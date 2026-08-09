// Seção "Em risco" — ações que podem comprometer o resultado do ciclo.
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES } from "../actionPlanConstants";
import { getAllRiskActions, formatDueDate } from "../actionPlanUtils";

export default function FocusAtRisk({ actions, onOpen }) {
  const riskItems = getAllRiskActions(actions);

  return (
    <section className="rounded-xl border border-red-200 bg-red-50/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Em risco</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700">
          {riskItems.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Ações que podem comprometer o resultado do ciclo.
      </p>

      {riskItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-red-200 bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação em risco no momento.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {riskItems.map(({ action, reason, days }) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
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
                    </div>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-caption font-medium text-red-700">
                      {reason}
                    </span>
                  </div>

                  <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">{action.title}</h3>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>Resp.: <span className="font-medium text-foreground">{action.responsible}</span></span>
                    <span>Prazo: <span className="font-medium text-foreground">{formatDueDate(action)}</span></span>
                    {action.progress > 0 && (
                      <span>Progresso: <span className="font-medium text-foreground">{action.progress}%</span></span>
                    )}
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => onOpen(action)}>
                      Abrir <ChevronRight className="h-3.5 w-3.5" />
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