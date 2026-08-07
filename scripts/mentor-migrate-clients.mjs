#!/usr/bin/env node
/**
 * Script de migração dos clientes reais para o Mentor Comercial (TASK 21 / TAREFA C04).
 *
 * REQUISITOS DULOS:
 * 1. DRY-RUN é o padrão. `--apply` é obrigatório para escrever. Sem exceção.
 * 2. Aborta se qualquer contagem diminuir entre antes e depois ou se ID for perdido.
 * 3. NUNCA apaga, recria ou trunca cliente, oportunidade, agendamento ou histórico.
 * 4. Reutiliza oportunidade ativa existente antes de criar qualquer nova.
 * 5. Só classifica status Mentor com evidência suficiente; sem evidência mantém
 *    needs_mentor_classification=true e NÃO inventa score.
 * 6. showroom -> Porta apenas em `channel_entry`. A coluna legada `canal` fica intocada.
 * 7. "sem canal" (18 casos) é tratado explicitamente, não presumido.
 * 8. Idempotente: rodar duas vezes com --apply não muda nada na segunda.
 *
 * Uso:
 *   node scripts/mentor-migrate-clients.mjs          # DRY-RUN (Padrão)
 *   node scripts/mentor-migrate-clients.mjs --apply  # Aplica no Supabase
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function loadEnv() {
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

export async function fetchAll({ url, key }, table, select) {
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

export async function patchRow({ url, key }, table, id, payload) {
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

export async function insertRows({ url, key }, table, rows) {
  if (!rows || rows.length === 0) return
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  })
  if (!response.ok) {
    throw new Error(`POST ${table}: HTTP ${response.status} — ${(await response.text()).slice(0, 200)}`)
  }
}

/**
 * Mapeamento do canal legado para o canal metodológico oficial (Porta, Internet, Carteira):
 *   - 'showroom' / 'porta' -> 'Porta'
 *   - 'internet' -> 'Internet'
 *   - 'carteira' -> 'Carteira'
 *   - 'sem canal' / '(sem canal)' / 'sem_canal' / null / '' -> 'Carteira' (tratamento explícito das 18 ocorrências)
 * NOTA: A coluna legada `canal` em `oportunidades` NÃO é alterada.
 */
export function mapChannelEntry(legacyCanal) {
  if (!legacyCanal) return 'Carteira'
  const norm = String(legacyCanal).trim().toLowerCase()
  if (norm === 'sem canal' || norm === '(sem canal)' || norm === 'sem_canal' || norm === '') {
    return 'Carteira'
  }
  if (norm === 'showroom' || norm === 'porta') return 'Porta'
  if (norm === 'internet') return 'Internet'
  if (norm === 'carteira') return 'Carteira'
  return 'Carteira'
}

export function isOppActive(opp) {
  return opp.closed_at === null && (opp.cancelada_em === null || opp.cancelada_em === undefined)
}

/**
 * Elabora o plano de migração determinístico a partir dos clientes e oportunidades.
 */
export function planMigration(clientes, oportunidades, nowIso = new Date().toISOString()) {
  const oppsByClient = new Map()
  for (const opp of oportunidades) {
    const list = oppsByClient.get(opp.cliente_id) ?? []
    list.push(opp)
    oppsByClient.set(opp.cliente_id, list)
  }

  const oppUpdates = []
  const newOpps = []
  let clientesComAtivaExistente = 0
  let clientesSemAtivaNovaCriada = 0

  for (const cliente of clientes) {
    const opps = oppsByClient.get(cliente.id) ?? []
    const activeOpps = opps.filter(isOppActive)

    if (activeOpps.length > 0) {
      clientesComAtivaExistente += 1
      activeOpps.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      const targetOpp = activeOpps[0]

      const rawCanal = targetOpp.canal || cliente.canal_origem
      const targetChannelEntry = mapChannelEntry(rawCanal)

      // Idempotência: só agenda atualização se channel_entry ou needs_mentor_classification precisarem mudar
      const needsUpdate =
        targetOpp.channel_entry !== targetChannelEntry ||
        targetOpp.needs_mentor_classification !== true

      if (needsUpdate) {
        oppUpdates.push({
          id: targetOpp.id,
          payload: {
            channel_entry: targetChannelEntry,
            needs_mentor_classification: true,
            mentor_updated_at: nowIso,
          },
        })
      }
    } else {
      clientesSemAtivaNovaCriada += 1
      const targetChannelEntry = mapChannelEntry(cliente.canal_origem)

      newOpps.push({
        cliente_id: cliente.id,
        loja_id: cliente.loja_id ?? null,
        seller_user_id: cliente.seller_user_id ?? null,
        etapa: 'prospeccao',
        canal: cliente.canal_origem || 'carteira',
        channel_entry: targetChannelEntry,
        needs_mentor_classification: true,
        created_at: nowIso,
        updated_at: nowIso,
        mentor_updated_at: nowIso,
      })
    }
  }

  return {
    clientesComAtivaExistente,
    clientesSemAtivaNovaCriada,
    oppUpdates,
    newOpps,
  }
}

/**
 * Validação estrita de integridade ANTES vs DEPOIS.
 * Aborta se qualquer contagem diminuir ou se qualquer ID for perdido.
 */
