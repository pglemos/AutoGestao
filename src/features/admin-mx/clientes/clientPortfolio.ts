export type PortfolioClient = {
  id: string
  name: string
  slug: string | null
  cnpj: string | null
  status: string | null
  business_phase: string | null
  product_name: string | null
  program_template_key: string | null
  structure_type: string | null
  primary_store_id: string | null
  implementation_owner_id: string | null
  implementation_owner_name: string | null
  contract_end_date: string | null
  onboarding_step: number | null
  onboarding_completed: boolean | null
  suspended_at: string | null
  suspended_reason: string | null
  activated_at: string | null
  scheduled_activation_at: string | null
  primary_store_city: string | null
  main_contact_name: string | null
  units: number
  users: number
  visitsDone: number
  visitsTotal: number
  modulesEnabled: number
  assignments: number
}

export type PortfolioBucket =
  | 'ativos'
  | 'em_implantacao'
  | 'prontos_para_ativar'
  | 'com_bloqueios'
  | 'renovacoes_proximas'
  | 'cadastros_pendentes'

/** Situações exibidas na carteira principal. Cada cliente entra em no máximo uma. */
export type PortfolioStatus = 'ativos' | 'em_implantacao' | 'prontos_para_ativar' | 'em_configuracao'
export type PortfolioStatusFilter =
  | PortfolioStatus
  | 'todos'
  | 'rascunho'
  | 'coleta_de_dados'
  | 'em_validacao'
  | 'pronto_para_ativar'
  | 'ativacao_programada'
  | 'ativo_em_implantacao'
  | 'ativo'
  | 'suspenso'
  | 'encerrado'
export type PortfolioStatusSource = Pick<
  PortfolioClient,
  'status' | 'primary_store_id' | 'product_name' | 'assignments' | 'modulesEnabled' | 'visitsDone' | 'visitsTotal'
>

export const PORTFOLIO_STATUS_LABEL: Record<PortfolioStatus, string> = {
  ativos: 'Ativos',
  em_implantacao: 'Em Implantação',
  prontos_para_ativar: 'Prontos p/ Ativar',
  em_configuracao: 'Em Configuração',
}

export const PORTFOLIO_STATUS_DETAIL: Record<PortfolioStatus, string> = {
  ativos: 'Clientes ativos',
  em_implantacao: 'Jornada em andamento',
  prontos_para_ativar: 'Sem pendência impeditiva',
  em_configuracao: 'Cadastro ou configuração pendente',
}

export const PORTFOLIO_BUCKET_LABEL: Record<PortfolioBucket, string> = {
  ativos: 'Ativos',
  em_implantacao: 'Em implantação',
  prontos_para_ativar: 'Prontos para ativar',
  com_bloqueios: 'Com bloqueios',
  renovacoes_proximas: 'Renovações próximas',
  cadastros_pendentes: 'Cadastros pendentes',
}

const ATIVO = ['ativo', 'ativa', 'active']

function normalizeStatus(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
}

export function isActive(client: Pick<PortfolioClient, 'status'>) {
  return ATIVO.includes(normalizeStatus(client.status))
}

/**
 * Situação canônica da carteira principal. Suspensos/encerrados ficam fora dos
 * quatro KPIs, mas continuam disponíveis no filtro e com seu status explícito
 * na tabela. Isso evita contar o mesmo cliente duas vezes e não mascara uma
 * suspensão como configuração.
 */
export function canonicalPortfolioStatus(client: PortfolioStatusSource): PortfolioStatus | null {
  const status = normalizeStatus(client.status)
  if (['suspenso', 'suspended', 'encerrado', 'closed', 'arquivado'].includes(status)) return null
  if (
    ['ativo_em_implantacao', 'em_implantacao', 'ativacao_programada'].includes(status) ||
    (isActive(client) && client.visitsTotal > 0 && client.visitsDone < client.visitsTotal)
  ) return 'em_implantacao'
  if (isActive(client)) return 'ativos'
  if (activationBlockers(client).length === 0 && ['pronto_para_ativar', 'pronto', 'ready_to_activate', 'em_validacao'].includes(status)) return 'prontos_para_ativar'
  if (activationBlockers(client).length === 0 && ['inativo', 'inactive', 'coleta_dados', 'rascunho'].includes(status)) return 'prontos_para_ativar'
  return 'em_configuracao'
}

export function portfolioStatusLabel(client: PortfolioClient): string {
  const raw = normalizeStatus(client.status)
  if (raw === 'suspenso' || raw === 'suspended') return 'Suspenso'
  if (raw === 'encerrado' || raw === 'closed') return 'Encerrado'
  if (raw === 'arquivado') return 'Arquivado'
  if (raw === 'ativo_em_implantacao' || raw === 'em_implantacao') return 'Ativo em Implantação'
  if (raw === 'ativacao_programada') return 'Ativação Programada'
  const canonical = canonicalPortfolioStatus(client)
  return canonical ? PORTFOLIO_STATUS_LABEL[canonical] : 'Indefinido'
}

