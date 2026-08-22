import { expect, test } from 'bun:test'
import {
  ALL_OWNER_UNITS,
  nextOwnerUnitId,
  resolveOwnerPlanningScopeType,
  resolveOwnerPlanningStoreId,
  toOwnerPlanningActor,
} from './ownerPlanningAdapter'

test('unitId vence a primeira unidade quando a loja existe na lista', () => {
  expect(resolveOwnerPlanningStoreId('store-2', [{ id: 'store-1' }, { id: 'store-2' }])).toBe('store-2')
})

test('unitId desconhecido recua para a primeira loja', () => {
  expect(resolveOwnerPlanningStoreId('fantasma', [{ id: 'store-1' }])).toBe('store-1')
})

test('"all" ancora no primeiro id real — nunca manda "all" para o workspace', () => {
  expect(resolveOwnerPlanningStoreId(ALL_OWNER_UNITS, [{ id: 'store-1' }, { id: 'store-2' }])).toBe('store-1')
})

test('preserva "all" mesmo quando a loja ativa da sessão muda', () => {
  expect(nextOwnerUnitId(ALL_OWNER_UNITS, [{ id: 'store-1' }], 'store-1')).toBe(ALL_OWNER_UNITS)
})

test('lista vazia não apaga consolidado', () => {
  expect(nextOwnerUnitId(ALL_OWNER_UNITS, [], null)).toBe(ALL_OWNER_UNITS)
})

test('escopo: all só consolida com mais de uma unidade', () => {
  expect(resolveOwnerPlanningScopeType(ALL_OWNER_UNITS, true)).toBe('CONSOLIDATED')
  expect(resolveOwnerPlanningScopeType(ALL_OWNER_UNITS, false)).toBe('STORE')
  expect(resolveOwnerPlanningScopeType('store-1', true)).toBe('STORE')
})

test('adapter força papel dono sem ampliar capacidades', () => {
  expect(toOwnerPlanningActor({ id: 'u1', full_name: 'Dono', email: 'dono@example.com' })).toEqual({
    id: 'u1', name: 'Dono', email: 'dono@example.com', role: 'dono',
  })
})
