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

export type StoreSaleEventRow = {
  id: string
  tipo_evento: string
  cliente_id: string
  data_evento: string
  data_competencia: string | null
  oportunidade_id: string | null
  evento_origem_id: string | null
  agendamento_id: string | null
  seller_user_id: string
  metadata: unknown
  observacao: string | null
  seller: { name: string } | null
  cliente: { nome: string } | null
  oportunidade: {
    id: string
    cliente_id: string
    veiculo_interesse: string | null
    valor_negociado: number | string | null
    etapa: string | null
    data_competencia: string | null
    sale_date: string | null
    closed_at: string | null
    cancelada_em: string | null
    motivo_cancelamento: string | null
    cliente: { nome: string } | null
    seller: { name: string } | null
  } | null
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function metadataText(metadata: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function metadataNumber(metadata: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = metadata[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value !== 'string' || !value.trim()) continue

    const normalized = value
      .trim()
      .replace(/^R\$\s*/i, '')
      .replace(/\s/g, '')
    const localized = normalized.includes(',')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized
    const parsed = Number(localized)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function numericValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function extractFromDescricao(descricao: string | null | undefined): { veiculo: string | null; valor: number | null } {
  if (!descricao) return { veiculo: null, valor: null }
  const match = descricao.match(/Venda concluída:\s*(.*?)\s+por\s+R\$\s*([\d\.,]+)/i)
  if (match) {
    const veiculo = match[1]?.trim() || null
    const rawVal = match[2]?.trim().replace(/\./g, '').replace(',', '.')
    const parsed = Number(rawVal)
    return {
      veiculo,
      valor: Number.isFinite(parsed) ? parsed : null,
    }
  }
  return { veiculo: null, valor: null }
}

/**
 * Reconstructs the store-sale detail from the immutable official events.
 * Cancellation events are joined in memory because an orphan sale has no
 * opportunity row to carry its cancelled state or presentation fields.
 */
export function buildStoreSaleCandidates(rows: readonly StoreSaleEventRow[]): StoreSaleCandidate[] {
  const cancellationByOrigin = new Map<string, StoreSaleEventRow>()
  const cancellationByOpportunity = new Map<string, StoreSaleEventRow>()

  for (const row of rows) {
    if (row.tipo_evento !== 'venda_cancelada' || row.agendamento_id) continue
    if (row.evento_origem_id) cancellationByOrigin.set(row.evento_origem_id, row)
    if (row.oportunidade_id) cancellationByOpportunity.set(row.oportunidade_id, row)
  }

  return rows
    .filter(row => row.tipo_evento === 'venda_realizada')
    .map(row => {
      const opportunity = row.oportunidade
      const metadata = metadataRecord(row.metadata)
      const cancellation = cancellationByOrigin.get(row.id)
        || (row.oportunidade_id ? cancellationByOpportunity.get(row.oportunidade_id) : undefined)
      const opportunityValue = numericValue(opportunity?.valor_negociado)
      const eventValue = metadataNumber(metadata, ['valor_negociado', 'valor_venda'])
      const descParsed = extractFromDescricao(
        typeof metadata.descricao === 'string'
          ? metadata.descricao
          : (typeof row.observacao === 'string' ? row.observacao : null),
      )

      return {
        event_id: row.id,
        oportunidade_id: row.oportunidade_id || opportunity?.id || null,
        data_evento: row.data_evento,
        data_competencia: row.data_competencia,
        oportunidade_data_competencia: opportunity?.data_competencia || null,
        oportunidade_sale_date: opportunity?.sale_date || null,
        etapa: cancellation || opportunity?.etapa === 'cancelada' ? 'cancelada' : 'ganho',
        cliente_id: opportunity?.cliente_id || row.cliente_id || null,
        cliente_nome: opportunity?.cliente?.nome || row.cliente?.nome || null,
        veiculo_interesse: opportunity?.veiculo_interesse
          || metadataText(metadata, ['veiculo_interesse', 'veiculo', 'veiculo_comprado', 'modelo'])
          || descParsed.veiculo,
        valor_negociado: opportunityValue ?? eventValue ?? descParsed.valor ?? 0,
        seller_user_id: row.seller_user_id || null,
        seller_nome: opportunity?.seller?.name || row.seller?.name || null,
        closed_at: opportunity?.closed_at || null,
        cancelada_em: cancellation?.data_evento || opportunity?.cancelada_em || null,
        motivo_cancelamento: cancellation?.observacao || opportunity?.motivo_cancelamento || null,
      }
    })
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
 * Data usada somente na apresentação da lista operacional. A competência
 * continua sendo a única data válida para filtros e agregadores; o instante
 * do evento evita que uma venda histórica órfã fique sem qualquer referência
 * visual na tela de auditoria.
 */
export function getStoreSaleDisplayDate(row: StoreSaleCandidate): string | null {
  return getStoreSaleCompetence(row) || toDateOnly(row.data_evento)
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
      // Sem período, a tela operacional é uma auditoria histórica e precisa
      // manter inclusive fatos legados sem competência. Com período explícito,
      // uma linha sem competência não pode ser classificada nesse intervalo.
      if (!competence) return !periodStart && !periodEnd
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
