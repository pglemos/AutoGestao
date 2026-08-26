import { describe, expect, test } from 'bun:test'
import {
  AUDIT_TRAILS,
  changedFieldList,
  formatAuditTimestamp,
  matchesAuditSearch,
  rowIdentityLabel,
  valueTransition,
} from './auditTrails'

/**
 * A tela /auditoria já exibiu uma trilha inventada (autor fixo, ação deduzida
 * do status do cliente). Estes testes travam a regra oposta: campo ausente vira
 * `—` ou "Data não registrada", nunca outro campo nem o relógio da requisição.
 */
describe('auditTrails', () => {
  test('cada trilha declara a tabela real de onde lê', () => {
    expect(AUDIT_TRAILS.map(item => item.table)).toEqual([
      'internal_mx_admin_audit',
      'logs_auditoria_loja',
      'checkin_audit_logs',
      'd1_audit_log',
      'data_correction_audit',
    ])
    expect(AUDIT_TRAILS.every(item => item.description.length > 0)).toBe(true)
  })

  test('changedFieldList lista os campos alterados e não inventa nada', () => {
    expect(changedFieldList({ slug: { old: null, new: 'x' }, modality: { old: 'a', new: 'b' } }))
      .toBe('slug, modality')
    expect(changedFieldList({})).toBe('—')
    expect(changedFieldList(null)).toBe('—')
    expect(changedFieldList('texto')).toBe('—')
  })

  test('valueTransition mostra antes e depois, com vazio explícito', () => {
    expect(valueTransition('ganho', 'cancelada')).toBe('ganho → cancelada')
    expect(valueTransition(null, 'cancelada')).toBe('— → cancelada')
    expect(valueTransition(null, null)).toBe('—')
    expect(valueTransition(0, 10)).toBe('0 → 10')
  })

  test('rowIdentityLabel descreve a linha corrigida', () => {
    expect(rowIdentityLabel({ id: 'abc' })).toBe('id: abc')
    expect(rowIdentityLabel({})).toBe('—')
    expect(rowIdentityLabel(undefined)).toBe('—')
  })

  test('formatAuditTimestamp não substitui data ausente pelo agora', () => {
    expect(formatAuditTimestamp('')).toBe('Data não registrada')
    expect(formatAuditTimestamp('não é data')).toBe('Data não registrada')
    expect(formatAuditTimestamp('2026-08-21T19:50:04.172635+00:00')).toContain('2026')
  })

  test('a busca cobre autor, ação, recurso e contexto', () => {
    const entry = {
      id: '1',
      timestamp: '2026-08-21T19:50:04Z',
      actor: 'Mariane',
      action: 'update_store_user',
      resource: 'usuario',
      context: 'CARRUM',
    }
    expect(matchesAuditSearch(entry, '')).toBe(true)
    expect(matchesAuditSearch(entry, 'carrum')).toBe(true)
    expect(matchesAuditSearch(entry, 'STORE_USER')).toBe(true)
    expect(matchesAuditSearch(entry, 'inexistente')).toBe(false)
  })
})
