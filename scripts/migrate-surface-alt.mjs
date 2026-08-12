#!/usr/bin/env node
/**
 * 07.019 — Migra o papel `surface-alt` da classificação 07.002 em todo o
 * runtime (bg-gray-50, bg-slate-50, bg-gray-100, bg-slate-100) para
 * `bg-surface-alt` / `bg-muted`.
 *
 * Contexto: a 07.003 migrou apenas page roots (páginas standalone); os usos
 * dentro de componentes (hovers de botões, zebra rows de tabelas, badges
 * secondary, chips de filtro) ficaram para trás. A classificação 07.002:
 * - surface-alt: bg-gray-50(631), bg-slate-50(179) -> bg-surface-alt;
 * - surface-muted: bg-slate-100(122), bg-gray-100(86) -> bg-muted.
 *
 * Exceções (mantidas): opacidades decorativas com hover-state, dark-surface
 * (gray-900/slate-900 — revisar contexto), base44-reference, whatsapp,
 * chart-*, testes, design-system tokens, index.css.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const ALT = 'alt'
const MUTED = 'muted'

const RULES = [
  // ---- surface-alt: 50 shades -> bg-surface-alt ----
  { re: /bg-gray-50(?!\d)/g, to: 'bg-surface-alt', family: ALT },
  { re: /bg-slate-50(?!\d)/g, to: 'bg-surface-alt', family: ALT },
  { re: /hover:bg-gray-50/g, to: 'hover:bg-surface-alt', family: ALT },
  { re: /hover:bg-slate-50/g, to: 'hover:bg-surface-alt', family: ALT },
  { re: /focus:bg-gray-50/g, to: 'focus:bg-surface-alt', family: ALT },
  { re: /group-hover:bg-gray-50/g, to: 'group-hover:bg-surface-alt', family: ALT },
  { re: /bg-gray-50\/30/g, to: 'bg-surface-alt/30', family: ALT },
  { re: /bg-gray-50\/50/g, to: 'bg-surface-alt/50', family: ALT },
  { re: /bg-gray-50\/60/g, to: 'bg-surface-alt/60', family: ALT },
  { re: /bg-gray-50\/70/g, to: 'bg-surface-alt/70', family: ALT },
  { re: /bg-gray-50\/80/g, to: 'bg-surface-alt/80', family: ALT },

  // ---- surface-muted: 100 shades -> bg-muted ----
  { re: /bg-gray-100(?!\d)/g, to: 'bg-muted', family: MUTED },
  { re: /bg-slate-100(?!\d)/g, to: 'bg-muted', family: MUTED },
  { re: /hover:bg-gray-100/g, to: 'hover:bg-muted', family: MUTED },
  { re: /hover:bg-slate-100/g, to: 'hover:bg-muted', family: MUTED },
  { re: /group-hover:bg-gray-100/g, to: 'group-hover:bg-muted', family: MUTED },
]

export function applySurfaceAltRules(original) {
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
    `rg -l "bg-(gray|slate)-(50|100)" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applySurfaceAltRules(original)
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
