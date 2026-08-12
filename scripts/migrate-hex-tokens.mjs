#!/usr/bin/env node
/**
 * 07.021 (COMP-hex-tokens) — Elimina hexes fora de tokens (796 usos no
 * inventário 07.001) em favor dos utilitários semânticos.
 *
 * Mapa (classificação 07.002, valores HSL verificados nos primitives):
 * - [#005BFF] (info-consultive) == --mx-status-info (218.7 100% 50%) ->
 *   bg-status-info / text-status-info-text / border-status-info /
 *   ring-status-info / from|to-status-info;
 * - [#0F172A] (sidebar-dark-navy) -> text-mx-navy (título/headings) e
 *   bg-mx-navy (superfícies) — convenção já usada 33x no runtime;
 * - [#526B7A] / [#64748B] (text-muted) -> text-muted-foreground;
 * - [#071822] (navy-score-good) -> text-mx-navy;
 * - [#031B3D] (navy-strong) -> text-mx-navy / bg-mx-navy;
 * - [#DFE0E1] / [#E5E7EB] (border-default) -> border-border;
 * - [#F7F8F8] / [#F8FAFC] (surface-alt) -> bg-surface-alt;
 * - [#00A89D] (success-brand-legacy, chart-1) -> text-status-success /
 *   bg-status-success / border-status-success;
 * - [#22C55E] / [#16A34A] (success) -> text-status-success /
 *   bg-status-success;
 * - [#F59E0B] / [#F59F0A] (warning) -> text-status-warning /
 *   bg-status-warning / border-status-warning;
 * - [#EF4444] / [#EF4343] (danger) -> text-status-error /
 *   bg-status-error;
 * - [#92400E] (brown-amber-strong) -> text-status-warning-text;
 * - [#FFFFFF] (surface-white on-dark) -> text-white já canônico — mantém;
 * - [#000000] / [#070A08] (near-black/overlay) -> bg-surface-overlay;
 * - [#2563EB] / [#3B82F6] / [#0284C7] (info-blue) -> text-status-info;
 *
 * Exceções (mantidas): base44-reference, whatsapp, chart-*, testes,
 * design-system tokens, index.css, tailwind.config.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const INFO = 'info'
const WARNING = 'warning'
const ERROR = 'error'
const SUCCESS = 'success'
const NAVY = 'navy'
const NEUTRAL = 'neutral'

const RULES = [
  // ---- #005BFF (info-consultive == status-info) ----
  { re: /bg-\[#005BFF\]/gi, to: 'bg-status-info', family: INFO },
  { re: /text-\[#005BFF\]/gi, to: 'text-status-info-text', family: INFO },
  { re: /border-\[#005BFF\]/gi, to: 'border-status-info', family: INFO },
  { re: /ring-\[#005BFF\]/gi, to: 'ring-status-info', family: INFO },
  { re: /from-\[#005BFF\]/gi, to: 'from-status-info', family: INFO },
  { re: /to-\[#005BFF\]/gi, to: 'to-status-info', family: INFO },
  { re: /hover:bg-\[#005BFF\]/gi, to: 'hover:bg-status-info', family: INFO },
  { re: /focus:ring-\[#005BFF\]/gi, to: 'focus:ring-status-info', family: INFO },

  // ---- #0F172A / #071822 / #031B3D (navy) ----
  { re: /text-\[#0F172A\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /bg-\[#0F172A\]/gi, to: 'bg-mx-navy', family: NAVY },
  { re: /text-\[#071822\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /text-\[#031B3D\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /bg-\[#031B3D\]/gi, to: 'bg-mx-navy', family: NAVY },
  { re: /from-\[#031B3D\]/gi, to: 'from-mx-navy', family: NAVY },

  // ---- #526B7A / #64748B (text-muted) ----
  { re: /text-\[#526B7A\]/gi, to: 'text-muted-foreground', family: NEUTRAL },
  { re: /text-\[#64748B\]/gi, to: 'text-muted-foreground', family: NEUTRAL },

  // ---- #DFE0E1 / #E5E7EB (border-default) ----
  { re: /border-\[#DFE0E1\]/gi, to: 'border-border', family: NEUTRAL },
  { re: /bg-\[#DFE0E1\]/gi, to: 'bg-border', family: NEUTRAL },
  { re: /divide-\[#DFE0E1\]/gi, to: 'divide-border', family: NEUTRAL },
  { re: /border-\[#E5E7EB\]/gi, to: 'border-border', family: NEUTRAL },

  // ---- #F7F8F8 / #F8FAFC (surface-alt) ----
  { re: /bg-\[#F7F8F8\]/gi, to: 'bg-surface-alt', family: NEUTRAL },
  { re: /bg-\[#F8FAFC\]/gi, to: 'bg-surface-alt', family: NEUTRAL },

  // ---- #00A89D (success-brand, chart-1) ----
  { re: /text-\[#00A89D\]/gi, to: 'text-status-success', family: SUCCESS },
  { re: /bg-\[#00A89D\]/gi, to: 'bg-status-success', family: SUCCESS },
  { re: /border-\[#00A89D\]/gi, to: 'border-status-success', family: SUCCESS },
  { re: /ring-\[#00A89D\]/gi, to: 'ring-status-success', family: SUCCESS },

  // ---- #22C55E / #16A34A (success) ----
  { re: /text-\[#22C55E\]/gi, to: 'text-status-success', family: SUCCESS },
  { re: /bg-\[#22C55E\]/gi, to: 'bg-status-success', family: SUCCESS },
  { re: /text-\[#16A34A\]/gi, to: 'text-status-success-text', family: SUCCESS },

  // ---- #F59E0B / #F59F0A (warning) ----
  { re: /text-\[#F59E0B\]/gi, to: 'text-status-warning-text', family: WARNING },
  { re: /bg-\[#F59E0B\]/gi, to: 'bg-status-warning', family: WARNING },
  { re: /border-\[#F59E0B\]/gi, to: 'border-status-warning', family: WARNING },
  { re: /ring-\[#F59E0B\]/gi, to: 'ring-status-warning', family: WARNING },
  { re: /fill-\[#F59F0A\]/gi, to: 'fill-status-warning', family: WARNING },
  { re: /text-\[#F59F0A\]/gi, to: 'text-status-warning-text', family: WARNING },
  { re: /bg-\[#F59F0A\]/gi, to: 'bg-status-warning', family: WARNING },
  { re: /border-\[#F59F0A\]/gi, to: 'border-status-warning', family: WARNING },

  // ---- #EF4444 / #EF4343 (danger) ----
  { re: /text-\[#EF4444\]/gi, to: 'text-status-error', family: ERROR },
  { re: /bg-\[#EF4444\]/gi, to: 'bg-status-error', family: ERROR },
  { re: /ring-\[#EF4444\]/gi, to: 'ring-status-error', family: ERROR },
  { re: /text-\[#EF4343\]/gi, to: 'text-status-error', family: ERROR },
  { re: /bg-\[#EF4343\]/gi, to: 'bg-status-error', family: ERROR },

  // ---- #92400E (brown-amber-strong) ----
  { re: /text-\[#92400E\]/gi, to: 'text-status-warning-text', family: WARNING },

  // ---- #000000 / #070A08 (near-black/overlay) ----
  { re: /bg-\[#000000\]/gi, to: 'bg-surface-overlay', family: NEUTRAL },
  { re: /bg-\[#070A08\]/gi, to: 'bg-surface-overlay', family: NEUTRAL },

  // ---- info-blue (#2563EB / #3B82F6 / #0284C7) ----
  { re: /text-\[#2563EB\]/gi, to: 'text-status-info', family: INFO },
  { re: /text-\[#3B82F6\]/gi, to: 'text-status-info', family: INFO },
  { re: /text-\[#0284C7\]/gi, to: 'text-status-info', family: INFO },

  // ---- variantes específicas (fill/border-t/ring/disabled/amber-pale) ----
  { re: /fill-\[#F59E0B\]/gi, to: 'fill-status-warning', family: WARNING },
  { re: /border-t-\[#005BFF\]/gi, to: 'border-t-status-info', family: INFO },
  { re: /ring-\[#DFE0E1\]/gi, to: 'ring-border', family: NEUTRAL },
  { re: /bg-\[#526B7A\]/gi, to: 'bg-muted-foreground', family: NEUTRAL },
  { re: /border-\[#526B7A\]/gi, to: 'border-muted-foreground', family: NEUTRAL },
  { re: /ring-\[#F59F0A\]\/15/g, to: 'ring-status-warning/15', family: WARNING },
  { re: /ring-\[#EF4343\]\/20/g, to: 'ring-status-error/20', family: ERROR },
  { re: /bg-\[#FFF7E6\]/gi, to: 'bg-status-warning-surface', family: WARNING },
  { re: /border-\[#FFF7E6\]/gi, to: 'border-status-warning/20', family: WARNING },
  { re: /bg-\[#34c759\]/gi, to: 'bg-status-success', family: SUCCESS },
  { re: /bg-\[#64748B\]/gi, to: 'bg-muted-foreground', family: NEUTRAL },

  // ---- review-unclassified: equivalências Tailwind/classificação ----
  // navy escuros (textos de destaque/títulos)
  { re: /text-\[#1e3a5f\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /text-\[#0b1d2e\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /text-\[#071723\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /text-\[#030b14\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /bg-\[#102c37\]/gi, to: 'bg-mx-navy', family: NAVY },
  // slate-mid (texto secundário)
  { re: /text-\[#475569\]/gi, to: 'text-muted-foreground', family: NEUTRAL },
  { re: /text-\[#334155\]/gi, to: 'text-muted-foreground', family: NEUTRAL },
  // surfaces claras de status (red-50/amber-50/emerald-50/sky-50)
  { re: /bg-\[#fef2f2\]/gi, to: 'bg-status-error-surface', family: ERROR },
  { re: /bg-\[#fecaca\]/gi, to: 'bg-status-error-surface', family: ERROR },
  { re: /bg-\[#fff7e6\]/gi, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-\[#fffdf7\]/gi, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-\[#fef3c7\]/gi, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-\[#fde68a\]/gi, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-\[#fcd34d\]/gi, to: 'bg-status-warning', family: WARNING },
  { re: /bg-\[#fed7aa\]/gi, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-\[#ecfdf5\]/gi, to: 'bg-status-success-surface', family: SUCCESS },
  { re: /bg-\[#f0fdf4\]/gi, to: 'bg-status-success-surface', family: SUCCESS },
  { re: /bg-\[#bbf7d0\]/gi, to: 'bg-status-success-surface', family: SUCCESS },
  { re: /bg-\[#eff6ff\]/gi, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-\[#f0f4ff\]/gi, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-\[#f0f9ff\]/gi, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-\[#bfdbfe\]/gi, to: 'bg-status-info-surface', family: INFO },
  // teal/success-brand (chart-1 família)
  { re: /text-\[#00a896\]/gi, to: 'text-status-success', family: SUCCESS },
  { re: /bg-\[#00a896\]/gi, to: 'bg-status-success', family: SUCCESS },
  { re: /bg-\[#008f7e\]/gi, to: 'bg-status-success', family: SUCCESS },
  { re: /text-\[#008f86\]/gi, to: 'text-status-success', family: SUCCESS },
  { re: /bg-\[#00968c\]/gi, to: 'bg-status-success', family: SUCCESS },
  { re: /bg-\[#eff9f8\]/gi, to: 'bg-status-success-surface', family: SUCCESS },
  // neutros claros (slate-100/slate-50)
  { re: /bg-\[#f1f5f9\]/gi, to: 'bg-muted', family: NEUTRAL },
  { re: /bg-\[#f2f4f6\]/gi, to: 'bg-muted', family: NEUTRAL },
  { re: /bg-\[#dfe7f0\]/gi, to: 'bg-muted', family: NEUTRAL },
  { re: /bg-\[#e8f3f2\]/gi, to: 'bg-surface-alt', family: NEUTRAL },
  // amber/orange fortes (warning-text)
  { re: /text-\[#d97706\]/gi, to: 'text-status-warning-text', family: WARNING },
  { re: /text-\[#ea580c\]/gi, to: 'text-status-warning-text', family: WARNING },
  // whatsapp green (canal) — mantido como exceção, mas se usado fora dos
  // arquivos whatsapp, migra para sucesso
  { re: /bg-\[#25d366\]/gi, to: 'bg-status-success', family: SUCCESS },

  // ---- variantes border dos hexes claros ----
  { re: /border-\[#dfe7f0\]/gi, to: 'border-border', family: NEUTRAL },
  { re: /border-\[#fecaca\]/gi, to: 'border-status-error/30', family: ERROR },
  { re: /border-\[#fcd34d\]/gi, to: 'border-status-warning/40', family: WARNING },
  { re: /border-\[#fed7aa\]/gi, to: 'border-status-warning/30', family: WARNING },
  { re: /border-\[#fde68a\]/gi, to: 'border-status-warning/30', family: WARNING },
  { re: /border-\[#f1f5f9\]/gi, to: 'border-border-subtle', family: NEUTRAL },
  { re: /border-\[#f2f4f6\]/gi, to: 'border-border-subtle', family: NEUTRAL },
  { re: /border-\[#bfdbfe\]/gi, to: 'border-status-info/30', family: INFO },
  { re: /border-\[#bbf7d0\]/gi, to: 'border-status-success/30', family: SUCCESS },
  { re: /border-\[#00a896\]/gi, to: 'border-status-success', family: SUCCESS },
  { re: /border-\[#008f86\]/gi, to: 'border-status-success', family: SUCCESS },
  { re: /text-\[#008f86\]/gi, to: 'text-status-success', family: SUCCESS },
  { re: /text-\[#0b1d2e\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /text-\[#071723\]/gi, to: 'text-mx-navy', family: NAVY },
  { re: /text-\[#030b14\]/gi, to: 'text-mx-navy', family: NAVY },

  // ---- variantes com prefixo (hover/focus-visible/important) ----
  { re: /hover:bg-\[#008f86\]/gi, to: 'hover:bg-status-success', family: SUCCESS },
  { re: /focus-visible:ring-\[#00a896\]\/45/gi, to: 'focus-visible:ring-status-success/45', family: SUCCESS },
  { re: /border-\[#f2f4f6\]/gi, to: 'border-border-subtle', family: NEUTRAL },
  { re: /border-\[#f1f5f9\]/gi, to: 'border-border-subtle', family: NEUTRAL },
  { re: /border-\[#fcd34d\]/gi, to: 'border-status-warning/40', family: WARNING },
  { re: /border-\[#fde68a\]/gi, to: 'border-status-warning/30', family: WARNING },
  { re: /bg-\[#0b1d2e\]/gi, to: 'bg-mx-navy', family: NAVY },
  { re: /!bg-\[#030b14\]/gi, to: '!bg-mx-navy', family: NAVY },
  { re: /bg-\[#071723\]/gi, to: 'bg-mx-navy', family: NAVY },
]

export function applyHexTokenRules(original) {
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
    `rg -l "#[0-9A-Fa-f]{6}" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applyHexTokenRules(original)
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
