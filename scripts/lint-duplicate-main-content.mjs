#!/usr/bin/env node
/**
 * Foundation Zero AC-29.015 — gate de duplicate `main-content`.
 *
 * O shell autenticado emite exatamente um `<main id="main-content">` (skip-link
 * aponta para ele, o RouteAnnouncer move o foco para ele e `page.locator('main')`
 * depende dessa unicidade — 08.002). Uma página que renderiza o próprio
 * `id="main-content"` (ou um segundo `<main id="main-content">`) quebra o
 * skip-link, o anúncio de rota e o strict mode do Playwright.
 *
 * Páginas servidas FORA do shell (login, landing, erro, termos) usam `<main>`
 * sem `id="main-content"` — a landmark `main` delas é coberta pelo
 * `lint-landmarks`; este gate é SÓ sobre a identidade `main-content`.
 *
 * Regras:
 *   R1 duplicate-main-content : qualquer arquivo fora do shell declarando
 *                               `id="main-content"` (segunda landmark).
 *   R2 shell-main-content-count: o shell deve declarar `id="main-content"`
 *                               exatamente 1× (nem 0 nem 2+).
 *
 * Puramente read-only: regex determinístico, zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-duplicate-main-content.mjs
 *   node scripts/lint-duplicate-main-content.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

/** Único renderizador autorizado de `id="main-content"`: o shell. */
const SHELL_FILE = 'src/components/MxSidebarShell.tsx'

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

/**
 * `id="main-content"`, `id='main-content'`, `id={"main-content"}`,
 * `id={'main-content'}`… Negativo: `data-id="main-content"` (outro atributo)
 * e `aria-labelledby="main-content"` (referência) não contam.
 */
const MAIN_CONTENT_ID = /(?<![\w-])id\s*=\s*\{?\s*["'`]main-content["'`]\s*\}?/

/** Fora de comentários de bloco/linha (o shell usa atributo JSX real). */
function isCodeLine(line) {
  return !/^\s*(?:\/\/|\*|\/\*)/.test(line)
}

/** Atributo `id` literal (não `data-id`, não referência). */
function isIdAttribute(line) {
  return MAIN_CONTENT_ID.test(line)
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

export function inspectDuplicateMainContent(source, file = '<inline>') {
  const violations = []
  const lines = source.split('\n')
  lines.forEach((line, index) => {
    if (isCodeLine(line) && isIdAttribute(line)) {
      violations.push({ file, line: index + 1 })
    }
  })
  return violations
}

export function runDuplicateMainContentGate() {
  const violations = []
  let shellOccurrences = 0

  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    const source = fs.readFileSync(filePath, 'utf8')
    const found = inspectDuplicateMainContent(source, relative)

    if (relative === SHELL_FILE) {
      shellOccurrences = found.length
      continue
    }
    for (const violation of found) {
      violations.push({ ...violation, rule: 'duplicate-main-content' })
    }
  }

  if (shellOccurrences !== 1) {
    violations.push({
      file: SHELL_FILE,
      line: 0,
      rule: 'shell-main-content-count',
      detail: `o shell deve declarar id="main-content" exatamente 1× (encontrado ${shellOccurrences})`,
    })
  }

  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runDuplicateMainContentGate()
  const result = {
    gate: 'lint-duplicate-main-content',
    pass: violations.length === 0,
    violationCount: violations.length,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log('[lint-duplicate-main-content] OK — um único main#main-content no shell')
  } else {
    console.error(`[lint-duplicate-main-content] ${violations.length} violação(ões) de duplicate main-content:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.rule})${violation.detail ? ` ${violation.detail}` : ''}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
