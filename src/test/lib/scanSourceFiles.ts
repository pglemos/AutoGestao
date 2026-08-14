import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

/**
 * Varredura 100% fs de arquivos fonte — C8.
 *
 * O bun test 1.3.5 engole o stdout de subprocessos diretos (git|rg|node), o
 * que faz contratos que rodam `rg`/`git grep` e esperam resultado vazio
 * passarem VACUAMENTE (blind-pass), e contratos que esperam bytes reais
 * falharem falso-RED. Este helper substitui os subprocessos por
 * readdir/readFile puro — mesma família de `auditVisualRaw()` do
 * visual-raw-guard-contract. Nenhum pipe, nenhum subprocesso: determinístico.
 *
 * `roots` são caminhos relativos ao root (arquivo ou diretório). `extraExcluded`
 * são globs (`**`, `*`) relativos ao root, aplicados ALÉM de node_modules.
 */
const ROOT = resolve(import.meta.dir, '../../..')

const RUNTIME_EXT = new Set(['.css', '.ts', '.tsx', '.js', '.jsx', '.mjs'])

function globToRegExp(pattern: string): RegExp {
  let escaped = ''
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i]
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        escaped += '.*'
        i++
      } else {
        escaped += '[^/]*'
      }
    } else if ('\\^$.|?+()[]{}'.includes(ch)) {
      escaped += '\\' + ch
    } else {
      escaped += ch
    }
  }
  return new RegExp(`^${escaped}$`)
}

export interface SourceFile {
  rel: string
  lines: string[]
}

export interface ScanOptions {
  roots?: string[]
  extraExcluded?: string[]
}

export function scanSourceFiles(options: ScanOptions = {}): SourceFile[] {
  const roots = options.roots ?? ['src']
  const exclusions = ['**/node_modules/**', ...(options.extraExcluded ?? [])].map(globToRegExp)
  const out: SourceFile[] = []

  const isExcluded = (rel: string) => exclusions.some((re) => re.test(rel))

  const push = (abs: string) => {
    const rel = relative(ROOT, abs)
    if (isExcluded(rel)) return
    if (!RUNTIME_EXT.has(extname(rel))) return
    out.push({ rel, lines: readFileSync(abs, 'utf8').split('\n') })
  }

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        walk(abs)
      } else {
        push(abs)
      }
    }
  }

  for (const root of roots) {
    const abs = join(ROOT, root)
    const stat = statSync(abs)
    if (stat.isDirectory()) walk(abs)
    else push(abs)
  }

  return out
}
