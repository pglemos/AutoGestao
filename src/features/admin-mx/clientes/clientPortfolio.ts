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

export const PORTFOLIO_BUCKET_LABEL: Record<PortfolioBucket, string> = {
  ativos: 'Ativos',
  em_implantacao: 'Em implantação',
  prontos_para_ativar: 'Prontos para ativar',
  com_bloqueios: 'Com bloqueios',
  renovacoes_proximas: 'Renovações próximas',
  cadastros_pendentes: 'Cadastros pendentes',
}

const ATIVO = ['ativo', 'ativa', 'active']

export function isActive(client: Pick<PortfolioClient, 'status'>) {
  return ATIVO.includes(String(client.status ?? '').toLowerCase())
}

/** Falta o mínimo que o banco exige para ativar (loja, produto, consultor). */
export function activationBlockers(client: PortfolioClient): string[] {
  const blockers: string[] = []
  if (!client.primary_store_id) blockers.push('sem loja principal')
  if (!client.product_name) blockers.push('sem produto contratado')
  if (!client.assignments) blockers.push('sem consultor')
  if (!client.modulesEnabled) blockers.push('sem módulos liberados')
  return blockers
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
  bucket: PortfolioBucket | 'todos'
  phase: string
  product: string
  owner: string
}

export const EMPTY_PORTFOLIO_FILTERS: PortfolioFilters = {
  search: '',
  bucket: 'todos',
  phase: 'todas',
  product: 'todos',
  owner: 'todos',
}

export function filterPortfolio(rows: PortfolioClient[], filters: PortfolioFilters, today = new Date()) {
  const term = filters.search.trim().toLowerCase()
  const digits = term.replace(/\D/g, '')
  return rows.filter(client => {
    if (filters.bucket !== 'todos' && !clientBuckets(client, today).includes(filters.bucket)) return false
    if (filters.phase !== 'todas' && (client.business_phase ?? '') !== filters.phase) return false
    if (filters.product !== 'todos' && (client.product_name ?? '') !== filters.product) return false
    if (filters.owner !== 'todos' && (client.implementation_owner_id ?? '') !== filters.owner) return false
    if (!term) return true
    const byName = [client.name, client.product_name, client.implementation_owner_name]
      .some(value => (value ?? '').toLowerCase().includes(term))
    const byCnpj = digits.length >= 3 && (client.cnpj ?? '').replace(/\D/g, '').includes(digits)
    return byName || byCnpj
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