/**
 * Filtro de estado da tabela. Os quatro cards usam estados canônicos da
 * carteira; a tabela também precisa expor os estados de lifecycle do Base44,
 * mesmo quando dois deles caem no mesmo card operacional.
 */
export function matchesPortfolioStatusFilter(client: PortfolioClient, filter: PortfolioStatusFilter): boolean {
  if (filter === 'todos') return true
  if (filter === 'ativos' || filter === 'em_implantacao' || filter === 'prontos_para_ativar' || filter === 'em_configuracao') {
    return canonicalPortfolioStatus(client) === filter
  }

  const raw = normalizeStatus(client.status)
  switch (filter) {
    case 'rascunho': return raw === 'rascunho'
    case 'coleta_de_dados': return ['coleta_de_dados', 'coleta_dados'].includes(raw)
    case 'em_validacao': return raw === 'em_validacao'
    case 'pronto_para_ativar': return ['pronto_para_ativar', 'pronto', 'ready_to_activate'].includes(raw)
    case 'ativacao_programada': return raw === 'ativacao_programada' || Boolean(client.scheduled_activation_at)
    case 'ativo_em_implantacao': return ['ativo_em_implantacao', 'em_implantacao'].includes(raw)
    case 'ativo': return isActive(client) && !['ativo_em_implantacao', 'em_implantacao'].includes(raw)
    case 'suspenso': return ['suspenso', 'suspended'].includes(raw)
    case 'encerrado': return ['encerrado', 'closed'].includes(raw)
    default: return false
  }
}

/** Falta o mínimo que o banco exige para ativar (loja, produto, consultor). */
export function activationBlockers(client: Pick<PortfolioClient, 'primary_store_id' | 'product_name' | 'assignments' | 'modulesEnabled'>): string[] {
  const blockers: string[] = []
  if (!client.primary_store_id) blockers.push('sem loja principal')
  if (!client.product_name) blockers.push('sem produto contratado')
  if (!client.assignments) blockers.push('sem consultor')
  if (!client.modulesEnabled) blockers.push('sem módulos liberados')
  return blockers
}

/**
 * Lojas que respondem por um cliente: a principal e as filiais penduradas nela.
 *
 * A carteira vive em `clientes_consultoria` e a operação vive em `lojas`; a
 * única ponte entre as duas é `primary_store_id` mais a hierarquia
 * `parent_loja_id`. `unidades_cliente_consultoria` não serve aqui — não guarda
 * referência para `lojas`, então não dá para contar equipe por ela.
 */
export function clientStoreIds(
  client: Pick<PortfolioClient, 'primary_store_id'>,
  lojas: ReadonlyArray<{ id: string; parent_loja_id?: string | null }>,
): string[] {
  const primary = client.primary_store_id
  if (!primary) return []
  const branches = lojas.filter((loja) => loja.parent_loja_id === primary).map((loja) => loja.id)
  return [primary, ...branches]
}

export type StoreTeamStat = { sellers: number; checkedIn?: number; disciplinePct: number }

/**
 * Soma a equipe do cliente nas lojas dele.
 *
 * A presença é recalculada sobre os totais somados em vez de tirar a média das
 * porcentagens: uma loja com 1 vendedor presente não vale o mesmo que uma com
 * 20, e a média das médias diria que vale.
 */
export function clientTeamStat(
  storeIds: readonly string[],
  stats: Readonly<Record<string, StoreTeamStat>>,
): { sellers: number; checkedIn: number; disciplinePct: number } {
  let sellers = 0
  let checkedIn = 0
  for (const storeId of storeIds) {
    const stat = stats[storeId]
    if (!stat) continue
    sellers += stat.sellers
    checkedIn += stat.checkedIn ?? Math.round((stat.disciplinePct / 100) * stat.sellers)
  }
  return {
    sellers,
    checkedIn,
    disciplinePct: sellers > 0 ? Math.min(100, Math.round((checkedIn / sellers) * 100)) : 0,
  }
}

export function isRenewalNear(client: PortfolioClient, today = new Date(), days = 60) {
  if (!client.contract_end_date) return false
  const end = new Date(`${client.contract_end_date}T00:00:00`)
  if (Number.isNaN(end.getTime())) return false
  const limit = new Date(today)
  limit.setDate(limit.getDate() + days)
  return end >= today && end <= limit
}

/**
 * Classifica o cliente nos cards da carteira. Um cliente aparece em mais de um
 * card de propósito: "ativo" e "renovação próxima" são fatos independentes, e
 * esconder o segundo atrás do primeiro é justamente o que faz um contrato
 * vencer sem ninguém ver.
 */
