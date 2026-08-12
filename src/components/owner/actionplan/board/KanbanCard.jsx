// Card de ação do Kanban — simplificado: código, prioridade, título, departamento, responsável, prazo, progresso e condições especiais.
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, AlertTriangle, Lock, Calendar, User, CheckCircle2 } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES, QUICK_ACTIONS } from "../actionPlanConstants";
import { formatDueDate, isLate, daysLate } from "../actionPlanUtils";
import MoveToMenu from "./MoveToMenu";

export default function KanbanCard({ action, onQuickAction, onDelete, onMoveTo }) {
  const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
  const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
  const late = isLate(action);
  const lateDays = daysLate(action);
  const quickActions = QUICK_ACTIONS[action.status] || [];
  const showProgress = action.status !== "awaiting_decision" || action.progress > 0;

  const progressColor = action.status === "completed" ? "bg-status-success" : action.status === "blocked" ? "bg-red-400" : "bg-status-info";

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute left-0 top-0 h-full w-1 ${dept.sideBar}`} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-bold text-muted-foreground">{action.code}</span>
          <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${priority.badge}`}>{priority.label}</span>
        </div>

        <h4 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">{action.title}</h4>

        <div className="mt-2">
          <span className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${dept.badge}`}>{dept.label}</span>
        </div>

        {/* Condições especiais */}
        <div className="mt-2 flex flex-wrap gap-1">
          {action.requiresOwner && action.status === "awaiting_decision" && (
            <span className="rounded-full bg-status-info-surface px-1.5 py-0.5 text-xs font-medium text-status-info-text">Sua decisão</span>
          )}
          {late && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-status-error-surface px-1.5 py-0.5 text-xs font-medium text-status-error-text">
              <AlertTriangle className="h-2.5 w-2.5" /> Atrasada há {lateDays}d
            </span>
          )}
          {action.blockedReason && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-status-error-surface px-1.5 py-0.5 text-xs font-medium text-status-error-text">
              <Lock className="h-2.5 w-2.5" /> Bloqueada
            </span>
          )}
          {action.status === "awaiting_validation" && (
            <span className="rounded-full bg-status-warning-surface px-1.5 py-0.5 text-xs font-medium text-status-warning-text">Validação</span>
          )}
          {action.status === "completed" && action.impactStatus && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-status-success-surface px-1.5 py-0.5 text-xs font-medium text-status-success-text">
              <CheckCircle2 className="h-2.5 w-2.5" /> Impacto medido
            </span>
          )}
        </div>

        <div className="mt-2.5 space-y-1.5 border-t border-border pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {action.responsible}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDueDate(action)}</span>
          </div>
          {showProgress && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${action.progress}%` }} />
              </div>
              <span className="text-xs font-medium text-foreground">{action.progress}%</span>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" aria-label={`Ações para ${action.title}`} className="h-7 w-7 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {quickActions.map((qa) => (
                <DropdownMenuItem key={qa.value} onClick={() => onQuickAction(action, qa.value)}>
                  {qa.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {onDelete && <DropdownMenuItem className="text-destructive" onClick={() => onDelete(action)}>Excluir definitivamente</DropdownMenuItem>}
              <MoveToMenu action={action} onMoveTo={onMoveTo} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
