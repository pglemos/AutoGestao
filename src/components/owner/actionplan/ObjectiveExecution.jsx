// Execução por objetivo estratégico — 5 linhas com progresso e contadores.
import { Target, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import { OBJECTIVES } from "./actionPlanConstants";
import { getObjectiveStats } from "./actionPlanUtils";

export default function ObjectiveExecution({ actions, onFilterByObjective, activeObjective }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Execução por objetivo estratégico</h2>
      <div className="space-y-2">
        {OBJECTIVES.map((obj) => {
          const stats = getObjectiveStats(actions, obj.value);
          const isActive = activeObjective === obj.value;
          return (
            <button
              key={obj.value}
              onClick={() => onFilterByObjective(obj.value)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{obj.label}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{stats.total} ações</span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-status-success-text" /> {stats.completed}
                  </span>
                  {stats.late > 0 && (
                    <span className="inline-flex items-center gap-1 text-status-error-text">
                      <AlertTriangle className="h-3 w-3" /> {stats.late}
                    </span>
                  )}
                  {stats.blocked > 0 && (
                    <span className="inline-flex items-center gap-1 text-status-error-text">
                      <Ban className="h-3 w-3" /> {stats.blocked}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${stats.progress}%` }} />
                </div>
                <span className="w-9 text-right text-sm font-bold text-foreground">{stats.progress}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}