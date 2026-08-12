#!/usr/bin/env node
/**
 * FASE V — migra token de PREENCHIMENTO usado como cor de TEXTO para o par
 * `-text`, que é o degrau escurecido validado em 07.012.
 *
 * Por que existe: `text-status-error` rende #ef4343, que dá 3.78:1 sobre branco
 * e 3.8:1 sobre a própria superfície de erro — reprova o mínimo AA de 4.5:1.
 * O token `-text` existe exatamente para isso e já foi validado no contrato de
 * contraste computado.
 *
 * O que NÃO faz: não toca em ocorrência cuja linha também traga preenchimento
 * sólido do mesmo estado (`bg-status-error`), fundo escuro ou `text-white` —
 * nesses casos o degrau escuro pioraria a legibilidade. Essas linhas são
 * listadas para revisão manual.
 *
 * Idempotente. Escopo: src/ (exclui base44-reference, testes, specs, stories).
 *
 * Uso: node scripts/migrate-status-text-tokens.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const DRY = process.argv.includes('--dry')

const EXCLUDED = [
  ':!src/base44-reference/**',
  ':!src/**/*.test.*',
  ':!src/**/*.spec.*',
  ':!src/**/*.stories.*',
]

/** Preenchimento sólido do estado, superfície escura ou texto branco na mesma linha. */
const DARK_CONTEXT =
  /bg-(status-(error|warning|success|info)\b(?!-)|slate-[89]00|gray-[89]00|black|mx-dark|mx-navy|neutral-[89]00)|text-white/

const TARGET = /\btext-status-(error|warning|success|info)\b(?!-)/g

function listFiles() {
  try {
    return execFileSync(
      'git',
      ['grep', '--untracked', '-l', '-E', String.raw`text-status-(error|warning|success|info)([^-a-z]|$)`, '--', 'src', ...EXCLUDED],
      { encoding: 'utf8' },
    )
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch (error) {
    if (error.status === 1) return []
    throw error
  }
}

let files = 0
let replacements = 0
const skipped = []

for (const file of listFiles()) {
  const source = readFileSync(file, 'utf8')
  let touched = 0

  const next = source
    .split('\n')
    .map((line, index) => {
      if (!TARGET.test(line)) {
        TARGET.lastIndex = 0
        return line
      }
      TARGET.lastIndex = 0

      if (DARK_CONTEXT.test(line)) {
        skipped.push(`${file}:${index + 1}`)
        return line
      }

      return line.replace(TARGET, (_match, state) => {
        touched += 1
        return `text-status-${state}-text`
      })
    })
    .join('\n')

  if (touched > 0) {
    if (!DRY) writeFileSync(file, next)
    files += 1
    replacements += touched
  }
}

console.log(
  JSON.stringify(
    { dryRun: DRY, replacements, files, skippedForDarkContext: skipped.length, skipped },
    null,
    2,
  ),
)
