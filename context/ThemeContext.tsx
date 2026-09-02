import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";
import { Palette, palettes } from "@/constants/theme";

/**
 * App-wide light/dark theming.
 *
 * `mode` is the user's choice ("system" | "light" | "dark"), persisted in
 * AsyncStorage. `colorScheme` is the resolved scheme actually in effect.
 *
 * Two complementary consumers:
 *   1. `dark:` className variants — react-native-css listens to RN
 *      `Appearance`, and `Appearance.setColorScheme()` switches it
 *      process-wide, so classes flip reactively.
 *   2. RN props that can't take classes (tintColor, placeholderTextColor,
 *      ActivityIndicator, StyleSheet, …) — use `usePalette()`.
 */

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextType = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colorScheme: "light" | "dark";
  palette: Palette;
};

const STORAGE_KEY = "clone.themeMode";

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  setMode: () => {},
  colorScheme: "light",
  palette: palettes.light,
});

/** Apply (or clear, for "system") the app-level appearance override. */
function applyOverride(mode: ThemeMode) {
  try {
    // RN's API: "unspecified" clears the override so the app follows the
    // OS again (see Appearance.js — null is not a valid input).
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
  } catch {
    // Older binaries ignore this; Context state still drives usePalette().
  }
}

// Apply the persisted choice as early as possible (module import) so the
// first paint is already themed — AsyncStorage hydration below then
// re-applies it authoritatively.
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>("system");
  const systemScheme = useColorScheme();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
          applyOverride(stored);
        }
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    applyOverride(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  // With mode "system" the override is "unspecified", so useColorScheme()
  // reports the real OS scheme ("unspecified" → treat as light).
  const colorScheme: "light" | "dark" =
    mode === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : mode;

  const value = useMemo<ThemeContextType>(
    () => ({
      mode,
      setMode,
      colorScheme,
      palette: palettes[colorScheme],
    }),
    [mode, setMode, colorScheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

/** Scheme-aware semantic palette for RN props (non-className styles). */
export const usePalette = (): Palette => useTheme().palette;
