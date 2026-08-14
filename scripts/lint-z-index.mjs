#!/usr/bin/env node
/**
 * Trava de regressão para z-index arbitrário.
 *
 * A escala fechada de destino está em `src/design-system/tokens/components.css`
 * (`--mx-z-*`). Nenhum valor numérico arbitrário é permitido no runtime;
 * consumidores usam `z-[var(--mx-z-*)]`, uma classe semântica do sistema ou
 * uma variável semântica no CSS. O landing público é uma exceção deliberada:
 * ele mantém um sistema visual isolado e está coberto por snapshots próprios.
 *
 * As regras semânticas (`SEMANTIC_RULES`) são determinísticas POR OCORRÊNCIA:
 * cada regra fixa as linhas exatas do elemento-alvo e exige que a linha use
 * exclusivamente o token esperado. Um token em OUTRA linha/elemento do mesmo
 * arquivo NÃO gera falso positivo — o escopo é a ocorrência, não o arquivo.
 *
 * Uso: node scripts/lint-z-index.mjs
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT_DIR, 'src')
/** Referência congelada do Base44; não é código do produto. */
const IGNORED = [/\/src\/base44-reference\//]
/** Marketing público isolado; não compartilha o DS operacional. */
const EXCEPTIONS = [/\/src\/features\/landing\/data\/landing-css\.ts$/]

const Z_ARBITRARY = /\bz-\[(\d+)\]/g
const Z_NUMERIC = /\bz-(\d+)\b/g
const Z_INDEX_NUMERIC = /\bz-index\s*:\s*(-?\d+)\b/g
const Z_INDEX_INLINE_NUMERIC = /\bzIndex\s*:\s*(-?\d+)\b/g
/** Escala fechada — única lista de tokens `--mx-z-*` permitidos. */
const Z_SCALE = new Set([
  'mx-z-base',
  'mx-z-sticky',
  'mx-z-sidebar',
  'mx-z-topbar',
  'mx-z-drawer',
  'mx-z-overlay',
  'mx-z-modal',
  'mx-z-popover',
  'mx-z-toast',
  'mx-z-tooltip',
])
/** Qualquer uso de `var(--mx-z-<nome>)`, inclusive em `z-index`/`zIndex`. */
const Z_TOKEN = /\bvar\(--(mx-z-[a-z]+)\)/g

/**
 * Regras semânticas por ocorrência. Cada entrada é
 * `[caminhoRelativo, tokenEsperado, linhas1BasedDoElementoAlvo]`.
 *
 * A checagem é por linha: a linha do elemento-alvo deve usar exatamente o
 * token esperado e nenhum outro `--mx-z-*` nem valor numérico. O que ocorre
 * em outras linhas do mesmo arquivo é irrelevante para a regra.
 */
export const SEMANTIC_RULES = [
  ['src/components/atoms/Tooltip.tsx', 'mx-z-tooltip', [6]],
  ['src/components/atoms/Button.tsx', 'mx-z-tooltip', [106]],
  ['src/components/fechamento/MovimentoDia.jsx', 'mx-z-tooltip', [311]],
  ['src/components/ui/dropdown-menu.jsx', 'mx-z-popover', [39, 53]],
  ['src/components/ui/popover.jsx', 'mx-z-popover', [19]],
  ['src/components/owner/OwnerFilterButton.jsx', 'mx-z-popover', [99]],
  ['src/features/ranking/manager/ManagerRankingComparison.tsx', 'mx-z-popover', [94]],
  ['src/features/manager/team/ManagerTeamKanban.tsx', 'mx-z-popover', [186]],
  ['src/features/manager/daily-closing/AgendaD1Panel.tsx', 'mx-z-popover', [653]],
  ['src/features/manager/onboarding/ManagerTourOverlay.tsx', 'mx-z-popover', [141]],
  ['src/features/manager/onboarding/ManagerTourOverlay.tsx', 'mx-z-tooltip', [152, 153]],
  ['src/features/checkin/sections/NovoRegistroModal.tsx', 'mx-z-modal', [642]],
  ['src/features/checkin/sections/CheckinHeader.tsx', 'mx-z-modal', [652, 823, 966]],
  ['src/features/crm/ModoAtaqueView.tsx', 'mx-z-modal', [284, 323, 461]],
  ['src/features/manager/team/ManagerSellerProfileModal.tsx', 'mx-z-modal', [69, 70]],
  ['src/features/ranking/components/SellerProfileModal.tsx', 'mx-z-modal', [44, 54]],
  ['src/features/agenda-admin/components/AgendaEventDrawer.tsx', 'mx-z-drawer', [51]],
  ['src/features/central-execucao/components/FichaClienteSheet.tsx', 'mx-z-drawer', [44]],
  ['src/features/consultoria-visita/LegacyConsultoriaVisitaExecucaoPage.tsx', 'mx-z-topbar', [654]],
  ['src/features/crm/FunilVendedor.container.tsx', 'mx-z-topbar', [148]],
  ['src/features/central-execucao/components/CentralTabs.tsx', 'mx-z-sticky', [15]],
  ['src/components/organisms/DataGrid.tsx', 'mx-z-sticky', [102]],
  ['src/components/organisms/AgendaCalendar/TimeGrid.tsx', 'mx-z-sticky', [183]],
  ['src/components/owner/strategic/StrategicIndicatorComparisonTable.jsx', 'mx-z-sticky', [54, 72]],
  ['src/components/owner/strategic/StrategicPlanOverview.jsx', 'mx-z-sticky', [73, 83]],
]

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(full, files)
    } else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) {
      files.push(full)
    }
  }
  return files
}

