import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * Contrato de integridade do stdout do inventário de rotas.
 *
 * `scripts/audit_route_data_inventory.mjs --json` emite um JSON grande (~119 KB:
 * 109 rotas + inventário de tabelas/RPCs/edge functions). O consumidor real
 * (`scripts/generate_foundation_zero_route_matrix.ts`) usa `execFileSync` +
 * `JSON.parse`. Sob consumidor **node**, `console.log(JSON.stringify(...))`
 * seguido de `process.exit()` trunca o stdout no buffer do pipe (65.536 bytes)
 * — `JSON.parse` falha com "Unterminated string in JSON at position 65536".
 *
 * IMPORTANTE: o runner bun engole o stdout de subprocessos diretos, mascarando
 * a truncagem E o próprio `PARSE_OK` do consumidor. Por isso o consumidor aqui
 * é um processo **node** real que (a) reproduz o caminho de produção com
 * `execFileSync` + `JSON.parse` e (b) grava o marcador de sucesso num arquivo
 * via `fs.writeFileSync` — o teste lê o arquivo via fs, fora do pipe engolido.
 */
function consumerScript(outPath: string) {
  return `
    const { execFileSync } = require('node:child_process');
    const fs = require('node:fs');
    const out = execFileSync('node', ['scripts/audit_route_data_inventory.mjs', '--json'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    JSON.parse(out);
    fs.writeFileSync(${JSON.stringify(outPath)}, 'PARSE_OK:' + out.length);
  `
}

describe('route data inventory stdout contract', () => {
  test('consumidor node recebe JSON íntegro e parseável do audit --json', () => {
    const dir = join(tmpdir(), `c8-stdout-${randomUUID()}`)
    mkdirSync(dir, { recursive: true })
    const outPath = join(dir, 'marker.txt')
    try {
      for (let iteration = 0; iteration < 5; iteration += 1) {
        rmSync(outPath, { force: true })
        const result = spawnSync('node', ['-e', consumerScript(outPath)], { encoding: 'utf8' })
        expect(
          result.status,
          `iteração ${iteration} — stdout truncado? stderr: ${result.stderr.slice(0, 160)}`,
        ).toBe(0)
        const marker = readFileSync(outPath, 'utf8')
        expect(marker.trim()).toMatch(/^PARSE_OK:\d+$/)
      }
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }, 60000)
})
