// Constantes do Plano de Ação: statuses, prioridades, departamentos, objetivos, origens, estilos.

export const REFERENCE_DATE = "2026-07-17";

export const CYCLE_INFO = {
  name: "Organização e Rentabilidade",
  startDate: "01/07/2026",
  endDate: "30/09/2026",
  daysRemaining: 73,
  status: "Atenção",
};

export const ACTION_STATUSES = [
  { value: "awaiting_decision", label: "Aguardando decisão" },
  { value: "not_started", label: "Não iniciada" },
  { value: "in_progress", label: "Em andamento" },
  { value: "blocked", label: "Bloqueada" },
  { value: "awaiting_validation", label: "Aguardando validação" },
  { value: "completed", label: "Concluída" },
];

export const STATUS_STYLES = {
  awaiting_decision: {
    label: "Aguardando decisão",
    bg: "bg-status-info-surface",
    text: "text-status-info-text",
    badge: "bg-status-info-surface text-status-info-text",
    dot: "bg-status-info",
    border: "border-status-info/30",
  },
  not_started: {
    label: "Não iniciada",
    bg: "bg-muted",
    text: "text-slate-600",
    badge: "bg-muted text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
  in_progress: {
    label: "Em andamento",
    bg: "bg-status-info-surface",
    text: "text-status-info-text",
    badge: "bg-status-info-surface text-status-info-text",
    dot: "bg-status-info",
    border: "border-status-info/30",
  },
  blocked: {
    label: "Bloqueada",
    bg: "bg-status-error-surface",
    text: "text-status-error-text",
    badge: "bg-status-error-surface text-status-error-text",
    dot: "bg-status-error",
    border: "border-status-error/30",
  },
  awaiting_validation: {
    label: "Aguardando validação",
    bg: "bg-status-warning-surface",
    text: "text-status-warning-text",
    badge: "bg-status-warning-surface text-status-warning-text",
    dot: "bg-status-warning",
    border: "border-status-warning/30",
  },
  late: {
    label: "Atrasada",
    bg: "bg-status-warning-surface",
    text: "text-status-warning-text",
    badge: "bg-status-warning-surface text-status-warning-text",
    dot: "bg-status-warning",
    border: "border-status-warning/30",
  },
  completed: {
    label: "Concluída",
    bg: "bg-status-success-surface",
    text: "text-status-success-text",
    badge: "bg-status-success-surface text-status-success-text",
    dot: "bg-status-success",
    border: "border-status-success/30",
  },
};

export const DEPARTMENTS = [
  { value: "commercial", label: "Comercial" },
  { value: "marketing", label: "Marketing" },
  { value: "product_stock", label: "Produto e Estoque" },
  { value: "financial", label: "Financeiro" },
  { value: "operations", label: "Operações" },
  { value: "people_hr", label: "Pessoas — RH" },
  { value: "general", label: "Geral e Estratégia" },
];

export const DEPT_STYLES = {
  commercial: {
    label: "Comercial",
    bg: "bg-status-info-surface",
    text: "text-status-info-text",
    border: "border-status-info/30",
    dot: "bg-status-info",
    iconBg: "bg-status-info-surface text-status-info-text",
    badge: "bg-status-info-surface text-status-info-text",
    sideBar: "bg-status-info",
  },
  marketing: {
    label: "Marketing",
    bg: "bg-status-info-surface",
    text: "text-status-info-text",
    border: "border-status-info/30",
    dot: "bg-status-info",
    iconBg: "bg-status-info-surface text-status-info-text",
    badge: "bg-status-info-surface text-status-info-text",
    sideBar: "bg-status-info",
  },
  product_stock: {
    label: "Produto e Estoque",
    bg: "bg-status-info-surface",
    text: "text-status-info-text",
    border: "border-status-info/30",
    dot: "bg-status-info",
    iconBg: "bg-status-info-surface text-status-info-text",
    badge: "bg-status-info-surface text-status-info-text",
    sideBar: "bg-status-info",
  },
  financial: {
    label: "Financeiro",
    bg: "bg-status-success-surface",
    text: "text-status-success-text",
    border: "border-status-success/30",
    dot: "bg-status-success",
    iconBg: "bg-status-success-surface text-status-success-text",
    badge: "bg-status-success-surface text-status-success-text",
    sideBar: "bg-status-success",
  },
  operations: {
    label: "Operações",
    bg: "bg-status-warning-surface",
    text: "text-status-warning-text",
    border: "border-status-warning/30",
    dot: "bg-status-warning",
    iconBg: "bg-status-warning-surface text-status-warning-text",
    badge: "bg-status-warning-surface text-status-warning-text",
    sideBar: "bg-status-warning",
  },
  people_hr: {
    label: "Pessoas — RH",
    bg: "bg-brand-primary-subtle",
    text: "text-brand-primary",
    border: "border-brand-primary/30",
    dot: "bg-brand-primary",
    iconBg: "bg-brand-primary-subtle text-brand-primary",
    badge: "bg-brand-primary-subtle text-brand-primary",
    sideBar: "bg-brand-primary",
  },
  general: {
    label: "Geral e Estratégia",
    bg: "bg-status-info-surface",
    text: "text-status-info-text",
    border: "border-status-info/30",
    dot: "bg-status-info",
    iconBg: "bg-status-info-surface text-status-info-text",
    badge: "bg-status-info-surface text-status-info-text",
    sideBar: "bg-status-info",
  },
};

export const PRIORITIES = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export const PRIORITY_STYLES = {
  critical: { label: "Crítica", badge: "bg-status-error-surface text-status-error-text", dot: "bg-status-error" },
  high: { label: "Alta", badge: "bg-status-warning-surface text-status-warning-text", dot: "bg-status-warning" },
  medium: { label: "Média", badge: "bg-status-warning-surface text-status-warning-text", dot: "bg-status-warning" },
  low: { label: "Baixa", badge: "bg-muted text-slate-600", dot: "bg-slate-400" },
};

export const ORIGINS = [
  { value: "strategic_plan", label: "Plano Estratégico" },
  { value: "alert", label: "Alerta executivo" },
  { value: "consulting", label: "Consultoria" },
  { value: "diagnostic", label: "Diagnóstico" },
  { value: "department", label: "Departamento" },
  { value: "manual", label: "Manual" },
];

export const OBJECTIVES = [
  { value: "protect_profitability", label: "Proteger a rentabilidade" },
  { value: "reduce_inventory_capital", label: "Reduzir capital imobilizado em estoque" },
  { value: "improve_conversion", label: "Melhorar conversão e produtividade comercial" },
  { value: "reduce_owner_dependency", label: "Reduzir dependência operacional do Dono" },
  { value: "standardize_operations", label: "Padronizar operações e pós-venda" },
];

export const IMPACT_STATUSES = [
  { value: "positive", label: "Impacto positivo" },
  { value: "partial", label: "Impacto parcial" },
  { value: "none", label: "Sem impacto comprovado" },
  { value: "negative", label: "Impacto negativo" },
  { value: "unmeasured", label: "Ainda não medido" },
];

export const IMPACT_STYLES = {
  positive: { label: "Impacto positivo", badge: "bg-status-success-surface text-status-success-text", dot: "bg-status-success" },
  partial: { label: "Impacto parcial", badge: "bg-status-warning-surface text-status-warning-text", dot: "bg-status-warning" },
  none: { label: "Sem impacto comprovado", badge: "bg-muted text-slate-600", dot: "bg-slate-400" },
  negative: { label: "Impacto negativo", badge: "bg-status-error-surface text-status-error-text", dot: "bg-status-error" },
  unmeasured: { label: "Ainda não medido", badge: "bg-status-info-surface text-status-info-text", dot: "bg-status-info" },
};

export const DISPLAY_FILTERS = [
  { value: "all", label: "Todas as ações" },
  { value: "active", label: "Ativas" },
  { value: "late", label: "Atrasadas" },
  { value: "today", label: "Vencem hoje" },
  { value: "next7", label: "Próximos 7 dias" },
  { value: "awaiting_decision", label: "Aguardando decisão" },
  { value: "blocked", label: "Bloqueadas" },
  { value: "awaiting_validation", label: "Aguardando validação" },
  { value: "completed", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "requires_me", label: "Requer minha atuação" },
  { value: "stale", label: "Sem atualização" },
  { value: "unmeasured", label: "Impacto ainda não medido" },
];

export const KANBAN_COLUMNS = [
  { value: "not_started", label: "Não iniciada", iconName: "Circle" },
  { value: "in_progress", label: "Em andamento", iconName: "Play" },
  { value: "late", label: "Atrasada", iconName: "AlarmClock", isDerived: true },
  { value: "completed", label: "Concluída", iconName: "CheckCircle" },
];

export const BLOCK_CATEGORIES = [
  { value: "owner_decision", label: "Decisão do Dono" },
  { value: "internal_dependency", label: "Dependência interna" },
  { value: "supplier", label: "Fornecedor" },
  { value: "budget", label: "Orçamento" },
  { value: "missing_info", label: "Falta de informação" },
  { value: "schedule", label: "Agenda" },
  { value: "technology", label: "Tecnologia" },
  { value: "other", label: "Outro" },
];

export const SORT_OPTIONS = [
  { value: "due_soon", label: "Prazo mais próximo" },
  { value: "priority_high", label: "Maior prioridade" },
  { value: "priority_low", label: "Menor prioridade" },
  { value: "progress_high", label: "Maior progresso" },
  { value: "progress_low", label: "Menor progresso" },
  { value: "responsible", label: "Responsável" },
  { value: "updated_recent", label: "Atualização mais recente" },
  { value: "updated_old", label: "Atualização mais antiga" },
];

export const TRANSITION_RULES = {
  awaiting_decision: {
    in_progress: { modal: "approve" },
    not_started: { modal: "approve" },
  },
  not_started: {
    in_progress: { direct: true },
  },
  in_progress: {
    blocked: { modal: "block" },
    awaiting_validation: { modal: "submitValidation" },
  },
  blocked: {
    in_progress: { modal: "unblock" },
  },
  awaiting_validation: {
    completed: { modal: "validate" },
    in_progress: { modal: "return" },
  },
  completed: {},
};

export const QUICK_ACTIONS = {
  awaiting_decision: [
    { value: "open", label: "Abrir" },
    { value: "approve", label: "Aprovar" },
    { value: "delegate", label: "Delegar" },
    { value: "consultant", label: "Falar com Consultor" },
  ],
  not_started: [
    { value: "open", label: "Abrir" },
    { value: "start", label: "Iniciar" },
    { value: "delegate", label: "Delegar" },
    { value: "edit", label: "Editar" },
    { value: "cancel", label: "Cancelar" },
  ],
  in_progress: [
    { value: "open", label: "Abrir" },
    { value: "progress", label: "Atualizar progresso" },
    { value: "delegate", label: "Delegar" },
    { value: "block", label: "Bloquear" },
    { value: "submitValidation", label: "Enviar para validação" },
  ],
  blocked: [
    { value: "open", label: "Abrir" },
    { value: "unblock", label: "Remover bloqueio" },
    { value: "delegate", label: "Delegar" },
    { value: "consultant", label: "Falar com Consultor" },
  ],
  awaiting_validation: [
    { value: "open", label: "Abrir" },
    { value: "validate", label: "Aprovar conclusão" },
    { value: "return", label: "Devolver para execução" },
    { value: "consultant", label: "Falar com Consultor" },
  ],
  completed: [
    { value: "open", label: "Abrir" },
    { value: "viewImpact", label: "Ver impacto" },
    { value: "reopen", label: "Reabrir" },
    { value: "duplicate", label: "Duplicar" },
  ],
};

export function getStatusLabel(value) {
  return ACTION_STATUSES.find((s) => s.value === value)?.label || value;
}

export function getDeptLabel(value) {
  return DEPARTMENTS.find((d) => d.value === value)?.label || value;
}

export function getPriorityLabel(value) {
  return PRIORITIES.find((p) => p.value === value)?.label || value;
}

export function getOriginLabel(value) {
  return ORIGINS.find((o) => o.value === value)?.label || value;
}

export function getObjectiveLabel(value) {
  return OBJECTIVES.find((o) => o.value === value)?.label || value;
}
