import { describe, expect, it } from 'bun:test'
import { normalizeOwnerConsultantRequestPayload } from './consultantRequest'

describe('owner consultant request normalization', () => {
  it('maps the Base44 vocabulary to the canonical MX classifications', () => {
    expect(normalizeOwnerConsultantRequestPayload({
      unit_id: 'store-1',
      request_type: 'decision_discussion',
      priority: 'high',
      context_type: 'executive_card',
      context_snapshot: 'Indicador crítico',
    })).toEqual({
      storeId: 'store-1',
      requestType: 'decisao',
      priority: 'alta',
      contextType: 'card_executivo',
      contextSnapshot: { snapshot: 'Indicador crítico' },
    })
  })

  it.each([
    [{ request_type: 'unknown', priority: 'medium', context_type: 'general' }, 'request_type'],
    [{ request_type: 'question', priority: 'unknown', context_type: 'general' }, 'priority'],
    [{ request_type: 'question', priority: 'medium', context_type: 'unknown' }, 'context_type'],
  ])('rejects unsupported classifications for %s', (partialPayload, fieldName) => {
    expect(() => normalizeOwnerConsultantRequestPayload({ unit_id: 'store-1', ...partialPayload })).toThrow(fieldName)
  })

  it('fails closed without an explicit accessible unit', () => {
    expect(() => normalizeOwnerConsultantRequestPayload({
      unit_id: '',
      request_type: 'question',
      priority: 'medium',
      context_type: 'general',
    })).toThrow('Unidade obrigatória')
  })
})
