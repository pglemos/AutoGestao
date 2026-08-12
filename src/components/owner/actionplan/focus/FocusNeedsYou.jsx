// Seção "Precisam de você" — ações que aguardam decisão do Dono.
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Target, Zap } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES } from "../actionPlanConstants";
import { formatDueDate, isLate, daysLate } from "../actionPlanUtils";

export default function FocusNeedsYou({ actions, onAnalyze, onApprove, onDelegate, onTalkToConsultant }) {
  const needsOwner = actions.filter((a) => a.requiresOwner && a.status === "awaiting_decision");

  return (
    <section className="rounded-xl border border-status-info/30 bg-status-info-surface/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-status-info-surface">
          <Zap className="h-4 w-4 text-status-info-text" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Precisam de você</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-info-surface px-1.5 text-xs font-bold text-status-info-text">
          {needsOwner.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Decisões e aprovações que não podem avançar sem sua atuação.
      </p>

      {needsOwner.length === 0 ? (
        <div className="rounded-lg border border-dashed border-status-info/30 bg-card py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação precisa da sua decisão neste momento.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {needsOwner.map((action) => {
            const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
            const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
            const late = isLate(action);
            const lateDays = daysLate(action);
            const whyOwner = action.recommendation || action.problemOrOpportunity || "Requer decisão estratégica do Dono.";

            return (
              <div
                key={action.id}
                className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm"
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

                  <h3 className="mt-1.5 text-sm font-semibold leading-snug text-foreground">{action.title}</h3>

                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p className="line-clamp-2">
                      <span className="font-medium text-foreground">Por que depende de você:</span> {whyOwner}
                    </p>
                    {action.expectedImpact && (
                      <p className="line-clamp-1">
                        <span className="font-medium text-foreground">Impacto:</span> {action.expectedImpact}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" /> Resp.: <span className="font-medium text-foreground">{action.responsible}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Prazo: <span className="font-medium text-foreground">{formatDueDate(action)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <Button size="sm" onClick={() => onAnalyze(action)} className="bg-status-info hover:bg-status-info">
                      Analisar e decidir
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