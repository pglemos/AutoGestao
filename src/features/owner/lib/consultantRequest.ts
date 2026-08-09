const REQUEST_TYPE_MAP = {
  question: 'duvida',
  analysis: 'analise',
  decision_discussion: 'decisao',
  review_action: 'revisao_acao',
  schedule_meeting: 'agendamento',
  send_info: 'informacao',
  urgent: 'urgente',
} as const

const PRIORITY_MAP = {
  low: 'baixa',
  medium: 'media',
  high: 'alta',
} as const

const CONTEXT_TYPE_MAP = {
  general: 'geral',
  action: 'acao',
  decision: 'decisao',
  executive_card: 'card_executivo',
  department: 'departamento',
} as const

type OwnerConsultantRequestPayload = {
  unit_id?: unknown
  request_type?: unknown
  priority?: unknown
  context_type?: unknown
  context_snapshot?: unknown
}

function requireMappedValue<T extends Record<string, string>>(
  map: T,
  value: unknown,
  fieldName: string,
): T[keyof T] {
  if (typeof value !== 'string' || !Object.prototype.hasOwnProperty.call(map, value)) {
    throw new Error(`Classificação inválida para ${fieldName}`)
  }
  return map[value as keyof T]
}

export function normalizeOwnerConsultantRequestPayload(payload: OwnerConsultantRequestPayload) {
  const storeId = typeof payload.unit_id === 'string' ? payload.unit_id.trim() : ''
  if (!storeId) throw new Error('Unidade obrigatória para a solicitação')

  return {
    storeId,
    requestType: requireMappedValue(REQUEST_TYPE_MAP, payload.request_type, 'request_type'),
    priority: requireMappedValue(PRIORITY_MAP, payload.priority, 'priority'),
    contextType: requireMappedValue(CONTEXT_TYPE_MAP, payload.context_type, 'context_type'),
    contextSnapshot:
      typeof payload.context_snapshot === 'string' && payload.context_snapshot.trim()
        ? { snapshot: payload.context_snapshot }
        : {},
  }
}
