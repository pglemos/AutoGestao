#!/usr/bin/env node
/**
 * Foundation Zero AC-29.008 — gate de tabs visual fora da family canônica.
 *
 * Tabs do produto devem usar uma das families canônicas: `TabNav`
 * (molecules) ou `MxPageTabs` (module). Um `role="tablist"` manual em div/nav
 * espalha variação visual e keyboard handling. Este gate detecta tablists
 * manuais fora das families, com allowlist por arquivo que só encolhe.
 *
 * Regra:
 *   R1 manual-tablist : `role="tablist"`/`role='tablist'` em div/nav fora de
 *                       TabNav/MxPageTabs.
 *
 * 100% fs (readdir/readFile) — sem `rg` via execSync.
 *
 * Uso:
 *   node scripts/lint-tabs-family.mjs
 *   node scripts/lint-tabs-family.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

/** Arquivos allowlisted (dívida real documentada — migração para family). */
export const TABS_FAMILY_ALLOWLIST = {
  'src/components/module/MxPageTabs.tsx': 'Family canônica de tabs (module).',
  'src/components/molecules/TabNav.tsx': 'Family canônica de tabs (molecules).',
  'src/components/molecules/TabNavPill.tsx': 'Primitive de tab da family canônica.',
  'src/features/central-execucao/components/CentralTabs.tsx':
    'Tabs manuais da Central de Execução — migrar para MxPageTabs/TabNav.',
  'src/features/ranking/sections/GlobalRankingHeader.tsx':
    'Tabs manuais do modo de classificação — migrar para TabNav.',
  'src/features/dashboard-loja/sections/CentralMxPlanoSegmentadoPanel.tsx':
    'Tabs manuais do escopo do plano — migrar para TabNav.',
  'src/features/manager/team/ManagerSellerProfileModal.tsx':
    'Tabs manuais do perfil do vendedor — migrar para TabNav.',
  'src/features/manager/team/ManagerTeamKanban.tsx':
    'Tabs manuais da classificação da equipe — migrar para TabNav.',
  'src/features/manager/day-routine/ManagerDayRoutineView.tsx':
    'Tabs manuais da Rotina do Dia — migrar para TabNav.',
  'src/features/manager/development/ManagerUniversityReference.tsx':
    'Tabs manuais da Universidade MX — migrar para TabNav.',
  'src/components/owner/strategic/StrategicPlanTabs.jsx':
    'Tabs manuais do Plano Estratégico — migrar para TabNav.',
  'src/features/consulting-journey/components/EvidenceTab.tsx':
    'Tabs manuais do tipo de evidência — migrar para TabNav.',
  'src/components/owner/actionplan/ActionPlanTabs.jsx':
    'Tabs manuais do Plano de Ação — migrar para TabNav.',
}

export function inspectTabsFamily(source, file = '<inline>') {
  const findings = []
  const re = /<(div|nav)\b[^>]*role=["']tablist["'][^>]*>/g
  let m
  while ((m = re.exec(source))) {
    findings.push({
      file,
      line: source.slice(0, m.index).split('\n').length,
      rule: 'manual-tablist',
      tag: m[1],
    })
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

export function runTabsFamilyGate() {
  const files = walk(path.join(ROOT, 'src'))
  const findings = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    if (rel in TABS_FAMILY_ALLOWLIST) continue
    findings.push(...inspectTabsFamily(source, rel))
  }

  const result = {
    gate: 'lint-tabs-family',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-tabs-family] OK — tablists manuais só na allowlist (migração futura)')
  } else {
    console.error(`[lint-tabs-family] ${findings.length} tablist(s) manual(is) fora da family:`)
    for (const finding of findings.slice(0, 30)) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.rule}) <${finding.tag}>`)
    }
    if (findings.length > 30) console.error(`  ... e mais ${findings.length - 30}`)
  }

  process.exit(0)
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) runTabsFamilyGate()
