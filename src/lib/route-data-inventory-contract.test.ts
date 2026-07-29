import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const script = 'scripts/audit_route_data_inventory.mjs'
const report = 'docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md'

describe('route and data inventory contract', () => {
  test('all protected leaf routes are governed by the canonical access matrix', () => {
    expect(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' })).not.toThrow()
  })

  test('the committed matrix matches the current runtime sources', () => {
    const current = execFileSync('node', [script], { encoding: 'utf8' })
    expect(readFileSync(report, 'utf8')).toBe(current)
  })
})
