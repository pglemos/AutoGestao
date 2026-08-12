#!/usr/bin/env node
/**
 * 07.015 — Complemento pontual da 07.006: variantes 500+/950/gradientes das
 * famílias de status (emerald/amber/red/blue/orange) que ficaram de fora do
 * mapa original — arquivos criados após 07.006 ou variantes não cobertas
 * (`-950`, `to-*600`, `ring-*600/900`, `hover:text-*800`, `active:bg-*950`).
 *
 * Mapa segue o 07.006/07.002:
 * - text-*-950/900/800/700/600 -> text-status-{success,warning,error,info}-text
 * - bg-*-950 -> bg-status-* (sólido; dark shade do status);
 * - to-{blue,emerald,red}-{500,600} (gradientes de destaque) -> to-status-*;
 * - ring-{blue,red}-{600,900} -> ring-status-*;
 * - hover:text-orange-800 / hover:bg-blue-600 -> variants do status;
 * - active:bg-blue-950 -> active:bg-status-info.
 * - text-blue-700 standalone (destaque sobre info) -> text-status-info-text.
 *
 * Exceções (mantidas): shades 300/400 decorativas, hexes arbitrários
 * (#005BFF etc. — FASE H), chart-*, base44-reference, whatsapp,
 * design-system tokens, index.css.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SUCCESS = 'success'
const WARNING = 'warning'
const ERROR = 'error'
const INFO = 'info'

const RULES = [
  // ---- text 950/900/800/700/600 -> status-*-text ----
  { re: /text-emerald-950/g, to: 'text-status-success-text', family: SUCCESS },
  { re: /text-amber-950/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-900/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-800/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-700/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-600/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-blue-950/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-900/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-800/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-700/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-600/g, to: 'text-status-info-text', family: INFO },
  { re: /text-orange-800/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-orange-700/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-orange-600/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-red-800/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-700/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-600/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-500/g, to: 'text-status-error', family: ERROR },

  // ---- bg 950 -> status sólido ----
  { re: /bg-blue-950/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-900/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-800/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-700/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-600/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-500/g, to: 'bg-status-info', family: INFO },
  { re: /bg-emerald-600/g, to: 'bg-brand-primary', family: SUCCESS },
  { re: /bg-amber-950/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-900/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-800/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-700/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-600/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-500/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-red-800/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-700/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-600/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-500/g, to: 'bg-status-error', family: ERROR },

  // ---- gradientes de destaque ----
  { re: /to-blue-600/g, to: 'to-status-info', family: INFO },
  { re: /to-blue-500/g, to: 'to-status-info', family: INFO },
  { re: /to-emerald-500/g, to: 'to-status-success', family: SUCCESS },
  { re: /to-red-500/g, to: 'to-status-error', family: ERROR },

  // ---- ring 600/900 -> ring-status-* ----
  { re: /ring-blue-600/g, to: 'ring-status-info', family: INFO },
  { re: /ring-blue-900/g, to: 'ring-status-info', family: INFO },
  { re: /ring-red-600/g, to: 'ring-status-error', family: ERROR },
  { re: /ring-red-900/g, to: 'ring-status-error', family: ERROR },
  { re: /ring-amber-600/g, to: 'ring-status-warning', family: WARNING },
  { re: /ring-amber-900/g, to: 'ring-status-warning', family: WARNING },

  // ---- border 700/900 (sólidos escuros não cobertos pela 07.006) ----
  { re: /border-amber-700/g, to: 'border-status-warning', family: WARNING },
  { re: /border-amber-800/g, to: 'border-status-warning', family: WARNING },
  { re: /border-amber-900/g, to: 'border-status-warning', family: WARNING },
  { re: /border-emerald-700/g, to: 'border-status-success', family: SUCCESS },
  { re: /border-emerald-800/g, to: 'border-status-success', family: SUCCESS },
  { re: /border-emerald-900/g, to: 'border-status-success', family: SUCCESS },
  { re: /border-red-700/g, to: 'border-status-error', family: ERROR },
  { re: /border-red-800/g, to: 'border-status-error', family: ERROR },
  { re: /border-red-900/g, to: 'border-status-error', family: ERROR },
  { re: /border-blue-600/g, to: 'border-status-info', family: INFO },
  { re: /border-blue-700/g, to: 'border-status-info', family: INFO },
  { re: /border-blue-800/g, to: 'border-status-info', family: INFO },
  { re: /border-blue-900/g, to: 'border-status-info', family: INFO },
  { re: /border-orange-700/g, to: 'border-status-warning', family: WARNING },
  { re: /border-orange-800/g, to: 'border-status-warning', family: WARNING },
  { re: /border-orange-900/g, to: 'border-status-warning', family: WARNING },

  // ---- hover/focus/active variants ----
  { re: /hover:text-orange-800/g, to: 'hover:text-status-warning-text', family: WARNING },
  { re: /hover:bg-blue-600/g, to: 'hover:bg-status-info', family: INFO },
  { re: /hover:bg-blue-700/g, to: 'hover:bg-status-info', family: INFO },
  { re: /hover:bg-red-600/g, to: 'hover:bg-status-error', family: ERROR },
  { re: /hover:bg-red-700/g, to: 'hover:bg-status-error', family: ERROR },
  { re: /hover:bg-amber-600/g, to: 'hover:bg-status-warning', family: WARNING },
  { re: /hover:bg-amber-700/g, to: 'hover:bg-status-warning', family: WARNING },
  { re: /active:bg-blue-950/g, to: 'active:bg-status-info', family: INFO },
  { re: /focus:ring-blue-900/g, to: 'focus:ring-status-info', family: INFO },
]

export function applyStatusComplementRules(original) {
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

  return { next, replacements, byFamily }
}

function collectFiles() {
  const output = execSync(
    `rg -l "(text|bg|border|ring|from|to|fill|stroke|hover|active|focus)-(emerald|amber|red|blue|orange)-(500|600|700|800|900|950)" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applyStatusComplementRules(original)
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
