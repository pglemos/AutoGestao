#!/usr/bin/env node
/**
 * Remove os overrides visuais legados que as páginas impõem sobre os
 * componentes do Design System.
 *
 * A unificação da aparência ficou nos componentes, mas as telas passam
 * `className` com cor, raio e peso do visual antigo — e o `className` vence no
 * `twMerge`. Resultado: o componente é aprovado, a tela continua legada. É a
 * violação do §9.5 ("uma página não pode criar CSS visual que deveria estar no
 * Design System") em escala.
 *
 * Este codemod remove apenas classes de *identidade visual*. Layout,
 * espaçamento, grid e responsividade ficam intactos.
 *
 * Uso: node scripts/strip-legacy-overrides.mjs [--dry]
 */

import fs from 'node:fs'
import path from 'node:path'

const DRY = process.argv.includes('--dry')
const SRC = 'src'

/** Referência congelada do Base44: nunca tocar. */
const SKIP = [/\/src\/base44-reference\//, /\/_stories\//, /\.test\.(tsx?|jsx?)$/]

/**
 * Classes de identidade legada. Cada uma foi substituída por um equivalente
 * que já vive no componente, então remover devolve o controle ao Design System.
 */
const LEGACY_CLASSES = [
  // Pesos e caixa do visual antigo (o aprovado usa 600/700 e caixa normal)
  'font-black',
  'uppercase',
  // Tracking proprietário
  'tracking-mx-wide',
  'tracking-mx-wider',
  'tracking-mx-widest',
  'tracking-widest',
  // Cores de marca legadas (teal) e superfícies antigas
  'bg-brand-primary',
  'bg-brand-secondary',
  'bg-mx-action',
  'bg-mx-black',
  'bg-mx-teal',
  'text-brand-primary',
  'text-mx-action',
  'text-mx-text',
  'text-text-primary',
  'text-text-secondary',
  'text-text-tertiary',
  'text-text-label',
  'border-mx-border',
  'border-border-default',
  'border-border-strong',
  'border-border-subtle',
  // Raios e sombras proprietários
  'rounded-mx-sm',
  'rounded-mx-md',
  'rounded-mx-lg',
  'rounded-mx-xl',
  'rounded-mx-2xl',
  'rounded-mx-3xl',
  'shadow-mx-sm',
  'shadow-mx-md',
  'shadow-mx-lg',
  'shadow-mx-xl',
  'shadow-mx-elite',
  'shadow-inner',
]

/** Componentes do DS cujo `className` deve deixar de ditar aparência. */
const DS_COMPONENTS = ['Button', 'Card', 'Typography', 'Badge', 'Input', 'Select', 'Textarea']

const classRe = new RegExp(
  `(?<![\\w:-])(?:${LEGACY_CLASSES.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w-])`,
  'g',
)

const openTagRe = new RegExp(`<(?:${DS_COMPONENTS.join('|')})\\b[^>]*?>`, 'gs')

let filesChanged = 0
let removals = 0

function stripInTag(tag) {
  return tag.replace(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g, (whole, dq, tq) => {
    const value = dq ?? tq
    const cleaned = value
      .replace(classRe, (m) => {
        removals += 1
        return ''
      })
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+"/g, '"')
      .trim()
    if (cleaned === value.trim()) return whole
    return dq !== undefined ? `className="${cleaned}"` : `className={\`${cleaned}\`}`
  })
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const normalized = full.replace(/\\/g, '/')
    if (SKIP.some((re) => re.test(`/${normalized}`))) continue
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(full)
      continue
    }
    if (!/\.(tsx|jsx)$/.test(entry.name)) continue

    const before = fs.readFileSync(full, 'utf8')
    const after = before.replace(openTagRe, stripInTag)
    if (after !== before) {
      filesChanged += 1
      if (!DRY) fs.writeFileSync(full, after)
      console.log((DRY ? 'seria alterado: ' : 'alterado: ') + normalized)
    }
  }
}

walk(SRC)
console.log(`\narquivos: ${filesChanged} | classes legadas removidas: ${removals}`)
