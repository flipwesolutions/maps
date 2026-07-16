/** Emerald Vista — Flipwi Maps design system (from flipwi_maps_UI) */
export const colors = {
  background: "#f8fafb",
  surface: "#ffffff",
  surfaceContainerLow: "#f2f4f5",
  surfaceContainer: "#eceeef",
  surfaceContainerHigh: "#e6e8e9",
  surfaceContainerHighest: "#e1e3e4",
  onSurface: "#191c1d",
  onSurfaceVariant: "#3e4944",
  outline: "#6e7a74",
  outlineVariant: "#bdc9c2",
  primary: "#006951",
  onPrimary: "#ffffff",
  primaryContainer: "#008467",
  onPrimaryContainer: "#f5fff8",
  primaryFixedDim: "#72d9b7",
  primaryLight: "#8ef6d2",
  secondary: "#416658",
  secondaryContainer: "#c0e9d7",
  tertiary: "#954337",
  error: "#ba1a1a",
  onError: "#ffffff",
  glass: "rgba(255,255,255,0.82)",
  glassBorder: "rgba(255,255,255,0.55)",
  glassShadow: "rgba(0,105,81,0.12)",
  // legacy aliases used across app
  bg: "#f8fafb",
  text: "#191c1d",
  textSecondary: "#3e4944",
  textMuted: "#6e7a74",
  border: "#bdc9c2",
  borderLight: "#f2f4f5",
  nav: "#006951",
  navDark: "#00513e",
  primaryDark: "#00513e",
  success: "#008467",
  danger: "#ba1a1a",
  warning: "#954337",
};

export const spacing = {
  safe: 20,
  panel: 24,
  gutter: 12,
  stack: 16,
  touch: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  sheet: 32,
  full: 9999,
};

export const typography = {
  headlineLg: { fontSize: 24, fontWeight: "700" as const, letterSpacing: -0.4 },
  headlineMd: { fontSize: 22, fontWeight: "600" as const },
  bodyLg: { fontSize: 16, fontWeight: "500" as const },
  bodyMd: { fontSize: 14, fontWeight: "400" as const },
  labelLg: {
    fontSize: 12,
    fontWeight: "600" as const,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
  },
  labelMd: { fontSize: 11, fontWeight: "500" as const },
};

export const glass = {
  backgroundColor: colors.glass,
  borderWidth: 1,
  borderColor: colors.glassBorder,
};

export const shadow = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
};
