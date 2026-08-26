import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * C8 — captura determinística de stdout de subprocesso (versão .mjs).
 *
 * Mesma técnica de `src/test/lib/captureSubprocess.ts`: o bun test 1.3.5 engole
 * o stdout de subprocessos diretos, então o comando roda dentro de um wrapper
 * `node -e` que grava a saída num arquivo temporário, lido aqui via fs.
 */
export function captureCommandOutput(command, args, opts = {}) {
  const dir = join(tmpdir(), `c8-capture-${randomUUID()}`)
  mkdirSync(dir, { recursive: true })
  const outPath = join(dir, 'out.txt')
  const script = [
    "const { execFileSync } = require('node:child_process');",
    "const fs = require('node:fs');",
    `const out = execFileSync(${JSON.stringify(command)}, ${JSON.stringify(args)}, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });`,
    `fs.writeFileSync(${JSON.stringify(outPath)}, out);`,
  ].join(' ')
  try {
    const result = spawnSync('node', ['-e', script], { ...opts, encoding: 'utf8' })
    let stdout = ''
    try {
      stdout = readFileSync(outPath, 'utf8')
    } catch {
      // Comando falhou antes de gravar — status carrega o código real.
    }
    return { stdout, status: result.status }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
