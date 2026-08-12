#!/usr/bin/env node
/**
 * 07.002 — Classificar cada cor por papel semântico (FASE G).
 *
 * Lê o baseline 07.001 (audit-07.001.json) e classifica cada variante
 * (Tailwind palette / arbitrary / raw hex / hsl-rgb) em um papel semântico,
 * apontando o token canônico alvo (src/design-system/tokens/*.css).
 *
 * Saída:
 *   - stdout: resumo por papel
 *   - .superpowers/mx-foundation-zero/color/07-002-classificacao.json
 *   - .superpowers/mx-foundation-zero/color/07-002-classificacao.md
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const AUDIT = JSON.parse(
  readFileSync(resolve(ROOT, '.superpowers/mx-foundation-zero/color/audit-07.001.json'), 'utf8'),
)

const S = (role, token) => ({ role, token })

/** Tokens canônicos já definidos em src/index.css / semantic.css (classes derivadas). */
const CANONICAL_TAILWIND = [
  'bg-background', 'bg-card', 'bg-card-foreground-hidden', 'bg-popover', 'bg-primary',
  'bg-primary-foreground', 'bg-secondary', 'bg-muted', 'bg-accent', 'bg-accent-foreground',
  'bg-destructive', 'bg-input', 'bg-surface-default', 'bg-surface-alt', 'bg-surface-elevated',
  'bg-surface-overlay', 'bg-sidebar', 'bg-border', 'border-border', 'border-border-default',
  'border-border-subtle', 'border-border-strong', 'border-input', 'border-primary',
  'border-sidebar-border', 'ring-ring', 'ring-ring-offset', 'ring-primary', 'ring-sidebar-ring',
  'ring-focus-ring', 'text-foreground', 'text-primary', 'text-secondary', 'text-tertiary',
  'text-label', 'text-disabled', 'text-muted-foreground', 'text-card-foreground',
  'text-popover-foreground', 'text-accent-foreground', 'text-destructive', 'text-primary-foreground',
  'text-secondary-foreground', 'text-sidebar', 'text-sidebar-muted', 'text-sidebar-section-label',
  'text-sidebar-accent', 'text-sidebar-accent-foreground', 'text-sidebar-primary-foreground',
  'text-sidebar-foreground', 'bg-sidebar-bg', 'text-sidebar-text', 'bg-sidebar-bg-strong',
  'text-sidebar-text-muted', 'bg-sidebar-item-hover', 'bg-sidebar-item-active-bg',
  'text-sidebar-item-active-text', 'bg-success', 'text-success', 'border-success',
  'text-success-text', 'text-success-foreground', 'bg-success-subtle', 'bg-success-surface',
  'border-success-border', 'bg-warning', 'text-warning', 'border-warning', 'text-warning-text',
  'border-warning-border', 'bg-warning-subtle', 'bg-warning-surface', 'bg-danger', 'text-danger',
  'border-danger', 'text-danger-text', 'border-danger-border', 'bg-danger-subtle', 'bg-danger-surface',
  'bg-info', 'text-info', 'border-info', 'text-info-text', 'border-info-border', 'bg-info-subtle',
  'bg-info-surface', 'bg-error', 'text-error', 'border-error', 'border-error-border',
  'bg-error-subtle', 'bg-error-surface', 'text-status-success', 'text-status-success-text',
  'bg-status-success', 'bg-status-success-surface', 'text-status-warning', 'text-status-warning-text',
  'bg-status-warning', 'bg-status-warning-surface', 'text-status-error', 'text-status-error-text',
  'bg-status-error', 'bg-status-error-surface', 'text-status-info', 'text-status-info-text',
  'bg-status-info', 'bg-status-info-surface', 'bg-chart-1', 'bg-chart-2', 'bg-chart-3',
  'bg-chart-4', 'bg-chart-5', 'bg-chart-6', 'bg-chart-7', 'bg-chart-8', 'text-chart-1',
  'text-chart-2', 'text-chart-3', 'text-chart-4', 'text-chart-5', 'text-chart-6', 'text-chart-7',
  'text-chart-8', 'bg-mx-teal', 'bg-mx-teal-light', 'bg-mx-teal-soft', 'text-mx-teal',
  'text-mx-teal-light', 'text-mx-teal-soft', 'bg-mx-green', 'text-mx-green', 'bg-mx-green-light',
  'text-mx-green-light', 'bg-mx-blue', 'text-mx-blue', 'bg-mx-navy', 'text-mx-navy',
  'bg-mx-amber', 'text-mx-amber', 'bg-mx-red', 'text-mx-red', 'bg-accent-blue',
  'bg-accent-blue-strong', 'bg-accent-blue-soft', 'text-accent-blue', 'text-accent-blue-strong',
  'fill-white', 'fill-current', 'text-current', 'border-current', 'stroke-current',
  'bg-transparent', 'border-transparent', 'text-transparent', 'fill-transparent',
  'stroke-transparent', 'from-transparent', 'to-transparent', 'via-transparent',
  'text-inherit', 'bg-inherit', 'border-inherit', 'border-destructive',
]

