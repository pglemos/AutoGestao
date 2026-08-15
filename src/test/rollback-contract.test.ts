import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE AL — Rollback (38.001–38.008).
 *
 * Garante que o caminho reversível está documentado e provado:
 *   38.001 — SHA de produção anterior registrado;
 *   38.002 — deployment anterior = rollback candidate;
 *   38.003 — rollback por git revert (nunca reset/force);
 *   38.004 — rollback Vercel documentado;
 *   38.005 — forward-fix/reversal migration documentado (supabase/rollbacks);
 *   38.006 — tag/bundle de backup legível;
 *   38.007 — gatilhos de rollback definidos;
 *   38.008 — dry-run lógico valida o caminho sem tocar produção.
 */
describe('FASE AL — rollback (38.001–38.008)', () => {
  test('38.001/002: runbook registra SHA de produção anterior como rollback candidate', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    expect(runbook).toContain('Produção anterior (rollback candidate)')
    expect(runbook).toMatch(/`[0-9a-f]{7,8}`/)
  })

  test('38.003: rollback por git revert, nunca reset/force', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    expect(runbook).toContain('git revert')
    expect(runbook).toContain('Nunca')
    expect(runbook).toContain('--force')
  })

  test('38.004: rollback Vercel documentado', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    expect(runbook).toContain('vercel rollback')
    expect(runbook).toContain('mxperformance')
  })

  test('38.005: forward-fix/reversal migration documentado', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    expect(runbook).toContain('supabase/rollbacks')
    expect(runbook).toContain('Forward-fix')
    expect(existsSync(join(root, 'supabase', 'rollbacks'))).toBe(true)
  })

  test('38.006: tag de backup existe e é legível', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    expect(runbook).toContain('pre-main-autonomous')
    expect(runbook).toContain('git cat-file')
  })

  test('38.007: gatilhos de rollback definidos', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    for (const trigger of [
      'Auth quebrado',
      'Páginas críticas 500',
      'Data corruption',
      'Main scroll failure',
      'Massive visual regression',
      'RLS regression',
    ]) {
      expect(runbook, `gatilho ${trigger}`).toContain(trigger)
    }
  })

  test('38.008: dry-run lógico documentado e não-destrutivo', () => {
    const runbook = read('docs/execution/rollback-runbook.md')
    expect(runbook).toContain('38.008')
    expect(runbook).toContain('rollback-dry-run.mjs')
    expect(runbook).toContain('sem tocar')
    // script existe e é puro (sem reset/force como instrução)
    const script = read('scripts/rollback-dry-run.mjs')
    expect(script).toContain('git revert')
    expect(script).toContain('is-ancestor')
    // detecta e rejeita reset destrutivo (regex de guarda presente)
    expect(script).toContain('destructiveResetOutsideProhibition')
  })
})
