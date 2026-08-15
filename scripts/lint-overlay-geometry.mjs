#!/usr/bin/env node
/**
 * Foundation Zero AC-29.005 — geometria de overlay (drift guard).
 *
 * Flagra, fora das famílias canônicas, quatro padrões de geometria de overlay:
 *   R1 custom-fixed-overlay      : `fixed inset-0` + scroll/role=dialog sem
 *                                  família canônica (Modal/Dialog/Sheet/Drawer/
 *                                  ScrollableRegion/Popover/Tooltip/…).
 *   R2 undeclared-overlay-scroll : DialogContent/SheetContent/DrawerContent com
 *                                  `overflow-y-auto` sem declaração
 *                                  (mx-overlay-body / ModalBody /
 *                                   data-mx-scroll-region / ScrollableRegion).
 *   R3 raw-overlay-z-index       : `z-[…]` arbitrário fora de `var(--mx-z-*)`.
 *   R4 raw-overlay-max-size      : `max-w-[…]`/`max-h-[…]` arbitrário fora de
 *                                  `var(--mx-*)`.
 *
 * O lint é determinístico (regex, zero runtime) e read-only (não gera
 * artefatos). A allowlist abaixo é a fila de migração documentada — arquivos
 * legados que ainda carregam os padrões e devem ser migrados para o organismo
 * `Modal`/`mx-overlay-*`; qualquer arquivo NOVO fora da allowlist é violação.
 * A contagem por arquivo/regra também é ratcheada contra o baseline abaixo.
 *
 * Uso:
 *   node scripts/lint-overlay-geometry.mjs            # exit 1 se violar
 *   node scripts/lint-overlay-geometry.mjs --json
 *   node scripts/lint-overlay-geometry.mjs --dump     # lista a fila atual
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')

/** Primitivas canônicas — nunca auditadas (são o denominador). */
const PRIMITIVE_FILES = new Set([
  'components/ui/dialog.jsx',
  'components/ui/sheet.jsx',
  'components/ui/drawer.jsx',
  'components/ui/alert-dialog.jsx',
  'components/ui/command.jsx',
  'components/organisms/Modal.tsx',
  'components/organisms/Modal.jsx',
])

/**
 * Fila de migração documentada: arquivos legados que ainda carregam os padrões
 * de overlay abaixo. Gerada por varredura (AC-29.005) em 2026-08-12; deve
 * ENCOLHER conforme cada arquivo migra para Modal/mx-overlay-*. Nunca crescer.
 */
const LEGACY_OVERLAY_ALLOWLIST = [
  'components/carteira/AlterarProximoPasso.jsx',
  'components/carteira/CarteiraAtivaTab.jsx',
  'components/carteira/FichaClienteSheet.jsx',
  'components/carteira/NovoClienteModal.jsx',
  'components/carteira/VeiculosChegaram.jsx',
  'components/carteira/WhatsAppRoteiro.jsx',
  'components/execucao/AbaRotina.jsx',
  'components/execucao/ClienteFichaSheet.jsx',
  'components/execucao/NovaAtividadeModal.jsx',
  'components/execucao/PendenciasDrawer.jsx',
  'components/execucao/ResolverModal.jsx',
  'components/fechamento/ClientCard.jsx',
  'components/fechamento/ClientCardMobile.jsx',
  'components/fechamento/DisciplinaModal.jsx',
  'components/fechamento/NovoRegistroModal.jsx',
  'components/fechamento/RegularizarFechamentoDrawer.jsx',
  'components/owner/ConsultantRequestModal.jsx',
  'components/owner/DetailDrawer.jsx',
  'components/owner/actionplan/ApproveModal.jsx',
  'components/owner/actionplan/DelegateModal.jsx',
  'components/owner/actionplan/EditActionModal.jsx',
  'components/owner/actionplan/NewActionModal.jsx',
  'components/owner/actionplan/board/ActionDrawerTabs.jsx',
  'components/owner/actionplan/board/BlockModal.jsx',
  'components/owner/actionplan/board/CancelModal.jsx',
  'components/owner/actionplan/board/DuplicateModal.jsx',
  'components/owner/actionplan/board/ProgressModal.jsx',
  'components/owner/actionplan/board/ReopenModal.jsx',
  'components/owner/actionplan/board/ReturnModal.jsx',
  'components/owner/actionplan/board/TransitionGuideModal.jsx',
  'components/owner/actionplan/board/UnblockModal.jsx',
  'components/owner/actionplan/board/ValidateModal.jsx',
  'components/owner/actionplan/calendar/CalendarView.jsx',
  'components/owner/consulting/MeetingDrawer.jsx',
  'components/remuneracao/NovaBonificacaoModal.jsx',
  'components/remuneracao/NovaPoliticaModal.jsx',
  'components/vendedor/CalculationDetailsDrawer.jsx',
  'features/action-plan/ActionPlanWorkspace.tsx',
  'features/auth/components/ForcePasswordChange.tsx',
  'features/central-execucao/components/FichaClienteSheet.tsx',
  'features/checkin/sections/CheckinCrmSection.tsx',
  'features/checkin/sections/CheckinForm.tsx',
  'features/checkin/sections/CheckinHeader.tsx',
  'features/checkin/sections/RegularizarFechamentoDrawer.tsx',
  'features/crm/PlanoAtaqueTab.tsx',
  'features/equipe/components/UserCreationModal.tsx',
  'features/internal-profile/LegacyProfilePage.tsx',
  'features/lojas/components/team-panel/EditMemberModal.tsx',
  'features/manager/daily-closing/AgendaD1Panel.tsx',
  'features/manager/mentor/ManagerMentorLibrary.tsx',
  'features/manager/onboarding/ManagerTourOverlay.tsx',
  'features/manager/team/ManagerSellerProfileModal.tsx',
  'features/mentor-comercial/ui/ExecuteNextStepPanel.tsx',
  'features/mentor-comercial/ui/GuidedStatusUpdate.tsx',
  'features/network-dashboard/components/NetworkDrilldownDrawer.tsx',
  'features/operational-diagnostics/components/DiagnosticDetailDrawer.tsx',
  'features/pdi/WizardPDI.tsx',
  'features/ranking/components/SellerProfileModal.tsx',
  'features/remuneracao/components/dashboard/CalculationDetailsDrawer.tsx',
  'features/vendedor-treinamentos/VendedorTreinamentos.container.tsx',
  'pages/owner/PlanoDeAcao.jsx',
]

