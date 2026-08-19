// Card "Detalhes do dia" — mostra ações do dia selecionado e detalhes da ação.
import { Button } from "@/components/ui/button";
import { ExternalLink, CalendarClock, MessageSquare, Lock, AlertTriangle, Plus } from "lucide-react";
import { STATUS_STYLES, DEPT_STYLES, PRIORITY_STYLES } from "../actionPlanConstants";
import { isLate, daysLate } from "../actionPlanUtils";
import { formatDateBR, getRelativeDayLabel, getActionsForDate } from "./calendarUtils";

export default function DayDetails({
  actions,
  selectedDate,
  selectedAction,
  onSelectAction,
  onOpenAction,
  onUpdateDeadline,
  onTalkToConsultant,
  onTalkToConsultantDay,
  onNewAction,
}) {
  const dayActions = getActionsForDate(actions, selectedDate);
  const action = selectedAction || dayActions[0] || null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">Detalhes do dia</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {getRelativeDayLabel(selectedDate)} — {formatDateBR(selectedDate)}
      </p>

      {dayActions.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação com prazo neste dia.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => onNewAction(formatDateBR(selectedDate))}>
            <Plus className="h-4 w-4" />
            Criar ação para esta data
          </Button>
        </div>
      ) : (
        <>
          {dayActions.length > 1 && (
            <div className="mt-3 space-y-1">
              {dayActions.map((a) => {
                const deptStyle = DEPT_STYLES[a.department] || {};
                const isActive = action?.id === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => onSelectAction(a)}
                    className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left text-xs transition-colors ${
                      isActive ? "border-status-success/40 bg-status-success-surface" : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${deptStyle.dot || "bg-slate-400"}`} />
                    <span className="font-medium text-foreground">{a.code}</span>
                    <span className="truncate text-muted-foreground">{a.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {action && <ActionDetail action={action} onOpenAction={onOpenAction} onUpdateDeadline={onUpdateDeadline} onTalkToConsultant={onTalkToConsultant} />}

          {dayActions.length > 1 && (
            <Button variant="ghost" size="sm" className="mt-3 w-full text-xs" onClick={() => onTalkToConsultantDay(selectedDate, dayActions)}>
              <MessageSquare className="h-3 w-3" />
              Falar com Consultor sobre o dia
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function ActionDetail({ action, onOpenAction, onUpdateDeadline, onTalkToConsultant }) {
  const deptStyle = DEPT_STYLES[action.department] || {};
  const statusStyle = STATUS_STYLES[action.status] || {};
  const prioStyle = PRIORITY_STYLES[action.priority] || {};
  const late = isLate(action);

  return (
    <div className="mt-3 space-y-3">
      <div className={`rounded-xl border border-border p-3.5 ${deptStyle.bg || "bg-surface-alt"}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">{action.code}</span>
          <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${statusStyle.badge || ""}`}>
            {statusStyle.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground">{action.title}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${deptStyle.badge || ""}`}>
            {deptStyle.label}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${prioStyle.badge || ""}`}>
            {prioStyle.label}
          </span>
          {late && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-status-error-surface px-2 py-0.5 text-caption font-medium text-status-error-text">
              <AlertTriangle className="h-3 w-3" />
              Atrasada há {daysLate(action)}d
            </span>
          )}
          {action.status === "blocked" && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-status-error-surface px-2 py-0.5 text-caption font-medium text-status-error-text">
              <Lock className="h-3 w-3" />
              {action.blockedReason || "Bloqueada"}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <DetailRow label="Objetivo" value={action.strategicObjectiveLabel} />
        <DetailRow label="Indicador" value={action.indicator} />
        <DetailRow label="Responsável" value={action.responsible} />
        <DetailRow label="Prazo" value={action.dueDate} />
        <DetailRow label="Progresso" value={`${action.progress || 0}%`} />
        {action.expectedImpact && <DetailRow label="Impacto esperado" value={action.expectedImpact} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90" onClick={() => onOpenAction(action)}>
          <ExternalLink className="h-3 w-3" />
          Abrir ação
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => onUpdateDeadline(action)}>
          <CalendarClock className="h-3 w-3" />
          Atualizar prazo
        </Button>
        <Button size="sm" variant="ghost" className="h-8" onClick={() => onTalkToConsultant(action)}>
          <MessageSquare className="h-3 w-3" />
          Consultor
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}