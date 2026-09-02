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
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
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
  },
  red: {
    300: "#FCA5A5",
    500: "#EF4444",
    600: "#DC2626",
  },
  emerald: {
    500: "#10B981",
    600: "#059669",
  },
  sky: {
    400: "#38BDF8",
  },
  amber: {
    500: "#F59E0B",
  },
  pink: {
    500: "#EC4899",
  },
  violet: {
    500: "#8B5CF6",
    600: "#7C3AED",
  },
  purple: {
    600: "#9333EA",
  },
  orange: {
    500: "#F97316",
  },
  yellow: {
    400: "#FACC15",
  },
  cyan: {
    500: "#06B6D4",
  },
  rose: {
    500: "#F43F5E",
  },
  white: "#FFFFFF",
  black: "#000000",
} as const;

/** Semantic aliases for the props that show up on almost every screen. */
export const palette = {
  primary: colors.blue[600],
  primaryDark: colors.blue[700],
  primaryLight: colors.blue[500],
  text: colors.slate[900],
  muted: colors.slate[500],
  placeholder: colors.slate[400],
  border: colors.slate[200],
  surface: colors.white,
  background: colors.slate[50],
  danger: colors.red[500],
  success: colors.emerald[500],
  overlay: "rgba(15, 23, 42, 0.28)",
} as const;

export const storyRingGradient = [
  colors.amber[500],
  colors.pink[500],
  colors.violet[500],
  colors.blue[500],
] as const;

export const storyRingViewed = [colors.slate[300], colors.slate[300]] as const;

export const theme = { colors, palette } as const;