/**
 * Ratchet por arquivo/regra para a fila legada. A allowlist só autoriza a
 * dívida conhecida no momento da adoção; ela não autoriza que um arquivo
 * legado acumule mais geometria fora do contrato. Ao migrar um arquivo,
 * remova-o da allowlist e deste baseline no mesmo diff.
 */
const LEGACY_OVERLAY_BASELINE = {
  'components/carteira/AlterarProximoPasso.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/carteira/CarteiraAtivaTab.jsx': { 'custom-fixed-overlay': 1 },
  'components/carteira/FichaClienteSheet.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/carteira/NovoClienteModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/carteira/VeiculosChegaram.jsx': { 'custom-fixed-overlay': 1 },
  'components/carteira/WhatsAppRoteiro.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/execucao/AbaRotina.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/execucao/ClienteFichaSheet.jsx': { 'undeclared-overlay-scroll': 1 },
  'components/execucao/NovaAtividadeModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/execucao/PendenciasDrawer.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/execucao/ResolverModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/fechamento/ClientCard.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/fechamento/ClientCardMobile.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/fechamento/DisciplinaModal.jsx': { 'undeclared-overlay-scroll': 1 },
  'components/fechamento/NovoRegistroModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/fechamento/RegularizarFechamentoDrawer.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/ConsultantRequestModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 2 },
  'components/owner/DetailDrawer.jsx': { 'undeclared-overlay-scroll': 1 },
  'components/owner/actionplan/ApproveModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/DelegateModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/EditActionModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/NewActionModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/ActionDrawerTabs.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/BlockModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/CancelModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/DuplicateModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/ProgressModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/ReopenModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/ReturnModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/TransitionGuideModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/UnblockModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/board/ValidateModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/owner/actionplan/calendar/CalendarView.jsx': { 'undeclared-overlay-scroll': 1 },
  'components/owner/consulting/MeetingDrawer.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/remuneracao/NovaBonificacaoModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/remuneracao/NovaPoliticaModal.jsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'components/vendedor/CalculationDetailsDrawer.jsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'features/action-plan/ActionPlanWorkspace.tsx': { 'undeclared-overlay-scroll': 1 },
  'features/auth/components/ForcePasswordChange.tsx': { 'custom-fixed-overlay': 1 },
  'features/central-execucao/components/FichaClienteSheet.tsx': { 'undeclared-overlay-scroll': 1, 'raw-overlay-max-size': 1 },
  'features/checkin/sections/CheckinCrmSection.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 4 },
  'features/checkin/sections/CheckinForm.tsx': { 'raw-overlay-max-size': 5 },
  'features/checkin/sections/CheckinHeader.tsx': { 'raw-overlay-max-size': 6 },
  'features/checkin/sections/RegularizarFechamentoDrawer.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'features/crm/PlanoAtaqueTab.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'features/equipe/components/UserCreationModal.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 2 },
  'features/internal-profile/LegacyProfilePage.tsx': { 'custom-fixed-overlay': 1 },
  'features/lojas/components/team-panel/EditMemberModal.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 4 },
  'features/manager/daily-closing/AgendaD1Panel.tsx': { 'raw-overlay-max-size': 1 },
  'features/manager/mentor/ManagerMentorLibrary.tsx': { 'custom-fixed-overlay': 1 },
  'features/manager/onboarding/ManagerTourOverlay.tsx': { 'custom-fixed-overlay': 1 },
  'features/manager/team/ManagerSellerProfileModal.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'features/mentor-comercial/ui/ExecuteNextStepPanel.tsx': { 'undeclared-overlay-scroll': 1 },
  'features/mentor-comercial/ui/GuidedStatusUpdate.tsx': { 'undeclared-overlay-scroll': 1 },
  'features/network-dashboard/components/NetworkDrilldownDrawer.tsx': { 'undeclared-overlay-scroll': 1 },
  'features/operational-diagnostics/components/DiagnosticDetailDrawer.tsx': { 'custom-fixed-overlay': 1 },
  'features/pdi/WizardPDI.tsx': { 'undeclared-overlay-scroll': 1 },
  'features/ranking/components/SellerProfileModal.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'features/remuneracao/components/dashboard/CalculationDetailsDrawer.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'features/vendedor-treinamentos/VendedorTreinamentos.container.tsx': { 'custom-fixed-overlay': 1, 'raw-overlay-max-size': 1 },
  'pages/owner/PlanoDeAcao.jsx': { 'undeclared-overlay-scroll': 1 },
}

