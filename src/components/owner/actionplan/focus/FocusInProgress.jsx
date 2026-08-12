// Seção "Em execução" — ações com status Em andamento.
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, ChevronRight, Play } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES } from "../actionPlanConstants";
import { formatDueDate, isLate, daysLate, parseBRDate } from "../actionPlanUtils";

export default function FocusInProgress({ actions, onOpen, onQuickAction }) {
  const inProgress = actions
    .filter((a) => a.status === "in_progress")
    .sort((a, b) => {
      const prioOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const pa = prioOrder[a.priority] ?? 9;
      const pb = prioOrder[b.priority] ?? 9;
      if (pa !== pb) return pa - pb;
      const da = a.dueDate ? parseBRDate(a.dueDate) : new Date(8640000000000000);
      const db = b.dueDate ? parseBRDate(b.dueDate) : new Date(8640000000000000);
      if (da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
      return (a.progress || 0) - (b.progress || 0);
    });

  return (
    <section className="rounded-xl border border-status-info/30 bg-status-info-surface/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-status-info-surface">
          <Play className="h-4 w-4 text-status-info-text" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Em execução</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-info-surface px-1.5 text-xs font-bold text-status-info-text">
          {inProgress.length}
        </span>
      </div>

      {inProgress.length === 0 ? (
        <div className="rounded-lg border border-dashed border-status-info/30 bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação em execução no momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inProgress.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
            const late = isLate(action);
            const lateDays = daysLate(action);
            const progressColor = action.status === "completed" ? "bg-status-success" : "bg-status-info";

            return (
              <div
                key={action.id}
                className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${dept.sideBar}`} />
                <div className="pl-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${priority.badge}`}>{priority.label}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${dept.badge}`}>{dept.label}</span>
                    </div>
                    {late && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-status-error-surface px-1.5 py-0.5 text-caption font-medium text-status-error-text">
                        <AlertTriangle className="h-2.5 w-2.5" /> Atrasada há {lateDays}d
                      </span>
                    )}
                  </div>

                  <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">{action.title}</h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Resp.: <span className="font-medium text-foreground">{action.responsible}</span></span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Prazo: <span className="font-medium text-foreground">{formatDueDate(action)}</span>
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${action.progress}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{action.progress}%</span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Última atualização: {action.lastUpdate}</span>
                    <Button size="sm" variant="outline" onClick={() => onQuickAction(action, "progress")}>
                      Atualizar <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}