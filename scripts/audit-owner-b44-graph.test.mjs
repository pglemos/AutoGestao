import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

test('o grafo do Dono bloqueia namespaces runtime retirados', () => {
  const result = spawnSync(process.execPath, ['scripts/audit-owner-b44-graph.mjs', '--check'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /Found 0 runtime imports/)
})
