// Seção "Concluídas recentemente" — últimas 4 ações concluídas com classificação de impacto.
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { DEPT_STYLES, IMPACT_STYLES } from "../actionPlanConstants";
import { getRecentlyCompleted } from "../actionPlanUtils";

export default function FocusRecentlyCompleted({ actions, onOpen }) {
  const completed = getRecentlyCompleted(actions);

  return (
    <section className="rounded-xl border border-status-success/30 bg-status-success-surface/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-status-success-surface">
          <CheckCircle2 className="h-4 w-4 text-status-success-text" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Concluídas recentemente</h2>
      </div>

      {completed.length === 0 ? (
        <div className="rounded-lg border border-dashed border-status-success/30 bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação concluída recentemente.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {completed.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const impact = action.impactStatus ? IMPACT_STYLES[action.impactStatus] : null;
            return (
              <div
                key={action.id}
                className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`absolute left-0 top-0 h-full w-1 ${dept.sideBar}`} />
                <div className="pl-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
                    {impact && (
                      <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${impact.badge}`}>{impact.label}</span>
                    )}
                  </div>

                  <h3 className="mt-1 text-sm font-semibold leading-snug text-foreground">{action.title}</h3>

                  <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Resp.: <span className="font-medium text-foreground">{action.responsible}</span></span>
                      <span>·</span>
                      <span>Concluída: {action.completedAt}</span>
                    </div>
                    {action.expectedImpact && (
                      <p className="line-clamp-1">
                        <span className="font-medium text-foreground">Impacto:</span> {action.expectedImpact}
                      </p>
                    )}
                  </div>

                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => onOpen(action)}>
                      Ver resultado <ChevronRight className="h-3.5 w-3.5" />
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