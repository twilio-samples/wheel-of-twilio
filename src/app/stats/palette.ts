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

export const CHART_INK = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  gridline: "#2c2c2a",
  baseline: "#383835",
};

export function wedgeColor(index: number) {
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}
