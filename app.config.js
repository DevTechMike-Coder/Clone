const fs = require("fs");
const path = require("path");

/**
 * Resolve google-services.json for Android.
 *
 * EAS Build only uploads files tracked by git, and google-services.json is
 * gitignored (correct - it contains secrets). This resolver makes the build
 * work in all cases:
 *
 * 1. EAS file variable: GOOGLE_SERVICES_JSON is a path to a temp file that EAS
 *    wrote (Dashboard > Environment variables > Type: File). -> use that path.
 * 2. Raw JSON string: GOOGLE_SERVICES_JSON contains the JSON itself -> write
 *    it to ./google-services.json and use it.
 * 3. Base64 string: GOOGLE_SERVICES_JSON or GOOGLE_SERVICES_JSON_BASE64 contains
 *    base64-encoded JSON -> decode, write, and use.
 * 4. Local file: ./google-services.json exists on disk (local `npx expo run:android`)
 *    -> use it.
 * 5. Nothing: return undefined so prebuild succeeds without Firebase. The app
 *    already handles missing Firebase at runtime (registerPushToken logs and
 *    returns null, pushService skips).
 *
 * Without this, `app.json` with `"googleServicesFile": "${GOOGLE_SERVICES_JSON}"`
 * fails in <1s on EAS when the env var is not set or the file is not uploaded:
 *   Build failed: "google-services.json" is missing...
 */
function getGoogleServicesFile() {
  const candidateEnvVars = [
    process.env.GOOGLE_SERVICES_JSON,
    process.env.GOOGLE_SERVICES_JSON_BASE64,
    process.env.GOOGLE_SERVICES_JSON_B64,
  ];

  // 1 & 2 & 3: Check primary env var first (most common: EAS File path)
  const primary = process.env.GOOGLE_SERVICES_JSON;
  if (primary) {
    const trimmed = primary.trim();

    // Case A: It's a path to an existing file (EAS File variable or local path)
    // EAS writes file variables to /tmp or similar and sets var to that absolute path.
    if (fs.existsSync(trimmed)) {
      // Verify it looks like JSON before using
      try {
        const content = fs.readFileSync(trimmed, "utf8");
        JSON.parse(content);
        console.log(`[app.config] Using google-services.json from GOOGLE_SERVICES_JSON path: ${trimmed}`);
        return trimmed;
      } catch {
        // File exists but not valid JSON - still return, let native build error clearly
        console.log(`[app.config] Using google-services.json from GOOGLE_SERVICES_JSON path (unverified): ${trimmed}`);
        return trimmed;
      }
    }

    // Case B: Raw JSON content pasted as string variable
    if (trimmed.startsWith("{")) {
      try {
        JSON.parse(trimmed);
        const dest = path.join(__dirname, "google-services.json");
        // Don't overwrite if identical to avoid unnecessary changes
        let shouldWrite = true;
        if (fs.existsSync(dest)) {
          try {
            if (fs.readFileSync(dest, "utf8") === trimmed) shouldWrite = false;
          } catch {}
        }
        if (shouldWrite) {
          fs.writeFileSync(dest, trimmed);
          console.log("[app.config] Created google-services.json from GOOGLE_SERVICES_JSON (raw JSON)");
        }
        return "./google-services.json";
      } catch (e) {
        // Not valid JSON, fall through to base64 check
      }
    }

    // Case C: Base64-encoded JSON (common when copying file content into env var)
    // Heuristic: base64 string (A-Z,a-z,0-9,+,/,=) with sufficient length. Real
    // google-services.json is ~1500-3000 chars base64-encoded, but keep threshold low for tests.
    const isBase64Like = /^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.replace(/\s/g, "").length > 40;
    if (isBase64Like) {
      try {
        const decoded = Buffer.from(trimmed.replace(/\s/g, ""), "base64").toString("utf8");
        if (decoded.trim().startsWith("{")) {
          JSON.parse(decoded.trim());
          const dest = path.join(__dirname, "google-services.json");
          fs.writeFileSync(dest, decoded.trim());
          console.log("[app.config] Created google-services.json from GOOGLE_SERVICES_JSON (base64)");
          return "./google-services.json";
        }
      } catch {}
    }

    // If primary was a path-like string but file didn't exist, log hint
    if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.endsWith(".json")) {
      console.warn(
        `[app.config] GOOGLE_SERVICES_JSON is set to "${trimmed}" but no file exists at that path. ` +
          `If you use EAS Dashboard > Environment variables, create it as Type: File (not String) ` +
          `in the "development" environment, or check the file was uploaded. Falling back to local check.`
      );
    }
  }

  // Check dedicated base64 vars
  const base64Vars = [
    process.env.GOOGLE_SERVICES_JSON_BASE64,
    process.env.GOOGLE_SERVICES_JSON_B64,
  ];
  for (const b64 of base64Vars) {
    if (!b64) continue;
    try {
      const decoded = Buffer.from(b64.replace(/\s/g, ""), "base64").toString("utf8");
      JSON.parse(decoded.trim());
      const dest = path.join(__dirname, "google-services.json");
      fs.writeFileSync(dest, decoded.trim());
      console.log("[app.config] Created google-services.json from GOOGLE_SERVICES_JSON_BASE64");
      return "./google-services.json";
    } catch (e) {
      console.warn("[app.config] Failed to decode GOOGLE_SERVICES_JSON_BASE64:", e.message);
    }
  }

  // Local file fallback (for `npx expo run:android` / `npx expo prebuild` locally)
  const localPath = path.join(__dirname, "google-services.json");
  if (fs.existsSync(localPath)) {
    try {
      const content = fs.readFileSync(localPath, "utf8");
      JSON.parse(content);
      console.log("[app.config] Using local ./google-services.json");
      return "./google-services.json";
    } catch {
      console.warn("[app.config] Local ./google-services.json exists but is not valid JSON");
      return "./google-services.json";
    }
  }

  // Nothing found - build without Firebase (push notifications disabled)
  console.log(
    "[app.config] google-services.json not found - building without Firebase. " +
      "Android push notifications will be disabled until you provide it. " +
      "See PUSH_NOTIFICATIONS_SETUP.md Step 0 or set GOOGLE_SERVICES_JSON as an EAS file variable."
  );
  return undefined;
}

