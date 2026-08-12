#!/usr/bin/env node
/**
 * 07.020 — Complemento dos neutros (gray/slate) em arquivos criados após as
 * fases 07.003-07.005/07.017/07.019, ou variantes não cobertas.
 *
 * Mapa (classificação 07.002):
 * - text-slate-400/500/600, text-gray-400/500/600 -> text-muted-foreground
 *   (text-secondary);
 * - text-slate-200/300, text-gray-200/300 -> text-text-disabled
 *   (text-disabled);
 * - text-slate-100, text-gray-100 -> text-muted-foreground;
 * - text-slate-700/800/900, text-gray-700/800/900 -> text-foreground
 *   (text-primary);
 * - divide-gray-50 / divide-slate-50 -> divide-border-subtle;
 * - border-slate-50 / border-gray-50 -> border-border-subtle;
 * - border-slate-100/200, border-gray-100/200 -> border-border
 *   (border-default); border-slate-100 em hover -> hover:border-border;
 * - border-slate-400/600/700/800, border-gray-800 -> border-border-strong
 *   (border-dark);
 * - from/to/via gray/slate em gradientes de marca (900/800) -> exceção
 *   documentada (dark-surface) — NÃO migra;
 * - bg-gray-900/slate-900/800/950 (dark-surface de marca em auth/landing)
 *   -> exceção documentada — NÃO migra;
 * - bg-slate-400/500, bg-gray-400 (dark-surface/surface-mid) -> NÃO migra
 *   (revisar contexto);
 * - shadow-slate-100/200 -> exceção (elevação neutra) — NÃO migra.
 *
 * Exceções (mantidas): dark-surface (bg-gray-900/slate-900), bg-slate-400/
 * 500/gray-400 (revisar contexto), gradientes dark de marca, shadows,
 * base44-reference, whatsapp, chart-*, testes, design tokens, index.css.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const TEXT = 'text'
const BORDER = 'border'

const RULES = [
  // ---- text neutros -> semantic ----
  { re: /text-slate-600/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-slate-500/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-slate-400/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-slate-300/g, to: 'text-text-disabled', family: TEXT },
  { re: /text-slate-200/g, to: 'text-text-disabled', family: TEXT },
  { re: /text-slate-100/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-slate-700/g, to: 'text-foreground', family: TEXT },
  { re: /text-gray-600/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-gray-500/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-gray-400/g, to: 'text-muted-foreground', family: TEXT },
  { re: /text-gray-300/g, to: 'text-text-disabled', family: TEXT },
  { re: /text-gray-200/g, to: 'text-text-disabled', family: TEXT },
  { re: /text-gray-700/g, to: 'text-foreground', family: TEXT },

  // ---- divide ----
  { re: /divide-gray-50/g, to: 'divide-border-subtle', family: BORDER },
  { re: /divide-slate-50/g, to: 'divide-border-subtle', family: BORDER },

  // ---- border neutros -> semantic ----
  { re: /border-slate-50/g, to: 'border-border-subtle', family: BORDER },
  { re: /border-gray-50/g, to: 'border-border-subtle', family: BORDER },
  { re: /border-slate-200/g, to: 'border-border', family: BORDER },
  { re: /border-gray-200/g, to: 'border-border', family: BORDER },
  { re: /border-slate-100/g, to: 'border-border', family: BORDER },
  { re: /border-gray-100/g, to: 'border-border', family: BORDER },
  { re: /hover:border-slate-200/g, to: 'hover:border-border', family: BORDER },
  { re: /hover:border-slate-100/g, to: 'hover:border-border', family: BORDER },
  { re: /border-slate-400/g, to: 'border-border-strong', family: BORDER },
  { re: /border-slate-600/g, to: 'border-border-strong', family: BORDER },
  { re: /border-slate-700/g, to: 'border-border-strong', family: BORDER },
  { re: /border-slate-800/g, to: 'border-border-strong', family: BORDER },
  { re: /border-gray-800/g, to: 'border-border-strong', family: BORDER },
]

export function applyNeutralComplementRules(original) {
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
    `rg -l "(text|border|divide|ring|hover:border|hover:text|focus:border|focus:text)-(gray|slate)-(50|100|200|300|400|500|600|700|800)" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applyNeutralComplementRules(original)
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
