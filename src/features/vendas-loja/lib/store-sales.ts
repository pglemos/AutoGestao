export type StoreSaleCandidate = {
  event_id: string
  oportunidade_id: string | null
  data_evento: string
  data_competencia: string | null
  oportunidade_data_competencia: string | null
  oportunidade_sale_date: string | null
  etapa: string | null
  cliente_id: string | null
  cliente_nome: string | null
  veiculo_interesse: string | null
  valor_negociado: number
  seller_user_id: string | null
  seller_nome: string | null
  closed_at: string | null
  cancelada_em: string | null
  motivo_cancelamento: string | null
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null
  const match = value.match(/^\d{4}-\d{2}-\d{2}/)
  return match?.[0] || null
}

/**
 * The dashboard's period is based on commercial competence, never on the
 * audit timestamp of an event or the opportunity's update time.
 */
export function getStoreSaleCompetence(row: StoreSaleCandidate): string | null {
  return toDateOnly(row.data_competencia)
    || toDateOnly(row.oportunidade_data_competencia)
    || toDateOnly(row.oportunidade_sale_date)
}

/**
 * Keep the individual list aligned with the canonical sales read model while
 * retaining cancelled sales for the audit/cancellation screen.
 */
export function filterStoreSales(
  rows: StoreSaleCandidate[],
  periodStart?: string | null,
  periodEnd?: string | null,
): StoreSaleCandidate[] {
  const candidates = rows
    .filter((row) => {
      if (row.etapa !== 'ganho' && row.etapa !== 'cancelada') return false
      const competence = getStoreSaleCompetence(row)
      if (!competence) return false
      if (periodStart && competence < periodStart) return false
      if (periodEnd && competence > periodEnd) return false
      return true
    })
    .sort((left, right) => {
      const explicitCompetence = Number(Boolean(right.data_competencia)) - Number(Boolean(left.data_competencia))
      if (explicitCompetence !== 0) return explicitCompetence
      return right.data_evento.localeCompare(left.data_evento) || right.event_id.localeCompare(left.event_id)
    })

  const seen = new Set<string>()
  return candidates.filter((row) => {
    const key = row.oportunidade_id ? `oportunidade:${row.oportunidade_id}` : `evento:${row.event_id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The store sales detail must use the same active seller scope as the
 * official performance read model. Historical events for an inactive seller
 * remain auditable in the database, but cannot inflate the current store
 * dashboard.
 */
export function filterStoreSalesBySellerIds(
  rows: StoreSaleCandidate[],
  activeSellerIds: readonly string[],
): StoreSaleCandidate[] {
  const activeSellerSet = new Set(activeSellerIds)
  return rows.filter((row) => row.seller_user_id !== null && activeSellerSet.has(row.seller_user_id))
}
