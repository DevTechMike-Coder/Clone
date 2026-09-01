const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Enables `android:largeHeap` on the <application> element.
 *
 * This app buffers real media (ExoPlayer video streams, Supabase REST
 * response bodies read through OkHttp/HTTP2, and file->ArrayBuffer uploads),
 * so the default Android heap cap (~256 MB) can be exhausted on lower-end
 * devices and the native JVM throws `java.lang.OutOfMemoryError`. The flag
 * requests a larger heap from the OS. It is a mitigation, not a replacement
 * for the code-level bounded-memory fixes (paged feed, active-only players)
 * — those still do the real work; this just gives the JS/native buffers more
 * headroom so a transient spike does not crash the process.
 *
 * Expo does not expose `largeHeap` as a top-level `android` config key, so it
 * must be applied through a config plugin during prebuild/EAS build.
 */
module.exports = function withAndroidLargeHeap(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    if (!Array.isArray(manifest.manifest?.application)) {
      // No <application> node yet (unusual) — let the normal build continue
      // rather than throw; the app still works, just without largeHeap.
      return config;
    }

    const application = manifest.manifest.application[0];
    application.$ = application.$ || {};
    application.$["android:largeHeap"] = "true";

    return config;
  });
};
