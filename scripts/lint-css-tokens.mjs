#!/usr/bin/env node
/**
 * T4.2 — Guard da fonte canônica de tokens (CSS).
 *
 * O `@theme` (Tailwind v4) e o `:root` de `src/index.css` são a ponte que
 * alimenta as classes utilitárias. Eles NÃO podem definir cores por hex/rgb
 * diretos: todo valor deve derivar de um primitivo `--mx-*` de
 * `src/design-system/tokens/primitives.css` (camada 1 da arquitetura DS).
 *
 * Comentários são ignorados (texto explicativo costuma citar hex históricos).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')
const INDEX_CSS = path.join(ROOT_DIR, 'src', 'index.css')
const PRIMITIVES_CSS = path.join(ROOT_DIR, 'src', 'design-system', 'tokens', 'primitives.css')

const text = fs.readFileSync(INDEX_CSS, 'utf8')
const primitivesText = fs.readFileSync(PRIMITIVES_CSS, 'utf8')
const argv = process.argv.slice(2)
const WARN_ONLY = argv.includes('--warn-only')

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '')
}

function stripStrings(src) {
  return src.replace(/url\([^)]*\)/g, '')
}

function sliceBlock(src, openMarker) {
  const start = src.indexOf(openMarker)
  if (start === -1) return ''
  const brace = src.indexOf('{', start)
  if (brace === -1) return ''
  let depth = 1
  let i = brace + 1
  for (; i < src.length && depth > 0; i++) {
    if (src[i] === '{') depth += 1
    else if (src[i] === '}') depth -= 1
  }
  return src.slice(brace + 1, i - 1)
}

const theme = sliceBlock(text, '@theme')
const root = sliceBlock(text, ':root')
const active = stripStrings(stripComments(`${theme}\n${root}`))

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const RGB_RE = /\b(?:rgba?|hsla?)\(/g

const violations = []
for (const match of active.matchAll(HEX_RE)) {
  violations.push({ value: match[0], offset: match.index, reason: 'hex direto' })
}
for (const match of active.matchAll(RGB_RE)) {
  if (/hsl\(\s*var\(/.test(active.slice(match.index, match.index + 40))) continue
  violations.push({ value: active.slice(match.index, match.index + 12), offset: match.index, reason: 'função rgb()/hsl() direta' })
}

function lineOf(offset) {
  return text.slice(0, offset).split('\n').length
}

const definedPrimitives = new Set(
  [...primitivesText.matchAll(/--([\w-]+)\s*:/g)].map((m) => m[1]),
)

for (const violation of violations) {
  console.error(`  ${INDEX_CSS.replace(ROOT_DIR + '/', '')}:${lineOf(violation.offset)}  ${violation.value}  (${violation.reason})`)
}

if (violations.length === 0) {
  console.log(`[lint-css-tokens] OK — @theme e :root sem hex/rgb diretos; ${definedPrimitives.size} primitivos disponíveis.`)
  process.exit(0)
}

console.error(`\n[lint-css-tokens] ${violations.length} violação(ões) de fonte canônica.`)
console.error('Valores de cor no @theme/:root devem ser `hsl(var(--mx-*))`.')
process.exit(WARN_ONLY ? 0 : 1)
