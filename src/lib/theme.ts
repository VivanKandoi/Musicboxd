export const THEME_COLORS = [
  { id: "amber", label: "Amber", accent: "#f59e0b", accentForeground: "#241704" },
  { id: "coral", label: "Coral", accent: "#ef6351", accentForeground: "#1a0d0a" },
  { id: "teal", label: "Teal", accent: "#2dd4bf", accentForeground: "#062622" },
  { id: "purple", label: "Purple", accent: "#a78bfa", accentForeground: "#1e1332" },
  { id: "blue", label: "Blue", accent: "#60a5fa", accentForeground: "#0b1f3d" },
  { id: "green", label: "Green", accent: "#4ade80", accentForeground: "#052e12" },
] as const;

export type ThemeColorId = (typeof THEME_COLORS)[number]["id"];
export const THEME_COLOR_IDS = THEME_COLORS.map((c) => c.id) as [
  ThemeColorId,
  ...ThemeColorId[],
];

export const THEME_MODES = ["dark", "light"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export function getThemeColor(id: string) {
  return THEME_COLORS.find((c) => c.id === id) ?? THEME_COLORS[0];
}
