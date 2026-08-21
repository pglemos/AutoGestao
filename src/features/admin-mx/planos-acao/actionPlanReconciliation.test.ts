import { describe, expect, test } from 'bun:test'
import {
  buildDuplicateReconciliationUpdates,
  detectPartialApplicationRows,
  findDuplicatedTemplateDrafts,
  findPotentialDuplicateApplications,
} from './actionPlanReconciliation'

const metadata = (requestId: string, itemId: string) => ({
  template_application_request_id: requestId,
  template_item_id: itemId,
})

const row = (id: string, requestId: string | null) => ({
  id,
  scope_id: 'store-1',
  origem_ref_id: 'version-1',
  responsavel_id: 'user-1',
  status: 'pendente',
  transition_metadata: requestId ? metadata(requestId, `item-${id}`) : {},
})

describe('reconciliação segura de aplicações duplicadas', () => {
  test('diagnóstico sinaliza múltiplos requests sem escolher duplicata automaticamente', () => {
    const rows = [
      row('plan-a', 'request-a'),
      row('plan-b', 'request-b'),
      { ...row('plan-c', 'request-b'), scope_id: 'store-2' },
    ]
    const groups = findPotentialDuplicateApplications(rows)
    expect(groups).toHaveLength(1)
    expect(groups[0].requestIds).toEqual(['request-a', 'request-b'])
    expect(groups[0].planIdsByRequest).toEqual({ 'request-a': ['plan-a'], 'request-b': ['plan-b'] })
  })

  test('diagnóstico ignora canceladas, reconciliadas, legadas e request único', () => {
    const rows = [
      { ...row('cancelled', 'request-a'), status: 'cancelada' },
      { ...row('reconciled', 'request-b'), transition_metadata: { template_application_request_id: 'request-b', reconcile_status: 'DUPLICATE_RECONCILED' } },
      row('legacy', null),
      row('single', 'request-c'),
    ]
    expect(findPotentialDuplicateApplications(rows)).toEqual([])
  })

  test('marca apenas request IDs explicitamente selecionados e preserva metadata', () => {
    const updates = buildDuplicateReconciliationUpdates({
      rows: [
        { id: 'canonical', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', status: 'pendente', transition_metadata: metadata('r1', 'i1') },
        { id: 'duplicate', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', status: 'pendente', transition_metadata: { ...metadata('r2', 'i1'), source: 'wizard' } },
        { id: 'deliberate', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', status: 'pendente', transition_metadata: metadata('r3', 'i1') },
      ],
      canonicalRequestId: 'r1',
      duplicateRequestIds: ['r2'],
      requestedBy: 'admin-1',
      reconciledAt: '2026-08-20T12:00:00.000Z',
    })

    expect(updates).toHaveLength(1)
    expect(updates[0]).toEqual({
      planId: 'duplicate',
      transitionMetadata: {
        ...metadata('r2', 'i1'),
        source: 'wizard',
        reconcile_status: 'DUPLICATE_RECONCILED',
        duplicate_of_request_id: 'r1',
        reconciled_at: '2026-08-20T12:00:00.000Z',
        reconciled_by: 'admin-1',
      },
    })
  })

  test('ignora plano já cancelado e nunca reconcilia o canônico', () => {
    const updates = buildDuplicateReconciliationUpdates({
      rows: [
        { id: 'canonical', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', status: 'pendente', transition_metadata: metadata('r1', 'i1') },
        { id: 'cancelled', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', status: 'cancelada', transition_metadata: metadata('r2', 'i1') },
      ],
      canonicalRequestId: 'r1',
      duplicateRequestIds: ['r1', 'r2'],
      requestedBy: 'admin-1',
      reconciledAt: '2026-08-20T12:00:00.000Z',
    })

    expect(updates).toEqual([])
  })
})

describe('reconciliação de rascunhos duplicados', () => {
  test('preserva como canônico o rascunho mais completo', () => {
    const groups = findDuplicatedTemplateDrafts([
      { id: 'd1', template_id: 't1', versao: 3, status: 'rascunho', notas: null, updated_at: '2026-08-20T12:00:00Z', itemCount: 1 },
      { id: 'd2', template_id: 't1', versao: 2, status: 'rascunho', notas: null, updated_at: '2026-08-19T12:00:00Z', itemCount: 3 },
      { id: 'p1', template_id: 't1', versao: 1, status: 'publicada', notas: null, updated_at: '2026-08-18T12:00:00Z', itemCount: 4 },
    ])

    expect(groups).toEqual([{ templateId: 't1', canonicalId: 'd2', duplicateIds: ['d1'] }])
  })

  test('desempata por versão e ignora template com um único rascunho', () => {
    const groups = findDuplicatedTemplateDrafts([
      { id: 'd1', template_id: 't1', versao: 1, status: 'rascunho', notas: null, updated_at: '2026-08-20T12:00:00Z', itemCount: 2 },
      { id: 'd2', template_id: 't1', versao: 4, status: 'rascunho', notas: null, updated_at: '2026-08-18T12:00:00Z', itemCount: 2 },
      { id: 'only', template_id: 't2', versao: 1, status: 'rascunho', notas: null, updated_at: '2026-08-20T12:00:00Z', itemCount: 1 },
    ])

    expect(groups).toEqual([{ templateId: 't1', canonicalId: 'd2', duplicateIds: ['d1'] }])
  })
})

describe('detecção de aplicações parciais de plano padrão', () => {
  test('considera completa a aplicação com todos os itens e responsáveis', () => {
    const result = detectPartialApplicationRows([
      { id: 'p1', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', transition_metadata: metadata('r1', 'i1') },
      { id: 'p2', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', transition_metadata: metadata('r1', 'i2') },
    ], new Map([['v1', new Set(['i1', 'i2'])]]))

    expect(result).toEqual([])
  })

  test('detecta item esperado ausente na aplicação lógica', () => {
    const [partial] = detectPartialApplicationRows([
      { id: 'p1', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', transition_metadata: metadata('r1', 'i1') },
    ], new Map([['v1', new Set(['i1', 'i2'])]]))

    expect(partial.issues).toEqual(['NO_ITEMS'])
    expect(partial.missingItemIds).toEqual(['i2'])
    expect(partial.materializedItemCount).toBe(1)
    expect(partial.expectedItemCount).toBe(2)
  })

  test('detecta versão e responsável ausentes sem inventar item agregado', () => {
    const [partial] = detectPartialApplicationRows([
      { id: 'p1', scope_id: 's1', origem_ref_id: null, responsavel_id: null, transition_metadata: {} },
    ], new Map())

    expect(partial.issues).toEqual(['MISSING_TEMPLATE_VERSION', 'MISSING_RESPONSIBLE', 'NO_ITEMS'])
    expect(partial.planIds).toEqual(['p1'])
  })

  test('mantém unidades separadas dentro da mesma request multiunidade', () => {
    const result = detectPartialApplicationRows([
      { id: 'p1', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', transition_metadata: metadata('r1', 'i1') },
      { id: 'p2', scope_id: 's2', origem_ref_id: 'v1', responsavel_id: null, transition_metadata: metadata('r1', 'i1') },
    ], new Map([['v1', new Set(['i1'])]]))

    expect(result).toHaveLength(1)
    expect(result[0].storeId).toBe('s2')
    expect(result[0].issues).toEqual(['MISSING_RESPONSIBLE'])
  })

  test('agrupa materializações legadas por versão e unidade', () => {
    const result = detectPartialApplicationRows([
      { id: 'p1', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', transition_metadata: { template_item_id: 'i1' } },
      { id: 'p2', scope_id: 's1', origem_ref_id: 'v1', responsavel_id: 'u1', transition_metadata: { template_item_id: 'i2' } },
    ], new Map([['v1', new Set(['i1', 'i2'])]]))

    expect(result).toEqual([])
  })
})
