/**
 * Agregações do Funil Comercial da gestão (gerente/dono).
 *
 * O funil por canal reaproveita `buildFunnelDashboard` (mesma engine do funil
 * do vendedor, já testada) — a diferença é o escopo: em vez de um vendedor,
 * passamos todos os `seller_user_id` presentes nos eventos da(s) loja(s) que a
 * RLS liberou para quem está logado.
 *
 * O ranking por origem é agregado aqui porque a engine do vendedor não quebra
 * vendas por pessoa.
 */
import {
  buildFunnelDashboard,
  normalizeChannel,
  type FunnelChannel,
  type FunnelRow,
  type PeriodRange,
} from '@/features/crm/lib/funil-vendas-diagnostico'

export type TeamRankingRow = {
  id: string
  name: string
  showroom: number
  internet: number
  carteira: number
  /** Vendas registradas sem canal de origem — sem elas a soma das colunas não fecha com o total. */
  semCanal: number
  total: number
}

const SALE = 'venda_realizada'
const CANCEL = 'venda_cancelada'

function eventType(row: FunnelRow) {
  return String(row.tipo_evento ?? '').trim().toLowerCase()
}

function saleKey(row: FunnelRow) {
  const opportunity = row.oportunidade_id ?? row.cliente_oportunidade_id
  if (opportunity) return `opp:${String(opportunity)}`
  const client = row.cliente_id
  return client ? `cli:${String(client)}` : null
}

/**
 * Cancelamento não apaga o `venda_realizada` original (histórico é imutável):
 * ele acrescenta um `venda_cancelada` para a mesma oportunidade. Sem descontar
 * o par, o ranking contaria vendas revertidas.
 */
export function dropCancelledSales(rows: FunnelRow[]): FunnelRow[] {
  const cancelled = new Set(
    rows.filter((row) => eventType(row) === CANCEL).map(saleKey).filter((key): key is string => Boolean(key)),
  )
  if (cancelled.size === 0) return rows
  return rows.filter((row) => {
    if (eventType(row) !== SALE) return true
    const key = saleKey(row)
    return !key || !cancelled.has(key)
  })
}

export function collectSellerIds(rows: FunnelRow[]): string[] {
  const ids = new Set<string>()
  for (const row of rows) {
    const id = row.seller_user_id
    if (typeof id === 'string' && id) ids.add(id)
  }
  return [...ids]
}

export function filterByPeriod(rows: FunnelRow[], period: PeriodRange): FunnelRow[] {
  return rows.filter((row) => {
    const raw = row.data_evento ?? row.created_at
    if (!raw) return false
    const date = new Date(String(raw))
    if (Number.isNaN(date.getTime())) return false
    return date.getTime() >= period.start.getTime() && date.getTime() <= period.end.getTime()
  })
}

const CHANNEL_FIELD: Record<FunnelChannel, keyof Pick<TeamRankingRow, 'showroom' | 'internet' | 'carteira'>> = {
  Showroom: 'showroom',
  Internet: 'internet',
  Carteira: 'carteira',
}

/**
 * Vendas por vendedor e por canal no período. Vendas sem canal registrado vão
 * para a coluna "Sem canal" — inventar uma origem distorceria a leitura, e
 * omitir faria a soma das colunas não fechar com o total.
 */
export function buildTeamRanking(
  rows: FunnelRow[],
  period: PeriodRange,
  names: Map<string, string>,
): TeamRankingRow[] {
  const sales = filterByPeriod(dropCancelledSales(rows), period).filter((row) => eventType(row) === SALE)
  const bySeller = new Map<string, TeamRankingRow>()

  for (const row of sales) {
    const sellerId = typeof row.seller_user_id === 'string' ? row.seller_user_id : null
    if (!sellerId) continue
    const entry = bySeller.get(sellerId) ?? {
      id: sellerId,
      name: names.get(sellerId) || 'Vendedor sem cadastro',
      showroom: 0,
      internet: 0,
      carteira: 0,
      semCanal: 0,
      total: 0,
    }
    const channel = normalizeChannel(row)
    if (channel) entry[CHANNEL_FIELD[channel]] += 1
    else entry.semCanal += 1
    entry.total += 1
    bySeller.set(sellerId, entry)
  }

  return [...bySeller.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'))
}

export function buildTeamFunnel(params: {
  events: FunnelRow[]
  period: PeriodRange
  storeId: string | null
  meta: number | null
  storeConfig?: FunnelRow | null
}) {
  return buildFunnelDashboard({
    events: params.events,
    customers: [],
    period: params.period,
    sellerIds: collectSellerIds(params.events),
    storeId: params.storeId,
    meta: params.meta,
    storeConfig: params.storeConfig ?? null,
  })
}
