import {
  activationBlockers,
  isActive,
  isRenewalNear,
  type PortfolioClient,
} from './clientPortfolio'

export type GovernanceFilter = 'todos' | 'sem_consultor' | 'bloqueios' | 'renovacoes' | 'suspensos'

export const GOVERNANCE_FILTER_LABEL: Record<GovernanceFilter, string> = {
  todos: 'Todas as pendências',
  sem_consultor: 'Sem consultor MX',
  bloqueios: 'Bloqueios de ativação',
  renovacoes: 'Renovações próximas',
  suspensos: 'Clientes suspensos',
}

export type GovernancePriority = 'critica' | 'alta' | 'atencao'

export const GOVERNANCE_PRIORITY_LABEL: Record<GovernancePriority, string> = {
  critica: 'Crítica',
  alta: 'Alta',
  atencao: 'Atenção',
}

export const GOVERNANCE_PRIORITY_RANK: Record<GovernancePriority, number> = {
  critica: 3,
  alta: 2,
  atencao: 1,
}

export type GovernanceCategoryRows = {
  semConsultor: PortfolioClient[]
  bloqueios: PortfolioClient[]
  renovacoes: PortfolioClient[]
  suspensos: PortfolioClient[]
  todos: PortfolioClient[]
}

export type GovernanceSummary = GovernanceCategoryRows & {
  uniqueClients: number
  occurrenceCount: number
  incompleteRegistration: number
}

export type GovernanceIssue = {
  key: 'sem_consultor' | 'bloqueio' | 'renovacao' | 'suspensao'
  label: string
  detail: string
}

const BLOCKER_LABELS: Record<string, string> = {
  'sem loja principal': 'Loja principal não vinculada',
  'sem produto contratado': 'Produto contratado não definido',
  'sem consultor': 'Consultor MX não atribuído',
  'sem módulos liberados': 'Módulos ainda não liberados',
}

function normalizeText(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR')
}

/** Converte motivos legados em uma frase legível sem alterar o valor salvo. */
export function formatGovernanceReason(value: string | null | undefined): string {
  const normalized = normalizeText(value ?? '')
    .replace(/\binadimplencia\b/g, 'inadimplência')
    .replace(/\binatividade\b/g, 'inatividade')
    .replace(/\breativacao\b/g, 'reativação')
  if (!normalized) return 'Motivo não registrado'
  return normalized.charAt(0).toLocaleUpperCase('pt-BR') + normalized.slice(1)
}

export function formatActivationBlocker(value: string): string {
  return BLOCKER_LABELS[normalizeText(value)] ?? formatGovernanceReason(value)
}

export function isCadastrallyIncomplete(client: Pick<PortfolioClient, 'primary_store_city' | 'cnpj'>): boolean {
  return !client.primary_store_city?.trim() || !client.cnpj?.trim()
}

export function governanceCategoryRows(rows: PortfolioClient[], today = new Date()): GovernanceCategoryRows {
  const semConsultor = rows.filter(client => isActive(client) && !client.implementation_owner_id)
  const bloqueios = rows.filter(client => !isActive(client) && activationBlockers(client).length > 0)
  const renovacoes = rows.filter(client => isRenewalNear(client, today))
  const suspensos = rows.filter(client => Boolean(client.suspended_at))
  const pendingIds = new Set([
    ...semConsultor.map(client => client.id),
    ...bloqueios.map(client => client.id),
    ...renovacoes.map(client => client.id),
    ...suspensos.map(client => client.id),
  ])

  return {
    semConsultor,
    bloqueios,
    renovacoes,
    suspensos,
    todos: rows.filter(client => pendingIds.has(client.id)),
  }
}

export function governanceRowsForFilter(categories: GovernanceCategoryRows, filter: GovernanceFilter): PortfolioClient[] {
  switch (filter) {
    case 'sem_consultor': return categories.semConsultor
    case 'bloqueios': return categories.bloqueios
    case 'renovacoes': return categories.renovacoes
    case 'suspensos': return categories.suspensos
    case 'todos': return categories.todos
  }
}

export function governanceSummary(rows: PortfolioClient[], today = new Date()): GovernanceSummary {
  const categories = governanceCategoryRows(rows, today)
  return {
    ...categories,
    uniqueClients: categories.todos.length,
    occurrenceCount: categories.semConsultor.length + categories.bloqueios.length + categories.renovacoes.length + categories.suspensos.length,
    incompleteRegistration: rows.filter(isCadastrallyIncomplete).length,
  }
}

export function governanceIssues(client: PortfolioClient, today = new Date()): GovernanceIssue[] {
  const issues: GovernanceIssue[] = []
  const blockers = activationBlockers(client)

  if (client.suspended_at) {
    issues.push({
      key: 'suspensao',
      label: 'Suspensão ativa',
      detail: formatGovernanceReason(client.suspended_reason),
    })
  }
  if (blockers.length > 0 && !isActive(client)) {
    issues.push({
      key: 'bloqueio',
      label: 'Pré-requisitos de ativação',
      detail: blockers.map(formatActivationBlocker).join(' · '),
    })
  }
  if (isActive(client) && !client.implementation_owner_id) {
    issues.push({
      key: 'sem_consultor',
      label: 'Sem consultor MX',
      detail: 'Nenhum responsável está atribuído à jornada deste cliente.',
    })
  }
  if (isRenewalNear(client, today)) {
    issues.push({
      key: 'renovacao',
      label: 'Renovação próxima',
      detail: 'O contrato está dentro da janela de 60 dias para renovação.',
    })
  }
  return issues
}

