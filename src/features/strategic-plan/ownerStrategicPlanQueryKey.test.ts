import { describe, expect, test } from 'bun:test'
import {
  invalidateOwnerStrategicPlanCaches,
  ownerStrategicPlanQueryKey,
  sameOwnerStrategicPlanQueryKey,
} from './ownerStrategicPlanQueryKey'

describe('ownerStrategicPlanQueryKey', () => {
  test('não compartilha cache entre unidades, visão ou competência', () => {
    const base = {
      clientAccountId: 'c1',
      strategicPlanVersionId: 'v1',
      referenceYear: 2026,
      referenceMonth: 7,
      selectedValueView: 'meta',
      scopeType: 'STORE',
      storeId: 'bh',
    }
    expect(sameOwnerStrategicPlanQueryKey(base, { ...base, storeId: 'contagem' })).toBe(false)
    expect(sameOwnerStrategicPlanQueryKey(base, { ...base, selectedValueView: 'realizado' })).toBe(false)
    expect(sameOwnerStrategicPlanQueryKey(base, { ...base, referenceMonth: 6 })).toBe(false)
    expect(sameOwnerStrategicPlanQueryKey(base, { ...base, scopeType: 'CONSOLIDATED', storeId: null })).toBe(false)
    expect(sameOwnerStrategicPlanQueryKey(base, { ...base })).toBe(true)
    expect(ownerStrategicPlanQueryKey(base)[0]).toBe('ownerStrategicPlan')
  })

  test('invalidar caches muda a geração da chave', () => {
    const scope = { clientAccountId: 'c1', referenceYear: 2026, storeId: 'bh' }
    const before = ownerStrategicPlanQueryKey(scope)
    invalidateOwnerStrategicPlanCaches()
    expect(sameOwnerStrategicPlanQueryKey(
      { ...scope },
      { ...scope },
    )).toBe(true)
    expect(ownerStrategicPlanQueryKey(scope)).not.toEqual(before)
  })
})
