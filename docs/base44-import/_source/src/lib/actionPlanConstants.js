// Constantes do módulo Planos de Ação — MX Performance

export const ACTION_PLAN_DEPARTMENTS = {
  COMERCIAL: { label: 'Comercial', icon: 'TrendingUp', color: 'bg-blue-50 text-blue-700 border-blue-200', cardColor: 'bg-blue-50' },
  MARKETING: { label: 'Marketing', icon: 'Megaphone', color: 'bg-pink-50 text-pink-700 border-pink-200', cardColor: 'bg-pink-50' },
  PRODUTO_ESTOQUE: { label: 'Produto e Estoque', icon: 'Package', color: 'bg-orange-50 text-orange-700 border-orange-200', cardColor: 'bg-orange-50' },
  PESSOAS_RH: { label: 'Pessoas - RH', icon: 'Users', color: 'bg-teal-50 text-teal-700 border-teal-200', cardColor: 'bg-teal-50' },
  FINANCEIRO: { label: 'Financeiro', icon: 'DollarSign', color: 'bg-green-50 text-green-700 border-green-200', cardColor: 'bg-green-50' },
  OPERACOES: { label: 'Operações', icon: 'Settings', color: 'bg-purple-50 text-purple-700 border-purple-200', cardColor: 'bg-purple-50' },
};

export const ACTION_PLAN_DEPARTMENT_LIST = Object.entries(ACTION_PLAN_DEPARTMENTS).map(([code, info]) => ({ code, ...info }));

export const RESPONSIBLE_ROLES = [
  { code: 'DONO', label: 'Dono' },
  { code: 'DIRETOR', label: 'Diretor' },
  { code: 'GERENTE_GERAL', label: 'Gerente Geral' },
  { code: 'GERENTE_COMERCIAL', label: 'Gerente Comercial' },
  { code: 'MARKETING', label: 'Marketing' },
  { code: 'PRODUTO_ESTOQUE', label: 'Produto e Estoque' },
  { code: 'PESSOAS_RH', label: 'Pessoas - RH' },
  { code: 'FINANCEIRO', label: 'Financeiro' },
  { code: 'OPERACOES', label: 'Operações' },
  { code: 'VENDEDOR', label: 'Vendedor' },
  { code: 'CONSULTOR_MX', label: 'Consultor MX' },
];

export const PRIORITIES = {
  CRITICA: { label: 'Crítica', color: 'bg-red-100 text-red-700' },
  ATENCAO: { label: 'Atenção', color: 'bg-yellow-100 text-yellow-700' },
  EVOLUCAO: { label: 'Evolução', color: 'bg-blue-100 text-blue-700' },
};

export const TEMPLATE_STATUS = {
  RASCUNHO: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  EM_REVISAO: { label: 'Em Revisão', color: 'bg-yellow-100 text-yellow-700' },
  PUBLICADO: { label: 'Publicado', color: 'bg-green-100 text-green-700' },
  DESABILITADO: { label: 'Desabilitado', color: 'bg-orange-100 text-orange-700' },
  ARQUIVADO: { label: 'Arquivado', color: 'bg-gray-100 text-gray-500' },
};

export const SUGGESTION_STATUS = {
  PENDENTE_VALIDACAO: { label: 'Pendente de validação', color: 'bg-yellow-100 text-yellow-700' },
  VALIDADA: { label: 'Validada pelo consultor', color: 'bg-blue-100 text-blue-700' },
  EXIBIDA_DONO: { label: 'Exibida ao Dono', color: 'bg-indigo-100 text-indigo-700' },
  CONVERTIDA: { label: 'Convertida em Plano', color: 'bg-green-100 text-green-700' },
  DESCARTADA: { label: 'Descartada', color: 'bg-gray-100 text-gray-500' },
  EXPIRADA: { label: 'Expirada', color: 'bg-red-100 text-red-700' },
};

export const ACTION_STATUS = {
  NAO_INICIADA: { label: 'Não iniciada', color: 'bg-gray-100 text-gray-600' },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700' },
  ATRASADA: { label: 'Atrasada', color: 'bg-red-100 text-red-700' },
  CONCLUIDA: { label: 'Concluída', color: 'bg-green-100 text-green-700' },
  VALIDANDO_EFICACIA: { label: 'Validando eficácia', color: 'bg-purple-100 text-purple-700' },
  PAUSADA: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700' },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500' },
};

