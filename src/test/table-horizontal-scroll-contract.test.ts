import { describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

/**
 * O gate parseia todo o `src` com AST TypeScript (~8s), então o resultado é
 * computado UMA vez no escopo do módulo — os testes apenas leem o cache.
 * Um `spawnSync` por teste estouraria o timeout de 5s do bun.
 */
const gate = (() => {
  const res = spawnSync('node', ['scripts/lint-table-horizontal-scroll.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  const violations = (res.stdout ? JSON.parse(res.stdout).violations : []) as Array<{
    file: string
    line: number
  }>
  return { status: res.status, violations }
})()

/**
 * Residuais da FASE I 09.012 — páginas canônicas com `overflow-x-auto` cru para
 * tabela horizontal.
 *
 * Fechado em 2026-08-13: os quatro residuais congelados (ManagerRankingReference,
 * ManagerTeamRoutineCanonical, ManagerDailyClosing.container e
 * ManagerDailyClosingBase44) foram migrados para `ScrollableRegion`. O orçamento
 * agora exige ZERO violações: qualquer ocorrência nova falha o contrato.
 */
const RESIDUAL: Record<string, string> = {}

describe('contrato FASE I — scroll horizontal local de tabela em página canônica', () => {
  test('gate lint-table-horizontal-scroll executa e responde status de saída', () => {
    expect(typeof gate.status).toBe('number')
  })

  test('toda violação fora do orçamento residual é migrada para ScrollableRegion', () => {
    const pending = gate.violations.filter(
      (v) => !RESIDUAL[`${v.file}:${v.line}`],
    )
    expect(pending, `violações não-residuais (migrar para ScrollableRegion):\n${JSON.stringify(pending, null, 2)}`).toEqual([])
  })

  test('cada residual documentado ainda está presente (orçamento não apodrece)', () => {
    const keys = new Set(gate.violations.map((v) => `${v.file}:${v.line}`))
    const stale = Object.keys(RESIDUAL).filter((key) => !keys.has(key))
    expect(stale, `residuais já migrados — remover do orçamento RESIDUAL:\n${stale.join('\n')}`).toEqual([])
  })
})
