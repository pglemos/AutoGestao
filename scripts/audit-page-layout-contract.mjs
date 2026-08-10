#!/usr/bin/env node
/**
 * Gate do contrato de layout — Task 7 do plano de padronização.
 *
 * Proíbe geometria estrutural fora do PageCanvas em rotas padrão:
 *   1. nested-macro-wrapper: wrapper com classes macro (mx-auto, max-w-7xl,
 *      w-full centrado, paddings/gaps de página) dentro de PageCanvas ou em
 *      seção de rota autenticada.
 *   2. page-root-no-canvas: página de rota autenticada sem PageCanvas/
 *      ConditionalPageCanvas/PageTemplate e com wrapper estrutural próprio.
 *   3. canvas-as-main: PageCanvas renderizado com `as="main"` (o shell já
 *      fornece <main>; aninhar main viola landmark).
 *
 * Uso:
 *   node scripts/audit-page-layout-contract.mjs          # exit 1 se violar
 *   node scripts/audit-page-layout-contract.mjs --json   # JSON em stdout
 *
 * Baseline SHA de referência: 82191012260208c6dc82e240cd78fdf4658fb6ba
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const JSON_MODE = process.argv.includes('--json')

/**
 * Arquivos de rotas padrão autenticadas (migradas ou não) + seções que
 * implementam a raiz de páginas de rota.
 */
const ROUTE_FILES = [
  // Vendedor
  'src/pages/VendedorHome.tsx',
  'src/pages/VendedorAjuda.tsx',
  'src/pages/CarteiraClientes.tsx',
  'src/pages/CentralExecucao.tsx',
  'src/pages/FunilVendedor.tsx',
  'src/pages/MeuPerfilVendedor.tsx',
  'src/pages/RelatoriosVendedor.tsx',
  'src/pages/VendedorConfiguracoes.tsx',
  'src/pages/VendedorDesenvolvimento.tsx',
  // Gerente/Dono/Admin
  'src/pages/DashboardLoja.tsx',
  'src/pages/RotinaGerente.tsx',
  'src/pages/GerenteFeedback.tsx',
  'src/pages/GerentePDI.tsx',
  'src/pages/ManagerDevelopment.tsx',
  'src/pages/ManagerMentor.tsx',
  'src/pages/Configuracoes.tsx',
  'src/pages/Perfil.tsx',
  'src/pages/Notificacoes.tsx',
  'src/pages/AgendaAdmin.tsx',
  'src/pages/LiberacaoFechamento.tsx',
  'src/pages/Ranking.tsx',
  'src/pages/Simulacao.tsx',
  'src/pages/StoreBranches.tsx',
  'src/pages/StoreConsultorIa.tsx',
  'src/pages/Reprocessamento.tsx',
  'src/pages/OperationalSettings.tsx',
  'src/pages/ConsultoriaParametros.tsx',
  // Features com rota própria
  'src/features/dashboard-loja/DashboardLoja.container.tsx',
  'src/features/checkin/Checkin.container.tsx',
  'src/features/manager/daily-closing/ManagerDailyClosing.container.tsx',
  'src/features/manager/team-routine/ManagerTeamRoutine.container.tsx',
  'src/features/gerente/FunilVendasGerente.tsx',
  'src/features/dono/FalarConsultorDono.tsx',
  'src/features/owner/OwnerStoresNetworkPage.tsx',
  'src/features/organograma/OrganogramaPage.tsx',
  'src/features/comportamental/ComportamentalPage.tsx',
  // Seções que montam raiz de página por perfil
  'src/features/manager/day-routine/ManagerDayRoutineView.tsx',
  'src/features/manager/development/ManagerUniversityReference.tsx',
  'src/features/manager/meta/ManagerStoreGoalReference.tsx',
  'src/features/manager/team/ManagerTeamPerformance.tsx',
  'src/features/ranking/views/ManagerRankingReference.tsx',
  'src/features/dashboard-loja/sections/DashboardEmptyStates.tsx',
  'src/features/dashboard-loja/sections/DashboardHeader.tsx',
  'src/features/dashboard-loja/sections/ManagerSellerParityHome.tsx',
  'src/features/dashboard-loja/sections/ManagerSellerParityHomeCanonical.tsx',
  'src/features/dashboard-loja/sections/PerformanceTab.tsx',
  'src/features/dashboard-loja/sections/ManagerOperationalCockpit.tsx',
  'src/features/dashboard-loja/sections/owner-cockpit/OwnerBase44Views.tsx',
  'src/features/dashboard-loja/sections/owner-cockpit/primitives.tsx',
  'src/features/manager/daily-closing/AgendaD1Panel.tsx',
  'src/features/manager/daily-closing/AgendaD1PanelBase44.tsx',
  'src/features/manager/daily-closing/LeadConferenceModal.tsx',
  'src/features/manager/daily-closing/ManagerDailyClosingBase44.tsx',
  'src/features/manager/team/ManagerSellerProfileModal.tsx',
  'src/features/ranking/views/StoreRankingView.tsx',
]