export const EFFICACY = {
  NAO_AVALIADA: { label: 'Ainda não avaliada', color: 'bg-gray-100 text-gray-600' },
  EFICAZ: { label: 'Eficaz', color: 'bg-green-100 text-green-700' },
  PARCIALMENTE_EFICAZ: { label: 'Parcialmente eficaz', color: 'bg-yellow-100 text-yellow-700' },
  INEFICAZ: { label: 'Ineficaz', color: 'bg-red-100 text-red-700' },
};

export const EVIDENCE_TYPES = [
  { code: 'ARQUIVO', label: 'Arquivo' },
  { code: 'IMAGEM', label: 'Imagem' },
  { code: 'LINK', label: 'Link' },
  { code: 'COMENTARIO_ESTRUTURADO', label: 'Comentário estruturado' },
  { code: 'CHECKLIST', label: 'Checklist' },
  { code: 'REUNIAO', label: 'Reunião' },
  { code: 'RELATORIO', label: 'Relatório' },
  { code: 'INDICADOR_OFICIAL', label: 'Indicador oficial' },
  { code: 'CONFIRMACAO_RESPONSAVEL', label: 'Confirmação do responsável' },
  { code: 'VALIDACAO_CONSULTOR', label: 'Validação do consultor' },
];

export const SUGGESTION_TRIGGERS = {
  MANUAL: 'Sugestão manual do Consultor',
  INDICATOR_BELOW_TARGET: 'Indicador abaixo da meta',
  INDICATOR_ABOVE_LIMIT: 'Indicador acima do limite',
  NEGATIVE_TREND: 'Tendência negativa',
  ACTIVE_ALERT: 'Alerta ativo',
  CRITICAL_SCORE: 'Score crítico ou em atenção',
};

export const DIRECTION_OPTIONS = [
  { code: 'AUMENTAR', label: 'Aumentar' },
  { code: 'DIMINUIR', label: 'Reduzir' },
  { code: 'MANTER', label: 'Manter' },
  { code: 'FAIXA', label: 'Atingir faixa ideal' },
  { code: 'CORRIGIR_PROCESSO', label: 'Corrigir processo' },
];

export const DIRECTION_LABELS = {
  AUMENTAR: 'Aumentar',
  DIMINUIR: 'Reduzir',
  MANTER: 'Manter',
  FAIXA: 'Atingir faixa ideal',
  CORRIGIR_PROCESSO: 'Corrigir processo',
};

export const SUPPORT_MATERIAL_TYPES = [
  { code: 'NONE', label: 'Nenhum material' },
  { code: 'FILE', label: 'Adicionar arquivo' },
  { code: 'UNIVERSITY_LESSON', label: 'Vincular aula da Universidade MX' },
];

export const ACTION_PLAN_ORIGINS = {
  MANUAL: 'Manual',
  TEMPLATE_MX: 'Plano Padrão MX',
  SUGESTAO_DONO: 'Sugestão ao Dono',
  PLANEJAMENTO_ESTRATEGICO: 'Planejamento Estratégico',
  ALERTA: 'Alerta',
  SCORE: 'Score',
  CONSULTOR: 'Consultor',
  ENCONTRO_CONSULTORIA: 'Encontro de Consultoria',
};

export const WIZARD_STEPS = [
  { id: 1, label: 'Indicador', short: 'Indicador' },
  { id: 2, label: 'Ações', short: 'Ações' },
  { id: 3, label: 'Prazo e Meta', short: 'Prazo' },
  { id: 4, label: 'Revisão e Publicação', short: 'Publicar' },
];

export const APPLY_STEPS = [
  { id: 1, label: 'Selecionar Cliente', short: 'Cliente' },
  { id: 2, label: 'Ano do Plano Estratégico', short: 'Ano' },
  { id: 3, label: 'Departamento', short: 'Depto' },
  { id: 4, label: 'Indicador', short: 'Indicador' },
  { id: 5, label: 'Plano Padrão', short: 'Plano' },
  { id: 6, label: 'Escopo e Responsável', short: 'Escopo' },
  { id: 7, label: 'Revisar e Criar', short: 'Revisar' },
];
