/**
 * Design tokens matching the Tailwind / NativeWind palette used in `className`.
 *
 * Tailwind utilities (`bg-blue-600`, `text-slate-900`, …) stay in className.
 * These tokens are the source of truth for RN props that cannot consume
 * Tailwind: `tintColor`, `color`, `placeholderTextColor`, `ActivityIndicator`,
 * `RefreshControl`, `StyleSheet`, `LinearGradient`, etc.
 */
export const colors = {
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
    950: "#172554",
  },
  slate: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617",
  },
  red: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
    950: "#450A0A",
  },
  emerald: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
    950: "#022C22",
  },
  sky: {
    50: "#F0F9FF",
    100: "#E0F2FE",
    200: "#BAE6FD",
    300: "#7DD3FC",
    400: "#38BDF8",
    500: "#0EA5E9",
    600: "#0284C7",
    700: "#0369A1",
    800: "#075985",
    900: "#0C4A6E",
    950: "#082F49",
  },
  amber: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
    950: "#451A03",
  },
  pink: {
    50: "#FDF2F8",
    100: "#FCE7F3",
    200: "#FBCFE8",
    300: "#F472B6",
    400: "#F472B6",
    500: "#EC4899",
    600: "#DB2777",
    700: "#BE185D",
    800: "#9D174D",
    900: "#831843",
    950: "#500724",
  },
  violet: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
    950: "#2E1065",
  },
  purple: {
    50: "#FAF5FF",
    100: "#F3E8FF",
    200: "#E9D5FF",
    300: "#D8B4FE",
    400: "#C084FC",
    500: "#A855F7",
    600: "#9333EA",
    700: "#7E22CE",
    800: "#6B21A8",
    900: "#581C87",
    950: "#3B0764",
  },
  orange: {
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
    700: "#C2410C",
    800: "#9A3412",
    900: "#7C2D12",
    950: "#431407",
  },
  yellow: {
    50: "#FEFCE8",
    100: "#FEF9C3",
    200: "#FEF08A",
    300: "#FDE047",
    400: "#FACC15",
    500: "#EAB308",
    600: "#CA8A04",
    700: "#A16207",
    800: "#854D0E",
    900: "#713F12",
    950: "#422006",
  },
  cyan: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE",
    500: "#06B6D4",
    600: "#0891B2",
    700: "#0E7490",
    800: "#155E75",
    900: "#164E63",
    950: "#083344",
  },
  rose: {
    50: "#FFF1F2",
    100: "#FFE4E6",
    200: "#FECDD3",
    300: "#FDA4AF",
    400: "#FB7185",
    500: "#F43F5E",
    600: "#E11D48",
    700: "#BE123C",
    800: "#9F1239",
    900: "#881337",
    950: "#4C0519",
  },
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ThemeMode = "system" | "light" | "dark";
export type ActiveTheme = "light" | "dark";

export interface ThemePalette {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  text: string;
  muted: string;
  placeholder: string;
  border: string;
  borderSubtle: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  background: string;
  danger: string;
  success: string;
  overlay: string;
  shadowColor: string;
  card: string;
  inputBg: string;
}

/** Light Theme semantic tokens */
export const lightPalette: ThemePalette = {
  primary: colors.blue[600],
  primaryDark: colors.blue[700],
  primaryLight: colors.blue[500],
  text: colors.slate[900],
  muted: colors.slate[500],
  placeholder: colors.slate[400],
  border: colors.slate[200],
  borderSubtle: colors.slate[100],
  surface: colors.white,
  surfaceElevated: colors.white,
  surfaceMuted: colors.slate[100],
  background: colors.slate[50],
  danger: colors.red[500],
  success: colors.emerald[500],
  overlay: "rgba(15, 23, 42, 0.4)",
  shadowColor: colors.slate[900],
  card: colors.white,
  inputBg: colors.white,
};

/** Dark Theme semantic tokens */
export const darkPalette: ThemePalette = {
  primary: colors.blue[500],
  primaryDark: colors.blue[600],
  primaryLight: colors.blue[400],
  text: "#F8FAFC",
  muted: colors.slate[400],
  placeholder: colors.slate[500],
  border: colors.slate[800],
  borderSubtle: "#1E293B",
  surface: "#0F172A",
  surfaceElevated: "#1E293B",
  surfaceMuted: "#1E293B",
  background: "#020617",
  danger: colors.red[500],
  success: colors.emerald[500],
  overlay: "rgba(0, 0, 0, 0.7)",
  shadowColor: "#000000",
  card: "#0F172A",
  inputBg: "#1E293B",
};

/** Default semantic aliases for backwards compatibility */
export const palette = lightPalette;

export const storyRingGradient = [
  colors.amber[500],
  colors.pink[500],
  colors.violet[500],
  colors.blue[500],
] as const;

export const storyRingViewed = [colors.slate[300], colors.slate[300]] as const;

export const getCardShadow = (isDark: boolean) =>
  isDark
    ? {
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
      }
    : {
        shadowColor: colors.slate[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      };

export const theme = {
  colors,
  palette,
  lightPalette,
  darkPalette,
  getCardShadow,
} as const;
