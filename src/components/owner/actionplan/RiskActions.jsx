// Ações em risco — top 5 ações com maior score de risco.
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES } from "./actionPlanConstants";
import { getRiskActions, formatDueDate } from "./actionPlanUtils";

export default function RiskActions({ actions, onOpen }) {
  const riskItems = getRiskActions(actions);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-status-error-text" />
        <h2 className="text-sm font-semibold text-foreground">Ações em risco</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-error-surface px-1.5 text-xs font-bold text-status-error-text">
          {riskItems.length}
        </span>
      </div>

      {riskItems.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ação em risco no momento.</p>
      ) : (
        <div className="space-y-1.5">
          {riskItems.map(({ action, reason, days }) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
            return (
              <div
                key={action.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 hover:bg-muted/40"
              >
                <div className={`h-8 w-1 shrink-0 rounded-full ${dept.sideBar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${priority.badge}`}>
                      {priority.label}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{action.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{action.responsible}</span>
                    <span>·</span>
                    <span>Prazo: {formatDueDate(action)}</span>
                    <span>·</span>
                    <span className="font-medium text-status-error-text">{reason}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onOpen(action)} className="shrink-0">
                  Abrir <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}