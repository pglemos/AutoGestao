#!/usr/bin/env node
/**
 * 07.010 — Migra as famílias residuais da classificação 07.002 que não
 * pertencem a status nem a neutros: primary (green MX), info-alt
 * (indigo/sky/cyan), warning-alt (yellow) e teal (unclassified, alias da
 * marca: `--color-mx-teal == --mx-color-primary`).
 *
 * Fonte: `.superpowers/mx-foundation-zero/color/07-002-classificacao.json`.
 * Precedente: 07.006 (status) / 07.007 (purple/violet).
 *
 * Decisões:
 * - `green-*` é a família primary do MX (`--mx-color-primary: --mx-green-600`):
 *   bg-green-600/500 -> bg-brand-primary; bg-green-700 -> brand-primary-hover;
 *   bg-green-50/100 -> bg-brand-primary-subtle; text 500/600 -> text-brand-primary;
 *   text 700/800 -> text-brand-primary-hover/active; borders 100-400 ->
 *   border-brand-primary/20|30|40|50.
 * - `indigo/sky/cyan` (info-alt) -> `status-info`: bg 50/100 -> surface,
 *   bg 500 -> sólido, text 500-900 -> info-text, borders -> /20|30|50.
 * - `yellow` (warning-alt) -> `status-warning`: bg-50 -> surface,
 *   bg-400 -> /50, text 600/700 -> warning-text, borders -> /20|40|50.
 * - `teal` (unclassified; `--color-mx-teal == primary`) -> brand-primary:
 *   bg-teal-50/100 -> bg-brand-primary-subtle; bg-teal-500 -> bg-brand-primary;
 *   text-teal-700/600 -> text-brand-primary; borders -> border-brand-primary/*.
 *
 * Exceções (mantidas): shades 300/400 decorativas on-dark (ver 07.006),
 * whatsapp (cores de canal do WhatsApp em RetornoWhatsAppModal/WhatsAppRoteiro),
 * chart-*, base44-reference, design-system tokens, index.css.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const PRIMARY = 'primary'
const INFO = 'info'
const WARNING = 'warning'

const RULES = [
  // ---- green -> brand-primary (fundo) ----
  { re: /bg-green-900/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-green-800/g, to: 'bg-brand-primary-active', family: PRIMARY },
  { re: /bg-green-700/g, to: 'bg-brand-primary-hover', family: PRIMARY },
  { re: /bg-green-600/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-green-500/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-green-400/g, to: 'bg-brand-primary/50', family: PRIMARY },
  { re: /bg-green-300/g, to: 'bg-brand-primary/40', family: PRIMARY },
  { re: /bg-green-200/g, to: 'bg-brand-primary/30', family: PRIMARY },
  { re: /bg-green-100/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /bg-green-50(?!\d)/g, to: 'bg-brand-primary-subtle', family: PRIMARY },

  // ---- green -> brand-primary (texto) ----
  { re: /text-green-900/g, to: 'text-brand-primary', family: PRIMARY },
  { re: /text-green-800/g, to: 'text-brand-primary-active', family: PRIMARY },
  { re: /text-green-700/g, to: 'text-brand-primary-hover', family: PRIMARY },
  { re: /text-green-600/g, to: 'text-brand-primary', family: PRIMARY },
  { re: /text-green-500/g, to: 'text-brand-primary', family: PRIMARY },
  { re: /text-green-400/g, to: 'text-brand-primary/60', family: PRIMARY },
  { re: /text-green-300/g, to: 'text-brand-primary/40', family: PRIMARY },

  // ---- green -> brand-primary (bordas) ----
  { re: /border-green-400/g, to: 'border-brand-primary/50', family: PRIMARY },
  { re: /border-green-300/g, to: 'border-brand-primary/40', family: PRIMARY },
  { re: /border-green-200/g, to: 'border-brand-primary/30', family: PRIMARY },
  { re: /border-green-100/g, to: 'border-brand-primary/20', family: PRIMARY },
  { re: /ring-green-200/g, to: 'ring-brand-primary/30', family: PRIMARY },
  { re: /from-green-50/g, to: 'from-brand-primary-subtle', family: PRIMARY },
  { re: /from-green-100/g, to: 'from-brand-primary-subtle', family: PRIMARY },
  { re: /to-green-500/g, to: 'to-brand-primary', family: PRIMARY },
  { re: /to-green-700/g, to: 'to-brand-primary-hover', family: PRIMARY },

  // ---- indigo/sky/cyan -> status-info (fundo) ----
  { re: /bg-indigo-900/g, to: 'bg-status-info', family: INFO },
  { re: /bg-indigo-800/g, to: 'bg-status-info', family: INFO },
  { re: /bg-indigo-700/g, to: 'bg-status-info', family: INFO },
  { re: /bg-indigo-600/g, to: 'bg-status-info', family: INFO },
  { re: /bg-indigo-500/g, to: 'bg-status-info', family: INFO },
  { re: /bg-indigo-100/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-indigo-50(?!\d)/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-sky-500/g, to: 'bg-status-info', family: INFO },
  { re: /bg-sky-50(?!\d)/g, to: 'bg-status-info-surface', family: INFO },
  { re: /bg-cyan-50(?!\d)/g, to: 'bg-status-info-surface', family: INFO },

  // ---- indigo/sky/cyan -> status-info (texto) ----
  { re: /text-indigo-900/g, to: 'text-status-info-text', family: INFO },
  { re: /text-indigo-800/g, to: 'text-status-info-text', family: INFO },
  { re: /text-indigo-700/g, to: 'text-status-info-text', family: INFO },
  { re: /text-indigo-600/g, to: 'text-status-info-text', family: INFO },
  { re: /text-indigo-500/g, to: 'text-status-info', family: INFO },
  { re: /text-sky-900/g, to: 'text-status-info-text', family: INFO },
  { re: /text-sky-700/g, to: 'text-status-info-text', family: INFO },
  { re: /text-sky-600/g, to: 'text-status-info-text', family: INFO },
  { re: /text-cyan-600/g, to: 'text-status-info-text', family: INFO },

  // ---- indigo/sky/cyan -> status-info (bordas) ----
  { re: /border-indigo-400/g, to: 'border-status-info/50', family: INFO },
  { re: /border-indigo-200/g, to: 'border-status-info/30', family: INFO },
  { re: /border-indigo-100/g, to: 'border-status-info/20', family: INFO },
  { re: /border-sky-200/g, to: 'border-status-info/30', family: INFO },
  { re: /border-sky-100/g, to: 'border-status-info/20', family: INFO },
  { re: /to-indigo-50/g, to: 'to-status-info-surface', family: INFO },
  { re: /ring-indigo-500/g, to: 'ring-status-info', family: INFO },

  // ---- yellow -> status-warning ----
  { re: /bg-yellow-400/g, to: 'bg-status-warning/50', family: WARNING },
  { re: /bg-yellow-50(?!\d)/g, to: 'bg-status-warning-surface', family: WARNING },
  { re: /text-yellow-700/g, to: 'text-status-warning-text', family: WARNING },
  { re: /text-yellow-600/g, to: 'text-status-warning-text', family: WARNING },
  { re: /border-yellow-400/g, to: 'border-status-warning/50', family: WARNING },
  { re: /border-yellow-300/g, to: 'border-status-warning/40', family: WARNING },
  { re: /border-yellow-100/g, to: 'border-status-warning/20', family: WARNING },
  { re: /ring-yellow-300/g, to: 'ring-status-warning/40', family: WARNING },
  { re: /from-yellow-300/g, to: 'from-status-warning/40', family: WARNING },
  { re: /to-yellow-400/g, to: 'to-status-warning/50', family: WARNING },

  // ---- teal (unclassified; alias da marca) -> brand-primary ----
  { re: /bg-teal-500/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-teal-100/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /bg-teal-50(?!\d)/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /text-teal-700/g, to: 'text-brand-primary', family: PRIMARY },
  { re: /text-teal-600/g, to: 'text-brand-primary', family: PRIMARY },
  { re: /text-teal-400/g, to: 'text-brand-primary/60', family: PRIMARY },
  { re: /border-teal-400/g, to: 'border-brand-primary/50', family: PRIMARY },
  { re: /border-teal-300/g, to: 'border-brand-primary/40', family: PRIMARY },
  { re: /border-teal-200/g, to: 'border-brand-primary/30', family: PRIMARY },
  { re: /border-teal-100/g, to: 'border-brand-primary/20', family: PRIMARY },
]

/**
 * A rule may add a semantic opacity (ex: border-yellow-400 -> /50). When the
 * source already has an explicit opacity, keeping both produces invalid
 * utilities such as `border-brand-primary/50/30`.
 */
function normalizeNestedOpacity(value) {
  return value.replace(
    /((?:status|brand)-[a-z-]+(?:(?:-subtle|-text|-hover|-active|-surface|-strong))?)\/(?:\d+|\[[^\]]+\])\/(\d+|\[[^\]]+\])/g,
    '$1/$2',
  )
}

export function applyResidualFamilyRules(original) {
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
    `rg -l "(text|bg|border|ring|from|to|fill|stroke)-(green|indigo|sky|cyan|teal|yellow)-[0-9]+" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applyResidualFamilyRules(original)
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
