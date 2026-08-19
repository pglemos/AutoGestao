// Constantes do módulo Consultoria MX

export const METHODOLOGY_TABS = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'produtos', label: 'Metodologia por Produto' },
  { id: 'biblioteca', label: 'Biblioteca de Conteúdos' },
  { id: 'relatorios', label: 'Modelos de Relatório' },
  { id: 'historico', label: 'Histórico e Versões' },
];

export const ENCOUNTER_INNER_TABS = [
  { id: 'objetivo', label: 'Objetivo' },
  { id: 'orientacao', label: 'Orientação do Consultor' },
  { id: 'aula', label: 'Aula e Vídeo' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'evidencias', label: 'Evidências' },
  { id: 'arquivos', label: 'Arquivos' },
  { id: 'relatorio', label: 'Relatório' },
  { id: 'planos', label: 'Planos de Ação' },
];

export const PARTICIPANT_ROLES = [
  'Dono', 'Diretor', 'Gerente Geral', 'Gerente Comercial', 'Vendedor',
  'Marketing', 'Produto e Estoque', 'Pessoas - RH', 'Financeiro', 'Operações', 'Consultor MX',
];

export const RESPONSIBLE_ROLES = [
  'Dono', 'Diretor', 'Gerente', 'Departamento', 'Consultor MX', 'Outro',
];

export const CONTENT_TYPES = {
  VIDEO: { label: 'Vídeo enviado', color: 'bg-red-100 text-red-700' },
  YOUTUBE: { label: 'YouTube', color: 'bg-red-100 text-red-700' },
  VIMEO: { label: 'Vimeo', color: 'bg-blue-100 text-blue-700' },
  EXTERNAL_LINK: { label: 'Link externo', color: 'bg-gray-100 text-gray-700' },
  UNIVERSITY_LESSON: { label: 'Aula da Universidade MX', color: 'bg-purple-100 text-purple-700' },
  FILE: { label: 'Arquivo', color: 'bg-amber-100 text-amber-700' },
};

export const VISIBILITY_LABELS = {
  INTERNAL_ONLY: 'Somente equipe MX',
  OWNER_AND_TEAM: 'Dono e equipe MX',
  ENCOUNTER_PARTICIPANTS: 'Participantes do encontro',
  AUTHORIZED_USERS: 'Usuários autorizados',
};

export const DELIVERY_MOMENTS = {
  ANTES: 'Antes do encontro',
  DURANTE: 'Durante o encontro',
  DEPOIS: 'Após o encontro',
};

export const EVIDENCE_TYPES = {
  ARQUIVO: 'Arquivo', IMAGEM: 'Imagem', LINK: 'Link', PLANILHA: 'Planilha',
  RELATORIO: 'Relatório', COMENTARIO: 'Comentário estruturado', CHECKLIST: 'Checklist',
  INDICADOR: 'Indicador oficial', CONFIRMACAO: 'Confirmação', REUNIAO: 'Reunião', OUTRO: 'Outro',
};

export const FILE_CATEGORIES = [
  'Material de apoio', 'Planilha', 'Modelo', 'Apresentação', 'Documento',
  'Checklist', 'Imagem', 'Vídeo', 'Relatório de referência', 'Outro',
];

export const REPORT_SECTIONS = [
  'Resumo Executivo', 'Contexto', 'Diagnóstico', 'Indicadores analisados',
  'Decisões', 'Recomendações', 'Plano de Ação', 'Responsáveis',
  'Próximos Passos', 'Observações', 'Anexos',
];

export const METHODOLOGY_STATUS = {
  RASCUNHO: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  EM_REVISAO: { label: 'Em revisão', color: 'bg-yellow-100 text-yellow-700' },
  PUBLICADO: { label: 'Publicado', color: 'bg-green-100 text-green-700' },
  SUBSTITUIDO: { label: 'Substituído', color: 'bg-blue-100 text-blue-700' },
  ARQUIVADO: { label: 'Arquivado', color: 'bg-red-100 text-red-700' },
};

export const ENCOUNTER_COMPLETENESS = {
  NAO_INICIADO: { label: 'Não iniciado', color: 'bg-gray-100 text-gray-600', icon: '○' },
  EM_CONFIGURACAO: { label: 'Em configuração', color: 'bg-blue-100 text-blue-700', icon: '◐' },
  COM_PENDENCIA: { label: 'Com pendência', color: 'bg-yellow-100 text-yellow-700', icon: '⚠' },
  PRONTO_REVISAO: { label: 'Pronto para revisão', color: 'bg-purple-100 text-purple-700', icon: '☆' },
  PUBLICADO: { label: 'Publicado', color: 'bg-green-100 text-green-700', icon: '✓' },
};

// Calcula completude do encontro com base nos conteúdos
export function calculateCompleteness(content, guide, deliverables, evidence, reportRef, contentRefs) {
  const checks = {
    objective: !!(content?.objective && content.objective.trim()),
    expectedResult: !!(content?.expected_result && content.expected_result.trim()),
    guide: !!(guide?.internal_objective && guide.internal_objective.trim()),
    deliverable: deliverables.length > 0,
    evidence: evidence.length > 0,
    report: !!reportRef?.report_template_id,
    visibility: content?.owner_visibility !== undefined,
    contentReviewed: contentRefs.length > 0,
  };
  const done = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const pending = total - done;
  if (done === 0) return { status: 'NAO_INICIADO', percent: 0, pending };
  if (pending > 0) return { status: 'EM_CONFIGURACAO', percent: Math.round((done / total) * 100), pending };
  return { status: 'PRONTO_REVISAO', percent: 100, pending: 0 };
}