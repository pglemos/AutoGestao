#!/usr/bin/env node
/**
 * Foundation Zero AC-29.011 — gate de raw radius/shadow fora de allowlist.
 *
 * Raio pertence à escala canônica `rounded-mx-*` / `--mx-radius-*`; sombra
 * pertence aos tokens `--mx-shadow-*`. Este gate flagra:
 *   R1 raw-radius : `rounded-[Npx]` fora da escala canônica
 *                   (4, 6, 8, 10, 12, 16, 20, 24, 9999) — mesmo critério do
 *                   `lint-radius-shadow` (T4.6), mas 100% fs.
 *   R2 raw-shadow  : `shadow-[...]` arbitrário sem referência a `var(--mx-*)`.
 *
 * O `lint-radius-shadow.mjs` via `rg` passava VACUAMENTE sob bun test (C8 —
 * stdout de subprocesso engolido). Este gate substitui a varredura por
 * readdir/readFile determinístico e impõe allowlist/ratchet: arquivo novo fora
 * da allowlist viola; a allowlist só pode encolher.
 *
 * Excluídos (denominadores corretos): definições de tokens, base44-reference,
 * _stories, testes/playwright, landing pública isolada.
 *
 * Allowlist: KEEP documentados por arquivo. Inclui os 4 glows de paridade
 * Base44 (CTAs de check-in e pódio de ranking) já reconhecidos pelo
 * visual-raw-guard — sombras coloridas deliberadas, tokenizadas na cor mas não
 * na sombra.
 *
 * Puramente read-only: zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-raw-radius-shadow-allowlist.mjs
 *   node scripts/lint-raw-radius-shadow-allowlist.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
const JSON_MODE = process.argv.includes('--json')

const SOURCE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js']

/** Escala canônica de raio (mesma do lint-radius-shadow T4.6). */
const RADIUS_SCALE = new Set([4, 6, 8, 10, 12, 16, 20, 24, 9999])

const RAW_RADIUS = /rounded-\[([0-9]+(?:\.[0-9]+)?)px\]/g
const RAW_SHADOW = /shadow-\[([^\]]+)\]/g

/**
 * KEEP por arquivo (caminho relativo). Só se acrescenta linha aqui com
 * justificativa escrita — e o contrato falha se a lista crescer.
 */
export const ALLOWLIST = new Map([
  [
    'src/features/checkin/sections/CheckinCrmSection.tsx',
    'Glow teal de paridade Base44 no CTA primário (sombra colorida deliberada, cor tokenizada). Reconhecido pelo visual-raw-guard.',
  ],
  [
    'src/features/checkin/sections/CheckinForm.tsx',
    'Glow verde de paridade Base44 no botão de finalizar (sombra colorida deliberada, cor tokenizada). Reconhecido pelo visual-raw-guard.',
  ],
  [
    'src/features/ranking/components/StoreBattleView.tsx',
    'Glows de pódio (verde/azul) nas células do vencedor — dado visual categórico de ranking, sombra colorida deliberada. Reconhecido pelo visual-raw-guard.',
  ],
])

function shouldExclude(relative) {
  return (
    relative.startsWith('src/design-system/tokens/') ||
    relative.endsWith('src/index.css') ||
    relative.startsWith('src/base44-reference/') ||
    relative.includes('/_stories/') ||
    relative.startsWith('src/features/landing/') ||
    /\.(test|spec|playwright)\./.test(relative)
  )
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'base44-reference', '_stories'].includes(entry.name)) {
        walk(full, files)
      }
    } else if (
      SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension)) &&
      !/\.(test|spec|playwright)\./.test(entry.name)
    ) {
      files.push(full)
    }
  }
  return files
}

export function inspectRawRadiusShadow(source, file = '<inline>') {
  const violations = []
  const lines = source.split('\n')

  lines.forEach((line, index) => {
    for (const match of line.matchAll(RAW_RADIUS)) {
      const value = Number.parseFloat(match[1])
      if (!RADIUS_SCALE.has(value)) {
        violations.push({
          file,
          line: index + 1,
          rule: 'raw-radius',
          utility: `rounded-[${match[1]}px]`,
        })
      }
    }
    for (const match of line.matchAll(RAW_SHADOW)) {
      const value = match[1]
      if (!value.includes('var(--mx')) {
        violations.push({
          file,
          line: index + 1,
          rule: 'raw-shadow',
          utility: `shadow-[${value.slice(0, 60)}]`,
        })
      }
    }
  })

  return violations
}

export function runRawRadiusShadowGate() {
  const violations = []
  for (const filePath of walk(SRC_DIR)) {
    const relative = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')
    if (shouldExclude(relative)) continue
    const source = fs.readFileSync(filePath, 'utf8')
    const found = inspectRawRadiusShadow(source, relative).filter((v) => !ALLOWLIST.has(v.file))
    violations.push(...found)
  }
  return violations.sort((a, b) => `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const violations = runRawRadiusShadowGate()
  const result = {
    gate: 'lint-raw-radius-shadow-allowlist',
    pass: violations.length === 0,
    violationCount: violations.length,
    allowlistSize: ALLOWLIST.size,
    violations,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (violations.length === 0) {
    console.log(`[lint-raw-radius-shadow-allowlist] OK — ${ALLOWLIST.size} arquivo(s) allowlisted; nenhum raio/sombra literal fora da allowlist`)
  } else {
    console.error(`[lint-raw-radius-shadow-allowlist] ${violations.length} raio/sombra literal fora da allowlist:`)
    for (const violation of violations) {
      console.error(`  - ${violation.file}:${violation.line} (${violation.rule}) ${violation.utility}`)
    }
  }

  process.exit(violations.length === 0 ? 0 : 1)
}
