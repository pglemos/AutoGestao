/**
 * Junção entre a operação da rede (lojas do cockpit) e a governança da carteira
 * (clientes MX). As duas fontes são tabelas concorrentes: a única ponte
 * persistida é `clients.primary_store_id -> stores.id`. Linhas sem par existem
 * dos dois lados e são expostas como tal, nunca silenciadas.
 */
import { clientBuckets, type PortfolioBucket, type PortfolioClient } from '@/features/admin-mx/clientes/clientPortfolio'
import { getStoreDiagnosticStatus, getStorePendingCount } from '@/features/network-dashboard/lib/networkDashboardFilters'
import type { NetworkCockpitStore, NetworkStatusFilter } from '@/features/network-dashboard/types'

export type CarteiraLinkage = 'vinculado' | 'sem_cliente' | 'sem_loja'
export type CarteiraOperationalStatus = Exclude<NetworkStatusFilter, 'all'>

export type CarteiraRow = {
  /** Estável entre leituras: prefixado pela origem para evitar colisão de ids. */
  key: string
  name: string
  city: string | null
  linkage: CarteiraLinkage
  /** Presente quando a linha tem loja na operação da rede. */
  store: NetworkCockpitStore | null
  operationalStatus: CarteiraOperationalStatus | null
  pending: number
  /** Presente quando a linha tem cliente na carteira MX. */
  client: PortfolioClient | null
  contractStatus: string | null
  ownerName: string | null
  hasDonoMaster: boolean | null
  clientSlug: string | null
}

const LINKAGE_LABEL: Record<CarteiraLinkage, string> = {
  vinculado: 'Loja e cliente vinculados',
  sem_cliente: 'Loja da rede sem cliente MX vinculado',
  sem_loja: 'Cliente MX sem loja vinculada',
}

export function linkageLabel(linkage: CarteiraLinkage): string {
  return LINKAGE_LABEL[linkage]
}

function storeRow(store: NetworkCockpitStore, client: PortfolioClient | null): CarteiraRow {
  return {
    key: `store:${store.id}`,
    name: client?.name || store.name,
    city: client?.primary_store_city ?? null,
    linkage: client ? 'vinculado' : 'sem_cliente',
    store,
    operationalStatus: getStoreDiagnosticStatus(store),
    pending: getStorePendingCount(store),
    client,
    contractStatus: client?.status ?? null,
    ownerName: client?.implementation_owner_name ?? null,
    hasDonoMaster: client ? client.hasDonoMaster : null,
    clientSlug: client?.slug ?? client?.id ?? null,
  }
}

function clientRow(client: PortfolioClient): CarteiraRow {
  return {
    key: `client:${client.id}`,
    name: client.name,
    city: client.primary_store_city,
    linkage: 'sem_loja',
    store: null,
    operationalStatus: null,
    pending: 0,
    client,
    contractStatus: client.status,
    ownerName: client.implementation_owner_name,
    hasDonoMaster: client.hasDonoMaster,
    clientSlug: client.slug ?? client.id,
  }
}

/**
 * Ordem de triagem: quem exige decisão primeiro. Crítico > atenção > sem par >
 * resto, e dentro de cada faixa por pendências e nome.
 */
const STATUS_WEIGHT: Record<CarteiraOperationalStatus, number> = {
  critical: 0,
  alert: 1,
  target: 4,
  healthy: 4,
}

function triageWeight(row: CarteiraRow): number {
  if (row.operationalStatus) return STATUS_WEIGHT[row.operationalStatus]
  // Sem leitura operacional é uma pendência de dado, não um estado saudável.
  return row.linkage === 'sem_loja' ? 2 : 3
}

export function buildCarteiraOperacional(
  stores: NetworkCockpitStore[],
  clients: PortfolioClient[],
): CarteiraRow[] {
  const clientByStore = new Map<string, PortfolioClient>()
  for (const client of clients) {
    if (client.primary_store_id) clientByStore.set(client.primary_store_id, client)
  }

  const rows = stores.map(store => storeRow(store, clientByStore.get(store.id) ?? null))
  const matchedClientIds = new Set(
    rows.map(row => row.client?.id).filter((id): id is string => Boolean(id)),
  )
  for (const client of clients) {
    if (!matchedClientIds.has(client.id)) rows.push(clientRow(client))
  }

  return rows.sort((a, b) => {
    const weight = triageWeight(a) - triageWeight(b)
    if (weight !== 0) return weight
    if (b.pending !== a.pending) return b.pending - a.pending
    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

export type CarteiraCounters = {
  total: number
  vinculados: number
  semCliente: number
  semLoja: number
}

export function carteiraCounters(rows: CarteiraRow[]): CarteiraCounters {
  return {
    total: rows.length,
    vinculados: rows.filter(row => row.linkage === 'vinculado').length,
    semCliente: rows.filter(row => row.linkage === 'sem_cliente').length,
    semLoja: rows.filter(row => row.linkage === 'sem_loja').length,
  }
}

/** Recortes de contrato herdados dos cartões de governança que a tabela absorveu. */
const CONTRACT_FILTERS = ['ativos', 'em_implantacao', 'prontos_para_ativar', 'com_bloqueios'] as const
type ContractFilter = (typeof CONTRACT_FILTERS)[number]

export type CarteiraFilter =
  | 'todos'
  | 'exigem_decisao'
  | 'sem_vinculo'
  | CarteiraOperationalStatus
  | ContractFilter

function isContractFilter(filter: CarteiraFilter): filter is ContractFilter {
  return (CONTRACT_FILTERS as readonly string[]).includes(filter)
}

export function filterCarteiraRows(rows: CarteiraRow[], filter: CarteiraFilter, search: string): CarteiraRow[] {
  const term = search.trim().toLowerCase()
  return rows.filter(row => {
    if (term && !`${row.name} ${row.city ?? ''} ${row.ownerName ?? ''}`.toLowerCase().includes(term)) return false
    if (filter === 'todos') return true
    if (filter === 'exigem_decisao') return row.operationalStatus === 'critical' || row.operationalStatus === 'alert'
    if (filter === 'sem_vinculo') return row.linkage !== 'vinculado'
    if (isContractFilter(filter)) {
      return row.client ? clientBuckets(row.client).includes(filter as PortfolioBucket) : false
    }
    return row.operationalStatus === filter
  })
}

export type CarteiraSortKey = 'name' | 'sales' | 'goal' | 'discipline' | 'pending'

function sortValue(row: CarteiraRow, key: CarteiraSortKey): number | string {
  if (key === 'name') return row.name.toLocaleLowerCase('pt-BR')
  if (key === 'pending') return row.pending
  if (!row.store) return -1
  if (key === 'sales') return row.store.dataQuality?.operational === 'available' ? row.store.sales : -1
  if (key === 'goal') return row.store.dataQuality?.goal === 'configured' ? row.store.goal : -1
  return row.store.dataQuality?.discipline === 'available' ? row.store.disciplinePct : -1
}

/** Ordenação explícita pedida pelo cabeçalho. Substitui a triagem padrão. */
export function sortCarteiraRows(rows: CarteiraRow[], key: CarteiraSortKey, direction: 'asc' | 'desc'): CarteiraRow[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = sortValue(a, key)
    const right = sortValue(b, key)
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left).localeCompare(String(right), 'pt-BR') * factor
    }
    if (left === right) return a.name.localeCompare(b.name, 'pt-BR')
    return (left - right) * factor
  })
}
