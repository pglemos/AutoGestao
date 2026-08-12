// Status helpers — texto + cor semântica (Canônico Módulo Dono)

export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'slate';

export interface StatusMeta {
  label: string;
  tone: Tone;
}

export const STATUS_META: Record<string, StatusMeta> = {
  on_track: { label: "Dentro do esperado", tone: "green" },
  attention: { label: "Atenção", tone: "amber" },
  critical: { label: "Crítico", tone: "red" },
  no_data: { label: "Sem dados", tone: "slate" },
  done: { label: "Concluído", tone: "green" },
  paused: { label: "Pausado", tone: "slate" },
  pending: { label: "Pendente", tone: "slate" },
  in_progress: { label: "Em andamento", tone: "blue" },
  completed: { label: "Concluído", tone: "green" },
  delayed: { label: "Atrasado", tone: "amber" },
  blocked: { label: "Bloqueado", tone: "red" },
  awaiting_decision: { label: "Aguardando decisão", tone: "amber" },
  approved: { label: "Aprovado", tone: "green" },
  delegated: { label: "Delegado", tone: "blue" },
  converted_action: { label: "Convertida em ação", tone: "blue" },
  deferred: { label: "Adiada", tone: "slate" },
  declined: { label: "Recusado", tone: "red" },
  scheduled: { label: "Agendado", tone: "blue" },
  confirmed: { label: "Confirmado", tone: "green" },
  open: { label: "Aberto", tone: "slate" },
  active: { label: "Ativo", tone: "green" },
};

export const TONE_CLASSES: Record<Tone, string> = {
  green: "bg-status-success-surface text-status-success-text border-status-success/30",
  amber: "bg-status-warning-surface text-status-warning-text border-status-warning/30",
  red: "bg-status-error-surface text-status-error-text border-status-error/30",
  blue: "bg-status-info-surface text-status-info-text border-status-info/30",
  slate: "bg-muted text-muted-foreground border-border",
};

export const DOT_CLASSES: Record<Tone, string> = {
  green: "bg-status-success",
  amber: "bg-status-warning",
  red: "bg-status-error",
  blue: "bg-status-info",
  slate: "bg-muted-foreground/60",
};

export const getStatusMeta = (status: string | null | undefined): StatusMeta =>
  (status && STATUS_META[status]) || { label: status || "—", tone: "slate" };

export const DEPARTMENT_LABELS: Record<string, string> = {
  commercial: "Comercial",
  marketing: "Marketing",
  product_stock: "Produto e Estoque",
  people_hr: "Pessoas — RH",
  financial: "Financeiro",
  operations: "Operações",
  executive: "Executivo",
};

export const IMPACT_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
};

export const PHASE_LABELS: Record<string, string> = {
  survival: "Sobrevivência",
  organization: "Organização",
  growth: "Crescimento",
  scale: "Escala",
  consolidation: "Consolidação",
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  question: "Tirar uma dúvida",
  analysis: "Solicitar análise",
  decision_discussion: "Discutir uma decisão",
  review_action: "Revisar uma ação",
  schedule_meeting: "Agendar encontro",
  send_info: "Enviar informação",
  urgent: "Situação urgente",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};
