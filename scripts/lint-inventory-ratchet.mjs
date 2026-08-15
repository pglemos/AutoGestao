#!/usr/bin/env node
/**
 * Foundation Zero AC-29.017 — gate de ratchet dos inventories.
 *
 * Inventories são compromissos: `routesTotal`, `redirectTotal`, renderings de
 * STANDARD_CANVAS, etc. — a fatura técnica declarada. Eles devem ser um
 * RATCHET: só podem DIMINUIR sem justificativa. Qualquer métrica que AUMENTE
 * acima do baseline comprometido precisa de justificativa escrita no
 * `INCREASE_ALLOWLIST` — e o contrato falha se um aumento novo aparecer.
 *
 * Bases auditadas (100% fs, imunes ao C8):
 *   - artifacts/route-role-inventory/route-role-matrix.json (summary)
 *   - docs/reports/layout-route-inventory.json (routeCount)
 *
 * O baseline é o snapshot comprometido no momento em que o gate foi criado
 * (2026-08-14, fatia AC-4). Quando uma métrica legitima cresce (ex.: uma rota
 * nova adicionada de propósito), registra-se a entrada no INCREASE_ALLOWLIST
 * com justificativa; a métrica nova vira o novo piso. Métrica que cai fecha o
 * orçamento permanentemente (não volta).
 *
 * Puramente read-only: zero escrita, zero runtime.
 *
 * Uso:
 *   node scripts/lint-inventory-ratchet.mjs
 *   node scripts/lint-inventory-ratchet.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const JSON_MODE = process.argv.includes('--json')

const MATRIX_PATH = path.join(ROOT_DIR, 'artifacts/route-role-inventory/route-role-matrix.json')
const INVENTORY_PATH = path.join(ROOT_DIR, 'docs/reports/layout-route-inventory.json')

/**
 * Snapshot comprometido dos inventories (2026-08-14, fatia AC-4).
 * Métrica fora desta tabela não é auditada (evita falso-positivo de campo novo).
 */
export const BASELINE = {
  'route-role-matrix.routesTotal': 109,
  'route-role-matrix.routesProtected': 101,
  'route-role-matrix.routesPublic': 8,
  'route-role-matrix.routeRoleTotal': 232,
  'route-role-matrix.standardCanvasTotal': 66,
  'route-role-matrix.standardCanvasRenderings': 216,
  'route-role-matrix.redirectTotal': 30,
  'route-role-matrix.fullscreenTotal': 4,
  'route-role-matrix.printTotal': 1,
  'route-role-matrix.ungoverned': 0,
  'route-role-matrix.duplicatePaths': 0,
  'layout-route-inventory.routeCount': 107,
}

/**
 * Aumentos JUSTIFICADOS acima do baseline. Só se acrescenta entrada aqui com
 * justificativa escrita — e o contrato falha se uma métrica aumentar sem
 * entrada. Depois de justificada, a métrica nova vira o piso do próximo ciclo.
 */
export const INCREASE_ALLOWLIST = {
  // Módulo Administrador MX (2026-08-15): 4 rotas novas — /clientes,
  // /consultoria-mx, /indicadores, /planos-acao — importadas do backlog do
  // Administrador. As demais métricas sobem como consequência direta delas.
  'route-role-matrix.routesTotal': 'Módulo Administrador MX: 4 rotas novas em 2026-08-15.',
  'route-role-matrix.routesProtected': 'Módulo Administrador MX: as 4 rotas novas são protegidas (INTERNAL_ROLES).',
  'route-role-matrix.routeRoleTotal': 'Consequência das 4 rotas novas do Administrador MX.',
  'route-role-matrix.standardCanvasTotal': 'As 4 rotas novas e /equipe/admin usam canvas padrão.',
  'route-role-matrix.standardCanvasRenderings': 'Consequência das 4 rotas novas do Administrador MX.',
  'layout-route-inventory.routeCount': 'Consequência das 4 rotas novas do Administrador MX.',
}

function readJson(rel) {
  const abs = path.join(ROOT_DIR, rel)
  if (!fs.existsSync(abs)) throw new Error(`inventory ausente: ${rel}`)
  return JSON.parse(fs.readFileSync(abs, 'utf8'))
}

/**
 * Coleta as métricas atuais dos inventories.
 * @returns {Record<string, number>}
 */
export function collectInventoryMetrics() {
  const matrix = readJson('artifacts/route-role-inventory/route-role-matrix.json')
  const inventory = readJson('docs/reports/layout-route-inventory.json')
  /** @type {Record<string, number>} */
  const metrics = {}

  for (const [key, value] of Object.entries(matrix.summary ?? {})) {
    metrics[`route-role-matrix.${key}`] = value
  }
  metrics['layout-route-inventory.routeCount'] = inventory.routeCount
  return metrics
}

export function runInventoryRatchet() {
  const metrics = collectInventoryMetrics()
  const problems = []
  const allowed = new Set(Object.keys(INCREASE_ALLOWLIST))

  for (const [metric, baseline] of Object.entries(BASELINE)) {
    const current = metrics[metric]
    if (current === undefined) {
      problems.push(`métrica ausente do inventory atual: ${metric} — baseline orfão, atualizar BASELINE.`)
      continue
    }
    if (current > baseline && !allowed.has(metric)) {
      problems.push(
        `ratchet violado: ${metric} subiu de ${baseline} para ${current} sem justificativa — inventários só diminuem; se o aumento é intencional, registre em INCREASE_ALLOWLIST.`,
      )
    }
  }

  // Residuais de INCREASE_ALLOWLIST que não correspondem a aumento real.
  for (const metric of allowed) {
    const baseline = BASELINE[metric]
    const current = metrics[metric]
    if (baseline === undefined) {
      problems.push(`INCREASE_ALLOWLIST referencia métrica desconhecida: ${metric} — remover.`)
      continue
    }
    if (current <= baseline) {
      problems.push(`INCREASE_ALLOWLIST obsoleta: ${metric} já não excede o baseline (${current} <= ${baseline}) — remover a entrada.`)
    }
  }

  return { metrics, problems }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCli) {
  const { metrics, problems } = runInventoryRatchet()
  const result = {
    gate: 'lint-inventory-ratchet',
    pass: problems.length === 0,
    metrics,
    problems,
  }

  if (JSON_MODE) {
    console.log(JSON.stringify(result, null, 2))
  } else if (problems.length === 0) {
    console.log('[lint-inventory-ratchet] OK — inventories dentro do ratchet (só diminuem)')
  } else {
    console.error(`[lint-inventory-ratchet] ${problems.length} problema(s) de ratchet:`)
    for (const problem of problems) console.error(`  • ${problem}`)
  }

  process.exit(problems.length === 0 ? 0 : 1)
}
