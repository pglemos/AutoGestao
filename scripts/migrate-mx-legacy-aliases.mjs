#!/usr/bin/env node
/**
 * 07.016 — Migra os aliases legados `mx-green-*` / `mx-indigo-*` / `mx-teal*`
 * (bug B1, declarado pendente na 07.006: "FASE G runtime") para os utilitários
 * semânticos da família brand-primary.
 *
 * Contexto do bug B1: em `src/index.css`, `--color-mx-green-400..700` apontam
 * todos para `--mx-chart-1` e `--color-mx-indigo-*` são aliases diretos de
 * `--color-mx-green-*` ("Legacy aliases (indigo → green)"). O runtime usa esses
 * aliases como superfícies de marca, e não há utilitário semântico correspondente
 * a `bg-mx-green-50` etc. — o contrato de paridade visual normaliza via tokens.
 *
 * Mapa (família primary MX, ver 07.002/07.010):
 * - bg-mx-green-50 / bg-mx-green / bg-mx-green-light / bg-mx-indigo-50 ->
 *   bg-brand-primary-subtle;
 * - bg-mx-green-500/600/900/950 -> bg-brand-primary (sólido);
 * - border-mx-green-200 / border-mx-indigo-100 -> border-brand-primary/20;
 * - border-mx-green -> border-brand-primary;
 * - text-mx-green -> text-brand-primary; text-mx-green-800/900 ->
 *   text-brand-primary-active.
 *
 * Exceções (mantidas): definições de tokens em design-system/index.css,
 * base44-reference, whatsapp, chart-*, testes.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const PRIMARY = 'primary'

const RULES = [
  // ---- bg: superfícies brand ----
  { re: /bg-mx-green-light/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /bg-mx-green-50(?!\d)/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /bg-mx-green\b(?!-[a-z0-9])/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /bg-mx-indigo-50(?!\d)/g, to: 'bg-brand-primary-subtle', family: PRIMARY },
  { re: /bg-mx-indigo-100/g, to: 'bg-brand-primary-subtle', family: PRIMARY },

  // ---- bg: sólido (ações/marcas) ----
  { re: /bg-mx-green-950/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-mx-green-900/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-mx-green-600/g, to: 'bg-brand-primary', family: PRIMARY },
  { re: /bg-mx-green-500/g, to: 'bg-brand-primary', family: PRIMARY },

  // ---- border: superfícies ----
  { re: /border-mx-green-200/g, to: 'border-brand-primary/20', family: PRIMARY },
  { re: /border-mx-indigo-100/g, to: 'border-brand-primary/20', family: PRIMARY },
  { re: /border-mx-green\b(?!-[a-z0-9])/g, to: 'border-brand-primary', family: PRIMARY },

  // ---- text ----
  { re: /text-mx-green-900/g, to: 'text-brand-primary-active', family: PRIMARY },
  { re: /text-mx-green-800/g, to: 'text-brand-primary-active', family: PRIMARY },
  { re: /text-mx-green\b(?!-[a-z0-9])/g, to: 'text-brand-primary', family: PRIMARY },
]

export function applyMxLegacyAliasRules(original) {
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
    `rg -l "(text|bg|border|ring|from|to|via|fill|stroke)-mx-(green|indigo|teal)[a-z0-9-]*" src --glob '*.{tsx,ts,jsx,js,css,mjs}' -g '!**/*.test.*' -g '!**/*.playwright.*' -g '!**/*.spec.*' -g '!**/_stories/**' -g '!**/base44-reference/**' -g '!**/design-system/tokens/**' -g '!**/index.css' -g '!**/WhatsApp*' -g '!**/RetornoWhatsApp*' 2>/dev/null || true`,
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
    const result = applyMxLegacyAliasRules(original)
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
