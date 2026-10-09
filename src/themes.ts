export interface Theme {
  id: string;
  name: string;
  background: string;
  primary: string;   // 見出し・強調
  accent: string;    // アクセントライン、矢印
  text: string;      // 本文
  muted: string;     // 補足文
  card: string;      // カード背景
  cardText: string;  // カード内の文字
}

export const THEMES: Theme[] = [
  {
    id: "clean",
    name: "クリーン",
    background: "#ffffff",
    primary: "#1e3a5f",
    accent: "#2f80ed",
    text: "#2b2b2b",
    muted: "#6b7280",
    card: "#eef4fb",
    cardText: "#1e3a5f",
  },
  {
    id: "dark",
    name: "ダーク",
    background: "#0f172a",
    primary: "#f8fafc",
    accent: "#38bdf8",
    text: "#e2e8f0",
    muted: "#94a3b8",
    card: "#1e293b",
    cardText: "#f8fafc",
  },
  {
    id: "warm",
    name: "ウォーム",
    background: "#fffaf3",
    primary: "#7c2d12",
    accent: "#f97316",
    text: "#3f3f46",
    muted: "#78716c",
    card: "#ffedd5",
    cardText: "#7c2d12",
  },
  {
    id: "forest",
    name: "フォレスト",
    background: "#f3f8f4",
    primary: "#14532d",
    accent: "#16a34a",
    text: "#1f2937",
    muted: "#6b7280",
    card: "#dcfce7",
    cardText: "#14532d",
  },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
