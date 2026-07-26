const EMPTY_RESPONSIBLE_VALUES = new Set(["", "Não definido", "Não informado", "—", "-"]);
export function normalizeActionPlanMode(value) {
  if (value === "kanban") return "kanban";
  return "table";
}

export function normalizeResponsibleValue(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return EMPTY_RESPONSIBLE_VALUES.has(normalized) ? "" : normalized;
}

export function getProgressOptions(currentProgress) {
  const parsed = Number(currentProgress);
  const current = Number.isFinite(parsed) ? Math.min(100, Math.max(0, Math.round(parsed))) : 0;
  return [...new Set([0, 20, 40, 45, 50, 60, 65, 75, 80, 100, current])].sort((a, b) => a - b);
}
