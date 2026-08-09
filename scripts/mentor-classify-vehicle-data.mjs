#!/usr/bin/env node
/**
 * Relatório de cobertura + classificação de dados de veículos via catálogo
 * mentor (PRODUCT DELTA 2026-08-07 §36).
 *
 * REGRAS:
 * 1. DRY-RUN é o padrão. `--apply` é obrigatório para escrever. Sem exceção.
 * 2. Escreve somente classificações inequívocas (`classification_source =
 *    'migration'`); textos originais nunca são sobrescritos.
 * 3. Não toca em itens já classificados (catalog_model_id NOT NULL).
 * 4. Idempotente: rodar duas vezes com --apply não muda nada na segunda.
 * 5. Estoque e oportunidades são tratados em separado no relatório.
 *
 * Uso:
 *   node scripts/mentor-classify-vehicle-data.mjs          # DRY-RUN (Padrão)
 *   node scripts/mentor-classify-vehicle-data.mjs --apply  # Aplica no Supabase
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const envPath = path.join(projectRoot, '.env')
  if (!existsSync(envPath)) throw new Error('.env não encontrado')
  const env = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_]+)=(.*)$/)
    if (!match) continue
    const value = match[2].trim().replace(/^["']|["']$/g, '')
    if (value) env[match[1]] = value
  }
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY não configurados')
  return { url, key }
}

export function normalizeVehicleText(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve marca+modelo contra o catálogo (mesma semântica do motor §9.3:
 *  match exato do token normalizado, nunca substring). */
export function resolveCatalogModel(brand, model, catalog) {
  const brandNorm = normalizeVehicleText(brand)
  const modelNorm = normalizeVehicleText(model)
  if (!brandNorm || !modelNorm) return { kind: 'not_found', entry: null, matches: 0 }
  const candidates = catalog.filter(entry => {
    if (entry.normalized_brand !== brandNorm) return false
    const tokens = [entry.normalized_model, ...(entry.aliases || []).map(normalizeVehicleText)]
    return tokens.includes(modelNorm)
  })
  if (candidates.length === 1) return { kind: 'resolved', entry: candidates[0], matches: 1 }
  if (candidates.length > 1) return { kind: 'ambiguous', entry: null, matches: candidates.length }
  return { kind: 'not_found', entry: null, matches: 0 }
}

/** Resolve texto livre de interesse (marca presente E modelo/alias presente). */
export function resolveInterestText(interestText, catalog) {
  const text = normalizeVehicleText(interestText)
  if (!text) return { kind: 'not_found', entry: null, matches: 0 }
  const matches = []
  for (const entry of catalog) {
    if (!text.includes(entry.normalized_brand)) continue
    const tokens = [entry.normalized_model, ...(entry.aliases || []).map(normalizeVehicleText)]
    if (tokens.some(token => text.includes(token))) matches.push(entry)
  }
  if (matches.length === 1) return { kind: 'resolved', entry: matches[0], matches: 1 }
  if (matches.length > 1) return { kind: 'ambiguous', entry: null, matches: matches.length }
  return { kind: 'not_found', entry: null, matches: 0 }
}

const CATEGORIAS_VALIDAS = new Set(['hatch', 'sedan', 'suv', 'picape', 'minivan', 'utilitario', 'moto', 'outro'])