const R_FIXED = /fixed inset-0/
const R_OVERLAY_SCROLL_OR_DIALOG_ROLE = /overflow-(?:y|x)?-auto|role="dialog"|aria-modal/
const R_DIALOG_FAMILY =
  /\b(?:Dialog|Modal|Sheet|Drawer|AlertDialog|Command|Popover|Tooltip|DropdownMenu|HoverCard|Menu)\b|components\/ui\/(?:dialog|sheet|drawer)/
const R_DIALOG_CONTENT = /DialogContent|SheetContent|DrawerContent|Dialog\.Content|Sheet\.Content/
const R_OVERFLOW_Y = /\boverflow-y-auto\b/
const R_SCROLL_DECL = /mx-overlay-body|DialogBody|ModalBody|data-mx-scroll-region|ScrollableRegion/
const R_OVERLAY_FILE = /DialogContent|SheetContent|DrawerContent|Dialog\.Content|Sheet\.Content|fixed inset-0/

/**
 * Função pura do gate (testável).
 *
 * @param {object} opts
 * @param {string[]} opts.files        caminhos relativos a `src`
 * @param {(rel: string) => string | null} opts.sourceOf
 * @param {string[]} [opts.allowlist]  fila de migração documentada
 */
export function inspectOverlayGeometry({ files, sourceOf, allowlist = LEGACY_OVERLAY_ALLOWLIST }) {
  const allow = new Set(allowlist)
  const violations = []
  const seen = new Set()

  for (const file of files) {
    if (PRIMITIVE_FILES.has(file) || seen.has(file)) continue
    seen.add(file)
    const src = sourceOf(file)
    if (src == null) continue
    const isOverlay = R_OVERLAY_FILE.test(src)

    if (R_FIXED.test(src) && R_OVERLAY_SCROLL_OR_DIALOG_ROLE.test(src) && !R_DIALOG_FAMILY.test(src) && !allow.has(file)) {
      violations.push({
        rule: 'custom-fixed-overlay',
        file,
        detail: 'fixed inset-0 com scroll/role=dialog sem família canônica (Modal/Dialog/Sheet/Drawer)',
      })
    }

    if (R_DIALOG_CONTENT.test(src) && R_OVERFLOW_Y.test(src) && !R_SCROLL_DECL.test(src) && !allow.has(file)) {
      violations.push({
        rule: 'undeclared-overlay-scroll',
        file,
        detail: 'overflow-y-auto em overlay sem mx-overlay-body/data-mx-scroll-region/ScrollableRegion',
      })
    }

    if (isOverlay && !allow.has(file)) {
      for (const m of src.matchAll(/z-\[([^\]]*)\]/g)) {
        if (!m[1].startsWith('var(')) {
          violations.push({ rule: 'raw-overlay-z-index', file, detail: `z-[${m[1]}]` })
        }
      }
      for (const m of src.matchAll(/(max-w-|max-h-)\[([^\]]*)\]/g)) {
        if (!m[2].startsWith('var(')) {
          violations.push({ rule: 'raw-overlay-max-size', file, detail: `${m[1]}[${m[2]}]` })
        }
      }
    }
  }

  return violations
}