function getGoogleServiceInfoPlist() {
  const iosVars = [
    process.env.GOOGLE_SERVICE_INFO_PLIST,
    process.env.GOOGLE_SERVICE_INFO_PLIST_BASE64,
  ];
  const primary = process.env.GOOGLE_SERVICE_INFO_PLIST;
  if (primary && primary.trim().startsWith("<?xml")) {
    try {
      const dest = path.join(__dirname, "GoogleService-Info.plist");
      fs.writeFileSync(dest, primary);
      console.log("[app.config] Created GoogleService-Info.plist from env var (raw XML)");
      return "./GoogleService-Info.plist";
    } catch {}
  }
  if (primary && fs.existsSync(primary.trim())) {
    console.log(`[app.config] Using GoogleService-Info.plist from env path: ${primary.trim()}`);
    return primary.trim();
  }
  const b64 = process.env.GOOGLE_SERVICE_INFO_PLIST_BASE64 || process.env.GOOGLESERVICE_INFO_PLIST_BASE64;
  if (b64) {
    try {
      const decoded = Buffer.from(b64.replace(/\s/g, ""), "base64").toString("utf8");
      if (decoded.includes("<?xml") || decoded.includes("<plist")) {
        const dest = path.join(__dirname, "GoogleService-Info.plist");
        fs.writeFileSync(dest, decoded);
        console.log("[app.config] Created GoogleService-Info.plist from base64 env var");
        return "./GoogleService-Info.plist";
      }
    } catch {}
  }
  const localPlist = path.join(__dirname, "GoogleService-Info.plist");
  if (fs.existsSync(localPlist)) {
    console.log("[app.config] Using local ./GoogleService-Info.plist");
    return "./GoogleService-Info.plist";
  }
  return undefined;
}

const googleServicesFile = getGoogleServicesFile();
const googleServiceInfoPlist = getGoogleServiceInfoPlist();

// Base config mirrors app.json but with dynamic googleServicesFile
const config = {
  name: "clone",
  slug: "clone",
  version: "1.0.0",
  platforms: ["android", "ios"],
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "clone",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.clone.app",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    ...(googleServiceInfoPlist ? { googleServicesFile: googleServiceInfoPlist } : {}),
  },
  android: {
    package: "com.clone.app",
    // Only include googleServicesFile if we actually have a file - otherwise prebuild fails
    ...(googleServicesFile ? { googleServicesFile } : {}),
    softwareKeyboardLayoutMode: "resize",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.MODIFY_AUDIO_SETTINGS",
      "android.permission.POST_NOTIFICATIONS",
    ],
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    "expo-font",
    "expo-image",
    "expo-web-browser",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
        recordAudioAndroid: true,
        enableBackgroundPlayback: false,
        enableBackgroundRecording: false,
      },
    ],
    "@react-native-google-signin/google-signin",
    "expo-video",
    [
      "expo-camera",
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera",
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone",
        recordAudioAndroid: true,
        barcodeScannerEnabled: true,
      },
    ],
    "expo-secure-store",
    "expo-status-bar",
    "./plugins/withAndroidLargeHeap",
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: "b47926b7-7814-4a3f-a756-92a72bde0d9c",
    },
  },
};

module.exports = {
  expo: config,
};
