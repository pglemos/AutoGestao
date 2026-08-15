// Regras puras da rota Consultoria MX (admin) — sem import de supabase.
// Espelha src/lib/consultingMxConstants.js do Base44, adaptado ao MX.

export const METHODOLOGY_TABS = [
  { id: 'visao', label: 'Visão Geral' },
  { id: 'produtos', label: 'Metodologia por Produto' },
  { id: 'biblioteca', label: 'Biblioteca de Conteúdos' },
  { id: 'relatorios', label: 'Modelos de Relatório' },
  { id: 'historico', label: 'Histórico e Versões' },
] as const

export const ENCOUNTER_INNER_TABS = [
  { id: 'objetivo', label: 'Objetivo' },
  { id: 'orientacao', label: 'Orientação do Consultor' },
  { id: 'aula', label: 'Aula e Vídeo' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'evidencias', label: 'Evidências' },
  { id: 'arquivos', label: 'Arquivos' },
  { id: 'relatorio', label: 'Relatório' },
  { id: 'planos', label: 'Planos de Ação' },
] as const

export type MethodologyTabId = (typeof METHODOLOGY_TABS)[number]['id']
export type EncounterInnerTabId = (typeof ENCOUNTER_INNER_TABS)[number]['id']

export const PARTICIPANT_ROLES = [
  'Dono', 'Diretor', 'Gerente Geral', 'Gerente Comercial', 'Vendedor',
  'Marketing', 'Produto e Estoque', 'Pessoas - RH', 'Financeiro', 'Operações', 'Consultor MX',
] as const

export const RESPONSIBLE_ROLES = [
  'Dono', 'Diretor', 'Gerente', 'Departamento', 'Consultor MX', 'Outro',
] as const

export const CONTENT_TYPES: Record<string, { label: string; tone: 'danger' | 'info' | 'violet' | 'warning' | 'neutral' }> = {
  VIDEO: { label: 'Vídeo enviado', tone: 'danger' },
  YOUTUBE: { label: 'YouTube', tone: 'danger' },
  VIMEO: { label: 'Vimeo', tone: 'info' },
  EXTERNAL_LINK: { label: 'Link externo', tone: 'neutral' },
  UNIVERSITY_LESSON: { label: 'Aula da Universidade MX', tone: 'violet' },
  FILE: { label: 'Arquivo', tone: 'warning' },
}

export const VISIBILITY_LABELS: Record<string, string> = {
  INTERNAL_ONLY: 'Somente equipe MX',
  OWNER_AND_TEAM: 'Dono e equipe MX',
  ENCOUNTER_PARTICIPANTS: 'Participantes do encontro',
  AUTHORIZED_USERS: 'Usuários autorizados',
}

export const DELIVERY_MOMENTS: Record<string, string> = {
  ANTES: 'Antes do encontro',
  DURANTE: 'Durante o encontro',
  DEPOIS: 'Após o encontro',
}

export const EVIDENCE_TYPES: Record<string, string> = {
  ARQUIVO: 'Arquivo', IMAGEM: 'Imagem', LINK: 'Link', PLANILHA: 'Planilha',
  RELATORIO: 'Relatório', COMENTARIO: 'Comentário estruturado', CHECKLIST: 'Checklist',
  INDICADOR: 'Indicador oficial', CONFIRMACAO: 'Confirmação', REUNIAO: 'Reunião', OUTRO: 'Outro',
}

export const FILE_CATEGORIES = [
  'Material de apoio', 'Planilha', 'Modelo', 'Apresentação', 'Documento',
  'Checklist', 'Imagem', 'Vídeo', 'Relatório de referência', 'Outro',
] as const

export const REPORT_SECTIONS = [
  'Resumo Executivo', 'Contexto', 'Diagnóstico', 'Indicadores analisados',
  'Decisões', 'Recomendações', 'Plano de Ação', 'Responsáveis',
  'Próximos Passos', 'Observações', 'Anexos',
] as const

export type MethodologyVersionStatus = 'rascunho' | 'em_revisao' | 'publicado' | 'substituido' | 'arquivado'

export const METHODOLOGY_STATUS: Record<MethodologyVersionStatus, { label: string; tone: 'neutral' | 'warning' | 'success' | 'info' | 'danger' }> = {
  rascunho: { label: 'Rascunho', tone: 'neutral' },
  em_revisao: { label: 'Em revisão', tone: 'warning' },
  publicado: { label: 'Publicado', tone: 'success' },
  substituido: { label: 'Substituído', tone: 'info' },
  arquivado: { label: 'Arquivado', tone: 'danger' },
}

export type EncounterCompletenessStatus = 'nao_iniciado' | 'em_configuracao' | 'com_pendencia' | 'pronto_revisao' | 'publicado'

export const ENCOUNTER_COMPLETENESS: Record<EncounterCompletenessStatus, { label: string; tone: 'neutral' | 'info' | 'warning' | 'violet' | 'success'; icon: string }> = {
  nao_iniciado: { label: 'Não iniciado', tone: 'neutral', icon: '○' },
  em_configuracao: { label: 'Em configuração', tone: 'info', icon: '◐' },
  com_pendencia: { label: 'Com pendência', tone: 'warning', icon: '⚠' },
  pronto_revisao: { label: 'Pronto para revisão', tone: 'violet', icon: '☆' },
  publicado: { label: 'Publicado', tone: 'success', icon: '✓' },
}