export function clientBuckets(client: PortfolioClient, today = new Date()): PortfolioBucket[] {
  const buckets: PortfolioBucket[] = []
  const active = isActive(client)
  const blockers = activationBlockers(client)

  if (active) buckets.push('ativos')
  if (active && client.visitsTotal > 0 && client.visitsDone < client.visitsTotal) buckets.push('em_implantacao')
  if (!active && !blockers.length) buckets.push('prontos_para_ativar')
  if (!active && blockers.length) buckets.push('com_bloqueios')
  if (isRenewalNear(client, today)) buckets.push('renovacoes_proximas')
  if (client.onboarding_completed === false || (client.onboarding_step ?? 0) > 0 && client.onboarding_completed !== true) {
    buckets.push('cadastros_pendentes')
  }
  return buckets
}

/** Próxima ação recomendada — a coluna que diz à equipe o que fazer hoje. */
export function nextAction(client: PortfolioClient): string {
  const blockers = activationBlockers(client)
  if (!isActive(client) && blockers.length) return `Resolver: ${blockers[0]}`
  if (!isActive(client)) return 'Validar e ativar cliente'
  if (client.onboarding_completed === false) return 'Continuar onboarding'
  if (!client.users) return 'Cadastrar pessoas e acessos'
  if (client.visitsTotal > 0 && client.visitsDone === 0) return 'Agendar primeiro encontro'
  if (client.visitsTotal > 0 && client.visitsDone < client.visitsTotal) return `Conduzir encontro ${client.visitsDone + 1} de ${client.visitsTotal}`
  if (isRenewalNear(client)) return 'Tratar renovação de contrato'
  return 'Acompanhar execução'
}

export function structureLabel(client: PortfolioClient): string {
  if (client.structure_type === 'REDE') return `Rede · ${client.units} unidade(s)`
  if (client.structure_type === 'LOJA_UNICA') return 'Loja única'
  return client.units ? `${client.units} unidade(s)` : 'Não informada'
}

export function journeyLabel(client: PortfolioClient): string {
  if (!client.visitsTotal) return 'Sem jornada'
  return `${client.visitsDone} de ${client.visitsTotal}`
}

export type PortfolioFilters = {
  search: string
  status: PortfolioStatusFilter
  bucket: PortfolioBucket | 'todos'
  phase: string
  product: string
  owner: string
}

export const EMPTY_PORTFOLIO_FILTERS: PortfolioFilters = {
  search: '',
  status: 'todos',
  bucket: 'todos',
  phase: 'todas',
  product: 'todos',
  owner: 'todos',
}

export function filterPortfolio(rows: PortfolioClient[], filters: PortfolioFilters, today = new Date()) {
  const term = filters.search.trim().toLowerCase()
  const digits = term.replace(/\D/g, '')
  return rows.filter(client => {
    if (!matchesPortfolioStatusFilter(client, filters.status)) return false
    if (filters.bucket !== 'todos' && !clientBuckets(client, today).includes(filters.bucket)) return false
    if (filters.phase !== 'todas' && (client.business_phase ?? '') !== filters.phase) return false
    if (filters.product !== 'todos' && (client.product_name ?? '') !== filters.product) return false
    if (filters.owner !== 'todos' && (client.implementation_owner_id ?? '') !== filters.owner) return false
    if (!term) return true
    const byString = [
      client.name,
      client.slug,
      client.product_name,
      client.implementation_owner_name,
      client.primary_store_city,
      client.main_contact_name,
    ].some(value => (value ?? '').toLowerCase().includes(term))
    const byCnpj = digits.length >= 3 && (client.cnpj ?? '').replace(/\D/g, '').includes(digits)
    return byString || byCnpj
  })
}

export function portfolioCounters(rows: PortfolioClient[], today = new Date()): Record<PortfolioBucket, number> {
  const counters: Record<PortfolioBucket, number> = {
    ativos: 0, em_implantacao: 0, prontos_para_ativar: 0, com_bloqueios: 0, renovacoes_proximas: 0, cadastros_pendentes: 0,
  }
  for (const client of rows) {
    for (const bucket of clientBuckets(client, today)) counters[bucket] += 1
  }
  return counters
}

export function portfolioStatusCounters(rows: PortfolioClient[]): Record<PortfolioStatus, number> {
  const counters: Record<PortfolioStatus, number> = {
    ativos: 0,
    em_implantacao: 0,
    prontos_para_ativar: 0,
    em_configuracao: 0,
  }
  for (const client of rows) {
    const status = canonicalPortfolioStatus(client)
    if (status) counters[status] += 1
  }
  return counters
}
