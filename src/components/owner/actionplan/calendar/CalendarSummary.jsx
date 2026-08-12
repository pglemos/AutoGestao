// Card "Resumo do calendário" — 6 indicadores calculados da coleção.
import { countByStatus, countLate } from "../actionPlanUtils";

const ITEMS = [
  { key: "total", label: "Ações no ciclo", color: "text-foreground", bg: "bg-muted/40" },
  { key: "in_progress", label: "Em andamento", color: "text-status-info-text", bg: "bg-status-info-surface" },
  { key: "awaiting_decision", label: "Aguardando decisão", color: "text-violet-700", bg: "bg-violet-50" },
  { key: "blocked", label: "Bloqueadas", color: "text-status-error-text", bg: "bg-status-error-surface" },
  { key: "completed", label: "Concluídas", color: "text-status-success-text", bg: "bg-status-success-surface" },
  { key: "late", label: "Atrasadas", color: "text-status-error-text", bg: "bg-status-error-surface" },
];

export default function CalendarSummary({ actions }) {
  const stats = {
    total: actions.filter((a) => a.status !== "cancelled").length,
    in_progress: countByStatus(actions, "in_progress"),
    awaiting_decision: countByStatus(actions, "awaiting_decision"),
    blocked: countByStatus(actions, "blocked"),
    completed: countByStatus(actions, "completed"),
    late: countLate(actions),
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Resumo do calendário</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {ITEMS.map((item) => (
          <div key={item.key} className={`rounded-lg p-2.5 ${item.bg}`}>
            <div className={`text-xl font-bold ${item.color}`}>{stats[item.key]}</div>
            <div className="text-caption text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}