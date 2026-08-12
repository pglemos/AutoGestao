#!/usr/bin/env node
/**
 * Audit 07.010 — Inventário de sombras e valores customizados (FASE G).
 *
 * O inventário é deliberadamente separado do lint: ele mede o estado real
 * antes de qualquer migração e mantém a dívida legada visível.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const OUT_DIR = '.superpowers/mx-foundation-zero/shadow'
mkdirSync(OUT_DIR, { recursive: true })

const excluded = ['src/base44-reference/**', '**/*.test.*', '**/*.spec.*', '**/*.stories.*']
const files = execFileSync('rg', ['--files', 'src'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((file) => !excluded.some((pattern) => {
    if (pattern === 'src/base44-reference/**') return file.startsWith('src/base44-reference/')
    if (pattern === '**/*.test.*') return /\.test\.[^.]+$/.test(file)
    if (pattern === '**/*.spec.*') return /\.spec\.[^.]+$/.test(file)
    if (pattern === '**/*.stories.*') return /\.stories\.[^.]+$/.test(file)
    return false
  }))
  .sort()

const standard = {}
const arbitraryVar = {}
const arbitraryOther = {}
const cssBoxShadow = []
const inlineBoxShadow = []
const dropShadow = []
const auditedFiles = []

function increment(map, key) {
  map[key] = (map[key] || 0) + 1
}

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  if (!/(?:\bshadow(?:-|\b)|\bbox-shadow\b|\bboxShadow\b|\bdrop-shadow\b)/.test(content)) continue
  auditedFiles.push(file)
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    for (const match of line.matchAll(/\bshadow(?:\b|-(?!\[)[a-zA-Z0-9][a-zA-Z0-9/-]*)/g)) {
      increment(standard, match[0])
    }
    for (const match of line.matchAll(/\bshadow-\[([^\]]+)\]/g)) {
      const utility = `shadow-[${match[1]}]`
      if (match[1].includes('var(')) increment(arbitraryVar, utility)
      else increment(arbitraryOther, utility)
    }
    for (const match of line.matchAll(/\bdrop-shadow(?:-\[[^\]]+\]|-[a-zA-Z0-9][a-zA-Z0-9/-]*)?/g)) {
      dropShadow.push({ file, line: index + 1, content: line.trim(), utility: match[0] })
    }
    if (file.endsWith('.css') && line.includes('box-shadow')) {
      cssBoxShadow.push({ file, line: index + 1, content: line.trim() })
    }
    if (!file.endsWith('.css') && /\bboxShadow\b|\bbox-shadow\b/.test(line)) {
      inlineBoxShadow.push({ file, line: index + 1, content: line.trim() })
    }
  })
}

const reportData = {
  timestamp: new Date().toISOString(),
  scope: {
    root: 'src',
    includePattern: 'shadow-|box-shadow|boxShadow|drop-shadow',
    excluded,
  },
  totalCodeFilesAudited: auditedFiles.length,
  tailwindStandard: standard,
  tailwindArbitraryVar: arbitraryVar,
  tailwindArbitraryOther: arbitraryOther,
  cssBoxShadow,
  inlineBoxShadow,
  dropShadow,
}

writeFileSync(path.join(OUT_DIR, 'audit-07.010.json'), JSON.stringify(reportData, null, 2))

const total = (map) => Object.values(map).reduce((sum, value) => sum + value, 0)
const md = `# Audit 07.010 — Inventário de Sombras Runtime

FASE G — Cores, Bordas, Raios e Sombras. Baseline de sombras no runtime (\`src/\`).
Comando: \`node scripts/audit-shadow-runtime.mjs\` (dados completos: \`audit-07.010.json\`).

Escopo: arquivos em \`src/\` que contêm utilities de sombra, \`box-shadow\`,
\`boxShadow\` ou \`drop-shadow\`, excluindo \`base44-reference\` e fixtures.

| Categoria | Ocorrências | Variantes |
|---|---:|---:|
| Tailwind Standard (\`shadow-*\`) | ${total(standard)} | ${Object.keys(standard).length} |
| Arbitrárias com token (\`shadow-[var(...)]\`) | ${total(arbitraryVar)} | ${Object.keys(arbitraryVar).length} |
| Arbitrárias customizadas | ${total(arbitraryOther)} | ${Object.keys(arbitraryOther).length} |
| CSS \`box-shadow\` | ${cssBoxShadow.length} | — |
| Inline React \`boxShadow\` | ${inlineBoxShadow.length} | — |
| Utilities \`drop-shadow\` | ${dropShadow.length} | — |
| Arquivos distintos auditados | — | ${auditedFiles.length} |

## Próxima etapa (07.011)
Migrar elevações neutras dos componentes canônicos para \`--mx-shadow-*\` /
tokens de família, preservando glows semânticos e sombras vetoriais justificadas.
`
writeFileSync(path.join(OUT_DIR, 'audit-07.010.md'), md)
console.log(`[OK] Inventário gerado em ${OUT_DIR}/audit-07.010.md e .json`)
