#!/usr/bin/env node
/**
 * Trava de regressão para z-index arbitrário.
 *
 * O projeto tem 21 valores distintos de `z-[N]` (80, 90, 100, 101, 110, 111,
 * 120, 130, 140, 150, 160, 180, 200, 210, 300, 999, 9999…). Reescrever esse
 * empilhamento de uma vez arriscaria sobrepor modal, drawer e topbar de formas
 * difíceis de detectar sem passar por todas as telas.
 *
 * Então este lint não exige a correção: congela o inventário atual e falha se
 * o total subir ou se um valor novo aparecer. A dívida só pode diminuir.
 *
 * A escala fechada de destino está em `src/design-system/tokens/components.css`
 * (`--mx-z-*`, §34). Ao migrar um arquivo, atualize o inventário abaixo.
 *
 * Uso: node scripts/lint-z-index.mjs [--update]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const BASELINE_PATH = path.join(ROOT_DIR, 'scripts', 'z-index-baseline.json')

const UPDATE = process.argv.includes('--update')

/** Referência congelada do Base44; não é código do produto. */
const IGNORED = [/\/src\/base44-reference\//]

const Z_ARBITRARY = /\bz-\[(\d+)\]/g

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(full, files)
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function collect() {
  const byValue = new Map()
  let total = 0

  for (const file of walk(SRC_DIR)) {
    const normalized = file.replace(/\\/g, '/')
    if (IGNORED.some((pattern) => pattern.test(normalized))) continue

    const text = fs.readFileSync(file, 'utf8')
    for (const [, value] of text.matchAll(Z_ARBITRARY)) {
      byValue.set(value, (byValue.get(value) ?? 0) + 1)
      total += 1
    }
  }

  return {
    total,
    values: Object.fromEntries([...byValue.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
  }
}

const current = collect()

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`)
  console.log(`[lint-z-index] inventário atualizado: ${current.total} ocorrências.`)
  process.exit(0)
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error('[lint-z-index] inventário ausente. Rode: node scripts/lint-z-index.mjs --update')
  process.exit(1)
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
const problems = []

if (current.total > baseline.total) {
  problems.push(
    `total subiu de ${baseline.total} para ${current.total} — z-index arbitrário só pode diminuir.`,
  )
}

for (const [value, count] of Object.entries(current.values)) {
  const allowed = baseline.values[value]
  if (allowed === undefined) {
    problems.push(`valor novo z-[${value}] (${count}×) — use a escala --mx-z-* de components.css.`)
  } else if (count > allowed) {
    problems.push(`z-[${value}] subiu de ${allowed} para ${count} ocorrências.`)
  }
}

if (problems.length > 0) {
  console.error('[lint-z-index] FALHA\n')
  for (const problem of problems) console.error(`  • ${problem}`)
  console.error('\nEscala permitida: --mx-z-base|sticky|sidebar|topbar|drawer|overlay|modal|popover|toast|tooltip')
  console.error('Se você removeu ocorrências, rode: node scripts/lint-z-index.mjs --update')
  process.exit(1)
}

const removed = baseline.total - current.total
console.log(
  removed > 0
    ? `[lint-z-index] OK — ${current.total} ocorrências (${removed} a menos que o inventário; rode --update para congelar o ganho).`
    : `[lint-z-index] OK — ${current.total} ocorrências, dentro do inventário.`,
)