/** Regras: família Tailwind -> papel -> token alvo. Ordem importa. */
const CLASS_RULES = [
  // ---- Canônicos (já conformes; zero ação) ----
  [/^bg-white$/, S('surface-white', 'bg-background (fundo base)')],
  [/^bg-gray-50$|^bg-slate-50$/, S('surface-alt', 'bg-surface-alt')],
  [/^bg-gray-100$|^bg-slate-100$/, S('surface-muted', 'bg-muted')],
  [/^bg-gray-(200|300)$|^bg-slate-(200|300)$/, S('surface-neutral', 'bg-muted / border-border')],
  [/^bg-gray-(400|500|600|700|800|900|950)$|^bg-slate-(400|500|600|700|800|900|950)$/, S('dark-surface', 'sidebar/navy (revisar contexto)')],
  [/^bg-black$/, S('overlay-scrim', 'modal overlay / scrim (revisar: --color-surface-overlay)')],
  // ---- Text (07.004) ----
  [/^text-gray-(700|800|900)$|^text-slate-(700|800|900)$/, S('text-primary', 'text-foreground')],
  [/^text-gray-(400|500|600)$|^text-slate-(400|500|600)$/, S('text-secondary', 'text-muted-foreground')],
  [/^text-gray-300$|^text-slate-(200|300)$/, S('text-disabled', 'text-disabled / placeholder')],
  [/^text-white$/, S('text-on-dark', 'text-primary-foreground (sobre bg dark)')],
  [/^text-black$/, S('text-black', 'text-foreground (revisar contexto)')],
  // ---- Border (07.005) ----
  [/^(?:border|divide|ring)-gray-100$|^(?:border|divide|ring)-slate-100$/, S('border-subtle', 'border-border-subtle')],
  [/^(?:border|divide|ring)-gray-200$|^(?:border|divide|ring)-slate-200$/, S('border-default', 'border-border')],
  [/^(?:border|divide|ring)-gray-300$|^(?:border|divide|ring)-slate-300$/, S('border-strong', 'border-border-strong')],
  [/^(?:border|divide|ring)-gray-(400|500|600|700|800|900)$|^(?:border|divide|ring)-slate-(400|500|600|700|800|900)$/, S('border-dark', 'border-border-strong')],
  [/^border-white$/, S('border-on-dark', 'border-border (sobre bg dark)')],
  [/^border-black$/, S('border-black', 'revisar contexto')],
  // ---- Primary / marca (07.003-07.005) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-green-(50|100)$/, S('primary-subtle', 'primary-subtle (primary green família)')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-green-(200|300|400)$/, S('primary-mid', 'primary (tom médio)')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-green-(500|600)$/, S('primary', 'bg-primary / text-primary-foreground')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-green-(700|800|900)$/, S('primary-strong', 'primary-hover / primary-active')],
  // ---- Status: success (emerald = canônico do MX) (07.006) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-emerald-(50|100)$/, S('success-subtle', 'bg-success-subtle / border-success-border')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-emerald-(200|300|400)$/, S('success-mid', 'success-border / success')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-emerald-(500|600)$/, S('success', 'bg-success / text-success-text')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-emerald-(700|800|900)$/, S('success-strong', 'text-success-text (status-success-text)')],
  // ---- Status: warning (07.006) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-amber-(50|100)$|^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-orange-50$|^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-yellow-50$/, S('warning-subtle', 'bg-warning-subtle / border-warning-border')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-amber-(200|300|400)$/, S('warning-mid', 'warning-border / warning')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-amber-(500|600)$/, S('warning', 'bg-warning / text-warning-text')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-amber-(700|800|900)$/, S('warning-strong', 'text-warning-text (status-warning-text)')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-yellow-(100|200|300|400|500|600|700|800|900)$/, S('warning-alt', 'warning / warning-border')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-orange-(100|200|300|400)$/, S('warning-alt-subtle', 'warning-border / warning-subtle')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-orange-(500|600|700|800|900)$/, S('warning-alt-strong', 'warning / warning-text')],
  // ---- Status: danger (07.006) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-red-(50|100)$/, S('danger-subtle', 'bg-danger-subtle / border-danger-border')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-red-(200|300|400)$/, S('danger-mid', 'danger-border / danger')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-red-(500|600)$/, S('danger', 'bg-danger / text-danger-text')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-red-(700|800|900)$/, S('danger-strong', 'text-danger-text (status-error-text)')],
  // ---- Status: info (07.006) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-blue-(50|100)$/, S('info-subtle', 'bg-info-subtle / border-info-border')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-blue-(200|300|400)$/, S('info-mid', 'info-border / info')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-blue-(500|600)$/, S('info', 'bg-info / text-info-text')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-blue-(700|800|900)$/, S('info-strong', 'text-info-text (status-info-text)')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-(cyan|sky|indigo)-(50|100|200|300|400|500|600|700|800|900)$/, S('info-alt', 'info família (cyan/sky/indigo)')],
  // ---- Legacy accent purple -> info (renomeado globalmente) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-purple-(50|100|200|300|400)$/, S('info-subtle-legacy', 'info-subtle / accent-blue')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-purple-(500|600)$/, S('info-legacy', 'info / accent-blue')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-purple-(700|800|900)$/, S('info-strong-legacy', 'text-info-text / accent-blue-strong')],
  // ---- Outros matizes (rótulo de revisão) ----
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-(lime|fuchsia|pink|rose|violet)-/, S('review-chromatic', 'revisar: chromatic fora do sistema')],
  [/^(?:bg|text|border|ring|fill|stroke|from|to|via|divide|accent)-(zinc|stone)-/, S('review-neutral', 'revisar: neutro não-canônico (zinc/stone)')],
]
/** Raws conhecidos -> papel -> token (fonte: audit 07.001 + colors.ts + primitives). */
const HEX_RULES = [
  [/#005bff/i, S('info-consultive', 'bg-info / text-info-text (alert-consultive = mx-status-info)')],
  [/#00a89d/i, S('success-brand-legacy', 'bg-success / text-success-text (chart-1 = verde marca)')],
  [/#22c55e|#1fcb6e|#16a34a/i, S('success', 'bg-success / text-success-text (duplicata verde)')],
  [/#f59e0b|#f59f0a|#f59e0a/i, S('warning', 'bg-warning / text-warning-text (duplicata amber)')],
  [/#ef4444|#ef4343|#f54545/i, S('danger', 'bg-danger / text-danger-text (duplicata red)')],
  [/#0f172a/i, S('sidebar-dark-navy', '--mx-tpl-sidebar-bg (197 55% 14%)')],
  [/#031b3d/i, S('navy-strong', '--mx-tpl-navy (214 83% 13.6%)')],
  [/#071822/i, S('navy-score-good', 'score-good / navy (scoreBand.good fallback)')],
  [/#526b7a|#64748b|#6b7280/i, S('text-muted', 'text-muted-foreground (slate-500-ish)')],
  [/#dfe0e1|#e0e0e0|#e5e7eb/i, S('border-default', 'border-border (neutral-200)')],
  [/#f7f8f8|#f8fafc|#f9f9f9/i, S('surface-alt', 'bg-surface-alt (neutral-50)')],
  [/#ffffff/i, S('surface-white', 'bg-background / text-foreground on dark')],
  [/#00b2a8|#00b0a6/i, S('success-brand-light', 'success (teal claro legado)')],
  [/#0047b3|#2563eb|#0284c7|#3b82f6/i, S('info-blue', 'info / info-text (blue legado)')],
  [/#1e293b|#334155/i, S('slate-mid', 'text-foreground / text-muted-foreground')],
  [/#070a08|#0a0a0a|#0f0f0f/i, S('near-black', 'revisar: próximo do black (overlay?)')],
  [/#6d28d9|#7c3aed/i, S('purple-legacy', 'info / accent-blue (purple legado)')],
  [/#92400e|#78350f/i, S('brown-amber-strong', 'warning-text (amber escuro)')],
  [/#fff7e6|#fff8e1/i, S('amber-pale', 'bg-warning-subtle (amber claro)')],
  [/#eff6ff|#f0f4ff/i, S('blue-pale', 'bg-info-subtle (blue claro)')],
  [/#f0f9ff|#f0fdf4/i, S('pale-misc', 'info/success subtle (sky/green claro)')],
]

const CANONICAL_SET = new Set(CANONICAL_TAILWIND)

const prefixOf = (v) => /^((?:bg|text|border|ring|fill|stroke|divide|accent|from|to|via)-)/.exec(v)?.[1] || ''
const withoutPrefix = (v) => v.replace(/^(?:bg|text|border|ring|fill|stroke|divide|accent|from|to|via)-/, '')

/** Arranca o hex/var de uma arbitraria `bg-[#005BFF]`, `from-[#005BFF]`, `text-[hsl(...)]`. */
const arbitraryHex = (v) => {
  const m = /\[(#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8}))\]/i.exec(v)
  return m ? m[1].toLowerCase() : null
}

const normalizeRgba = (v) => {
  const m = /rgba?\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})/.exec(v)
  if (!m) return null
  const toHex = (n) => Number(n).toString(16).padStart(2, '0')
  return `#${toHex(m[1])}${toHex(m[2])}${toHex(m[3])}`
}

const classifyClass = (v) => {
  if (CANONICAL_SET.has(v)) return S('canonical', 'já conforme (token canônico)')
  for (const [re, s] of CLASS_RULES) {
    if (re.test(v)) return s
  }
  return S('review-unclassified', 'sem regra')
}

const classifyArbitrary = (v) => {
  const hex = arbitraryHex(v)
  if (!hex) return S('review-unclassified', 'sem hex extraível')
  for (const [re, s] of HEX_RULES) {
    if (re.test(hex)) return s
  }
  return S('review-unclassified', `hex=${hex} sem regra`)
}

const classifyHslRgb = (v) => {
  if (v.startsWith('hsl(${' ) || v === 'hsl(${ref}/${alpha})') return S('dynamic-ref', 'ref dinâmica (verificar fonte)')
  const hex = normalizeRgba(v)
  if (hex) {
    for (const [re, s] of HEX_RULES) {
      if (re.test(hex)) return s
    }
    return S('review-unclassified', `rgba→${hex} sem regra`)
  }
  return S('review-unclassified', 'não-parseável')
}

const rollup = (entries, classify) => {
  const byRole = new Map()
  for (const [variant, files] of entries) {
    const { role, token } = classify(variant)
    const agg = byRole.get(role) || { role, token, count: 0, variants: 0, top: new Map() }
    agg.count += files
    agg.variants += 1
    agg.top.set(variant, files)
    byRole.set(role, agg)
  }
  return [...byRole.values()]
    .sort((a, b) => b.count - a.count)
    .map((agg) => ({
      role: agg.role,
      token: agg.token,
      variants: agg.variants,
      count: agg.count,
      top: [...agg.top.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([v, c]) => `${v}(${c})`).join(', '),
    }))
}

const byFile = Object.entries(AUDIT.byFile).sort((a, b) => b[1] - a[1]).slice(0, 25)

const tailwind = rollup(Object.entries(AUDIT.tailwind), classifyClass)
const arbitrary = rollup(Object.entries(AUDIT.arbitrary), classifyArbitrary)
const hexes = rollup(Object.entries(AUDIT.hex), (v) => {
  for (const [re, s] of HEX_RULES) if (re.test(v)) return s
  return S('review-unclassified', 'sem regra')
})
const hslrgb = rollup(Object.entries(AUDIT.hslrgb), classifyHslRgb)

const totalTw = Object.values(AUDIT.tailwind).reduce((a, b) => a + b, 0)
const pct = (r) => Math.round((r.count / totalTw) * 100)

const table = (rows) => rows.map((r) => `| ${r.role} | ${r.token} | ${r.variants} | ${r.count} | ${r.top} |`).join('\n')

const md = `# 07.002 — Classificação por Papel Semântico

**Status:** concluído · Baseline: \`audit-07.001.json\` · Gerado por \`scripts/classify-colors-semantic.mjs\`

## Resumo

| Fonte | Usos totais | Papéis | % já canônica |
|---|---|---|---|
| Tailwind palette | ${totalTw} | ${tailwind.length} | ${pct(tailwind.find((r) => r.role === 'canonical') || { count: 0 })}% |
| Arbitrárias | ${Object.values(AUDIT.arbitrary).reduce((a, b) => a + b, 0)} | ${arbitrary.length} | - |
| Raw hex | ${Object.values(AUDIT.hex).reduce((a, b) => a + b, 0)} | ${hexes.length} | - |
| hsl/rgb | ${Object.values(AUDIT.hslrgb).reduce((a, b) => a + b, 0)} | ${hslrgb.length} | - |

## Papéis — Tailwind palette (${tailwind.length})

| Papel | Token alvo | Variantes | Usos | Principais |
|---|---|---|---|---|
${table(tailwind)}

## Papéis — Arbitrárias (${arbitrary.length})

| Papel | Token alvo | Variantes | Usos | Principais |
|---|---|---|---|---|
${table(arbitrary)}

## Papéis — Raw hex (${hexes.length})

| Papel | Token alvo | Variantes | Usos | Principais |
|---|---|---|---|---|
${table(hexes)}

## Papéis — hsl/rgb (${hslrgb.length})

| Papel | Token alvo | Variantes | Usos | Principais |
|---|---|---|---|---|
${table(hslrgb)}

## Top arquivos (07.001)

${byFile.map(([f, c], i) => `${i + 1}. \`${f}\` — ${c}`).join('\n')}

## Decisões de deduplicação (07.002)

1. **\`#005BFF\`** (267 usos + arbitrárias) → papel *info/consultive*; token canônico \`--color-alert-consultive\` já = \`--mx-status-info\`. Alvo: \`bg-info\`/\`text-info-text\` (ou \`accent-blue\` em contexto decorativo).
2. **\`#00A89D\`** (94) → *success / marca legada*; chart-1 = 176 100% 33% = #00A89D = verde da marca consolidado.
3. **\`#22C55E\` / \`#1FCB6E\` / \`#16A34A\`** (69) → duplicatas verdes de sucesso → sucess tokens.
4. **\`#F59E0B\` / \`#F59F0A\`** (56) → duplicatas amber (warning) → warning tokens.
5. **\`#EF4444\` / \`#EF4343\`** (49) → duplicatas red (danger) → danger tokens.
6. **\`#0F172A\`** (116) → dark navy → \`--mx-tpl-sidebar-bg\`; **\`#031B3D\`** (43) → \`--mx-tpl-navy\`.
7. **\`#526B7A\` / \`#64748B\`** (163) → texto muted → \`text-muted-foreground\`.
8. **\`#DFE0E1\` / \`#E5E7EB\`** (101) → borda default → \`border-border\`; **\`#F7F8F8\` / \`#F8FAFC\`** (47) → \`bg-surface-alt\`.
9. **\`#071822\`** (61) → navy score-good → token score/navy existente.

## Observações

- Classes canônicas (marcadas \`canonical\`) já usam tokens \`--color-*\`; nenhuma ação nas migrations.
- Papéis \`review-*\` precisam de julgamento pontual durante as migrations 07.003–07.007.
`

writeFileSync(
  resolve(ROOT, '.superpowers/mx-foundation-zero/color/07-002-classificacao.json'),
  JSON.stringify({ tailwind, arbitrary, hexes, hslrgb, byFile }, null, 2),
)
writeFileSync(
  resolve(ROOT, '.superpowers/mx-foundation-zero/color/07-002-classificacao.md'),
  md,
)

console.log('=== 07.002 — Classificação por papel semântico ===')
for (const r of tailwind) console.log(`  ${r.role.padEnd(24)} v=${r.variants} uso=${r.count} :: ${r.top.slice(0, 55)}`)
console.log('--- raw hex ---')
for (const r of hexes) console.log(`  ${r.role.padEnd(24)} v=${r.variants} uso=${r.count} :: ${r.top.slice(0, 55)}`)
console.log('--- arbitrárias ---')
for (const r of arbitrary) console.log(`  ${r.role.padEnd(24)} v=${r.variants} uso=${r.count} :: ${r.top.slice(0, 55)}`)
console.log('--- hsl/rgb ---')
for (const r of hslrgb) console.log(`  ${r.role.padEnd(24)} v=${r.variants} uso=${r.count} :: ${r.top.slice(0, 55)}`)
