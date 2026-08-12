#!/usr/bin/env node
/**
 * FASE G — 07.009
 * Migra raios arbitrários em pixel (`rounded-[12px]`, `rounded-t-[8px]`)
 * para a escala canônica `rounded-mx-*` definida no @theme de src/index.css.
 *
 * Idempotente: rodar novamente não produz alterações.
 * Escopo: src/ (exclui base44-reference, testes, specs e stories).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const PX_TO_TOKEN = new Map([
  [4, 'mx-xs'],
  [6, 'mx-sm'],
  [8, 'mx-md'],
  [10, 'mx-lg'],
  [12, 'mx-xl'],
  [16, 'mx-2xl'],
  [20, 'mx-3xl'],
  [24, 'mx-4xl'],
  [999, 'mx-full'],
  [9999, 'mx-full'],
])

const EXCLUDED = [
  ':!src/base44-reference/**',
  ':!src/**/*.test.*',
  ':!src/**/*.spec.*',
  ':!src/**/*.stories.*',
]

const PATTERN = /rounded(-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?-\[(\d+)px\]/g

function listFiles() {
  try {
    const out = execFileSync(
      'git',
      ['grep', '-l', '-E', String.raw`rounded(-[a-z]+)?-\[[0-9]+px\]`, '--', 'src', ...EXCLUDED],
      { encoding: 'utf8' },
    )
    return out.trim().split('\n').filter(Boolean)
  } catch (error) {
    if (error.status === 1) return []
    throw error
  }
}

let files = 0
let replacements = 0
const unmapped = new Map()

for (const file of listFiles()) {
  const source = readFileSync(file, 'utf8')
  let touched = 0
  const next = source.replace(PATTERN, (match, side = '', px) => {
    const token = PX_TO_TOKEN.get(Number(px))
    if (!token) {
      unmapped.set(`${px}px`, (unmapped.get(`${px}px`) ?? 0) + 1)
      return match
    }
    touched += 1
    return `rounded${side ?? ''}-${token}`
  })
  if (touched > 0) {
    writeFileSync(file, next)
    files += 1
    replacements += touched
  }
}

console.log(`[migrate-radius-tokens] ${replacements} substituições em ${files} arquivos`)
if (unmapped.size > 0) {
  console.log('[migrate-radius-tokens] valores sem token canônico (revisar manualmente):')
  for (const [px, count] of [...unmapped].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x ${px}`)
  }
  process.exitCode = 1
}
