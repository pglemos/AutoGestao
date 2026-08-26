import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { captureCommandOutput } from './lib/captureSubprocess.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('audita os alvos atuais de estilos internos sem depender de arquivos removidos', () => {
  // C8: `spawnSync` direto devolve stdout vazio sob `bun test` — o wrapper grava
  // a saída em arquivo e o teste lê via fs.
  const result = captureCommandOutput(process.execPath, ['scripts/check-internal-mx-styles.mjs'], {
    cwd: projectRoot,
  })

  assert.equal(result.status, 0, result.stdout)
  assert.match(result.stdout, /^OK: \d+ arquivos/m)
})
