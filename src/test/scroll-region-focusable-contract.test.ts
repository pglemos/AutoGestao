import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { captureCommandOutput } from './lib/captureSubprocess'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')

/**
 * O gate parseia todo o `src` com AST TypeScript (~8s), então o resultado é
 * computado UMA vez no escopo do módulo — os testes apenas leem o cache.
 *
 * C8: `spawnSync` direto teria o stdout engolido pelo bun test (blind-pass);
 * `captureCommandOutput` grava o stdout do gate num arquivo via node e o teste
 * lê por fs.
 */
const gate = (() => {
  const res = captureCommandOutput('node', ['scripts/lint-scroll-region-focusable.mjs', '--json'], {
    cwd: ROOT,
  })
  const violations = (res.stdout ? JSON.parse(res.stdout).violations : []) as Array<{
    file: string
    line: number
  }>
  return { status: res.status, violations }
})()

/**
 * Residuais da FASE I — região declarada (`data-mx-scroll-region`) não-focável
 * envolvendo tabela.
 *
 * Fechado em 2026-08-13: o residual `AdminStoreMatrixTable` (/sales-performance)
 * foi migrado para o primitivo `ScrollableRegion`. O orçamento agora exige ZERO
 * violações: qualquer ocorrência nova falha o contrato.
 */
const RESIDUAL: Record<string, string> = {}

describe('contrato FASE I — região de rolagem declarada é focável (tabela)', () => {
  test('gate lint-scroll-region-focusable executa e responde status de saída', () => {
    expect(typeof gate.status).toBe('number')
  })

  test('toda região declarada não-focável fora do orçamento é migrada para ScrollableRegion', () => {
    const pending = gate.violations.filter((v) => !RESIDUAL[`${v.file}:${v.line}`])
    expect(pending, `violações não-residuais (usar ScrollableRegion):\n${JSON.stringify(pending, null, 2)}`).toEqual([])
  })

  test('cada residual documentado ainda está presente (orçamento não apodrece)', () => {
    const keys = new Set(gate.violations.map((v) => `${v.file}:${v.line}`))
    const stale = Object.keys(RESIDUAL).filter((key) => !keys.has(key))
    expect(stale, `residuais já migrados — remover do orçamento RESIDUAL:\n${stale.join('\n')}`).toEqual([])
  })
})
