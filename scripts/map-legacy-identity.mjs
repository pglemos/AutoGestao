#!/usr/bin/env node
/**
 * Mapeia as classes de identidade legada para o equivalente aprovado.
 *
 * O codemod anterior devolveu ao Design System o controle sobre o `className`
 * dos componentes. Mas a identidade legada também vive em elementos crus
 * (`div`, `span`, `h1`, `button`) espalhados por 329 arquivos: fundo teal da
 * marca antiga, raios e sombras proprietários, cinzas próprios e peso 900.
 *
 * Aqui a substituição é 1:1 — cada classe antiga vira a aprovada que já é usada
 * pelos componentes. Nada é apenas removido, então nenhum elemento fica sem
 * estilo.
 *
 * NÃO mexe em `uppercase` nem `tracking-*`: o visual aprovado (Base44/Dono)
 * usa micro-rótulos em caixa alta com tracking largo — "GESTÃO",
 * "ATINGIMENTO DO MÊS". Remover isso afastaria da referência, não aproximaria.
 *
 * Uso: node scripts/map-legacy-identity.mjs [--dry]
 */

import fs from 'node:fs'
import path from 'node:path'

const DRY = process.argv.includes('--dry')
/**
 * Testes, stories e a referência congelada ficam fora: neles as classes antigas
 * são o *objeto* da asserção, não estilo a migrar. Reescrevê-las corromperia a
 * intenção do teste.
 */
const SKIP = [
  /\/src\/base44-reference\//,
  /\/_stories\//,
  /\/__tests__\//,
  /\.(test|spec)\.(tsx|jsx)$/,
  // A Carteira é port 1:1 da referência Base44 e tem guarda de paridade de DOM
  // contra ela: já está no visual aprovado, converter só a afastaria.
  /\/src\/components\/carteira\//,
]

/** legado → aprovado */
const MAP = {
  // Peso: o aprovado nunca usa 900
  'font-black': 'font-bold',

  // Superfícies e fundos de marca
  'bg-brand-secondary': 'bg-gray-900',
  'bg-mx-action': 'bg-brand-primary',
  'bg-mx-black': 'bg-gray-900',
  'bg-mx-teal': 'bg-brand-primary',
  'bg-mx-bg': 'bg-gray-50',
  'bg-surface-alt': 'bg-gray-50',

  // Texto de marca
  'text-brand-primary': 'text-status-success-text',
  'text-mx-action': 'text-status-success-text',
  'text-mx-text': 'text-gray-800',
  'text-text-primary': 'text-gray-800',
  'text-text-secondary': 'text-gray-500',
  'text-text-tertiary': 'text-gray-500',
  'text-text-label': 'text-gray-500',

  // Bordas
  'border-mx-border': 'border-gray-200',
  'border-border-default': 'border-gray-200',
  'border-border-subtle': 'border-gray-100',
  'border-border-strong': 'border-gray-200',

  // Raios proprietários
  'rounded-mx-sm': 'rounded-lg',
  'rounded-mx-md': 'rounded-xl',
  'rounded-mx-lg': 'rounded-xl',
  'rounded-mx-xl': 'rounded-2xl',
  'rounded-mx-2xl': 'rounded-2xl',
  'rounded-mx-3xl': 'rounded-2xl',

  // Sombras proprietárias — o aprovado usa apenas shadow-sm
  'shadow-mx-sm': 'shadow-sm',
  'shadow-mx-md': 'shadow-sm',
  'shadow-mx-lg': 'shadow-sm',
  'shadow-mx-xl': 'shadow-sm',
  'shadow-mx-elite': 'shadow-sm',
  'shadow-inner': 'shadow-none',
}

const entries = Object.entries(MAP).sort((a, b) => b[0].length - a[0].length)

let filesChanged = 0
const tally = {}

function convert(source) {
  let out = source
  for (const [from, to] of entries) {
    // Preserva prefixos de variante (`hover:`, `md:`, `group-hover:`) e evita
    // casar sufixos de nomes maiores.
    const re = new RegExp(String.raw`(?<![\w-])${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\w-])`, 'g')
    out = out.replace(re, () => {
      tally[from] = (tally[from] ?? 0) + 1
      return to
    })
  }
  return out
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const normalized = `/${full.replace(/\\/g, '/')}`
    if (SKIP.some((re) => re.test(normalized))) continue
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(full)
      continue
    }
    if (!/\.(tsx|jsx)$/.test(entry.name)) continue

    const before = fs.readFileSync(full, 'utf8')
    const after = convert(before)
    if (after !== before) {
      filesChanged += 1
      if (!DRY) fs.writeFileSync(full, after)
    }
  }
}

walk('src')

const total = Object.values(tally).reduce((a, b) => a + b, 0)
console.log(`${DRY ? '[dry] ' : ''}arquivos: ${filesChanged} | substituições: ${total}\n`)
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k} → ${MAP[k]}  (${v})`)
}
