import { expect, test } from 'bun:test'
import { resolveOwnerPlanningStoreId, toOwnerPlanningActor } from './ownerPlanningAdapter'

test('unitId vence a primeira unidade', () => {
  expect(resolveOwnerPlanningStoreId('store-2', [{ id: 'store-1' }])).toBe('store-2')
})

test('adapter força papel dono sem ampliar capacidades', () => {
  expect(toOwnerPlanningActor({ id: 'u1', full_name: 'Dono', email: 'dono@example.com' })).toEqual({
    id: 'u1', name: 'Dono', email: 'dono@example.com', role: 'dono',
  })
})
