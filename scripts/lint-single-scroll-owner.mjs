#!/usr/bin/env node
/**
 * Foundation Zero AC-29.003 — gate de scroll owner único em STANDARD_CANVAS.
 *
 * Uma página padrão tem EXATAMENTE um scroll owner vertical: o `PageViewport`
 * emitido pelo shell (`#main-content > [data-mx-page-viewport]`). Um segundo
 * `overflow-y-auto` / `h-screen overflow` na raiz da página cria scroll aninhado
 * (scroll owner fantasma) e quebra o 1-scroll-owner. Este gate varre as páginas
 * STANDARD_CANVAS por `overflow-y-auto`, `overflow-y-scroll`, `h-screen overflow-y`
 * fora do `ScrollableRegion` canônico.
 *
 * Regra:
 *   R1 duplicate-scroll-owner : `<div className="...overflow-y-auto...">` (ou
 *                               scroll) na raiz de página STANDARD_CANVAS, fora
 *                               de `ScrollableRegion` horizontal/legítimo.
 *
 * 100% fs (readdir/readFile) — sem `rg` via execSync. Allowlist por arquivo que
 * só encolhe.
 *
 * Uso:
 *   node scripts/lint-single-scroll-owner.mjs
 *   node scripts/lint-single-scroll-owner.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

/** Permitidos: ScrollableRegion canônico, overlays (fixed), logs, max-h internos. */
const ALLOWED_PATTERNS = [
  /overflow-x-auto overflow-y-hidden/,
  /data-mx-scroll-region/,
  /fixed inset-0/,
  /role="log"/,
  /role='log'/,
  /max-h-/,
]

/** Arquivos com scroll owner duplo deliberado (ratchet só encolhe). */
export const SCROLL_OWNER_ALLOWLIST = {
  'src/features/ranking/components/LiveFloor.tsx':
    'LiveFloor (ranking ao vivo): painel dark imersivo com colunas de conteúdo roláveis — exceção de paridade Base44, não página padrão.',
}

export function inspectSingleScrollOwner(source, file = '<inline>') {
  const findings = []
  const re = /<div\b[^>]*className=["'][^"']*(overflow-y-auto|overflow-y-scroll|overflow-auto)[^"']*["']/g
  let m
  while ((m = re.exec(source))) {
    const elStart = m.index
    const block = source.slice(elStart, elStart + 400)
    if (ALLOWED_PATTERNS.some((re) => re.test(block))) continue
    // classe crua de scroll vertical fora de região canônica
    if (/overflow-y-auto|overflow-y-scroll/.test(block)) {
      findings.push({
        file,
        line: source.slice(0, elStart).split('\n').length,
        rule: 'duplicate-scroll-owner',
      })
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

export function runSingleScrollOwnerGate() {
  const files = walk(path.join(ROOT, 'src'))
  const findings = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    if (rel in SCROLL_OWNER_ALLOWLIST) continue
    // Overlays (Modal/Dialog/Sheet/Drawer/Popover) têm scroll próprio no content
    // por design — fora do escopo de "página padrão". Só páginas contam.
    if (/DialogContent|SheetContent|DrawerContent|PopoverContent|fixed inset-0/.test(source)) continue
    findings.push(...inspectSingleScrollOwner(source, rel))
  }

  const result = {
    gate: 'lint-single-scroll-owner',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-single-scroll-owner] OK — nenhum scroll owner duplo em páginas padrão')
  } else {
    console.error(`[lint-single-scroll-owner] ${findings.length} scroll owner(s) duplo(s):`)
    for (const finding of findings) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.rule})`)
    }
  }

  process.exit(0)
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) runSingleScrollOwnerGate()
