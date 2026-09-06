import { NativeModules, TurboModuleRegistry } from "react-native";

/**
 * Safely copy string to clipboard without crashing if the native module
 * is not yet compiled into the running binary.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const hasModule =
    TurboModuleRegistry.get("ExpoClipboard") != null ||
    NativeModules.ExpoClipboard != null;

  if (hasModule) {
    try {
      // Lazy load to prevent crash if native module is absent in current binary
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require("expo-clipboard");
      await Clipboard.setStringAsync(text);
      return true;
    } catch (err) {
      console.warn("Failed to copy via ExpoClipboard:", err);
    }
  }

  return false;
}