async function fetchAll({ url, key }, table, select, filters = '') {
  const rows = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${url}/rest/v1/${table}?select=${select}${filters}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + pageSize - 1}`,
      },
    })
    if (!response.ok) {
      throw new Error(`${table}: HTTP ${response.status} — ${(await response.text()).slice(0, 200)}`)
    }
    const page = await response.json()
    rows.push(...page)
    if (page.length < pageSize) break
  }
  return rows
}

async function patchRow({ url, key }, table, id, payload) {
  const response = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`PATCH ${table} [${id}]: HTTP ${response.status} — ${(await response.text()).slice(0, 200)}`)
  }
}

/** Planeja a classificação de uma lista de itens com resolução por marca+modelo. */
function planByBrandModel(items, catalog, classify) {
  const plan = { total: items.length, jaClassificados: 0, aClassificar: 0, resolvidos: [], ambiguos: [], naoEncontrados: [] }
  for (const item of items) {
    if (item.catalog_model_id) {
      plan.jaClassificados += 1
      continue
    }
    plan.aClassificar += 1
    const resolution = classify(item)
    if (resolution.kind === 'resolved') plan.resolvidos.push({ item, entry: resolution.entry })
    else if (resolution.kind === 'ambiguous') plan.ambiguos.push({ item, matches: resolution.matches })
    else plan.naoEncontrados.push({ item })
  }
  return plan
}

export async function planVehicleCoverage(catalog, oportunidades, veiculos) {
  return {
    oportunidades: planByBrandModel(oportunidades, catalog, opp => resolveInterestText(opp.veiculo_interesse, catalog)),
    estoque: planByBrandModel(veiculos, catalog, veiculo => resolveCatalogModel(veiculo.marca, veiculo.modelo, catalog)),
  }
}

function buildReport(coverage, dryRun) {
  const lines = []
  lines.push('# Cobertura de dados de veículos — catálogo mentor')
  lines.push('')
  lines.push(`> Gerado automaticamente por \`scripts/mentor-classify-vehicle-data.mjs\` — ${dryRun ? 'DRY-RUN (nada foi escrito)' : 'com --apply (escritas aplicadas)'}.`)
  lines.push('')
  for (const [label, plan] of [['Oportunidades', coverage.oportunidades], ['Estoque', coverage.estoque]]) {
    lines.push(`## ${label}`)
    lines.push('')
    lines.push(`| Métrica | Valor |`)
    lines.push(`| --- | --- |`)
    lines.push(`| Total de itens | ${plan.total} |`)
    lines.push(`| Já classificados (catalog_model_id) | ${plan.jaClassificados} |`)
    lines.push(`| Classificáveis inequivocamente | ${plan.resolvidos.length} |`)
    lines.push(`| Ambiguidades | ${plan.ambiguos.length} |`)
    lines.push(`| Não classificáveis | ${plan.naoEncontrados.length} |`)
    lines.push('')
    if (plan.resolvidos.length > 0) {
      lines.push(`### ${dryRun ? 'Classificações a aplicar' : 'Classificações aplicadas'} (${plan.resolvidos.length})`)
      lines.push('')
      lines.push('| Item | Resolução | Categoria |')
      lines.push('| --- | --- | --- |')
      for (const { item, entry } of plan.resolvidos) {
        const label = label === 'Oportunidades' ? `Oportunidade ${item.id}` : `Veículo ${item.marca} ${item.modelo}`
        lines.push(`| ${label} | ${entry.brand} ${entry.model} | ${entry.category} |`)
      }
      lines.push('')
    }
    if (plan.ambiguos.length > 0) {
      lines.push(`### Ambiguidades (${plan.ambiguos.length})`)
      lines.push('')
      lines.push('| Item | Entradas casadas |')
      lines.push('| --- | --- |')
      for (const { item, matches } of plan.ambiguos) {
        const label = label === 'Oportunidades' ? item.veiculo_interesse : `${item.marca} ${item.modelo}`
        lines.push(`| ${label} | ${matches} |`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

async function main() {
  const apply = process.argv.includes('--apply')
  const env = loadEnv()
  const catalog = await fetchAll(env, 'vehicle_model_catalog', 'id,brand,model,normalized_brand,normalized_model,aliases,category,status')
  const activeCatalog = catalog.filter(entry => entry.status !== 'inativo')
  const oportunidades = await fetchAll(env, 'oportunidades', 'id,veiculo_interesse,catalog_model_id,categoria_veiculo')
  const veiculos = await fetchAll(env, 'veiculos_estoque', 'id,marca,modelo,catalog_model_id,categoria')

  const coverage = await planVehicleCoverage(
    activeCatalog,
    oportunidades.filter(opp => opp.veiculo_interesse && String(opp.veiculo_interesse).trim()),
    veiculos.filter(veiculo => veiculo.marca && veiculo.modelo),
  )

  const report = buildReport(coverage, !apply)
  const reportDir = path.join(projectRoot, 'docs/mentor-comercial')
  mkdirSync(reportDir, { recursive: true })
  const reportPath = path.join(reportDir, 'VEHICLE_DATA_COVERAGE_REPORT.md')
  writeFileSync(reportPath, report)
  console.log(report)
  console.log(`\nRelatório: ${path.relative(projectRoot, reportPath)}`)

  if (apply) {
    let escritas = 0
    for (const { item, entry } of coverage.oportunidades.resolvidos) {
      const payload = {
        catalog_model_id: entry.id,
        classification_source: 'migration',
      }
      if (item.categoria_veiculo == null && CATEGORIAS_VALIDAS.has(entry.category)) {
        payload.categoria_veiculo = entry.category
      }
      await patchRow(env, 'oportunidades', item.id, payload)
      escritas += 1
    }
    for (const { item, entry } of coverage.estoque.resolvidos) {
      const payload = {
        catalog_model_id: entry.id,
        classification_source: 'migration',
      }
      if (item.categoria == null && CATEGORIAS_VALIDAS.has(entry.category)) {
        payload.categoria = entry.category
      }
      await patchRow(env, 'veiculos_estoque', item.id, payload)
      escritas += 1
    }
    console.log(`\n${escritas} classificação(ões) gravada(s) com classification_source='migration'.`)
  } else {
    console.log('\nDRY-RUN: nenhuma escrita realizada. Use --apply para gravar.')
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message || error)
    process.exit(1)
  })
}
