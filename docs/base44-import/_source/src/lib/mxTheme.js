// MX Performance Design Tokens
export const MX_COLORS = {
  green: '#198653',
  blue: '#2563EB',
  navy: '#102A3E',
  background: '#FFFFFF',
  backgroundSecondary: '#F7F8FA',
  textPrimary: '#171717',
  textSecondary: '#737373',
  border: '#E5E5E5',
  critical: '#EF4444',
  warning: '#F59E0B',
  positive: '#198653',
  info: '#2563EB',
  consultive: '#7C3AED',
};

export const LIFECYCLE_STATUS_LABELS = {
  RASCUNHO: 'Rascunho',
  COLETA_DADOS: 'Coleta de Dados',
  EM_CONFIGURACAO: 'Em Configuração',
  EM_VALIDACAO: 'Em Validação',
  PRONTO_PARA_ATIVAR: 'Pronto para Ativar',
  ATIVACAO_PROGRAMADA: 'Ativação Programada',
  ATIVO_EM_IMPLANTACAO: 'Ativo em Implantação',
  ATIVO: 'Ativo',
  SUSPENSO: 'Suspenso',
  ENCERRADO: 'Encerrado',
};

export const LIFECYCLE_STATUS_COLORS = {
  RASCUNHO: 'bg-gray-100 text-gray-700',
  COLETA_DADOS: 'bg-blue-50 text-blue-700',
  EM_CONFIGURACAO: 'bg-purple-50 text-purple-700',
  EM_VALIDACAO: 'bg-yellow-50 text-yellow-700',
  PRONTO_PARA_ATIVAR: 'bg-cyan-50 text-cyan-700',
  ATIVACAO_PROGRAMADA: 'bg-indigo-50 text-indigo-700',
  ATIVO_EM_IMPLANTACAO: 'bg-orange-50 text-orange-700',
  ATIVO: 'bg-green-50 text-green-700',
  SUSPENSO: 'bg-red-50 text-red-700',
  ENCERRADO: 'bg-gray-200 text-gray-600',
};

export const BUSINESS_PHASE_LABELS = {
  NAO_DEFINIDA: 'Não definida',
  SOBREVIVENCIA: 'Sobrevivência',
  ORGANIZACAO: 'Organização',
  CRESCIMENTO: 'Crescimento',
  ESCALA: 'Escala',
  CONSOLIDACAO: 'Consolidação',
};

export const PROGRAM_LABELS = {
  PMR: 'PMR',
  PMR_PLUS: 'PMR Plus',
  PPA: 'PPA',
};

export const ENCOUNTER_STATUS_LABELS = {
  NAO_INICIADO: 'Não iniciado',
  PRONTO_PARA_AGENDAR: 'Pronto para agendar',
  AGENDADO: 'Agendado',
  EM_PREPARACAO: 'Em preparação',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  AGUARDANDO_VALIDACAO: 'Aguardando validação',
  CONCLUIDO: 'Concluído',
  REAGENDADO: 'Reagendado',
  PAUSADO: 'Pausado',
  CANCELADO: 'Cancelado',
  NAO_APLICAVEL: 'Não aplicável',
};

export const SCORE_FAIXAS = [
  { min: 90, max: 100, label: 'Elite', color: '#198653', bg: '#DCFCE7' },
  { min: 80, max: 89.99, label: 'Excelente', color: '#16A34A', bg: '#DCFCE7' },
  { min: 70, max: 79.99, label: 'Bom', color: '#2563EB', bg: '#DBEAFE' },
  { min: 60, max: 69.99, label: 'Atenção', color: '#D97706', bg: '#FEF3C7' },
  { min: 0, max: 59.99, label: 'Crítico', color: '#EF4444', bg: '#FEE2E2' },
];

export function getScoreFaixa(score) {
  return SCORE_FAIXAS.find(f => score >= f.min && score <= f.max) || SCORE_FAIXAS[4];
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}