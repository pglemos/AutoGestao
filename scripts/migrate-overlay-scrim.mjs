#!/usr/bin/env node
/**
 * 07.018 — Migra o papel `overlay-scrim` da classificação 07.002
 * (`bg-black/XX`, backdrop de modais/drawers) para `bg-surface-overlay/XX`.
 *
 * Contexto: `--color-surface-overlay` (`hsl(var(--mx-surface-overlay))`) é o
 * token canônico de scrim, já usado por Tooltip. Todo uso de `bg-black` no
 * runtime é backdrop de modal/drawer (overlay fixo + click-outside) — nunca
 * texto ou superfície de conteúdo. O 07.013 fixa que o produto não tem tema
 * escuro, então o fundo escuro de marca (`bg-gray-900` em auth/landing) é
 * intencional e permanece como exceção documentada.
 *
 * Exceções (mantidas): bg-gray-900/slate-900 (dark-surface de marca em
 * auth/landing — revisar contexto), base44-reference, whatsapp, chart-*,
 * testes, design-system tokens, index.css.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const OVERLAY = 'overlay'

const RULES = [
  { re: /bg-black\/95/g, to: 'bg-surface-overlay/95', family: OVERLAY },
  { re: /bg-black\/90/g, to: 'bg-surface-overlay/90', family: OVERLAY },
  { re: /bg-black\/85/g, to: 'bg-surface-overlay/85', family: OVERLAY },
  { re: /bg-black\/80/g, to: 'bg-surface-overlay/80', family: OVERLAY },
  { re: /bg-black\/75/g, to: 'bg-surface-overlay/75', family: OVERLAY },
  { re: /bg-black\/70/g, to: 'bg-surface-overlay/70', family: OVERLAY },
  { re: /bg-black\/65/g, to: 'bg-surface-overlay/65', family: OVERLAY },
  { re: /bg-black\/60/g, to: 'bg-surface-overlay/60', family: OVERLAY },
  { re: /bg-black\/55/g, to: 'bg-surface-overlay/55', family: OVERLAY },
  { re: /bg-black\/50/g, to: 'bg-surface-overlay/50', family: OVERLAY },
  { re: /bg-black\/45/g, to: 'bg-surface-overlay/45', family: OVERLAY },
  { re: /bg-black\/40/g, to: 'bg-surface-overlay/40', family: OVERLAY },
  { re: /bg-black\/35/g, to: 'bg-surface-overlay/35', family: OVERLAY },
  { re: /bg-black\/30/g, to: 'bg-surface-overlay/30', family: OVERLAY },
  { re: /bg-black\/25/g, to: 'bg-surface-overlay/25', family: OVERLAY },
  { re: /bg-black\/20/g, to: 'bg-surface-overlay/20', family: OVERLAY },
  { re: /bg-black\/15/g, to: 'bg-surface-overlay/15', family: OVERLAY },
  { re: /bg-black\/10/g, to: 'bg-surface-overlay/10', family: OVERLAY },
  { re: /bg-black\/5/g, to: 'bg-surface-overlay/5', family: OVERLAY },
  { re: /bg-black(?!\/[0-9])/g, to: 'bg-surface-overlay', family: OVERLAY },
]

export function applyOverlayScrimRules(original) {
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
    `rg -l "bg-black" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applyOverlayScrimRules(original)
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
