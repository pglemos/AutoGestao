#!/usr/bin/env node
/**
 * Script de migração dos clientes reais para o Mentor Comercial (TASK 21).
 *
 * REQUISITOS DULOS:
 * - Executa em DRY-RUN por padrão. Só escreve com `--apply` explícito.
 * - Captura contagem e IDs ANTES e DEPOIS. Aborta se qualquer contagem diminuir
 *   ou se qualquer ID existente for removido.
 * - Preserva clientId, canal, telefone, veículo, agendamento, observações,
 *   histórico, venda e próxima ação. PROIBIDO apagar ou recriar clientes/oportunidades.
 * - Reutiliza oportunidade ativa existente (closed_at IS NULL AND cancelada_em IS NULL).
 *   Só cria nova oportunidade se o cliente não possuir oportunidade ativa.
 * - Mapeamento de canal legado: `showroom` -> `Porta` APENAS no campo metodológico
 *   `channel_entry`. A coluna legada `canal` NÃO é alterada.
 * - Mantém `needs_mentor_classification = true` quando não houver evidência suficiente.
 * - NÃO preenche score artificialmente (mentor_score permanece null).
 * - Lê .env usando VITE_SUPABASE_URL ou SUPABASE_URL (mesmo padrão de reconcile report).
 *
 * Uso:
 *   node scripts/mentor-migrate-clients.mjs          # DRY-RUN
 *   node scripts/mentor-migrate-clients.mjs --apply  # Aplica no Supabase
 */

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APPLY_MODE = process.argv.includes('--apply')

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

