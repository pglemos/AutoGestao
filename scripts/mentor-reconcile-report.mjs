#!/usr/bin/env node
/**
 * Relatório de reconciliação de clientes e oportunidades (TASK 57).
 *
 * SOMENTE LEITURA. Não escreve nada no banco. Serve para decidir a migração dos
 * dados reais (TASK 21) com evidência, em vez de classificar no escuro.
 *
 * Uso:
 *   node scripts/mentor-reconcile-report.mjs
 *   node scripts/mentor-reconcile-report.mjs --json
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const AS_JSON = process.argv.includes('--json')

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

async function fetchAll({ url, key }, table, select) {
  const rows = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const response = await fetch(`${url}/rest/v1/${table}?select=${select}`, {
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

/** Normalização usada só para DETECTAR suspeita de duplicidade. Nunca para mesclar. */
function normalizePhone(value) {
  if (!value) return null
  const digits = String(value).replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-11) : null
}

async function main() {
  const env = loadEnv()

  const [clientes, oportunidades] = await Promise.all([
    fetchAll(env, 'clientes', 'id,nome,telefone,telefone_normalizado,loja_id,seller_user_id,status'),
    fetchAll(
      env,
      'oportunidades',
      'id,cliente_id,etapa,canal,loja_id,seller_user_id,current_status_code,needs_mentor_classification,closed_at,cancelada_em',
    ),
  ])

  const byClient = new Map()
  for (const opp of oportunidades) {
    const list = byClient.get(opp.cliente_id) ?? []
    list.push(opp)
    byClient.set(opp.cliente_id, list)
  }

  const isClosed = (opp) => opp.closed_at !== null || opp.cancelada_em !== null

  const report = {
    clientesTotal: clientes.length,
    oportunidadesTotal: oportunidades.length,
    clientesComOportunidade: 0,
    clientesSemOportunidade: 0,
    clientesComMaisDeUmaOportunidade: 0,
    oportunidadesAtivas: 0,
    oportunidadesEncerradas: 0,
    oportunidadesNeedsClassification: 0,
    oportunidadesJaClassificadas: 0,
    oportunidadesOrfas: 0,
    porEtapa: {},
    porCanal: {},
    duplicidadeSuspeitaPorTelefone: [],
    clientesSemTelefoneNormalizado: 0,
  }

  for (const cliente of clientes) {
    const opps = byClient.get(cliente.id)
    if (!opps || opps.length === 0) report.clientesSemOportunidade += 1
    else {
      report.clientesComOportunidade += 1
      if (opps.length > 1) report.clientesComMaisDeUmaOportunidade += 1
    }
    if (!cliente.telefone_normalizado) report.clientesSemTelefoneNormalizado += 1
  }

  const clientIds = new Set(clientes.map((c) => c.id))
  for (const opp of oportunidades) {
    if (!clientIds.has(opp.cliente_id)) report.oportunidadesOrfas += 1
    if (isClosed(opp)) report.oportunidadesEncerradas += 1
    else report.oportunidadesAtivas += 1
    if (opp.needs_mentor_classification) report.oportunidadesNeedsClassification += 1
    else report.oportunidadesJaClassificadas += 1
    report.porEtapa[opp.etapa] = (report.porEtapa[opp.etapa] ?? 0) + 1
    report.porCanal[opp.canal ?? '(sem canal)'] =
      (report.porCanal[opp.canal ?? '(sem canal)'] ?? 0) + 1
  }

  // Duplicidade é apenas REPORTADA. Nada é mesclado nem apagado aqui (§36).
  const byPhone = new Map()
  for (const cliente of clientes) {
    const phone = normalizePhone(cliente.telefone_normalizado ?? cliente.telefone)
    if (!phone) continue
    const list = byPhone.get(phone) ?? []
    list.push(cliente)
    byPhone.set(phone, list)
  }
  for (const [phone, group] of byPhone) {
    if (group.length > 1) {
      report.duplicidadeSuspeitaPorTelefone.push({
        telefoneParcial: `…${phone.slice(-4)}`,
        quantidade: group.length,
        mesmaLoja: new Set(group.map((c) => c.loja_id)).size === 1,
      })
    }
  }

  if (AS_JSON) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log('Mentor Comercial — reconciliação de clientes e oportunidades')
  console.log('SOMENTE LEITURA. Nenhum dado foi alterado.\n')
  console.log(`  clientes total                        ${report.clientesTotal}`)
  console.log(`  clientes com oportunidade             ${report.clientesComOportunidade}`)
  console.log(`  clientes sem oportunidade             ${report.clientesSemOportunidade}`)
  console.log(`  clientes com mais de uma oportunidade ${report.clientesComMaisDeUmaOportunidade}`)
  console.log(`  clientes sem telefone normalizado     ${report.clientesSemTelefoneNormalizado}`)
  console.log('')
  console.log(`  oportunidades total                   ${report.oportunidadesTotal}`)
  console.log(`  oportunidades ativas                  ${report.oportunidadesAtivas}`)
  console.log(`  oportunidades encerradas              ${report.oportunidadesEncerradas}`)
  console.log(`  aguardando classificação Mentor       ${report.oportunidadesNeedsClassification}`)
  console.log(`  já classificadas                      ${report.oportunidadesJaClassificadas}`)
  console.log(`  órfãs (cliente inexistente)           ${report.oportunidadesOrfas}`)
  console.log('')
  console.log('  por etapa do funil:')
  for (const [etapa, n] of Object.entries(report.porEtapa).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(5)}  ${etapa}`)
  }
  console.log('  por canal:')
  for (const [canal, n] of Object.entries(report.porCanal).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(5)}  ${canal}`)
  }
  console.log('')
  console.log(
    `  grupos com telefone repetido: ${report.duplicidadeSuspeitaPorTelefone.length} ` +
      '(apenas reportado — nada é mesclado nem apagado)',
  )

  if (report.oportunidadesOrfas > 0) {
    console.log('\nATENÇÃO: existem oportunidades apontando para cliente inexistente.')
    console.log('Investigar antes de qualquer migração de dados.')
  }
}

main().catch((error) => {
  console.error(`FALHA: ${error.message}`)
  process.exit(1)
})
