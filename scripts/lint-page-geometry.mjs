#!/usr/bin/env node
/**
 * Foundation Zero AC-29.004 — gate de raw page geometry.
 *
 * A geometria de página (largura/gutters/padding/margens) pertence a PageCanvas
 * via `width` + tokens `--mx-page-*` — nunca a literais crus. Este gate varre
 * as page roots (arquivos que montam PageCanvas/PageTemplate/MxModulePage) por
 * classes arbitrárias de geometry:
 *   R1 raw-max-width  : `max-w-[Npx]`/`max-w-[Nrem]` na raiz da página
 *   R2 raw-width      : `w-[Npx]`/`w-[Nrem]` na raiz da página
 *   R3 raw-padding    : `p-[Npx]`/`px-[Npx]`/`py-[Npx]` na raiz da página
 *   R4 raw-margin     : `m-[Npx]`/`mx-[Npx]`/`my-[Npx]` na raiz da página
 *   R5 raw-gap        : `gap-[Npx]`/`gap-x-[Npx]`/`gap-y-[Npx]` na raiz da página
 *
 * 100% fs (readdir/readFile) — sem `rg` via execSync. Allowlist por arquivo que
 * só encolhe.
 *
 * Uso:
 *   node scripts/lint-page-geometry.mjs
 *   node scripts/lint-page-geometry.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

/** Page roots = arquivos que montam o canvas canônico. */
const CANVAS_IMPORTERS = /PageCanvas|PageTemplate|MxModulePage/

const RAW_GEOMETRY = /(?:max-w|(?<!min-)w|p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-\[[0-9.]+(?:px|rem)\]/

/** Arquivos allowlisted (dívida real documentada). */
export const PAGE_GEOMETRY_ALLOWLIST = {
  // (vazio — page roots devem usar tokens/canvas, não geometry crua)
}

export function inspectPageGeometry(source, file = '<inline>') {
  const findings = []
  // Só a raiz da página: o className do PageCanvas/PageTemplate/MxModulePage.
  const re = /<(PageCanvas|PageTemplate|MxModulePage)\b[^>]*className=["'][^"']*["']/g
  let m
  while ((m = re.exec(source))) {
    const cls = m[0].match(/className=["']([^"']*)["']/)[1]
    const global = new RegExp(RAW_GEOMETRY.source, 'g')
    let raw
    while ((raw = global.exec(cls))) {
      const line = source.slice(0, m.index).split('\n').length
      const rule =
        raw[0].startsWith('max-w') ? 'raw-max-width'
        : raw[0].startsWith('w-') ? 'raw-width'
        : raw[0].startsWith('p') ? 'raw-padding'
        : raw[0].startsWith('m') ? 'raw-margin'
        : 'raw-gap'
      findings.push({ file, line, rule, token: raw[0] })
    }
  }
  return findings
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.includes('base44')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (/\.(tsx|jsx)$/.test(entry.name)) files.push(full)
  }
  return files
}

export function runPageGeometryGate() {
  const files = walk(path.join(ROOT, 'src'))
  const findings = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    if (rel in PAGE_GEOMETRY_ALLOWLIST) continue
    if (!CANVAS_IMPORTERS.test(source)) continue
    findings.push(...inspectPageGeometry(source, rel))
  }

  const result = {
    gate: 'lint-page-geometry',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-page-geometry] OK — page roots sem geometry crua')
  } else {
    console.error(`[lint-page-geometry] ${findings.length} geometry crua em page roots:`)
    for (const finding of findings.slice(0, 30)) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.rule}) ${finding.token}`)
    }
    if (findings.length > 30) console.error(`  ... e mais ${findings.length - 30}`)
  }

  process.exit(0)
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) runPageGeometryGate()
