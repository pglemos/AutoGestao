import assert from 'node:assert/strict'
import test from 'node:test'
import { captureCommandOutput } from './lib/captureSubprocess.mjs'

test('o grafo do Dono bloqueia namespaces runtime retirados', () => {
  // C8: `spawnSync` direto devolve stdout vazio sob `bun test` — o wrapper grava
  // a saída em arquivo e o teste lê via fs.
  const result = captureCommandOutput(process.execPath, ['scripts/audit-owner-b44-graph.mjs', '--check'], {
    cwd: process.cwd(),
  })

  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /Found 0 runtime imports/)
})
