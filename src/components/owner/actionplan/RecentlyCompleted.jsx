// Concluídas recentemente — últimas 4 ações concluídas com classificação de impacto.
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { DEPT_STYLES, IMPACT_STYLES } from "./actionPlanConstants";
import { getRecentlyCompleted } from "./actionPlanUtils";

export default function RecentlyCompleted({ actions, onOpen }) {
  const completed = getRecentlyCompleted(actions);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-status-success-text" />
        <h2 className="text-sm font-semibold text-foreground">Concluídas recentemente</h2>
      </div>

      {completed.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma ação concluída recentemente.</p>
      ) : (
        <div className="space-y-1.5">
          {completed.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const impact = action.impactStatus ? IMPACT_STYLES[action.impactStatus] : null;
            return (
              <div
                key={action.id}
                className="flex items-center gap-2 rounded-lg border border-border p-2.5 hover:bg-muted/40"
              >
                <div className={`h-8 w-1 shrink-0 rounded-full ${dept.sideBar}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
                    {impact && (
                      <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${impact.badge}`}>
                        {impact.label}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">{action.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{action.responsible}</span>
                    <span>·</span>
                    <span>Concluída: {action.completedAt}</span>
                    <span>·</span>
                    <span className="truncate">{action.strategicObjectiveLabel}</span>
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