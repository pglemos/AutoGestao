#!/usr/bin/env node
/**
 * Foundation Zero AC-29.013 — gate de z-index arbitrário (allowlist/ratchet).
 *
 * A escala fechada de z-index está em `src/design-system/tokens/components.css`
 * (`--mx-z-base|sticky|sidebar|topbar|drawer|overlay|modal|popover|toast|
 * tooltip`). Este gate flagra z-index arbitrário no runtime:
 *   R1 z-arbitrary      : `z-[N]` com valor numérico literal.
 *   R2 z-numeric        : `z-N` (utilitário Tailwind numérico).
 *   R3 z-index-numeric  : `z-index: N` (declaração CSS literal).
 *   R4 z-index-inline   : `zIndex: N` (propriedade inline literal).
 *
 * O `lint-z-index.mjs` já audita a escala (zero-tolerance). Este gate é o
 * análogo de allowlist/ratchet 100% fs (readdir/readFile, zero subprocesso) —
 * imune ao C8 do bun test — e expõe o orçamento de exceções: a allowlist só
 * pode encolher.
 *
 * Excluídos (denominadores corretos): definições de tokens, base44-reference,
 * _stories, testes/playwright, landing pública isolada (sistema próprio).
 *
 * Puramente read-only: zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-arbitrary-z-index.mjs
 *   node scripts/lint-arbitrary-z-index.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

const Z_ARBITRARY = /\bz-\[(\d+)\]/g
const Z_NUMERIC = /\bz-(\d+)\b/g
const Z_INDEX_NUMERIC = /\bz-index\s*:\s*(-?\d+)\b/g
const Z_INDEX_INLINE_NUMERIC = /\bzIndex\s*:\s*(-?\d+)\b/g

/**
 * KEEP por arquivo (caminho relativo). Só se acrescenta linha aqui com
 * justificativa escrita — e o contrato falha se a lista crescer.
 */
export const ALLOWLIST = new Map([
  // 'src/components/x/Y.tsx': 'justificativa',
])

function shouldExclude(relative) {
  return (
    relative.startsWith('src/design-system/tokens/') ||
    relative.endsWith('src/index.css') ||
    relative.startsWith('src/base44-reference/') ||
    relative.includes('/_stories/') ||
    relative.startsWith('src/features/landing/') ||
    /\.(test|spec|playwright)\./.test(relative)
  )
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'base44-reference', '_stories'].includes(entry.name)) {
        walk(full, files)
      }
    } else if (
      SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
      !/\.(test|spec|playwright)\./.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

export function inspectArbitraryZIndex(source, file = '<inline>') {
  const violations = []
  const lines = source.split('\n')

  lines.forEach((line, index) => {
    for (const match of line.matchAll(Z_ARBITRARY)) {
      violations.push({ file, line: index + 1, rule: 'z-arbitrary', utility: `z-[${match[1]}]` })
    }
    for (const match of line.matchAll(Z_NUMERIC)) {
      violations.push({ file, line: index + 1, rule: 'z-numeric', utility: `z-${match[1]}` })
    }
    for (const match of line.matchAll(Z_INDEX_NUMERIC)) {
      if (/\bvar\(--mx-z-/.test(line)) continue // token semântico
      violations.push({ file, line: index + 1, rule: 'z-index-numeric', utility: `z-index: ${match[1]}` })
    }
    for (const match of line.matchAll(Z_INDEX_INLINE_NUMERIC)) {
      if (/\bvar\(--mx-z-/.test(line)) continue // token semântico
      violations.push({ file, line: index + 1, rule: 'z-index-inline', utility: `zIndex: ${match[1]}` })
    }
  })

  return violations
}

export function runArbitraryZIndexGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    if (shouldExclude(relative)) continue
    const source = fs.readFileSync(filePath, 'utf8')
    const found = inspectArbitraryZIndex(source, relative).filter((v) => !ALLOWLIST.has(v.file))
    violations.push(...found)
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runArbitraryZIndexGate()
  const result = {
    gate: 'lint-arbitrary-z-index',
    pass: violations.length === 0,
    violationCount: violations.length,
    allowlistSize: ALLOWLIST.size,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log(`[lint-arbitrary-z-index] OK — ${ALLOWLIST.size} arquivo(s) allowlisted; nenhum z-index arbitrário fora da allowlist`)
  } else {
    console.error(`[lint-arbitrary-z-index] ${violations.length} z-index arbitrário fora da allowlist:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.rule}) ${violation.utility}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
