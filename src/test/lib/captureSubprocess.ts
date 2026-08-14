import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * C8 — captura determinística de stdout de subprocesso.
 *
 * O bun test 1.3.5 engole o stdout de subprocessos diretos (git|rg|node|pwd)
 * quando o arquivo de teste vive sob o project root. A tentativa original de
 * desvio via FD-redirect (`spawnSync(..., stdio: ['ignore', fd, 'inherit'])`)
 * NÃO funciona — o bun engole o fd mesmo com arquivo real; medido: bytes vazios.
 *
 * A técnica que funciona (validada por probe) é o wrapper `node -e`: o node
 * roda o comando de verdade como filho dele (neto do bun), captura o stdout
 * dentro do processo node e grava via `fs.writeFileSync` num arquivo
 * temporário. O teste lê o arquivo via fs — fora de qualquer pipe que o runner
 * engole.
 *
 * Mesmo padrão de src/test/lib/scanSourceFiles.ts (readdir/readFile): nenhum
 * stdout de subprocesso direto é lido pelo teste.
 */
export function captureCommandOutput(
  command: string,
  args: string[],
  opts: { cwd?: string } = {},
): { stdout: string; status: number | null } {
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
      // Comando falhou antes de gravar (exit != 0) — stdout fica vazio e o
      // status carrega o código de erro real.
    }
    return { stdout, status: result.status }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
