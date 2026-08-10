import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')

function runGate() {
  const res = spawnSync('node', ['scripts/audit-page-layout-contract.mjs', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' }
}

describe('Contrato de layout — proibido wrapper estrutural fora do canvas', () => {
  it('gate audit-page-layout-contract deve passar (zero violações)', () => {
    const { status, stdout, stderr } = runGate()
    const detail = stdout.trim().slice(0, 2000) || stderr.trim().slice(0, 2000)
    expect(status, `Gate falhou (exit ${status}):\n${detail}`).toBe(0)
  })
})
