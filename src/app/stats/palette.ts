// Dark-surface categorical palette, validated against the page background
// (#000D25) with scripts/validate_palette.js from the dataviz skill.
export const CATEGORICAL_COLORS = [
  "#3987e5", // blue
  "#199e70", // aqua
  "#c98500", // yellow
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
  "#d55181", // magenta
  "#d95926", // orange
];

// Tote-board surface tokens — a shade lifted off the page background so
// panels read as their own plane, plus the two brand accents (red for
// live/urgent, gold for prize/claimed) carried over from the wheel screen.
export const SURFACE = {
  card: "#0B1B3E",
  raised: "#12275A",
  line: "#24365F",
};

export const ACCENT = {
  red: "#EF223A",
  gold: "#E8B339",
};

export const CHART_INK = {
  primary: "#FDF7F4",
  secondary: "#B9C3D9",
  muted: "#7C89AC",
  gridline: "#24365F",
  baseline: "#3A4A73",
};

export function wedgeColor(index: number) {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}
