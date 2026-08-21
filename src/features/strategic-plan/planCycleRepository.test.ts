import { describe, expect, test } from 'bun:test'
import { parseCycleReadinessResponse, parsePlanCycleResponse } from './planCycleRepository'

const validReadiness = {
  total: 3,
  ready: 2,
  pending: 1,
  canPublish: false,
  issues: [{
    type: 'MES_SEM_META',
    severity: 'pendencia',
    message: 'Meta mensal não preenchida.',
    indicatorCode: 'sales_total',
    month: 12,
  }],
}

describe('parseCycleReadinessResponse', () => {
  test('aceita o contrato autoritativo devolvido pela RPC', () => {
    const result = parseCycleReadinessResponse(validReadiness)

    expect(result.error).toBeNull()
    expect(result.readiness).toMatchObject({ total: 3, ready: 2, pending: 1, canPublish: false })
  })

  test.each([{ data: null }, { data: [] }, { data: 'inválido' }, { data: 42 }])('recusa resposta que não seja objeto: %p', ({ data }) => {
    expect(parseCycleReadinessResponse(data)).toEqual({
      readiness: null,
      error: 'Resposta inválida ao validar o plano estratégico.',
    })
  })

  test.each([
    {},
    { ...validReadiness, total: '3' },
    { ...validReadiness, canPublish: 'false' },
    { ...validReadiness, issues: {} },
  ])('recusa resposta incompleta ou com tipos incorretos', data => {
    expect(parseCycleReadinessResponse(data)).toEqual({
      readiness: null,
      error: 'Resposta incompleta ao validar o plano estratégico.',
    })
  })
})

const validCycle = {
  id: 'cycle-1',
  client_id: 'client-1',
  year: 2026,
  status: 'rascunho',
  version_number: 1,
  package_version_id: null,
  revised_from_id: null,
  published_at: null,
  published_by: null,
  created_at: '2026-08-20T00:00:00Z',
}

describe('parsePlanCycleResponse', () => {
  test('aceita ciclo válido e ausência explícita em leitura nullable', () => {
    expect(parsePlanCycleResponse(validCycle)).toEqual({ cycle: validCycle, error: null })
    expect(parsePlanCycleResponse(null, { nullable: true })).toEqual({ cycle: null, error: null })
  })

  test.each([{ data: null }, { data: [] }, { data: 'inválido' }, { data: 42 }])('recusa payload não composto: %p', ({ data }) => {
    expect(parsePlanCycleResponse(data).cycle).toBeNull()
    expect(parsePlanCycleResponse(data).error).toContain('Resposta inválida')
  })

  test.each([
    {},
    { ...validCycle, status: 'desconhecido' },
    { ...validCycle, year: '2026' },
    { ...validCycle, version_number: null },
  ])('recusa ciclo incompleto ou com status inválido', data => {
    expect(parsePlanCycleResponse(data).cycle).toBeNull()
    expect(parsePlanCycleResponse(data).error).toContain('Resposta incompleta')
  })
})