export function governancePriority(client: PortfolioClient, today = new Date()): GovernancePriority {
  if (client.suspended_at) return 'critica'
  if (!isActive(client) && activationBlockers(client).length > 0) return 'critica'
  if (isActive(client) && !client.implementation_owner_id) return 'alta'
  if (isRenewalNear(client, today)) {
    const end = parseDateOnly(client.contract_end_date)
    const reference = parseDateOnly(today.toISOString())
    if (end && reference && differenceInDays(end, reference) <= 30) return 'alta'
  }
  return 'atencao'
}

export function governanceImpact(client: PortfolioClient, _today = new Date()): string {
  if (client.suspended_at) return 'Operação interrompida até revisão da suspensão.'
  if (!isActive(client) && activationBlockers(client).length > 0) return 'A ativação não pode avançar enquanto houver pré-requisitos ausentes.'
  if (isActive(client) && !client.implementation_owner_id) return 'A jornada está ativa, mas sem acompanhamento MX definido.'
  if (isRenewalNear(client, _today)) return 'A continuidade contratual precisa ser tratada antes do vencimento.'
  return 'Acompanhar a execução da jornada consultiva.'
}

export function governanceNextAction(client: PortfolioClient, _today = new Date()): string {
  if (client.suspended_at) return 'Revisar o motivo e decidir a reativação'
  if (!isActive(client) && activationBlockers(client).length > 0) return 'Completar os pré-requisitos de ativação'
  if (isActive(client) && !client.implementation_owner_id) return 'Atribuir consultor MX'
  if (isRenewalNear(client, _today)) return 'Abrir a Visão 360 e tratar a renovação'
  return 'Abrir a Visão 360 para acompanhar'
}

export function governanceReferenceLabel(client: PortfolioClient, today = new Date()): string {
  if (client.suspended_at) return `Suspenso ${relativePastLabel(client.suspended_at, today)}`
  if (client.contract_end_date && isRenewalNear(client, today)) {
    const end = parseDateOnly(client.contract_end_date)
    const reference = parseDateOnly(today.toISOString())
    if (end && reference) {
      const days = differenceInDays(end, reference)
      if (days === 0) return 'Vencimento hoje'
      if (days === 1) return 'Vencimento amanhã'
      return `Vencimento em ${days} dias`
    }
  }
  if (client.updated_at) return `Cadastro atualizado em ${formatDate(client.updated_at)}`
  return 'Sem data de referência'
}

export function governanceSearchText(client: PortfolioClient): string {
  return [
    client.name,
    client.slug,
    client.primary_store_city,
    client.implementation_owner_name,
    client.implementation_owner_email,
    client.suspended_reason,
    ...activationBlockers(client),
  ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
}

export function sortGovernanceRows(rows: PortfolioClient[], today = new Date()): PortfolioClient[] {
  return [...rows].sort((left, right) => {
    const priorityDifference = GOVERNANCE_PRIORITY_RANK[governancePriority(right, today)] - GOVERNANCE_PRIORITY_RANK[governancePriority(left, today)]
    if (priorityDifference !== 0) return priorityDifference

    const leftDue = renewalDays(left, today)
    const rightDue = renewalDays(right, today)
    if (leftDue !== rightDue) return (leftDue ?? Number.POSITIVE_INFINITY) - (rightDue ?? Number.POSITIVE_INFINITY)

    const leftUpdated = timestamp(left.updated_at ?? left.suspended_at)
    const rightUpdated = timestamp(right.updated_at ?? right.suspended_at)
    if (leftUpdated !== rightUpdated) return leftUpdated - rightUpdated
    return left.name.localeCompare(right.name, 'pt-BR')
  })
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return Number.isNaN(date.getTime()) ? null : date
}

function differenceInDays(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / 86_400_000)
}

function renewalDays(client: PortfolioClient, today: Date): number | null {
  if (!client.contract_end_date || !isRenewalNear(client, today)) return null
  const end = parseDateOnly(client.contract_end_date)
  const reference = parseDateOnly(today.toISOString())
  return end && reference ? differenceInDays(end, reference) : null
}

function relativePastLabel(value: string, today: Date): string {
  const date = parseDateOnly(value)
  const reference = parseDateOnly(today.toISOString())
  if (!date || !reference) return 'sem data'
  const days = Math.max(0, differenceInDays(reference, date))
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

function formatDate(value: string): string {
  const date = parseDateOnly(value)
  return date
    ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date)
    : 'data indisponível'
}

function timestamp(value: string | null | undefined): number {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}
