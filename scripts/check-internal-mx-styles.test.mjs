import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('audita os alvos atuais de estilos internos sem depender de arquivos removidos', () => {
  const result = spawnSync(process.execPath, ['scripts/check-internal-mx-styles.mjs'], {
    cwd: projectRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /^OK: \d+ arquivos/m)
})