export function verifyMigrationIntegrity(clientesBefore, oportunidadesBefore, clientesAfter, oportunidadesAfter) {
  const beforeClientesCount = clientesBefore.length
  const beforeOppsCount = oportunidadesBefore.length
  const afterClientesCount = clientesAfter.length
  const afterOppsCount = oportunidadesAfter.length

  const beforeClientesIds = new Set(clientesBefore.map((c) => c.id))
  const beforeOppsIds = new Set(oportunidadesBefore.map((o) => o.id))

  const afterClientesIds = new Set(clientesAfter.map((c) => c.id))
  const afterOppsIds = new Set(oportunidadesAfter.map((o) => o.id))

  const errors = []

  if (afterClientesCount < beforeClientesCount) {
    errors.push(`Contagem de clientes diminuiu! (Antes: ${beforeClientesCount}, Depois: ${afterClientesCount})`)
  }

  if (afterOppsCount < beforeOppsCount) {
    errors.push(`Contagem de oportunidades diminuiu! (Antes: ${beforeOppsCount}, Depois: ${afterOppsCount})`)
  }

  for (const id of beforeClientesIds) {
    if (!afterClientesIds.has(id)) {
      errors.push(`Cliente existente foi removido! ID: ${id}`)
    }
  }

  for (const id of beforeOppsIds) {
    if (!afterOppsIds.has(id)) {
      errors.push(`Oportunidade existente foi removida! ID: ${id}`)
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

export async function main() {
  const APPLY_MODE = process.argv.includes('--apply')
  const env = loadEnv()
  const nowIso = new Date().toISOString()

  console.log('Mentor Comercial — Script de Migração de Clientes Reais (TASK 21 / C04)')
  console.log(`Modo: ${APPLY_MODE ? 'APPLY (Escrita no Supabase)' : 'DRY-RUN (Simulação)'}\n`)

  // 1. ANTES: Captura contagem e IDs
  console.log('Capturando estado inicial do banco...')
  const [clientesBefore, oportunidadesBefore] = await Promise.all([
    fetchAll(env, 'clientes', 'id,nome,telefone,telefone_normalizado,loja_id,seller_user_id,status,canal_origem,created_at'),
    fetchAll(
      env,
      'oportunidades',
      'id,cliente_id,etapa,canal,loja_id,seller_user_id,veiculo_interesse,next_action_at,last_interaction_at,appointment_at,sale_date,closed_at,cancelada_em,current_status_code,channel_entry,needs_mentor_classification,created_at',
    ),
  ])

  console.log(`  Clientes ANTES: ${clientesBefore.length}`)
  console.log(`  Oportunidades ANTES: ${oportunidadesBefore.length}`)

  const plan = planMigration(clientesBefore, oportunidadesBefore, nowIso)

  console.log('\nPlano de migração elaborado:')
  console.log(`  Clientes com oportunidade ativa reutilizada: ${plan.clientesComAtivaExistente}`)
  console.log(`  Clientes sem oportunidade ativa (novas ativas a criar): ${plan.clientesSemAtivaNovaCriada}`)
  console.log(`  Atualizações em oportunidades existentes: ${plan.oppUpdates.length}`)
  console.log(`  Novas oportunidades a inserir: ${plan.newOpps.length}`)

  if (!APPLY_MODE) {
    console.log('\n[DRY-RUN] Nenhuma alteração foi realizada no banco de dados.')
    console.log('Execute com --apply para efetivar as alterações no Supabase.')

    const simAfterClientesCount = clientesBefore.length
    const simAfterOppsCount = oportunidadesBefore.length + plan.newOpps.length
    console.log('\n--- Simulação ANTES vs DEPOIS ---')
    console.log(`Clientes:      ${clientesBefore.length} -> ${simAfterClientesCount} (delta: 0)`)
    console.log(`Oportunidades: ${oportunidadesBefore.length} -> ${simAfterOppsCount} (delta: +${plan.newOpps.length})`)

    const simOppsAfter = [
      ...oportunidadesBefore,
      ...plan.newOpps.map((o, idx) => ({ ...o, id: `sim-new-${idx}` })),
    ]
    const integrity = verifyMigrationIntegrity(clientesBefore, oportunidadesBefore, clientesBefore, simOppsAfter)
    if (!integrity.ok) {
      console.error('\nFALHA NA SIMULAÇÃO DE INTEGRIDADE:')
      for (const err of integrity.errors) console.error(`  - ${err}`)
      process.exit(1)
    }
    return
  }

  // 2. EXECUÇÃO DE ESCRITA (--apply)
  console.log('\nAplicando alterações no Supabase...')

  const BATCH_SIZE = 50
  for (let i = 0; i < plan.oppUpdates.length; i += BATCH_SIZE) {
    const batch = plan.oppUpdates.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((item) => patchRow(env, 'oportunidades', item.id, item.payload)))
  }

  if (plan.newOpps.length > 0) {
    await insertRows(env, 'oportunidades', plan.newOpps)
  }

  // 3. DEPOIS: Captura novamente e compara
  console.log('\nVerificando estado final do banco...')
  const [clientesAfter, oportunidadesAfter] = await Promise.all([
    fetchAll(env, 'clientes', 'id'),
    fetchAll(env, 'oportunidades', 'id'),
  ])

  console.log(`  Clientes DEPOIS: ${clientesAfter.length}`)
  console.log(`  Oportunidades DEPOIS: ${oportunidadesAfter.length}`)

  const integrity = verifyMigrationIntegrity(clientesBefore, oportunidadesBefore, clientesAfter, oportunidadesAfter)

  if (!integrity.ok) {
    console.error('\nFALHA NA MIGRAÇÃO: Invariante de preservação violada!')
    for (const err of integrity.errors) console.error(`  - ${err}`)
    process.exit(1)
  }

  console.log('\nSUCESSO: Migração concluída e verificada!')
  console.log(`  Clientes: ${clientesBefore.length} -> ${clientesAfter.length}`)
  console.log(`  Oportunidades: ${oportunidadesBefore.length} -> ${oportunidadesAfter.length} (+${plan.newOpps.length} novas ativas)`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`\nFALHA CRÍTICA: ${error.message}`)
    process.exit(1)
  })
}
