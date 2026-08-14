#!/usr/bin/env node
/**
 * Foundation Zero AC-29.010 — gate de raw color fora de allowlist.
 *
 * Cor pertence aos tokens semânticos `--mx-*`. Este gate flagra utilitários de
 * cor com valor literal (hex cru, `rgb(...)`, `hsl(...)`) sem referência a
 * `var(--mx-*)` no runtime — o mesmo raciocínio do `lint-visual-raw`
 * (07.014), mas como gate de allowlist/ratchet: qualquer arquivo NOVO fora da
 * allowlist viola; a allowlist só pode encolher.
 *
 * Diferença do `lint-colors.mjs` (T4.9): este gate é 100% fs (readdir/readFile,
 * zero subprocesso), então o contrato bun test lê bytes reais — imune ao C8
 * (bun test 1.3.5 engole stdout de subprocessos). O `lint-colors` via `rg`
 * passava VACUAMENTE sob bun test.
 *
 * Excluídos (denominadores corretos):
 *   - Definições de tokens (`src/design-system/tokens/**`, `src/index.css`)
 *   - `base44-reference`, `_stories`, arquivos de teste/playwright
 *   - Landing pública isolada (sistema visual próprio, coberta por snapshots)
 *   - `chartTokens.*` e `var(--mx-*)` (já tokenizados)
 *
 * Allowlist: KEEP documentados, um por arquivo, com justificativa escrita.
 * Ratchet: o contrato falha se um arquivo fora da allowlist aparecer OU se a
 * allowlist crescer além do orçamento.
 *
 * Puramente read-only: zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-raw-color-allowlist.mjs
 *   node scripts/lint-raw-color-allowlist.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

/**
 * Utilitário de cor com valor literal que NÃO referencia `var(--mx-*)`.
 * Grupo 1 = prefixo (ex.: `bg`), Grupo 2 = valor arbitrário.
 * Prefixos de cor cobertos: bg/text/border/ring/from/to/via/fill/stroke/
 * divide/accent/caret/placeholder/decoration + hover/focus/group-hover.
 */
const COLOR_UTILITY = /(?:^|[\s'"`])((?:!)?(?:bg|text|border|ring|from|to|via|fill|stroke|decoration|divide|accent|caret|placeholder|hover:bg|hover:text|focus:ring|focus:border|group-hover:bg|group-hover:text))-\[([^\]]+)\]/g

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

export function inspectRawColor(source, file = '<inline>') {
  const violations = []
  const lines = source.split('\n')
  lines.forEach((line, index) => {
    for (const match of line.matchAll(COLOR_UTILITY)) {
      const prefix = match[1]
      const value = match[2].trim()
      if (/^(?:#|rgb|hsl)/.test(value) && !value.includes('var(--mx')) {
        violations.push({
          file,
          line: index + 1,
          utility: `${prefix}-[${value}]`,
        })
      }
    }
  })
  return violations
}

export function runRawColorGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    if (shouldExclude(relative)) continue
    const source = fs.readFileSync(filePath, 'utf8')
    const found = inspectRawColor(source, relative).filter((v) => !ALLOWLIST.has(v.file))
    violations.push(...found)
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runRawColorGate()
  const result = {
    gate: 'lint-raw-color-allowlist',
    pass: violations.length === 0,
    violationCount: violations.length,
    allowlistSize: ALLOWLIST.size,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log(`[lint-raw-color-allowlist] OK — ${ALLOWLIST.size} arquivo(s) allowlisted; nenhuma cor literal fora da allowlist`)
  } else {
    console.error(`[lint-raw-color-allowlist] ${violations.length} utilitário(s) de cor literal fora da allowlist:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} ${violation.utility}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
