import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Appearance, ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ThemeMode,
  ActiveTheme,
  ThemePalette,
  lightPalette,
  darkPalette,
  colors,
} from "@/constants/theme";

const THEME_STORAGE_KEY = "@user_theme_preference";

interface ThemeContextType {
  themePreference: ThemeMode;
  activeTheme: ActiveTheme;
  isDark: boolean;
  isReady: boolean;
  setThemePreference: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  palette: ThemePalette;
  colors: typeof colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themePreference, setThemePreferenceState] =
    useState<ThemeMode>("system");
  const [systemScheme, setSystemScheme] = useState<ActiveTheme>(() => {
    const initial = Appearance.getColorScheme();
    return initial === "dark" ? "dark" : "light";
  });
  const [isReady, setIsReady] = useState(false);

  // Sync with device OS changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(
      ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        setSystemScheme(colorScheme === "dark" ? "dark" : "light");
      }
    );
    return () => subscription.remove();
  }, []);

  // Hydrate stored preference from AsyncStorage
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (
          isMounted &&
          stored &&
          (stored === "system" || stored === "light" || stored === "dark")
        ) {
          setThemePreferenceState(stored as ThemeMode);
          if (stored !== "system") {
            Appearance.setColorScheme?.(stored as ColorSchemeName);
          }
        }
      } catch (err) {
        console.error("Failed to load theme preference:", err);
      } finally {
        if (isMounted) setIsReady(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTheme: ActiveTheme = useMemo(() => {
    if (themePreference === "system") {
      return systemScheme;
    }
    return themePreference;
  }, [themePreference, systemScheme]);

  const isDark = activeTheme === "dark";
  const palette = useMemo(
    () => (isDark ? darkPalette : lightPalette),
    [isDark]
  );

  const setThemePreference = useCallback(async (mode: ThemeMode) => {
    try {
      setThemePreferenceState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      if (mode === "system") {
        (Appearance.setColorScheme as any)?.(null);
      } else {
        Appearance.setColorScheme?.(mode);
      }
    } catch (err) {
      console.error("Failed to save theme preference:", err);
    }
  }, []);

  const toggleTheme = useCallback(async () => {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    await setThemePreference(nextMode);
  }, [isDark, setThemePreference]);

  const value = useMemo(
    () => ({
      themePreference,
      activeTheme,
      isDark,
      isReady,
      setThemePreference,
      toggleTheme,
      palette,
      colors,
    }),
    [
      themePreference,
      activeTheme,
      isDark,
      isReady,
      setThemePreference,
      toggleTheme,
      palette,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
