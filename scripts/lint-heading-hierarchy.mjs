#!/usr/bin/env node
/**
 * Foundation Zero AC / FASE V 22.002 — gate de hierarquia de headings por rota.
 *
 * WCAG 1.3.1 / 2.4.6 / 2.4.10: cada página deve ter exatamente UM `<h1>`
 * (título do conteúdo principal) e a hierarquia h1→h2→h3 deve ser não-pulada
 * e não-repetida em níveis superiores. Este auditor varre os componentes raiz
 * das rotas críticas e reporta:
 *   R1 duplicate-h1        : mais de um `<h1>` no mesmo documento raiz.
 *   R2 skipped-heading     : `<h3>`/`<h4>` sem `<h2>`/`<h3>` anterior (aprox.).
 *
 * É um AUDITOR estático determinístico (read-only): aponta arquivos para
 * revisão, não bloqueia build. Rotas são os containers de página listados.
 *
 * Uso:
 *   node scripts/lint-heading-hierarchy.mjs
 *   node scripts/lint-heading-hierarchy.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

/** Rotas/containers críticos auditados para hierarquia de headings. */
export const CRITICAL_ROUTES = [
  'src/pages/Login.tsx',
  'src/pages/owner/PlanoDeAcao.jsx',
  'src/pages/OperationalSettings.tsx',
  'src/pages/FunilVendedor.tsx',
  'src/pages/ConsultorNotificacoes.tsx',
  'src/features/agenda-admin/sections/AgendaHeader.tsx',
  'src/features/morning-report/LegacyMorningReportPage.tsx',
  'src/pages/GerentePDI.tsx',
]

export function inspectHeadingHierarchy(source, file = '<inline>') {
  const findings = []
  const h1s = (source.match(/<h1\b/g) || []).length
  if (h1s > 1) {
    findings.push({ file, rule: 'duplicate-h1', detail: `${h1s} <h1> no mesmo documento` })
  }
  // h3/h4 sem h2 anterior (heurística: ordem de aparição)
  const levels = [...source.matchAll(/<(h1|h2|h3|h4)\b/g)].map((m) => Number(m[1][1]))
  let maxSeen = 0
  for (const level of levels) {
    if (level > maxSeen + 1) {
      findings.push({ file, rule: 'skipped-heading', detail: `<h${level}> sem <h${maxSeen + 1}> anterior` })
      break
    }
    maxSeen = Math.max(maxSeen, level)
  }
  return findings
}

export function runHeadingHierarchyGate() {
  const findings = []
  for (const file of CRITICAL_ROUTES) {
    const full = path.join(ROOT, file)
    if (!fs.existsSync(full)) continue
    const source = fs.readFileSync(full, 'utf8')
    findings.push(...inspectHeadingHierarchy(source, file))
  }

  const result = {
    gate: 'lint-heading-hierarchy',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-heading-hierarchy] OK — hierarquia de headings coerente nas rotas críticas')
  } else {
    console.error(`[lint-heading-hierarchy] ${findings.length} problema(s) de hierarquia:`)
    for (const finding of findings) {
      console.error(`  - ${finding.file} (${finding.rule}) ${finding.detail}`)
    }
  }

  process.exit(0)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runHeadingHierarchyGate()
}
