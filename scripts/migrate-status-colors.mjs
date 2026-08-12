#!/usr/bin/env node
/**
 * 07.006 — Migra status colors (emerald/amber/red/blue/orange + status-n legacy)
 * para os utilitários semânticos `status-*` / `brand-primary`.
 *
 * Fonte: `.superpowers/mx-foundation-zero/color/07-002-classificacao.json`.
 * Precedente canônico: cockpit do Dono (`owner-cockpit`), StatusBadge,
 * StatusDot, Progress, AlertMessage e o contrato de contraste
 * `src/test/semantic-status-contrast-contract.test.ts` (§13.1).
 *
 * Decisões:
 * - `bg-emerald-600` == `brand-primary` (--color-emerald-600: hsl(var(--mx-color-primary))):
 *   preenchimentos de ação -> bg-brand-primary (valor idêntico preservado).
 * - `hover:bg-emerald-700` -> hover:bg-brand-primary-hover (idêntico).
 * - `bg-emerald-700` standalone -> bg-status-success (unifica no verde status).
 * - Textos 600-900 -> text-status-{success,warning,error,info}-text (escurecidos,
 *   contraste AA do §13.1 — obrigatório pelo contrato).
 * - `-50/-100` bg -> bg-status-*-surface; `-500` -> bg-status-*;
 * - borders 100/200/300 -> border-status-XX/20|30|40; 500/600 -> sólido;
 * - rings -> ring-status-*;
 * - `bg-status-n` (teal legado, sem definição no @theme — bug silencioso) ->
 *   bg-status-success-surface.
 *
 * Exceções (mantidas): shades 300/400 (decorativas em telas escuras), purple/violet
 * (07.007), `mx-green-*`/`mx-teal` (bug B1 — FASE G runtime), hexes arbitrários,
 * chart-*, base44-reference, whatsapp.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const SUCCESS = 'success'
const WARNING = 'warning'
const ERROR = 'error'
const INFO = 'info'

// ordem importa: mais específico primeiro
export const RULES = [
  // ---- text ----
  { re: /text-emerald-900/g, to: 'text-status-success-text', family: SUCCESS },
  { re: /text-emerald-800/g, to: 'text-status-success-text', family: SUCCESS },
  { re: /text-emerald-700/g, to: 'text-status-success-text', family: SUCCESS },
  { re: /text-emerald-600/g, to: 'text-status-success-text', family: SUCCESS },
  { re: /text-emerald-500/g, to: 'text-status-success', family: SUCCESS },

  { re: /text-amber-900/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-800/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-700/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-600/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-amber-500/g, to: 'text-status-warning', family: WARNING },

  { re: /text-red-900/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-800/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-700/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-600/g, to: 'text-status-error-text', family: ERROR },
  { re: /text-red-500/g, to: 'text-status-error', family: ERROR },

  { re: /text-blue-900/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-800/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-700/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-600/g, to: 'text-status-info-text', family: INFO },
  { re: /text-blue-500/g, to: 'text-status-info', family: INFO },

  { re: /text-orange-700/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-orange-600/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-orange-500/g, to: 'text-status-warning', family: WARNING },

  // ---- bg ----
  { re: /bg-emerald-50\/60(?!\d)/g, to: 'bg-status-success-surface/60', family: SUCCESS },
  { re: /bg-emerald-50(?!\d)/g, to: 'bg-status-success-surface', family: SUCCESS },
  { re: /bg-emerald-100/g, to: 'bg-status-success-surface', family: SUCCESS },
  { re: /bg-emerald-500/g, to: 'bg-status-success', family: SUCCESS },
  { re: /hover:bg-emerald-700/g, to: 'hover:bg-brand-primary-hover', family: SUCCESS },
  { re: /bg-emerald-700/g, to: 'bg-status-success', family: SUCCESS },
  { re: /bg-emerald-600/g, to: 'bg-brand-primary', family: SUCCESS },
  { re: /bg-emerald-800/g, to: 'bg-status-success', family: SUCCESS },
  { re: /bg-emerald-900/g, to: 'bg-status-success', family: SUCCESS },

  { re: /bg-amber-50(?!\d)/g, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-amber-100/g, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-amber-500/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-600/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-700/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-800/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-amber-900/g, to: 'bg-status-warning', family: WARNING },

  { re: /bg-red-50(?!\d)/g, to: 'bg-status-error-surface', family: ERROR },
  { re: /bg-red-100/g, to: 'bg-status-error-surface', family: ERROR },
  { re: /bg-red-500/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-600/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-700/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-800/g, to: 'bg-status-error', family: ERROR },
  { re: /bg-red-900/g, to: 'bg-status-error', family: ERROR },

  { re: /bg-blue-50(?!\d)/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-blue-100/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-blue-500/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-600/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-700/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-800/g, to: 'bg-status-info', family: INFO },
  { re: /bg-blue-900/g, to: 'bg-status-info', family: INFO },

  { re: /bg-orange-50(?!\d)/g, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-orange-100/g, to: 'bg-status-warning-surface', family: WARNING },
  { re: /bg-orange-500/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-orange-600/g, to: 'bg-status-warning', family: WARNING },
  { re: /bg-orange-700/g, to: 'bg-status-warning', family: WARNING },

  { re: /bg-status-n/g, to: 'bg-status-success-surface', family: SUCCESS },

  // ---- border ----
  { re: /border-emerald-100/g, to: 'border-status-success/20', family: SUCCESS },
  { re: /border-emerald-200/g, to: 'border-status-success/30', family: SUCCESS },
  { re: /border-emerald-300/g, to: 'border-status-success/40', family: SUCCESS },
  { re: /border-emerald-500/g, to: 'border-status-success', family: SUCCESS },
  { re: /border-emerald-600/g, to: 'border-status-success', family: SUCCESS },

  { re: /border-amber-100/g, to: 'border-status-warning/20', family: WARNING },
  { re: /border-amber-200/g, to: 'border-status-warning/30', family: WARNING },
  { re: /border-amber-300/g, to: 'border-status-warning/40', family: WARNING },
  { re: /border-amber-500/g, to: 'border-status-warning', family: WARNING },
  { re: /border-amber-600/g, to: 'border-status-warning', family: WARNING },

  { re: /border-red-100/g, to: 'border-status-error/20', family: ERROR },
  { re: /border-red-200/g, to: 'border-status-error/30', family: ERROR },
  { re: /border-red-300/g, to: 'border-status-error/40', family: ERROR },
  { re: /border-red-400/g, to: 'border-status-error/50', family: ERROR },
  { re: /border-red-500/g, to: 'border-status-error', family: ERROR },
  { re: /border-red-600/g, to: 'border-status-error', family: ERROR },

  { re: /border-blue-100/g, to: 'border-status-info/20', family: INFO },
  { re: /border-blue-200/g, to: 'border-status-info/30', family: INFO },
  { re: /border-blue-300/g, to: 'border-status-info/40', family: INFO },
  { re: /border-blue-400/g, to: 'border-status-info/50', family: INFO },
  { re: /border-blue-500/g, to: 'border-status-info', family: INFO },
  { re: /border-blue-600/g, to: 'border-status-info', family: INFO },

  { re: /border-orange-100/g, to: 'border-status-warning/20', family: WARNING },
  { re: /border-orange-200/g, to: 'border-status-warning/30', family: WARNING },
  { re: /border-orange-300/g, to: 'border-status-warning/40', family: WARNING },
  { re: /border-orange-500/g, to: 'border-status-warning', family: WARNING },

  // ---- ring ----
  { re: /ring-emerald-500/g, to: 'ring-status-success', family: SUCCESS },
  { re: /ring-amber-500/g, to: 'ring-status-warning', family: WARNING },
  { re: /ring-red-500/g, to: 'ring-status-error', family: ERROR },
  { re: /ring-blue-500/g, to: 'ring-status-info', family: INFO },

  // ---- gradient ----
  { re: /from-emerald-50/g, to: 'from-status-success-surface', family: SUCCESS },
  { re: /from-emerald-100/g, to: 'from-status-success-surface', family: SUCCESS },
  { re: /to-emerald-800/g, to: 'to-status-success', family: SUCCESS },
  { re: /to-emerald-700/g, to: 'to-status-success', family: SUCCESS },
  { re: /from-amber-100/g, to: 'from-status-warning-surface', family: WARNING },
  { re: /to-amber-500/g, to: 'to-status-warning', family: WARNING },
  { re: /from-red-50/g, to: 'from-status-error-surface', family: ERROR },
  { re: /from-red-100/g, to: 'from-status-error-surface', family: ERROR },
  { re: /to-red-800/g, to: 'to-status-error', family: ERROR },
  { re: /from-blue-50/g, to: 'from-status-info-surface', family: INFO },
  { re: /from-blue-100/g, to: 'from-status-info-surface', family: INFO },
  { re: /to-blue-700/g, to: 'to-status-info', family: INFO },
]

/**
 * A border rule may add a semantic opacity (for example, bare blue-400 maps to
 * status-info/50). When the source already has an explicit opacity, keeping
 * both values would produce invalid utilities such as status-info/50/30.
 */
function normalizeNestedOpacity(value) {
  return value.replace(
    /(status-(?:success|warning|info|error)(?:-(?:surface|text|strong))?)\/(?:\d+|\[[^\]]+\])\/(\d+|\[[^\]]+\])/g,
    '$1/$2',
  )
}

export function applyStatusColorRules(original) {
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

function collectFiles() {
  const output = execSync(
    `rg -l "(text|bg|border|ring|from|to|fill|stroke)-(emerald|amber|red|blue|orange)-[0-9]+|bg-status-n" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' 2>/dev/null || true`,
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
    const result = applyStatusColorRules(original)
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
