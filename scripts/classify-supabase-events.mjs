#!/usr/bin/env node
/**
 * FASE AH — classificação de eventos de log do Supabase (34.004/34.005/34.012).
 *
 * Recebe eventos de log (linhas) e os classifica em categorias estáveis,
 * para o delta pré/pós E2E ser legível e nenhum RLS ser afrouxado por causa
 * de tráfego de teste (34.006). As categorias:
 *
 *   PRODUCTION_BUG             — sintoma real do produto (schema/RPC/query errada).
 *   EXPECTED_TEST_TRAFFIC      — tráfego gerado por fixtures/E2E que RLS bloqueia
 *                                de propósito (vendedor sem vínculo, rota de outro perfil).
 *   ENVIRONMENT_NOISE          — ruído de ambiente (websocket dev, analytics ausente fora
 *                                da Vercel, 401 de RLS de perfil trocado em teste).
 *   UNCLASSIFIED               — evento sem classificação ainda.
 *
 * A classificação é determinística por padrões de texto. Uso:
 *   node scripts/classify-supabase-events.mjs < events.txt
 *   node scripts/classify-supabase-events.mjs --json < events.txt
 */
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

export const CATEGORIES = ['PRODUCTION_BUG', 'EXPECTED_TEST_TRAFFIC', 'ENVIRONMENT_NOISE', 'UNCLASSIFIED']

const EXPECTED_TEST_TRAFFIC_PATTERNS = [
  // vendedor sem vínculo ativo -> RLS vendedores_loja/vinculos_loja filtra (fixture E2E).
  /vendedores_loja|vinculos_loja/,
  /no rows? (returned|in result)|0 rows/,
  /new row violates row-level security/,
  // consultor/e2e fixture que usa role de outro perfil.
  /e2e[-_]consultor_mx|e2e[-_]seller|fixture.*role/i,
  // query esperada de teste (get_rls_info, matrix).
  /get_table_rls_info|rls_matrix/i,
]

const ENVIRONMENT_NOISE_PATTERNS = [
  /websocket/i,
  /realtime\/v1\/websocket/,
  /_vercel\/insights|_vercel\/speed-insights/,
  /Failed to load resource/,
  /loadUserData fail/,
  /supabase\.co\/.*(401|400)/,
  /dev[ _-]server|localhost:3107/,
]

const PRODUCTION_BUG_PATTERNS = [
  // mismatch de schema coluna/tabela.
  /column .* does not exist|relation .* does not exist/,
  /could not find a function named|function .* does not exist/,
  /invalid input syntax for type uuid/,
  /statement timeout|statement_timeout/,
  /canceling statement due to (statement|user )?timeout/,
  /duplicate key value violates unique constraint/,
  /permission denied for (table|function|schema) public\./,
  /rpc.*(permission|denied|failed)/i,
]

export function classifyEvent(line) {
  if (PRODUCTION_BUG_PATTERNS.some((re) => re.test(line))) return 'PRODUCTION_BUG'
  if (EXPECTED_TEST_TRAFFIC_PATTERNS.some((re) => re.test(line))) return 'EXPECTED_TEST_TRAFFIC'
  if (ENVIRONMENT_NOISE_PATTERNS.some((re) => re.test(line))) return 'ENVIRONMENT_NOISE'
  return 'UNCLASSIFIED'
}

export function classifyEvents(lines) {
  const counts = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const category = classifyEvent(trimmed)
    if (!counts[category]) counts[category] = { count: 0, samples: [] }
    counts[category].count++
    if (counts[category].samples.length < 5) counts[category].samples.push(trimmed.slice(0, 160))
  }
  return CATEGORIES.map((c) => ({
    category: c,
    count: counts[c]?.count ?? 0,
    samples: counts[c]?.samples ?? [],
  }))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = readFileSync(0, 'utf8')
  const lines = input.split('\n')
  const result = classifyEvents(lines)

  // 34.002 — run-id identificável: etiqueta a classificação para o delta
  // pré/pós E2E ser rastreável (ex.: --run-id e2e-2026-08-15-main).
  const runIdIdx = process.argv.indexOf('--run-id')
  const runId = runIdIdx !== -1 && process.argv[runIdIdx + 1] ? process.argv[runIdIdx + 1] : 'adhoc'

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ runId, at: new Date().toISOString(), categories: result }, null, 2))
  } else {
    console.log(`[supabase-classify] run=${runId} at=${new Date().toISOString()}`)
    for (const { category, count, samples } of result) {
      console.log(`${category}: ${count}`)
      for (const s of samples) console.log(`    ${s}`)
    }
  }
}