function collect() {
  const byValue = new Map()
  const numericByValue = new Map()
  const declarationByValue = new Map()
  const inlineByValue = new Map()
  const unknownByValue = new Map()
  let total = 0
  let numericTotal = 0
  let declarationTotal = 0
  let inlineTotal = 0
  let unknownTotal = 0

  for (const file of walk(SRC_DIR)) {
    const normalized = file.replace(/\\/g, '/')
    if (IGNORED.some((pattern) => pattern.test(normalized)) || EXCEPTIONS.some((pattern) => pattern.test(normalized))) continue

    const text = fs.readFileSync(file, 'utf8')
    for (const [, value] of text.matchAll(Z_ARBITRARY)) {
      byValue.set(value, (byValue.get(value) ?? 0) + 1)
      total += 1
    }
    for (const [, value] of text.matchAll(Z_NUMERIC)) {
      numericByValue.set(value, (numericByValue.get(value) ?? 0) + 1)
      numericTotal += 1
    }
    for (const [, value] of text.matchAll(Z_INDEX_NUMERIC)) {
      declarationByValue.set(value, (declarationByValue.get(value) ?? 0) + 1)
      declarationTotal += 1
    }
    for (const [, value] of text.matchAll(Z_INDEX_INLINE_NUMERIC)) {
      inlineByValue.set(value, (inlineByValue.get(value) ?? 0) + 1)
      inlineTotal += 1
    }
    for (const [, value] of text.matchAll(Z_TOKEN)) {
      if (!Z_SCALE.has(value)) {
        unknownByValue.set(value, (unknownByValue.get(value) ?? 0) + 1)
        unknownTotal += 1
      }
    }
  }

  return {
    total,
    values: Object.fromEntries([...byValue.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    numericTotal,
    numericValues: Object.fromEntries([...numericByValue.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    declarationTotal,
    declarationValues: Object.fromEntries([...declarationByValue.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    inlineTotal,
    inlineValues: Object.fromEntries([...inlineByValue.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))),
    unknownTotal,
    unknownValues: Object.fromEntries([...unknownByValue.entries()].sort()),
  }
}

function zTokensInLine(line) {
  return [...line.matchAll(/var\(--(mx-z-[a-z]+)\)/g)].map((match) => match[1])
}

/**
 * Tokens `var(--mx-z-<nome>)` fora da escala fechada num trecho de texto.
 * Exportada para o contrato focado; cobre classes `z-[var(...)]` e
 * declarações `z-index`/`zIndex`.
 */
export function unknownScaleTokens(source) {
  const byValue = {}
  for (const [, name] of source.matchAll(Z_TOKEN)) {
    if (!Z_SCALE.has(name)) byValue[name] = (byValue[name] ?? 0) + 1
  }
  return byValue
}

/**
 * Audita UMA regra contra o texto de um arquivo (determinístico por linha).
 * Exportada para o contrato focado; recebe `source` e `{ token, lines }`.
 */
export function auditSemanticRuleText(source, { token, lines }) {
  const problems = []
  const fileLines = source.split('\n')
  let checkedLines = 0

  for (const lineNo of lines) {
    const line = fileLines[lineNo - 1]
    if (line === undefined) continue
    checkedLines += 1
    const tokens = zTokensInLine(line)
    if (tokens.length === 0) {
      problems.push(`linha ${lineNo}: sem var(--mx-z-*); esperado somente var(--${token}).`)
      continue
    }
    const wrong = tokens.filter((used) => used !== token)
    if (wrong.length > 0) {
      problems.push(`linha ${lineNo}: usa ${wrong.map((used) => `--${used}`).join(', ')}; esperado somente var(--${token}).`)
      continue
    }
    if (/\bz-\[\d+\]|\bz-\d+\b/.test(line)) {
      problems.push(`linha ${lineNo}: z numérico junto do token semântico.`)
      continue
    }
  }

  if (checkedLines === 0) {
    problems.push(`nenhuma linha esperada existe no arquivo — var(--${token}) não encontrado.`)
  }
  return problems
}

/** Audita todas as 24 regras contra o checkout. */
export function auditSemanticRules(rootDir = ROOT_DIR) {
  const problems = []
  for (const [relativePath, token, lines] of SEMANTIC_RULES) {
    const file = path.join(rootDir, relativePath)
    let source
    try {
      source = fs.readFileSync(file, 'utf8')
    } catch {
      problems.push(`${relativePath}: arquivo ausente.`)
      continue
    }
    problems.push(...auditSemanticRuleText(source, { token, lines }).map((problem) => `${relativePath}: ${problem}`))
  }
  return problems
}

/** Auditoria completa: ocorrências numéricas globais + regras semânticas. */
export function runZIndexAudit(rootDir = ROOT_DIR) {
  const current = collect()
  const problems = []

  if (current.total > 0) {
    for (const [value, count] of Object.entries(current.values)) {
      problems.push(`${count} ocorrência(s) de z-[${value}] — use z-[var(--mx-z-*)] de components.css.`)
    }
  }

  if (current.numericTotal > 0) {
    for (const [value, count] of Object.entries(current.numericValues)) {
      problems.push(`${count} ocorrência(s) de z-${value} — use z-[var(--mx-z-*)] de components.css.`)
    }
  }

  if (current.declarationTotal > 0) {
    for (const [value, count] of Object.entries(current.declarationValues)) {
      problems.push(`${count} ocorrência(s) de z-index: ${value} — use uma variável --mx-z-* semântica.`)
    }
  }

  if (current.inlineTotal > 0) {
    for (const [value, count] of Object.entries(current.inlineValues)) {
      problems.push(`${count} ocorrência(s) de zIndex: ${value} — use uma variável --mx-z-* semântica.`)
    }
  }

  if (current.unknownTotal > 0) {
    for (const [value, count] of Object.entries(current.unknownValues)) {
      problems.push(`${count} ocorrência(s) de var(--${value}) — token fora da escala fechada (use --mx-z-base|sticky|sidebar|topbar|drawer|overlay|modal|popover|toast|tooltip).`)
    }
  }

  problems.push(...auditSemanticRules(rootDir))

  return {
    problems,
    counts: {
      arbitraryTotal: current.total,
      numericTotal: current.numericTotal,
      declarationTotal: current.declarationTotal,
      inlineTotal: current.inlineTotal,
      unknownScaleTotal: current.unknownTotal,
    },
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { problems } = runZIndexAudit()

  if (problems.length > 0) {
    console.error('[lint-z-index] FALHA\n')
    for (const problem of problems) console.error(`  • ${problem}`)
    console.error('\nEscala permitida: --mx-z-base|sticky|sidebar|topbar|drawer|overlay|modal|popover|toast|tooltip')
    process.exit(1)
  }

  console.log(`[lint-z-index] OK — escala semântica fechada; ${EXCEPTIONS.length} exceção(ões) explícita(s) de superfície pública.`)
}
