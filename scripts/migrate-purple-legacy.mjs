#!/usr/bin/env node
/**
 * 07.007 — Migra purple/violet legacy (info-legacy + review-chromatic)
 * para os utilitários semânticos `status-info-*` (canonical info).
 * Rose-800/900 (red dark) -> text-status-error-text.
 *
 * Fonte: `.superpowers/mx-foundation-zero/color/07-002-classificacao.json`.
 * Precedente: 07.006 (status colors). Purple e violet são classificados
 * como `info / accent-blue (purple legado)`. O token canônico da família
 * info é `--mx-status-info` (hsl); `--color-accent-purple` é alias do mesmo
 * HSL, então a normalização do contrato de paridade visual mapeia purple
 * e violet para `bg-status-info-*` / `text-status-info-text`.
 *
 * Decisões:
 * - text 700-900 -> text-status-info-text (info-strong-legacy + canônico).
 * - text 500/600 -> text-status-info-text; text 300/400 -> text-status-info.
 * - bg 700 -> bg-status-info; bg 500/600 -> bg-status-info;
 *   bg 50/100 -> bg-status-info-surface (info-subtle-legacy).
 * - borders 100/200/300 -> border-status-info/20|30|40; 400/500/600 -> sólido.
 * - rings -> ring-status-info (sólido) | /40 (mid).
 * - `text-rose-800/900` -> text-status-error-text (red dark -> erro textual).
 *
 * Exceções (mantidas): rose != 800/900 (pink/rose-300...), fuchsia,
 * #6D28D9 hex (purple-legacy em hex, FASE H arbitrárias), base44-reference,
 * whatsapp, chart-*.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const INFO = 'info'
const ERROR = 'error'

const RULES = [
  // ---- text purple ----
  { re: /text-purple-900/g, to: 'text-status-info-text', family: INFO },
  { re: /text-purple-800/g, to: 'text-status-info-text', family: INFO },
  { re: /text-purple-700/g, to: 'text-status-info-text', family: INFO },
  { re: /text-purple-600/g, to: 'text-status-info-text', family: INFO },
  { re: /text-purple-500/g, to: 'text-status-info-text', family: INFO },
  { re: /text-purple-400/g, to: 'text-status-info-text', family: INFO },
  { re: /text-purple-300/g, to: 'text-status-info-text', family: INFO },

  // ---- text violet (review-chromatic -> info canônico) ----
  { re: /text-violet-900/g, to: 'text-status-info-text', family: INFO },
  { re: /text-violet-800/g, to: 'text-status-info-text', family: INFO },
  { re: /text-violet-700/g, to: 'text-status-info-text', family: INFO },
  { re: /text-violet-600/g, to: 'text-status-info-text', family: INFO },
  { re: /text-violet-500/g, to: 'text-status-info-text', family: INFO },
  { re: /text-violet-400/g, to: 'text-status-info-text', family: INFO },
  { re: /text-violet-300/g, to: 'text-status-info-text', family: INFO },

  // ---- bg purple ----
  { re: /bg-purple-900/g, to: 'bg-status-info', family: INFO },
  { re: /bg-purple-800/g, to: 'bg-status-info', family: INFO },
  { re: /bg-purple-700/g, to: 'bg-status-info', family: INFO },
  { re: /bg-purple-600/g, to: 'bg-status-info', family: INFO },
  { re: /bg-purple-500/g, to: 'bg-status-info', family: INFO },
  { re: /bg-purple-100/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-purple-50(?!\d)/g, to: 'bg-status-info-surface', family: INFO },

  // ---- bg violet ----
  { re: /bg-violet-900/g, to: 'bg-status-info', family: INFO },
  { re: /bg-violet-800/g, to: 'bg-status-info', family: INFO },
  { re: /bg-violet-700/g, to: 'bg-status-info', family: INFO },
  { re: /bg-violet-600/g, to: 'bg-status-info', family: INFO },
  { re: /bg-violet-500/g, to: 'bg-status-info', family: INFO },
  { re: /bg-violet-100/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-violet-50(?!\d)/g, to: 'bg-status-info-surface', family: INFO },

  // ---- border purple/violet ----
  { re: /border-purple-100/g, to: 'border-status-info/20', family: INFO },
  { re: /border-purple-200/g, to: 'border-status-info/30', family: INFO },
  { re: /border-purple-300/g, to: 'border-status-info/40', family: INFO },
  { re: /border-purple-400/g, to: 'border-status-info/50', family: INFO },
  { re: /border-purple-500/g, to: 'border-status-info', family: INFO },
  { re: /border-purple-600/g, to: 'border-status-info', family: INFO },
  { re: /border-violet-100/g, to: 'border-status-info/20', family: INFO },
  { re: /border-violet-200/g, to: 'border-status-info/30', family: INFO },
  { re: /border-violet-300/g, to: 'border-status-info/40', family: INFO },
  { re: /border-violet-400/g, to: 'border-status-info/50', family: INFO },
  { re: /border-violet-500/g, to: 'border-status-info', family: INFO },
  { re: /border-violet-600/g, to: 'border-status-info', family: INFO },

  // ---- ring ----
  { re: /ring-purple-500/g, to: 'ring-status-info', family: INFO },
  { re: /ring-violet-400/g, to: 'ring-status-info/40', family: INFO },
  { re: /ring-violet-500/g, to: 'ring-status-info', family: INFO },

  // ---- from/to gradients ----
  { re: /from-purple-50/g, to: 'from-status-info-surface', family: INFO },
  { re: /from-purple-100/g, to: 'from-status-info-surface', family: INFO },
  { re: /from-purple-500/g, to: 'from-status-info', family: INFO },
  { re: /to-purple-500/g, to: 'to-status-info', family: INFO },
  { re: /from-violet-50/g, to: 'from-status-info-surface', family: INFO },
  { re: /from-violet-100/g, to: 'from-status-info-surface', family: INFO },
  { re: /from-violet-500/g, to: 'from-status-info', family: INFO },
  { re: /to-violet-500/g, to: 'to-status-info', family: INFO },

  // ---- hover/focus variants (preservar prefixos arbitrários) ----
  { re: /hover:bg-purple-700/g, to: 'hover:bg-status-info', family: INFO },
  { re: /hover:bg-violet-700/g, to: 'hover:bg-status-info', family: INFO },
  { re: /hover:text-purple-600/g, to: 'hover:text-status-info-text', family: INFO },
  { re: /hover:text-violet-600/g, to: 'hover:text-status-info-text', family: INFO },
  { re: /hover:border-violet-300/g, to: 'hover:border-status-info/40', family: INFO },
  { re: /focus:border-violet-400/g, to: 'focus:border-status-info/50', family: INFO },
  { re: /focus:ring-violet-400/g, to: 'focus:ring-status-info/40', family: INFO },

  // ---- rose legacy (red dark family) -> status-error ----
  { re: /text-rose-900/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-rose-800/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-rose-700/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-rose-600/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-rose-500/g, to: 'text-status-error', family: ERROR },
  { re: /text-rose-400/g, to: 'text-status-error', family: ERROR },
  { re: /bg-rose-900/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-rose-800/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-rose-700/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-rose-600/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-rose-500/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-rose-100/g, to: 'bg-status-error-surface', family: ERROR },
  { re: /bg-rose-50(?!\d)/g, to: 'bg-status-error-surface', family: ERROR },
  { re: /border-rose-100/g, to: 'border-status-error/20', family: ERROR },
  { re: /border-rose-200/g, to: 'border-status-error/30', family: ERROR },
  { re: /border-rose-300/g, to: 'border-status-error/40', family: ERROR },
  { re: /border-rose-400/g, to: 'border-status-error/50', family: ERROR },
  { re: /border-rose-500/g, to: 'border-status-error', family: ERROR },
  { re: /ring-rose-400/g, to: 'ring-status-error/40', family: ERROR },
  { re: /ring-rose-500/g, to: 'ring-status-error', family: ERROR },

  // ---- accent-purple-* aliases (consolidados em status-info canônico) ----
  { re: /text-accent-purple-strong/g, to: 'text-status-info-text', family: INFO },
  { re: /text-accent-purple-soft/g, to: 'text-status-info', family: INFO },
  { re: /text-accent-purple/g, to: 'text-status-info-text', family: INFO },
  { re: /bg-accent-purple-strong/g, to: 'bg-status-info', family: INFO },
  { re: /bg-accent-purple-soft/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-accent-purple/g, to: 'bg-status-info', family: INFO },
  { re: /border-accent-purple\/20/g, to: 'border-status-info/20', family: INFO },
  { re: /border-accent-purple\/30/g, to: 'border-status-info/30', family: INFO },
  { re: /border-accent-purple\/40/g, to: 'border-status-info/40', family: INFO },
  { re: /border-accent-purple\/50/g, to: 'border-status-info/50', family: INFO },
  { re: /border-accent-purple/g, to: 'border-status-info', family: INFO },
  { re: /ring-accent-purple\/40/g, to: 'ring-status-info/40', family: INFO },
  { re: /ring-accent-purple\/50/g, to: 'ring-status-info/50', family: INFO },
  { re: /ring-accent-purple/g, to: 'ring-status-info', family: INFO },
  { re: /from-accent-purple-soft/g, to: 'from-status-info-surface', family: INFO },
  { re: /from-accent-purple-strong/g, to: 'from-status-info', family: INFO },
  { re: /from-accent-purple/g, to: 'from-status-info', family: INFO },
  { re: /to-accent-purple-strong/g, to: 'to-status-info', family: INFO },
  { re: /to-accent-purple/g, to: 'to-status-info', family: INFO },
  { re: /hover:bg-accent-purple-strong/g, to: 'hover:bg-status-info', family: INFO },
  { re: /focus:border-accent-purple\/40/g, to: 'focus:border-status-info/40', family: INFO },
  { re: /focus:ring-accent-purple\/40/g, to: 'focus:ring-status-info/40', family: INFO },
]

export function applyPurpleLegacyRules(original) {
  let next = original
  const byFamily = {}
  let replacements = 0

  for (const rule of RULES) {
    next = next.replace(rule.re, (match) => {
      if (match === rule.to) return match
      byFamily[rule.family] = (byFamily[rule.family] || 0) + 1
      replacements += 1
      return rule.to
    })
  }

  return { next: normalizeNestedOpacity(next), replacements, byFamily }
}

/**
 * Quando a regra de borda adiciona uma opacidade semântica padrão (ex:
 * border-violet-200 -> border-status-info/30) e o fonte original já mantinha
 * uma opacidade explícita (border-violet-200/60), manter ambos resultaria em
 * utilitários inválidos como `border-status-info/30/60`. Mantemos o último.
 */
function normalizeNestedOpacity(value) {
  return value.replace(
    /(status-(?:success|warning|info|error)(?:-(?:surface|text|strong))?)\/(?:\d+|\[[^\]]+\])\/(\d+|\[[^\]]+\])/g,
    '$1/$2',
  )
}

function collectFiles() {
  const output = execSync(
    `rg -l "(text|bg|border|ring|from|to|fill|stroke|hover|focus)-(?:purple|violet|rose)-[0-9]+" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' 2>/dev/null || true`,
  )
    .toString()
    .trim()

  return output ? output.split('\n').filter(Boolean) : []
}

function main() {
  const counts = { files: 0, replacements: 0 }
  const byFamily = {}

  for (const file of collectFiles()) {
    const original = readFileSync(file, 'utf8')
    const result = applyPurpleLegacyRules(original)
    if (result.next === original) continue

    writeFileSync(file, result.next)
    counts.files += 1
    counts.replacements += result.replacements
    for (const [family, count] of Object.entries(result.byFamily)) {
      byFamily[family] = (byFamily[family] || 0) + count
    }
  }

  console.log(JSON.stringify({ ...counts, byFamily }, null, 2))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
