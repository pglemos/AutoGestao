#!/usr/bin/env node
/**
 * Guard 07.014 — proíbe decisão visual crua (cor/raio/sombra) fora dos tokens.
 *
 * Três regras de tolerância zero, todas já em conformidade quando o guard foi
 * criado (nenhuma dívida foi anistiada por baseline):
 *
 *  1. `rounded-[Npx]` em qualquer lugar do runtime — a escala canônica é
 *     `rounded-mx-*` (07.009).
 *  2. `shadow-[...]` arbitrário que não referencie `var(--mx-*)` — a elevação
 *     pertence a `--mx-shadow-*` (07.010/07.011).
 *  3. hex cru (`#rgb`/`#rrggbb`) nos primitivos do design system e nas famílias
 *     de componentes — cor pertence aos tokens semânticos (07.003–07.007).
 *
 * Exceções, todas explícitas e justificadas em ALLOWLIST.
 *
 * Uso: node scripts/lint-visual-raw.mjs
 */
import { execFileSync } from 'node:child_process'

const EXCLUDED = [
  ':!src/base44-reference/**',
  // Token definitions are the source of truth for raw fallback values. The
  // guard targets consumers that should reference those tokens semantically.
  ':!src/design-system/tokens/**',
  ':!src/**/*.test.*',
  ':!src/**/*.spec.*',
  ':!src/**/*.stories.*',
]

/**
 * Cada entrada é `arquivo:linha` de uma violação conhecida e aceita.
 * Só se acrescenta linha aqui com justificativa escrita.
 */
const ALLOWLIST = new Map([
  [
    'src/features/checkin/sections/CheckinCrmSection.tsx',
    'CTA de paridade Base44: glow teal casado com o `bg-[#00A89D]` literal. Sai junto com a migração da cor, não antes.',
  ],
  [
    'src/features/checkin/sections/CheckinForm.tsx',
    'CTA de paridade Base44: glow verde casado com o gradiente literal do botão de finalizar.',
  ],
])

const COMPONENT_SCOPES = [
  'src/design-system',
  'src/components/atoms',
  'src/components/molecules',
  'src/components/organisms',
]

function gitGrep(pattern, paths) {
  try {
    return execFileSync('git', ['grep', '--untracked', '-n', '-E', pattern, '--', ...paths, ...EXCLUDED], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch (error) {
    if (error.status === 1) return []
    throw error
  }
}

function allowed(hit) {
  const file = hit.slice(0, hit.indexOf(':'))
  return ALLOWLIST.has(file)
}

const rules = [
  {
    id: 'radius-arbitrario-px',
    message: 'raio arbitrário em pixel — use a escala rounded-mx-*',
    hits: gitGrep(String.raw`rounded(-[a-z]+)?-\[[0-9]+px\]`, ['src']),
  },
  {
    id: 'shadow-arbitrario',
    message: 'sombra arbitrária — use --mx-shadow-* / shadow-mx-*',
    hits: gitGrep(String.raw`shadow-\[[^]]*\]`, ['src']).filter(
      hit => !/var\(--mx-/.test(hit) && !/drop-shadow-\[/.test(hit),
    ),
  },
  {
    id: 'hex-cru-em-componentes',
    message: 'hex cru em primitivo/família de componente — use token semântico',
    // Use POSIX character classes instead of `\b`: Git's ERE word-boundary
    // behavior differs between macOS and GNU/Linux runners.
    hits: gitGrep(String.raw`(^|[^[:xdigit:]])#[[:xdigit:]]{3,8}([^[:xdigit:]]|$)`, COMPONENT_SCOPES),
  },
]

let violations = 0
const report = []

for (const rule of rules) {
  const open = rule.hits.filter(hit => !allowed(hit))
  const waived = rule.hits.length - open.length
  report.push({ rule: rule.id, violations: open.length, waived })
  if (open.length > 0) {
    violations += open.length
    console.error(`\n[${rule.id}] ${rule.message}`)
    for (const hit of open) console.error(`  ${hit}`)
  }
}

console.log(JSON.stringify({ scope: 'src', rules: report, totalViolations: violations }, null, 2))
if (violations > 0) process.exitCode = 1