export type CompletenessInput = {
  objective?: string | null
  expected_result?: string | null
  guideObjective?: string | null
  deliverables: number
  evidence: number
  reportTemplateId?: string | null
  ownerVisibilitySet: boolean
  contentRefs: number
}

export type CompletenessResult = {
  status: EncounterCompletenessStatus
  percent: number
  pending: number
  checks: Record<string, boolean>
}

/**
 * Calcula a completude de um encontro com base nos conteúdos configurados —
 * mesma lógica do Base44 (calculateCompleteness).
 */
export function calculateCompleteness(input: CompletenessInput): CompletenessResult {
  const checks = {
    objective: Boolean(input.objective && input.objective.trim()),
    expectedResult: Boolean(input.expected_result && input.expected_result.trim()),
    guide: Boolean(input.guideObjective && input.guideObjective.trim()),
    deliverable: input.deliverables > 0,
    evidence: input.evidence > 0,
    report: Boolean(input.reportTemplateId),
    visibility: input.ownerVisibilitySet,
    contentReviewed: input.contentRefs > 0,
  }
  const done = Object.values(checks).filter(Boolean).length
  const total = Object.keys(checks).length
  const pending = total - done
  if (done === 0) return { status: 'nao_iniciado', percent: 0, pending, checks }
  if (pending > 0) return { status: 'em_configuracao', percent: Math.round((done / total) * 100), pending, checks }
  return { status: 'pronto_revisao', percent: 100, pending: 0, checks }
}

/** Nome de exibição de um encontro pelo número: 0 = Onboarding. */
export function encounterDisplayName(visitNumber: number | null): string {
  if (visitNumber === null || visitNumber === undefined) return 'Encontro'
  if (visitNumber === 0) return 'Onboarding'
  return `Encontro ${visitNumber}`
}

/** Próximo número de versão metodológica: "1.0" → "1.1". */
export function nextMethodologyVersion(current: string | null): string {
  const base = parseFloat(current ?? '0')
  if (Number.isNaN(base) || base <= 0) return '1.0'
  const next = Math.round((base + 0.1) * 10) / 10
  return next.toFixed(1)
}

/**
 * Situação de um produto pela lista de versões metodológicas — igual ao
 * Base44 (productStatus em MethodologyByProductTab).
 */
export type ProductMethodologyState = {
  configured: boolean
  label: string
  tone: 'neutral' | 'warning' | 'success' | 'danger'
}

export function productMethodologyStatus(versions: Array<{ status: string; encounters_pending: number }>): ProductMethodologyState {
  if (versions.length === 0) return { configured: false, label: 'Não configurado', tone: 'neutral' }
  const hasPublished = versions.some(v => v.status === 'publicado')
  const hasDraft = versions.some(v => v.status === 'rascunho')
  const hasPending = versions.some(v => v.encounters_pending > 0)
  if (hasPublished && !hasDraft && !hasPending) return { configured: true, label: 'Publicado', tone: 'success' }
  if (hasPublished && hasDraft) return { configured: true, label: 'Com pendência', tone: 'warning' }
  if (hasDraft) return { configured: true, label: 'Em configuração', tone: 'warning' }
  if (versions.some(v => v.status === 'em_revisao')) return { configured: true, label: 'Em revisão', tone: 'warning' }
  return { configured: true, label: 'Arquivado', tone: 'danger' }
}

/** Validação do formulário de conteúdo (vídeo/arquivo) — título é obrigatório. */
export function validateContentTitle(title: string): string | null {
  return title.trim() ? null : 'Informe o título do conteúdo.'
}

/** Validação de entrega — título e descrição obrigatórios. */
export function validateDeliverable(title: string, description: string): string | null {
  if (!title.trim()) return 'Informe o título da entrega.'
  if (!description.trim()) return 'Informe a descrição da entrega.'
  return null
}

/** Validação de evidência — nome e descrição obrigatórios. */
export function validateEvidence(name: string, description: string): string | null {
  if (!name.trim()) return 'Informe o nome da evidência.'
  if (!description.trim()) return 'Informe a descrição da evidência.'
  return null
}

/** Validação de modelo de relatório — nome obrigatório. */
export function validateReportTemplateName(name: string): string | null {
  return name.trim() ? null : 'Informe o nome do modelo de relatório.'
}

/** Extrai papéis de uma string separada por vírgula. */
export function splitRoles(value: string | null | undefined): string[] {
  return (value ?? '').split(',').map(part => part.trim()).filter(Boolean)
}

/** Converte uma lista de papéis em string separada por vírgula. */
export function joinRoles(roles: string[]): string {
  return roles.join(', ')
}

/** Toggle de papel numa lista, como no Base44 (ObjectiveTab.toggleRole). */
export function toggleRole(current: string | null | undefined, role: string): string {
  const roles = splitRoles(current)
  const next = roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role]
  return joinRoles(next)
}

/** Lê o checklist de preparação do guia (jsonb) com fallback seguro. */
export function parsePreparationChecklist(raw: unknown): Array<{ name: string; description: string; required: boolean; order: number; responsible: string }> {
  if (typeof raw !== 'string' && !Array.isArray(raw)) return []
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.map((item, index) => ({
    name: String(item?.name ?? ''),
    description: String(item?.description ?? ''),
    required: Boolean(item?.required ?? true),
    order: Number(item?.order ?? index + 1),
    responsible: String(item?.responsible ?? ''),
  }))
}
