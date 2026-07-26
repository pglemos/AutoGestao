import { QUICK_ACTIONS } from "./actionPlanConstants";

const INLINE_EXECUTION_ACTIONS = new Set(["progress", "block", "unblock"]);

export function getExecutionQuickActions(status) {
  return (QUICK_ACTIONS[status] || []).filter(({ value }) => !INLINE_EXECUTION_ACTIONS.has(value) && value !== "open");
}

export function shouldShowProgressEditor(status) {
  return status === "in_progress";
}