/** Padrões de classe proibidos fora do canvas. */
const MACRO_RE =
  /\b(mx-auto|mx-\[auto\]|block|flex|grid)\s+[^"']*(w-full|max-w-7xl|max-w-\[[^\]]+\])|(w-full|max-w-7xl|max-w-\[[^\]]+\])[^"']*\b(mx-auto|mx-\[auto\])/g
const CENTERED_WRAP_RE = /\b(mx-auto|mx-\[auto\])(\s|\b)/g
const MAXW_RE = /\bmax-w-(7xl|\[[0-9]+(\.[0-9]+)?(rem|px)?\]|screen-[a-z]+|\[screen-[^\]]+\])\b/g
const PAGE_PADDING_RE = /\b(px-4|px-6|px-8|py-6|py-8|pb-20|pb-24|gap-4|gap-5|space-y-5|flex-col)\b/g

function readText(file) {
  const abs = path.isAbsolute(file) ? file : path.join(ROOT_DIR, file)
  if (!fs.existsSync(abs)) return null
  return fs.readFileSync(abs, 'utf8')
}

function hasCanvas(text) {
  return /<PageCanvas|<ConditionalPageCanvas|PageTemplate\b/.test(text)
}

/**
 * Detecta wrapper estrutural: classe com centragem + largura máxima + sinais
 * de page-gutter (padrão histórico do antigo AppShell).
 */
function findStructuralWrappers(text) {
  const found = []
  const classNameMatches = [...text.matchAll(/className=["'`]([^"'`]+)["'`]/g)]
  for (const m of classNameMatches) {
    const cls = m[1]
    const hasCenter = CENTERED_WRAP_RE.test(cls)
    const hasMaxW = MAXW_RE.test(cls)
    const hasPageGutter = PAGE_PADDING_RE.test(cls)
    if (hasCenter && hasMaxW && hasPageGutter) {
      const line = text.slice(0, m.index).split('\n').length
      found.push({ line, cls: cls.slice(0, 90) })
    }
  }
  return found
}

/** Verifica se o arquivo já define o canvas na raiz (as != "main"). */
function rootCanvasOk(text) {
  const canvasTags = [...text.matchAll(/<(PageCanvas|ConditionalPageCanvas)([^>]*?)(\/?>)/g)]
  for (const m of canvasTags) {
    if (/\bas="main"/.test(m[2])) return false
  }
  return true
}

const violations = []

for (const file of ROUTE_FILES) {
  const abs = path.join(ROOT_DIR, file)
  if (!fs.existsSync(abs)) continue
  const text = fs.readFileSync(abs, 'utf8')
  const kinds = new Set()

  if (!hasCanvas(text)) {
    const wrappers = findStructuralWrappers(text)
    if (wrappers.length > 0) {
      kinds.add(
        `page-root-no-canvas (${wrappers.map((w) => `L${w.line}`).join(',')}: ${wrappers[0].cls})`,
      )
    }
  } else {
    const wrappers = findStructuralWrappers(text)
    for (const w of wrappers) {
      kinds.add(`nested-macro-wrapper (L${w.line}: ${w.cls})`)
    }
    if (!rootCanvasOk(text)) kinds.add('canvas-as-main')
  }

  if (kinds.size > 0) {
    violations.push({ file, kinds: [...kinds] })
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file))

if (JSON_MODE) {
  console.log(
    JSON.stringify(
      {
        gate: 'audit-page-layout-contract',
        pass: violations.length === 0,
        violationCount: violations.length,
        violations,
        baselineSha: '82191012260208c6dc82e240cd78fdf4658fb6ba',
      },
      null,
      2,
    ),
  )
} else {
  if (violations.length === 0) {
    console.log('[audit-page-layout-contract] OK — zero violações do contrato de layout')
  } else {
    console.log(`[audit-page-layout-contract] FALHA — ${violations.length} arquivo(s) com violação:`)
    for (const v of violations) {
      console.log(`  - ${v.file}`)
      for (const k of v.kinds) console.log(`      ${k}`)
    }
  }
}

process.exit(violations.length === 0 ? 0 : 1)
