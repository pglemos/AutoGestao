import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

import { captureCommandOutput } from '../test/lib/captureSubprocess'

const script = 'scripts/audit_route_data_inventory.mjs'
const report = 'docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md'

describe('route and data inventory contract', () => {
  test('all protected leaf routes are governed by the canonical access matrix', () => {
    expect(() => execFileSync('node', [script, '--check'], { stdio: 'pipe' })).not.toThrow()
  }, 30000)

  test('the committed matrix matches the current runtime sources', () => {
    // C8: bun test 1.3.5 engole o stdout de subprocessos diretos — `execFileSync`
    // aqui retornaria vazio. O wrapper node grava o stdout do script num arquivo
    // e o teste lê via fs.
    const current = captureCommandOutput('node', [script]).stdout
    expect(readFileSync(report, 'utf8')).toBe(current)
  }, 30000)
})
