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
    bg: "bg-violet-50",
    text: "text-violet-700",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
    border: "border-violet-200",
  },
  not_started: {
    label: "Não iniciada",
    bg: "bg-slate-100",
    text: "text-slate-600",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    border: "border-slate-200",
  },
  in_progress: {
    label: "Em andamento",
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    border: "border-blue-200",
  },
  blocked: {
    label: "Bloqueada",
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
    border: "border-red-200",
  },
  awaiting_validation: {
    label: "Aguardando validação",
    bg: "bg-orange-50",
    text: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    dot: "bg-orange-500",
    border: "border-orange-200",
  },
  late: {
    label: "Atrasada",
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    border: "border-amber-200",
  },
  completed: {
    label: "Concluída",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    border: "border-emerald-200",
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
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
    iconBg: "bg-violet-100 text-violet-600",
    badge: "bg-violet-100 text-violet-700",
    sideBar: "bg-violet-500",
  },
  marketing: {
    label: "Marketing",
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
    dot: "bg-pink-500",
    iconBg: "bg-pink-100 text-pink-600",
    badge: "bg-pink-100 text-pink-700",
    sideBar: "bg-pink-500",
  },
  product_stock: {
    label: "Produto e Estoque",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
    iconBg: "bg-blue-100 text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    sideBar: "bg-blue-500",
  },
  financial: {
    label: "Financeiro",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    iconBg: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    sideBar: "bg-emerald-500",
  },
  operations: {
    label: "Operações",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-500",
    iconBg: "bg-orange-100 text-orange-600",
    badge: "bg-orange-100 text-orange-700",
    sideBar: "bg-orange-500",
  },
  people_hr: {
    label: "Pessoas — RH",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    dot: "bg-teal-500",
    iconBg: "bg-teal-100 text-teal-600",
    badge: "bg-teal-100 text-teal-700",
    sideBar: "bg-teal-500",
  },
  general: {
    label: "Geral e Estratégia",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-500",
    iconBg: "bg-indigo-100 text-indigo-600",
    badge: "bg-indigo-100 text-indigo-700",
    sideBar: "bg-indigo-500",
  },
};

export const PRIORITIES = [
  { value: "critical", label: "Crítica" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Média" },
  { value: "low", label: "Baixa" },
];

export const PRIORITY_STYLES = {
  critical: { label: "Crítica", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  high: { label: "Alta", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  medium: { label: "Média", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  low: { label: "Baixa", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
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
  positive: { label: "Impacto positivo", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  partial: { label: "Impacto parcial", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  none: { label: "Sem impacto comprovado", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
  negative: { label: "Impacto negativo", badge: "bg-red-100 text-red-700", dot: "bg-red-500" },
  unmeasured: { label: "Ainda não medido", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
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