async function insertRows({ url, key }, table, rows) {
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
 * Mapeamento do canal legado para o canal metodológico oficial:
 *   - 'showroom' / 'porta' -> 'Porta'
 *   - 'internet' -> 'Internet'
 *   - 'carteira' -> 'Carteira'
 * NOTA: A coluna legada `canal` em `oportunidades` NÃO é alterada.
 */
function mapChannelEntry(legacyCanal) {
  if (!legacyCanal) return 'Carteira'
  const norm = String(legacyCanal).trim().toLowerCase()
  if (norm === 'showroom' || norm === 'porta') return 'Porta'
  if (norm === 'internet') return 'Internet'
  if (norm === 'carteira') return 'Carteira'
  return 'Carteira'
}

async function main() {
  const env = loadEnv()
  const nowIso = new Date().toISOString()

  console.log('Mentor Comercial — Script de Migração de Clientes Reais (TASK 21)')
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

  const beforeClientesCount = clientesBefore.length
  const beforeOppsCount = oportunidadesBefore.length
  const beforeClientesIds = new Set(clientesBefore.map((c) => c.id))
  const beforeOppsIds = new Set(oportunidadesBefore.map((o) => o.id))

  console.log(`  Clientes ANTES: ${beforeClientesCount}`)
  console.log(`  Oportunidades ANTES: ${beforeOppsCount}`)

  // Mapeia oportunidades por cliente
  const oppsByClient = new Map()
  for (const opp of oportunidadesBefore) {
    const list = oppsByClient.get(opp.cliente_id) ?? []
    list.push(opp)
    oppsByClient.set(opp.cliente_id, list)
  }

  const isOppActive = (opp) => opp.closed_at === null && opp.cancelada_em === null

  const oppUpdates = []
  const newOpps = []
  let clientesComAtivaExistente = 0
  let clientesSemAtivaNovaCriada = 0

  for (const cliente of clientesBefore) {
    const opps = oppsByClient.get(cliente.id) ?? []
    const activeOpps = opps.filter(isOppActive)

    if (activeOpps.length > 0) {
      // Reutiliza a oportunidade ativa existente (a mais recente se houver múltiplas)
      clientesComAtivaExistente += 1
      activeOpps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      const targetOpp = activeOpps[0]

      const targetChannelEntry = mapChannelEntry(targetOpp.canal || cliente.canal_origem)

      oppUpdates.push({
        id: targetOpp.id,
        payload: {
          channel_entry: targetChannelEntry,
          needs_mentor_classification: true,
          mentor_updated_at: nowIso,
        },
      })
    } else {
      // Cliente não possui oportunidade ativa: cria uma nova oportunidade ativa
      clientesSemAtivaNovaCriada += 1
      const targetChannelEntry = mapChannelEntry(cliente.canal_origem)

      newOpps.push({
        cliente_id: cliente.id,
        loja_id: cliente.loja_id,
        seller_user_id: cliente.seller_user_id,
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

  console.log('\nPlano de migração elaborado:')
  console.log(`  Clientes com oportunidade ativa reutilizada: ${clientesComAtivaExistente}`)
  console.log(`  Clientes sem oportunidade ativa (novas ativas a criar): ${clientesSemAtivaNovaCriada}`)
  console.log(`  Atualizações em oportunidades existentes: ${oppUpdates.length}`)
  console.log(`  Novas oportunidades a inserir: ${newOpps.length}`)

  if (!APPLY_MODE) {
    console.log('\n[DRY-RUN] Nenhuma alteração foi realizada no banco de dados.')
    console.log('Execute com --apply para efetivar as alterações no Supabase.')

    const simAfterClientesCount = beforeClientesCount
    const simAfterOppsCount = beforeOppsCount + newOpps.length
    console.log('\n--- Simulação ANTES vs DEPOIS ---')
    console.log(`Clientes:      ${beforeClientesCount} -> ${simAfterClientesCount} (delta: 0)`)
    console.log(`Oportunidades: ${beforeOppsCount} -> ${simAfterOppsCount} (delta: +${newOpps.length})`)
    return
  }

  // 2. EXECUÇÃO DE ESCRITA (--apply)
  console.log('\nAplicando alterações no Supabase...')

  // Atualizações em lotes pequenos
  const BATCH_SIZE = 50
  for (let i = 0; i < oppUpdates.length; i += BATCH_SIZE) {
    const batch = oppUpdates.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map((item) => patchRow(env, 'oportunidades', item.id, item.payload)))
  }

  // Inserções em lote
  if (newOpps.length > 0) {
    await insertRows(env, 'oportunidades', newOpps)
  }

  // 3. DEPOIS: Captura novamente e compara
  console.log('\nVerificando estado final do banco...')
  const [clientesAfter, oportunidadesAfter] = await Promise.all([
    fetchAll(env, 'clientes', 'id'),
    fetchAll(env, 'oportunidades', 'id'),
  ])

  const afterClientesCount = clientesAfter.length
  const afterOppsCount = oportunidadesAfter.length
  const afterClientesIds = new Set(clientesAfter.map((c) => c.id))
  const afterOppsIds = new Set(oportunidadesAfter.map((o) => o.id))

  console.log(`  Clientes DEPOIS: ${afterClientesCount}`)
  console.log(`  Oportunidades DEPOIS: ${afterOppsCount}`)

  // Validações de integridade
  let abort = false

  if (afterClientesCount < beforeClientesCount) {
    console.error(`ERRO: Contagem de clientes diminuiu! (Antes: ${beforeClientesCount}, Depois: ${afterClientesCount})`)
    abort = true
  }

  if (afterOppsCount < beforeOppsCount) {
    console.error(`ERRO: Contagem de oportunidades diminuiu! (Antes: ${beforeOppsCount}, Depois: ${afterOppsCount})`)
    abort = true
  }

  for (const id of beforeClientesIds) {
    if (!afterClientesIds.has(id)) {
      console.error(`ERRO: Cliente existente foi removido! ID: ${id}`)
      abort = true
    }
  }

  for (const id of beforeOppsIds) {
    if (!afterOppsIds.has(id)) {
      console.error(`ERRO: Oportunidade existente foi removida! ID: ${id}`)
      abort = true
    }
  }

  if (abort) {
    console.error('\nFALHA NA MIGRAÇÃO: Invariante de preservação violada!')
    process.exit(1)
  }

  console.log('\nSUCESSO: Migração concluída e verificada!')
  console.log(`  Clientes: ${beforeClientesCount} -> ${afterClientesCount}`)
  console.log(`  Oportunidades: ${beforeOppsCount} -> ${afterOppsCount} (+${newOpps.length} novas ativas)`)
}

main().catch((error) => {
  console.error(`\nFALHA CRÍTICA: ${error.message}`)
  process.exit(1)
})
