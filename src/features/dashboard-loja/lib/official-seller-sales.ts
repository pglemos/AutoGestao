export type OfficialSellerSale = {
  id: string
  data_competencia: string | null
  data_evento: string
  oportunidade_id: string | null
  oportunidade?: {
    etapa: string | null
    data_competencia: string | null
    sale_date: string | null
    valor_negociado: number | null
    veiculo_interesse: string | null
    placa_veiculo: string | null
    tipo_veiculo: string | null
    cliente_nome: string | null
  }
  canal: string | null
}

/** Competência do fato comercial; nunca usa data_evento como fallback. */
export function getOfficialSaleCompetence(sale: OfficialSellerSale): string | null {
  return sale.data_competencia
    || sale.oportunidade?.data_competencia
    || sale.oportunidade?.sale_date
    || null
}

/** Limite exclusivo do dia seguinte em America/Sao_Paulo para consultas auxiliares. */
export function getPeriodEndExclusive(periodEnd: string): string {
  const end = new Date(`${periodEnd}T00:00:00-03:00`)
  if (Number.isNaN(end.getTime())) return `${periodEnd}T23:59:59.999-03:00`
  end.setUTCDate(end.getUTCDate() + 1)
  return end.toISOString()
}

/**
 * Mantém a lista de detalhes alinhada ao read model oficial:
 * competência explícita, canceladas/sem competência fora e uma linha por
 * oportunidade. Eventos sem oportunidade são deduplicados pelo próprio id.
 */
export function filterOfficialSellerSales(
  rows: OfficialSellerSale[],
  periodStart: string,
  periodEnd: string,
): OfficialSellerSale[] {
  const candidates = rows
    .filter((sale) => {
      if (sale.oportunidade?.etapa === 'cancelada') return false
      const competence = getOfficialSaleCompetence(sale)
      return Boolean(competence && competence >= periodStart && competence <= periodEnd)
    })
    .sort((left, right) => {
      const explicitCompetence = Number(Boolean(right.data_competencia)) - Number(Boolean(left.data_competencia))
      if (explicitCompetence !== 0) return explicitCompetence
      return right.data_evento.localeCompare(left.data_evento) || right.id.localeCompare(left.id)
    })

  const seen = new Set<string>()
  return candidates.filter((sale) => {
    const key = sale.oportunidade_id ? `oportunidade:${sale.oportunidade_id}` : `evento:${sale.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
