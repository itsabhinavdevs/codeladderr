export const DIFFICULTY_COLORS = {
  Easy: "#3b82f6",
  Medium: "#eab308",
  Hard: "#ef4444",
};

export function getDifficultyColor(difficulty) {
  return DIFFICULTY_COLORS[difficulty] || "var(--color-text-secondary)";
}