function countByFileAndRule(violations) {
  const counts = new Map()
  for (const violation of violations) {
    const key = `${violation.file}|${violation.rule}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

/**
 * Audita tanto a fila nova quanto o crescimento da dívida legada.
 *
 * O retorno separado de `allViolations` permite que o contrato prove que a
 * allowlist não transforma uma regressão dentro de um arquivo legado em falso
 * verde. A política continua sendo: arquivos novos falham imediatamente;
 * arquivos legados só podem manter ou reduzir a contagem baseline por regra.
 */
export function inspectOverlayGeometryRatchet({
  files,
  sourceOf,
  allowlist = LEGACY_OVERLAY_ALLOWLIST,
  baseline = LEGACY_OVERLAY_BASELINE,
}) {
  const allow = new Set(allowlist)
  const unallowlistedViolations = inspectOverlayGeometry({ files, sourceOf, allowlist })
  const allViolations = inspectOverlayGeometry({ files, sourceOf, allowlist: [] })
  const counts = countByFileAndRule(allViolations)
  const ratchetViolations = []

  for (const [key, count] of counts) {
    const [file, rule] = key.split('|')
    if (!allow.has(file)) continue
    const limit = baseline[file]?.[rule] ?? 0
    if (count > limit) {
      ratchetViolations.push({
        rule: 'legacy-ratchet-increase',
        file,
        detail: `${rule}: baseline ${limit}, atual ${count}`,
      })
    }
  }

  for (const file of allowlist) {
    if (!Object.hasOwn(baseline, file)) {
      ratchetViolations.push({
        rule: 'legacy-ratchet-missing-baseline',
        file,
        detail: 'arquivo allowlisted sem baseline por regra',
      })
      continue
    }
    if (!allViolations.some((violation) => violation.file === file)) {
      ratchetViolations.push({
        rule: 'legacy-ratchet-stale-allowlist',
        file,
        detail: 'arquivo não possui mais violações; remova-o da allowlist e do baseline',
      })
    }
  }

  return {
    violations: [...unallowlistedViolations, ...ratchetViolations],
    allViolations,
    ratchetViolations,
  }
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!['node_modules', '.git', 'base44-reference'].includes(entry.name)) walk(full, files)
    } else if (/\.(tsx|jsx|ts|js)$/.test(entry.name) && !/\.(test|spec|playwright)\./.test(entry.name)) {
      files.push(path.relative(SRC_DIR, full).replace(/\\/g, '/'))
    }
  }
  return files
}

const JSON_MODE = process.argv.includes('--json')
const DUMP_MODE = process.argv.includes('--dump')

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCli) {
  const files = walk(SRC_DIR)
  const sourceOf = (rel) => {
    const abs = path.join(SRC_DIR, rel)
    return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null
  }
  const audit = inspectOverlayGeometryRatchet({ files, sourceOf })
  const violations = audit.violations
  const result = {
    gate: 'lint-overlay-geometry',
    pass: violations.length === 0,
    allowlistCount: LEGACY_OVERLAY_ALLOWLIST.length,
    currentLegacyViolationCount: audit.allViolations.length,
    violationCount: violations.length,
    violations,
  }

  if (DUMP_MODE) {
    for (const v of [...new Set(violations.map((x) => x.file))].sort()) console.log(`'${v}',`)
  } else if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (result.pass) {
    console.log(`[lint-overlay-geometry] OK — 0 violações fora da allowlist (${result.allowlistCount} legados documentados)`)
  } else {
    console.error(`[lint-overlay-geometry] FALHA — ${result.violationCount} violação(ões) fora da allowlist:`)
    for (const v of result.violations) {
      console.error(`  - [${v.rule}] ${v.file} — ${v.detail}`)
    }
  }
  process.exit(result.pass ? 0 : 1)
}
