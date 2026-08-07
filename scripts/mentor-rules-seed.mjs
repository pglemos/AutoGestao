#!/usr/bin/env node
/**
 * Seed idempotente dos catálogos do Mentor Comercial (TASK 9).
 *
 * Carrega rules/mentor-comercial/v1/*.json para as tabelas mestre no Supabase.
 *
 *   executar 1x  -> dados corretos
 *   executar 2x  -> mesmos dados
 *   executar 10x -> mesmos dados
 *
 * Nunca duplica: o upsert usa as chaves naturais versionadas
 * (rule_version + código), garantidas por índice único no banco.
 *
 * O validator roda ANTES de qualquer escrita. Se a matriz estiver inválida,
 * nada é aplicado — não existe seed parcial silencioso.
 *
 * Uso:
 *   node scripts/mentor-rules-seed.mjs            # aplica
 *   node scripts/mentor-rules-seed.mjs --dry-run  # só relata o que faria
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RULES_DIR = path.join(projectRoot, 'rules/mentor-comercial/v1')
const DRY_RUN = process.argv.includes('--dry-run')
const RULE_VERSION = 'v1'

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
  // SUPABASE_URL está vazio no .env deste projeto; VITE_SUPABASE_URL é o válido.
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL/SERVICE_ROLE_KEY não configurados')
  return { url, key }
}

const load = (name) => JSON.parse(readFileSync(path.join(RULES_DIR, name), 'utf8'))

/** `Qualquer`, `Qualquer visita`, `Qualquer ativa` são curingas oficiais da fonte. */
const isWildcard = (value) => value !== null && /^qualquer\b/i.test(String(value).trim())

function buildRows(sourceSha256) {
  const statuses = load('statuses.json').records
  const cadences = load('cadences.json').records
  const steps = load('cadence-steps.json').records
  const scripts = load('scripts.json').records
  const transitions = load('transitions.json').records

  // step_order é a posição do passo dentro da sua cadência, na ordem da planilha.
  const orderByCadence = new Map()
  const stepRows = steps.map((s) => {
    const next = (orderByCadence.get(s.cadenceId) ?? 0) + 1
    orderByCadence.set(s.cadenceId, next)
    return {
      rule_version: RULE_VERSION,
      cadence_code: s.cadenceId,
      attempt_label: String(s.attempt),
      step_order: next,
      offset_label: String(s.offset),
      objective: s.objective,
      notes: s.notes,
      source_sha256: sourceSha256,
      active: true,
    }
  })

  return {
    mentor_status_definitions: {
      conflict: 'rule_version,status_code',
      rows: statuses.map((s) => ({
        rule_version: RULE_VERSION,
        status_code: s.statusId,
        channel: s.channel,
        family: s.family,
        label: s.label,
        definition: s.definition,
        origin: s.origin,
        responsible: s.responsible,
        temperature: s.temperature,
        objective: s.objective,
        next_step: s.nextStep,
        cadence_ref: s.cadenceId,
        script_ref: s.scriptId,
        potential: s.potential,
        central_rule: s.centralRule,
        active_in_portfolio: s.activeInPortfolio,
        mentor_guidance: s.mentorGuidance,
        main_results: s.mainResults,
        notes: s.notes,
        source_sha256: sourceSha256,
        active: true,
      })),
    },
    mentor_cadences: {
      conflict: 'rule_version,cadence_code',
      rows: cadences.map((c) => ({
        rule_version: RULE_VERSION,
        cadence_code: c.cadenceId,
        name: c.name,
        objective: c.objective,
        attempts_label: String(c.attempts),
        day_pattern: c.dayPattern,
        application: c.application,
        interruption_condition: c.interruptionCondition,
        final_condition: c.finalCondition,
        source_sha256: sourceSha256,
        active: true,
      })),
    },
    mentor_cadence_steps: { conflict: 'rule_version,cadence_code,step_order', rows: stepRows },
    mentor_scripts: {
      conflict: 'rule_version,script_code',
      rows: scripts.map((s) => ({
        rule_version: RULE_VERSION,
        script_code: s.scriptId,
        area: s.area,
        attempt_label: s.attempt,
        objective: s.objective,
        // Texto verbatim: CRLF e placeholders preservados.
        body: s.text,
        source_sha256: sourceSha256,
        active: true,
      })),
    },
    mentor_transitions: {
      conflict: 'rule_version,family,from_status_or_context,result',
      rows: transitions.map((t) => ({
        rule_version: RULE_VERSION,
        family: t.family,
        from_status_or_context: t.fromStatusOrContext,
        result: t.result,
        to_status: t.toStatus,
        decision_notes: t.decisionNotes,
        is_wildcard: isWildcard(t.fromStatusOrContext),
        source_sha256: sourceSha256,
        active: true,
      })),
    },
  }
}

async function upsert({ url, key }, table, conflict, rows) {
  const response = await fetch(
    `${url}/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // merge-duplicates = atualiza a linha quando a chave natural já existe,
        // que é exatamente o comportamento exigido: "atualizar conteúdo quando
        // código/versão correspondente já existe".
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    },
  )
  if (!response.ok) {
    throw new Error(`${table}: HTTP ${response.status} — ${(await response.text()).slice(0, 400)}`)
  }
}

async function countRows({ url, key }, table) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' },
  })
  return Number(response.headers.get('content-range')?.split('/')[1] ?? -1)
}

async function main() {
  // Gate: validator primeiro. Matriz inválida não vira seed parcial.
  try {
    execFileSync('node', [path.join(projectRoot, 'scripts/mentor-rules-validate.mjs')], {
      stdio: 'pipe',
    })
  } catch (error) {
    console.error('FALHA: o validator da matriz não passou. Seed abortado, nada foi escrito.')
    console.error(String(error.stdout ?? error.message).slice(0, 2000))
    process.exit(1)
  }

  const metadata = load('metadata.json')
  const plan = buildRows(metadata.sourceSha256)

  console.log(`Mentor Comercial — seed da matriz ${metadata.version}`)
  console.log(`Fonte SHA256: ${metadata.sourceSha256}`)
  console.log('')

  if (DRY_RUN) {
    for (const [table, { rows }] of Object.entries(plan)) {
      console.log(`  ${String(rows.length).padStart(4)}  ${table} (dry-run, nada escrito)`)
    }
    return
  }

  const env = loadEnv()
  for (const [table, { conflict, rows }] of Object.entries(plan)) {
    const before = await countRows(env, table)
    await upsert(env, table, conflict, rows)
    const after = await countRows(env, table)
    const delta = after - before
    console.log(
      `  ${String(after).padStart(4)}  ${table.padEnd(28)} ` +
        `(${rows.length} enviadas, ${delta >= 0 ? '+' : ''}${delta} linhas)`,
    )
    if (after !== rows.length) {
      console.error(
        `\nFALHA: ${table} ficou com ${after} linhas para ${rows.length} registros da fonte.`,
      )
      process.exit(1)
    }
  }

  console.log('\nSeed idempotente concluído. Reexecutar não duplica.')
}

main().catch((error) => {
  console.error(`FALHA: ${error.message}`)
  process.exit(1)
})
