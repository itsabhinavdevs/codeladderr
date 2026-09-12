export function formatDateId(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayId() {
  return formatDateId(new Date());
}

export function detectStreakGap(lastActiveDateId, currentStreak) {
  if (!lastActiveDateId) return 0;
  const [y, m, d] = lastActiveDateId.split("-").map(Number);
  const last = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  last.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today - last) / 86400000);
  return diffDays > 1 ? 0 : currentStreak;
}
