// Card de ação que precisa do Dono — usado na seção "Precisam de você".
import { Button } from "@/components/ui/button";
import { Eye, Check, UserPlus, MessageCircle, AlertTriangle, Target, Calendar } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES, STATUS_STYLES, getOriginLabel } from "./actionPlanConstants";
import { formatDueDate, isLate, daysLate } from "./actionPlanUtils";

export default function OwnerActionCard({ action, onAnalyze, onApprove, onDelegate, onTalkToConsultant }) {
  const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
  const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
  const status = STATUS_STYLES[action.status] || STATUS_STYLES.not_started;
  const late = isLate(action);
  const lateDays = daysLate(action);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm`}>
      <div className={`absolute left-0 top-0 h-full w-1 ${dept.sideBar}`} />

      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priority.badge}`}>
              {priority.label}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${dept.badge}`}>
              {dept.label}
            </span>
          </div>
          {late && (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-error-surface px-2 py-0.5 text-xs font-medium text-status-error-text">
              <AlertTriangle className="h-3 w-3" /> Atrasada há {lateDays}d
            </span>
          )}
        </div>

        <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground">{action.title}</h3>

        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Target className="h-3 w-3 shrink-0" />
            <span className="truncate">{action.strategicObjectiveLabel}</span>
          </div>
          {action.indicator && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/70">Indicador:</span>
              <span className="truncate">{action.indicator}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>Prazo: {formatDueDate(action)}</span>
          </div>
        </div>

        {action.expectedImpact && (
          <p className="mt-2 line-clamp-2 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Impacto:</span> {action.expectedImpact}
          </p>
        )}

        {action.recommendation && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Recomendação:</span> {action.recommendation}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Responsável:</span>
          <span className="font-medium text-foreground">{action.responsible}</span>
          {action.executor && action.executor !== action.responsible && (
            <span>· Executor: {action.executor}</span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => onAnalyze(action)}>
            <Eye className="h-3.5 w-3.5" /> Analisar
          </Button>
          <Button size="sm" onClick={() => onApprove(action)} className="bg-primary hover:bg-primary/90">
            <Check className="h-3.5 w-3.5" /> Aprovar
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelegate(action)}>
            <UserPlus className="h-3.5 w-3.5" /> Delegar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onTalkToConsultant(action)}>
            <MessageCircle className="h-3.5 w-3.5" /> Consultor
          </Button>
        </div>
      </div>
    </div>
  );
}