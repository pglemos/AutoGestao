#!/usr/bin/env node
/**
 * 07.017 — Migra o papel `surface-neutral` da classificação 07.002
 * (bg-slate-200/300, bg-gray-200/300) para `bg-muted`.
 *
 * Contexto: são superfícies neutras de apoio (tracks de progresso, badges de
 * status, barras de fallback em listas e rankings), nunca bordas — o papel
 * `border-default/strong` foi coberto nas fases 07.005/07.006. O token
 * `--color-muted` já é a superfície neutra canônica (bg-slate-100/gray-100
 * migrados na 07.003 para o mesmo destino).
 *
 * Exceções (mantidas): base44-reference, whatsapp, chart-*, testes,
 * design-system tokens, index.css.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const NEUTRAL = 'neutral'

const RULES = [
  { re: /bg-gray-300/g, to: 'bg-muted', family: NEUTRAL },
  { re: /bg-gray-200/g, to: 'bg-muted', family: NEUTRAL },
  { re: /bg-slate-300/g, to: 'bg-muted', family: NEUTRAL },
  { re: /bg-slate-200/g, to: 'bg-muted', family: NEUTRAL },
]

export function applySurfaceNeutralRules(original) {
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
    `rg -l "bg-(gray|slate)-(200|300)" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applySurfaceNeutralRules(original)
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
