#!/usr/bin/env node
/**
 * Foundation Zero AC-29.006 — gate de component overrides perigosos.
 *
 * `className` em componentes canônicos (Button/Input/Card/Modal/Select/Textarea/
 * Badge/Typography) deve conter apenas layout/espaçamento — nunca identidade
 * visual (cor de primitiva, raio/sombra proprietários, peso/caixa legados) que
 * sobrescreve o design system (§9.5). A lista de classes de identidade é a mesma
 * do codemod `strip-legacy-overrides.mjs` (fonte única).
 *
 * Regra:
 *   R1 dangerous-override : `<Button|Input|Card|Modal|... className="...">`
 *                           com classe de identidade legada no className.
 *
 * 100% fs (readdir/readFile) — sem `rg` via execSync. Allowlist por arquivo que
 * só encolhe.
 *
 * Uso:
 *   node scripts/lint-dangerous-overrides.mjs
 *   node scripts/lint-dangerous-overrides.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSON_MODE = process.argv.includes('--json')

/** Identidade visual legada (mesma lista do codemod strip-legacy-overrides). */
const LEGACY_CLASSES = [
  'font-black', 'uppercase',
  'tracking-mx-wide', 'tracking-mx-wider', 'tracking-mx-widest', 'tracking-widest',
  'bg-brand-primary', 'bg-brand-secondary', 'bg-mx-action', 'bg-mx-black', 'bg-mx-teal',
  'text-brand-primary', 'text-mx-action', 'text-mx-text',
  'text-text-primary', 'text-text-secondary', 'text-text-tertiary', 'text-text-label',
  'border-mx-border', 'border-border-default', 'border-border-strong', 'border-border-subtle',
  'rounded-mx-sm', 'rounded-mx-md', 'rounded-mx-lg', 'rounded-mx-xl', 'rounded-mx-2xl', 'rounded-mx-3xl',
  'shadow-mx-sm', 'shadow-mx-md', 'shadow-mx-lg', 'shadow-mx-xl', 'shadow-mx-elite', 'shadow-inner',
]

const DS_COMPONENTS = ['Button', 'Card', 'Typography', 'Badge', 'Input', 'Select', 'Textarea', 'Modal']

const classRe = new RegExp(
  `(?<![\\w:-])(?:${LEGACY_CLASSES.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w-])`,
)

/** Altura/raio/background forçados com `!important` em canônicos (11.012). */
const IMPORTANT_RE = /!\s*(?:h-|w-|rounded|bg-|p-|m-|text-|border-)/

/** Arquivos allowlisted (dívida real documentada). */
export const DANGEROUS_OVERRIDE_ALLOWLIST = {
  'src/components/owner/actionplan/board/ValidateModal.jsx':
    'Button com bg-brand-primary inline (variante primária legada) — migrar para variant="primary".',
  'src/features/checkin/sections/CheckinCrmSection.tsx':
    'Card com shadow-mx-lg inline (dívida FASE M) — migrar para elevation token.',
  'src/features/checkin/sections/CheckinForm.tsx':
    'Card com rounded-mx-2xl inline (dívida FASE M) — migrar para radius token.',
  'src/features/consultoria-visita/LegacyConsultoriaVisitaExecucaoPage.tsx':
    'Button com bg-brand-primary inline (variante primária legada) — migrar para variant="primary".',
  'src/features/digital-products/components/DigitalProductCard.tsx':
    'Card com border-border-subtle inline — migrar para border token.',
  'src/features/lojas/components/team-panel/ConfirmationDialog.tsx':
    'Button com uppercase/tracking-widest legados — migrar para variante canônica.',
  'src/features/lojas/components/team-panel/EditMemberModal.tsx':
    'Button com uppercase legado — migrar para variante canônica.',
  'src/features/lojas/components/team-panel/TransferConfirmationDialog.tsx':
    'Button com uppercase/tracking-widest legados — migrar para variante canônica.',
  'src/features/mentor-comercial/ui/ExecuteNextStepPanel.tsx':
    'Borda border-border-strong inline — migrar para token.',
  'src/features/mentor-comercial/ui/GuidedStatusUpdate.tsx':
    'Borda border-border-strong inline — migrar para token.',
  'src/features/universidade/components/ContentSuggestionDialog.tsx':
    'Button com bg-brand-primary inline — migrar para variant="primary".',
  'src/features/configuracoes/components/tabs/PerfilTab.tsx':
    'Button com !h-mx-14 (altura forçada) + bg-surface-alt — migrar para size canônico (11.012).',
  'src/pages/LiberacaoFechamento.tsx':
    'Button com !text-lg (texto forçado) — migrar para size/typography canônico (11.012).',
}

export function inspectDangerousOverrides(source, file = '<inline>') {
  const findings = []
  const re = new RegExp(`<(?:${DS_COMPONENTS.join('|')})\\b[^>]*className=["'][^"']*["'][^>]*>`, 'g')
  let m
  while ((m = re.exec(source))) {
    const tag = m[0]
    const clsMatch = tag.match(/className=["']([^"']*)["']/)
    if (!clsMatch) continue
    const cls = clsMatch[1]
    const hit = cls.match(classRe)
    const important = cls.match(IMPORTANT_RE)
    if (hit) {
      findings.push({
        file,
        line: source.slice(0, m.index).split('\n').length,
        rule: 'dangerous-override',
        token: hit[0],
        cls: cls.slice(0, 60),
      })
    }
    if (important) {
      findings.push({
        file,
        line: source.slice(0, m.index).split('\n').length,
        rule: 'forced-important-override',
        token: important[0].trim(),
        cls: cls.slice(0, 60),
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

export function runDangerousOverridesGate() {
  const files = walk(path.join(ROOT, 'src'))
  const findings = []
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    if (rel in DANGEROUS_OVERRIDE_ALLOWLIST) continue
    findings.push(...inspectDangerousOverrides(source, rel))
  }

  const result = {
    gate: 'lint-dangerous-overrides',
    pass: findings.length === 0,
    findingCount: findings.length,
    findings,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (findings.length === 0) {
    console.log('[lint-dangerous-overrides] OK — canônicos sem override de identidade')
  } else {
    console.error(`[lint-dangerous-overrides] ${findings.length} override(s) de identidade em canônicos:`)
    for (const finding of findings.slice(0, 30)) {
      console.error(`  - ${finding.file}:${finding.line} (${finding.token}) ${finding.cls}`)
    }
    if (findings.length > 30) console.error(`  ... e mais ${findings.length - 30}`)
  }

  process.exit(0)
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) runDangerousOverridesGate()
