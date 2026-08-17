import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AK/AH — fechamento: 34.007-011 BLOCKED + checklist execução AK 37.006-020.
 *
 * - Supabase: itens bloqueados com motivo (nenhum bug de schema/RPC confirmado).
 * - Release: checklist pronta para o DS6 (comandos exatos, gates GO/NO-GO).
 */
describe('FASE AH — 34.007-011 BLOCKED com motivo', () => {
  test('34.007-011 marcados como BLOQUEADO no ledger', () => {
    const ledger = read('docs/audit/2026-08-15-foundation-zero-release-evidence.md')
    expect(ledger).toContain('34.007')
    expect(ledger).toContain('34.011')
    // conta os itens 34.007-011 com BLOQUEADO na descrição (pode estar em qualquer posição)
    const items = ['34.007', '34.008', '34.009', '34.010', '34.011']
    const blocked = items.filter((n) => {
      const idx = ledger.indexOf(`**${n}**`)
      return idx !== -1 && ledger.slice(idx, idx + 400).includes('BLOQUEADO')
    })
    expect(blocked).toEqual(items)
  })

  test('motivo do bloqueio: nenhum bug de schema/RPC confirmado', () => {
    const ledger = read('docs/audit/2026-08-15-foundation-zero-release-evidence.md')
    expect(ledger).toContain('nenhum bug de schema/RPC confirmado')
    expect(ledger).toContain('sem ocorrência ativa confirmada')
    expect(ledger).toContain('docs/audit/2026-08-10-supabase-log-triaging-and-classification.md')
  })
})

describe('FASE AK — checklist de execução 37.006-020', () => {
  test('checklist existe e cobre push→deploy→health→smoke→screenshots→parity', () => {
    const checklist = read('docs/execution/release-checklist-ak.md')
    for (const n of ['37.006', '37.009', '37.010', '37.011', '37.012', '37.014']) {
      expect(checklist, n).toContain(n)
    }
  })

  test('comandos exatos prontos para copiar', () => {
    const checklist = read('docs/execution/release-checklist-ak.md')
    expect(checklist).toContain('git push origin main')
    expect(checklist).toContain('vercel --prod')
    expect(checklist).toContain('visual-matrix-roles')
    expect(checklist).toContain('classify-supabase-events')
  })

  test('gates GO/NO-GO e rollback documentados', () => {
    const checklist = read('docs/execution/release-checklist-ak.md')
    expect(checklist).toContain('Gate A')
    expect(checklist).toContain('NO-GO')
    expect(checklist).toContain('Rollback a qualquer momento')
  })

  test('checklist avisa sobre as migrations sem reversal (36.019)', () => {
    const checklist = read('docs/execution/release-checklist-ak.md')
    expect(checklist).toContain('2 migrations de 2026-08-15 sem reversal')
    expect(checklist).toContain('criar rollbacks ANTES de finalizar')
  })
})
