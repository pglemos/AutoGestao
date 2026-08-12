// Aba Resumo do drawer — mostra todos os campos da ação.
import { Target, FileText, Lightbulb, User, Users, Calendar, DollarSign, AlertTriangle, Clock, Flag, CheckCircle, ShieldCheck } from "lucide-react";
import { DEPT_STYLES, PRIORITY_STYLES, STATUS_STYLES, IMPACT_STYLES, getOriginLabel } from "../actionPlanConstants";
import { formatDueDate, isLate, daysLate } from "../actionPlanUtils";

export default function SummaryTab({ action }) {
  const dept = DEPT_STYLES[action.department] || DEPT_STYLES.general;
  const priority = PRIORITY_STYLES[action.priority] || PRIORITY_STYLES.medium;
  const status = STATUS_STYLES[action.status] || STATUS_STYLES.not_started;
  const late = isLate(action);
  const lateDays = daysLate(action);
  const impact = IMPACT_STYLES[action.impactStatus] || IMPACT_STYLES.unmeasured;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.badge}`}>{status.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority.badge}`}>{priority.label}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${dept.badge}`}>{dept.label}</span>
        {late && <span className="rounded-full bg-status-error-surface px-2 py-0.5 text-xs font-medium text-status-error-text">Atrasada há {lateDays}d</span>}
      </div>

      {action.description && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Descrição</p>
          <p className="text-sm text-foreground">{action.description}</p>
        </div>
      )}

      <InfoRow icon={Flag} label="Origem">{getOriginLabel(action.origin)}</InfoRow>
      <InfoRow icon={Target} label="Objetivo estratégico">{action.strategicObjectiveLabel}</InfoRow>
      {action.indicator && <InfoRow icon={FileText} label="Indicador relacionado">{action.indicator}</InfoRow>}

      {action.problemOrOpportunity && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Problema / Oportunidade</p>
          <p className="text-sm text-foreground">{action.problemOrOpportunity}</p>
        </div>
      )}

      {action.expectedImpact && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" /> Impacto esperado</p>
          <p className="text-sm text-foreground">{action.expectedImpact}</p>
        </div>
      )}

      {action.financialImpact != null && (
        <InfoRow icon={DollarSign} label="Impacto financeiro">R$ {action.financialImpact.toLocaleString("pt-BR")}</InfoRow>
      )}

      <div className="grid grid-cols-2 gap-3">
        <InfoRow icon={User} label="Responsável">{action.responsible}</InfoRow>
        {action.executor && <InfoRow icon={User} label="Executor">{action.executor}</InfoRow>}
      </div>

      {action.participants && action.participants.length > 0 && (
        <InfoRow icon={Users} label="Participantes">{action.participants.join(", ")}</InfoRow>
      )}

      <div className="grid grid-cols-2 gap-3">
        <InfoRow icon={Calendar} label="Início">{action.startDate}</InfoRow>
        <InfoRow icon={Calendar} label="Prazo">{formatDueDate(action)}</InfoRow>
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="mb-1 text-xs font-medium text-muted-foreground">Progresso</p>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full rounded-full ${action.status === "completed" ? "bg-status-success" : action.status === "blocked" ? "bg-red-400" : "bg-status-info"}`} style={{ width: `${action.progress}%` }} />
          </div>
          <span className="text-sm font-bold text-foreground">{action.progress}%</span>
        </div>
      </div>

      {action.budget != null && <InfoRow icon={DollarSign} label="Orçamento">R$ {action.budget.toLocaleString("pt-BR")}</InfoRow>}

      {action.blockedReason && (
        <div className="rounded-lg border border-status-error/30 bg-status-error-surface p-3">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-status-error-text"><AlertTriangle className="h-3.5 w-3.5" /> Motivo do bloqueio</p>
          <p className="text-sm text-status-error-text">{action.blockedReason}</p>
          {action.blockCategory && <p className="mt-1 text-xs text-status-error-text">Categoria: {action.blockCategory}</p>}
          {action.blockResponsible && <p className="text-xs text-status-error-text">Responsável: {action.blockResponsible}</p>}
          {action.expectedUnblockDate && <p className="text-xs text-status-error-text">Previsão: {action.expectedUnblockDate}</p>}
        </div>
      )}

      <InfoRow icon={Clock} label="Última atualização">{action.lastUpdate}</InfoRow>

      <div className="flex flex-wrap gap-2">
        <Badge icon={CheckCircle} active={action.requiresOwner} label="Requer decisão do Dono" />
        <Badge icon={ShieldCheck} active={action.evidenceRequired} label="Requer validação" />
      </div>

      {action.status === "completed" && (
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Impacto</p>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${impact.badge}`}>{impact.label}</span>
            {action.completedAt && <span className="text-xs text-muted-foreground">Concluída em {action.completedAt}</span>}
          </div>
          {action.impactNote && <p className="mt-1 text-sm text-foreground">{action.impactNote}</p>}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground">{children}</div>
      </div>
    </div>
  );
}

function Badge({ icon: Icon, active, label }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}