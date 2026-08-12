import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
import * as XLSX from 'xlsx'

dotenv.config({ quiet: true })

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com'
const BASE_URL = process.env.E2E_BASE_URL || 'https://mxperformance.vercel.app'
const RUN_STAMP = process.env.E2E_RUN_ID || new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
const RUN_ID = `E2E_ADMIN_MASTER_${RUN_STAMP}`
const ARTIFACT_DIR = path.join(ROOT, 'output', `e2e-admin-master-full-${RUN_STAMP}`)
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'screenshots')
const DOWNLOAD_DIR = path.join(ARTIFACT_DIR, 'downloads')
const AUDIT_PATH = path.join(ROOT, 'docs', 'audit', `admin-master-full-e2e-${RUN_STAMP}.md`)
const CLEANUP_PATH = path.join(ARTIFACT_DIR, 'cleanup-registry.json')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })
fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true })

const results = []
const artifacts = []
const cleanupWarnings = []
let finalized = false
const created = {
  runId: RUN_ID,
  storeId: null,
  storeName: `E2E ADMIN MASTER ${RUN_STAMP}`,
  testUserId: null,
  testUserEmail: `e2e-admin-master-${RUN_STAMP.toLowerCase()}@mxperformance.test`,
  productId: null,
  clientId: null,
  clientSlug: null,
  visitId: null,
  eventId: null,
  feedbackId: null,
  evidenceIds: [],
  storagePaths: [],
}

function requiredEnv(name, fallbackName) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined)
  if (!value) throw new Error(`Missing env var ${name}${fallbackName ? `/${fallbackName}` : ''}`)
  return value.replace(/^"|"$/g, '')
}

const SUPABASE_URL = requiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
const SUPABASE_ANON_KEY = requiredEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
const SUPABASE_SERVICE_ROLE_KEY = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function nowIso() {
  return new Date().toISOString()
}

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function saoPauloDate(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.format(new Date()).split('-').map(Number)
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0))
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

function previousWeekRange() {
  const today = new Date(`${saoPauloDate()}T12:00:00Z`)
  const day = today.getUTCDay() || 7
  const monday = new Date(today)
  monday.setUTCDate(today.getUTCDate() - day - 6)
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) }
}

function previousMonthDate() {
  const today = new Date(`${saoPauloDate()}T12:00:00Z`)
  today.setUTCMonth(today.getUTCMonth() - 1)
  today.setUTCDate(15)
  return today.toISOString().slice(0, 10)
}

function safeDetails(details) {
  return JSON.parse(JSON.stringify(details || {}, (key, value) => {
    const lowered = String(key || '').toLowerCase()
    if (lowered.includes('token') || lowered === 'session') return '[REDACTED]'
    if (typeof value !== 'string') return value
    return value
      .replace(SUPABASE_SERVICE_ROLE_KEY, '[REDACTED]')
      .replace(SUPABASE_ANON_KEY, '[REDACTED]')
  }))
}

function record(section, name, status, details = {}) {
  const row = {
    at: nowIso(),
    section,
    name,
    status,
    details: safeDetails(details),
  }
  results.push(row)
  const marker = status.padEnd(7)
  console.log(`[${marker}] ${section} - ${name}`)
  if (details?.message) console.log(`          ${details.message}`)
  return row
}

async function step(section, name, fn, options = {}) {
  const started = Date.now()
  try {
    const details = await fn()
    record(section, name, 'PASS', {
      duration_ms: Date.now() - started,
      ...(details || {}),
    })
    return details
  } catch (error) {
    const status = options.warn ? 'WARN' : options.blocked ? 'BLOCKED' : 'FAIL'
    record(section, name, status, {
      duration_ms: Date.now() - started,
      message: error?.message || String(error),
    })
    if (!options.continue) throw error
    return null
  }
}

async function expectNoError(response, context) {
  if (response.error) throw new Error(`${context}: ${response.error.message}`)
  return response.data
}

async function promptHidden(query) {
  if (process.env.E2E_ADMIN_PASSWORD) return process.env.E2E_ADMIN_PASSWORD
  if (!process.stdin.isTTY) throw new Error('E2E_ADMIN_PASSWORD not set and stdin is not a TTY')
  process.stdout.write(query)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  let value = ''
  return await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          reject(new Error('Password prompt cancelled'))
          return
        }
        if (char === '\r' || char === '\n') {
          process.stdin.off('data', onData)
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          resolve(value)
          return
        }
        if (char === '\u007f') {
          value = value.slice(0, -1)
          continue
        }
        value += char
      }
    }
    process.stdin.on('data', onData)
  })
}

async function preflight(password) {
  const profile = await expectNoError(
    await admin.from('usuarios').select('id,email,name,role,active,must_change_password').eq('email', ADMIN_EMAIL).maybeSingle(),
    'profile lookup',
  )
  if (!profile) throw new Error(`Profile not found for ${ADMIN_EMAIL}`)
  if (profile.role !== 'administrador_geral') throw new Error(`Expected administrador_geral, got ${profile.role}`)
  if (profile.active !== true) throw new Error('Profile is not active')
  if (profile.must_change_password) throw new Error('must_change_password is true; stopping before password mutation')

  const authRes = await userClient.auth.signInWithPassword({ email: ADMIN_EMAIL, password })
  if (authRes.error || !authRes.data.session) {
    throw new Error(`Login failed for ${ADMIN_EMAIL}: ${authRes.error?.message || 'missing session'}`)
  }

  const userProfile = await expectNoError(
    await userClient.from('usuarios').select('id,email,name,role,active,must_change_password').eq('id', authRes.data.user.id).maybeSingle(),
    'authenticated profile lookup',
  )
  if (userProfile?.must_change_password) throw new Error('Authenticated profile requires password change')

  return { profile: userProfile }
}

async function validatePermissions() {
  const [profiles, modules, permissions, matrix] = await Promise.all([
    userClient.from('perfis').select('codigo,nome,nivel,area_interna_mx').eq('codigo', 'administrador_geral').maybeSingle(),
    userClient.from('modulos_sistema').select('codigo,nome,sensivel,interno_mx').order('codigo'),
    userClient.from('permissoes_modulo').select('codigo,nome').order('codigo'),
    userClient.from('perfis_permissoes').select('*').eq('perfil_codigo', 'administrador_geral'),
  ])
  for (const [label, res] of [['perfis', profiles], ['modulos', modules], ['permissoes', permissions], ['matriz', matrix]]) {
    if (res.error) throw new Error(`${label}: ${res.error.message}`)
  }
  const deletePerms = (matrix.data || []).filter((item) => item.permissao_codigo === 'excluir')
  const exportPerms = (matrix.data || []).filter((item) => item.permissao_codigo === 'exportar')
  if (!profiles.data?.area_interna_mx) throw new Error('Admin master profile is not marked as area_interna_mx')
  if ((modules.data || []).length < 7) throw new Error(`Expected at least 7 modules, got ${(modules.data || []).length}`)
  return {
    modules: modules.data.length,
    permission_codes: permissions.data.map((item) => item.codigo),
    matrix_rows: matrix.data.length,
    delete_permissions: deletePerms.length,
    export_permissions: exportPerms.length,
  }
}

async function createStoreAndRules() {
  const managerEmail = ADMIN_EMAIL
  const store = await expectNoError(
    await userClient.from('lojas').insert({
      name: created.storeName,
      manager_email: managerEmail,
      active: true,
    }).select('*').single(),
    'create loja',
  )
  created.storeId = store.id

  await expectNoError(await userClient.from('regras_entrega_loja').upsert({
    store_id: store.id,
    matinal_recipients: [managerEmail],
    weekly_recipients: [managerEmail],
    monthly_recipients: [managerEmail],
    timezone: 'America/Sao_Paulo',
    active: true,
  }, { onConflict: 'store_id' }), 'upsert regras_entrega_loja')

  await expectNoError(await userClient.from('regras_metas_loja').upsert({
    store_id: store.id,
    monthly_goal: 12,
    individual_goal_mode: 'even',
    include_venda_loja_in_store_total: true,
    include_venda_loja_in_individual_goal: false,
    bench_lead_agd: 20,
    bench_agd_visita: 60,
    bench_visita_vnd: 33,
    projection_mode: 'calendar',
  }, { onConflict: 'store_id' }), 'upsert regras_metas_loja')

  await expectNoError(await userClient.from('benchmarks_loja').upsert({
    store_id: store.id,
    lead_to_agend: 20,
    agend_to_visit: 60,
    visit_to_sale: 33,
  }, { onConflict: 'store_id' }), 'upsert benchmarks_loja')

  await expectNoError(await userClient.from('lojas').update({
    name: `${created.storeName} EDITADA`,
    manager_email: managerEmail,
  }).eq('id', store.id), 'update loja')
  created.storeName = `${created.storeName} EDITADA`

  await expectNoError(await userClient.from('lojas').update({ active: false }).eq('id', store.id), 'archive loja')
  await expectNoError(await userClient.from('lojas').update({ active: true }).eq('id', store.id), 'reactivate loja')

  return { store_id: store.id, store_name: created.storeName, manager_email: managerEmail }
}

async function createTeamAndCheckins(adminProfile) {
  const testPassword = `Mx#${RUN_STAMP}Aa!`
  const register = await userClient.functions.invoke('register-user', {
    body: {
      email: created.testUserEmail,
      password: testPassword,
      name: `E2E Vendedor ${RUN_STAMP}`,
      role: 'vendedor',
      store_id: created.storeId,
      phone: '11999990000',
    },
  })
  if (register.error || !register.data?.success) {
    throw new Error(register.error?.message || register.data?.error || 'register-user failed')
  }
  created.testUserId = register.data.user_id

  const updateUser = await userClient.functions.invoke('manage-global-user', {
    body: {
      action: 'update',
      user_id: created.testUserId,
      updates: {
        name: `E2E VENDEDOR EDITADO ${RUN_STAMP}`,
        phone: '11999990001',
        active: true,
      },
      reason: RUN_ID,
    },
  })
  if (updateUser.error || !updateUser.data?.success) {
    throw new Error(updateUser.error?.message || updateUser.data?.error || 'manage-global-user update failed')
  }

  await expectNoError(await userClient.from('vinculos_loja').upsert({
    user_id: created.testUserId,
    store_id: created.storeId,
    role: 'gerente',
  }, { onConflict: 'user_id,store_id' }), 'promote membership')

  await expectNoError(await userClient.from('vinculos_loja').upsert({
    user_id: created.testUserId,
    store_id: created.storeId,
    role: 'vendedor',
  }, { onConflict: 'user_id,store_id' }), 'restore membership role')

  const tenurePayload = {
    store_id: created.storeId,
    seller_user_id: created.testUserId,
    started_at: saoPauloDate(-35),
    ended_at: null,
    is_active: true,
    closing_month_grace: false,
  }
  const tenureUpsert = await userClient.from('vendedores_loja').upsert(tenurePayload, { onConflict: 'store_id,seller_user_id' })
  if (tenureUpsert.error) {
    record('CLI/API', 'seller tenure upsert constraint', 'FAIL', { message: tenureUpsert.error.message })
    await expectNoError(await userClient.from('vendedores_loja').insert(tenurePayload), 'insert seller tenure fallback')
  }

  const week = previousWeekRange()
  const dates = Array.from(new Set([saoPauloDate(-1), week.start, week.end, previousMonthDate()]))
  const rows = dates.map((referenceDate, index) => ({
    seller_user_id: created.testUserId,
    store_id: created.storeId,
    reference_date: referenceDate,
    submitted_at: nowIso(),
    metric_scope: 'daily',
    submitted_late: false,
    submission_status: 'on_time',
    leads_prev_day: 10 + index,
    agd_cart_prev_day: 3,
    agd_net_prev_day: 2,
    agd_cart_today: 4,
    agd_net_today: 2,
    vnd_porta_prev_day: 1,
    vnd_cart_prev_day: 1,
    vnd_net_prev_day: 1,
    visit_prev_day: 3,
    note: RUN_ID,
  }))
  const checkinsUpsert = await userClient.from('lancamentos_diarios').upsert(rows, {
    onConflict: 'seller_user_id,store_id,reference_date,metric_scope',
  })
  if (checkinsUpsert.error) {
    record('CLI/API', 'daily checkins upsert constraint', 'FAIL', { message: checkinsUpsert.error.message })
    await expectNoError(await userClient.from('lancamentos_diarios').insert(rows), 'insert checkins fallback')
  }

  const feedbackPayload = {
    store_id: created.storeId,
    manager_id: adminProfile.id,
    seller_id: created.testUserId,
    week_reference: week.start,
    leads_week: 25,
    agd_week: 9,
    visit_week: 6,
    vnd_week: 3,
    tx_lead_agd: 36,
    tx_agd_visita: 66,
    tx_visita_vnd: 50,
    meta_compromisso: 4,
    positives: `${RUN_ID} pontos fortes`,
    attention_points: `${RUN_ID} pontos de atencao`,
    action: `${RUN_ID} proximo passo`,
    notes: RUN_ID,
    acknowledged: false,
  }
  // P0-05b (auditoria 2026-07-10): a chave 'seller_id,week_reference' foi
  // substituída por 'store_id,manager_id,seller_id,week_reference' na
  // migration 20260516121500_devolutivas_store_manager_week_key.sql — este
  // script continuava usando a chave antiga, causando o FAIL "there is no
  // unique or exclusion constraint matching the ON CONFLICT specification"
  // em toda execução desde 2026-05-16. Não era um bug de produto: o código
  // real (src/hooks/useFeedbacks.ts) já usava a chave correta.
  let feedbackRes = await userClient.from('devolutivas').upsert(feedbackPayload, { onConflict: 'store_id,manager_id,seller_id,week_reference' }).select('id').single()
  if (feedbackRes.error) {
    record('CLI/API', 'feedback upsert constraint', 'FAIL', { message: feedbackRes.error.message })
    feedbackRes = await userClient.from('devolutivas').insert(feedbackPayload).select('id').single()
  }
  const feedback = await expectNoError(feedbackRes, 'insert feedback fallback')
  created.feedbackId = feedback.id

  return { user_id: created.testUserId, feedback_id: created.feedbackId, checkin_rows: rows.length }
}

async function validateProducts() {
  const product = await expectNoError(await userClient.from('produtos_digitais').insert({
    name: `E2E Produto ${RUN_STAMP}`,
    description: `${RUN_ID} produto digital`,
    link: `${BASE_URL}/produtos?e2e=${RUN_STAMP}`,
    category: 'E2E',
    target_roles: ['vendedor', 'gerente'],
    status: 'rascunho',
    sort_order: 999,
  }).select('*').single(), 'insert produto')
  created.productId = product.id

  await expectNoError(await userClient.from('produtos_digitais').update({
    description: `${RUN_ID} produto digital editado`,
    status: 'ativo',
    sort_order: 998,
  }).eq('id', product.id), 'update produto')

  const reloaded = await expectNoError(await userClient.from('produtos_digitais').select('id,status,sort_order').eq('id', product.id).maybeSingle(), 'select produto')
  if (reloaded.status !== 'ativo') throw new Error(`Product status not updated: ${reloaded.status}`)
  return { product_id: product.id, status: reloaded.status }
}

async function validateConsulting(adminProfile) {
  const clientSlug = slugify(`e2e-admin-master-${RUN_STAMP}`)
  const client = await expectNoError(await userClient.from('clientes_consultoria').insert({
    name: `E2E Cliente ${RUN_STAMP}`,
    slug: clientSlug,
    legal_name: `E2E Cliente Legal ${RUN_STAMP}`,
    product_name: `E2E PMR ${RUN_STAMP}`,
    notes: RUN_ID,
    status: 'ativo',
    primary_store_id: created.storeId,
    current_visit_step: 0,
    modality: 'Presencial',
    created_by: adminProfile.id,
  }).select('id,slug,name').single(), 'insert consulting client')
  created.clientId = client.id
  created.clientSlug = client.slug || clientSlug

  await expectNoError(await userClient.from('contatos_cliente_consultoria').insert({
    client_id: client.id,
    name: `E2E Contato ${RUN_STAMP}`,
    email: ADMIN_EMAIL,
    phone: '11999990002',
    role: 'E2E',
    is_primary: true,
  }), 'insert consulting contact')

  await expectNoError(await userClient.from('unidades_cliente_consultoria').insert({
    client_id: client.id,
    name: `E2E Unidade ${RUN_STAMP}`,
    city: 'Sao Paulo',
    state: 'SP',
    is_primary: true,
  }), 'insert consulting unit')

  const visit = await expectNoError(await userClient.from('visitas_consultoria').insert({
    client_id: client.id,
    visit_number: 1,
    scheduled_at: `${saoPauloDate(3)}T13:00:00-03:00`,
    duration_hours: 2,
    modality: 'Presencial',
    consultant_id: adminProfile.id,
    auxiliary_consultant_id: null,
    objective: `${RUN_ID} objetivo visita`,
    visit_reason: 'Validacao E2E',
    target_audience: 'Equipe E2E',
    product_name: `E2E PMR ${RUN_STAMP}`,
    status: 'agendada',
    executive_summary: `${RUN_ID} resumo executivo`,
  }).select('id').single(), 'insert consulting visit')
  created.visitId = visit.id

  await expectNoError(await userClient.from('visitas_consultoria').update({
    status: 'em_andamento',
    objective: `${RUN_ID} objetivo visita editado`,
  }).eq('id', visit.id), 'update consulting visit')

  const event = await expectNoError(await userClient.from('eventos_agenda_consultoria').insert({
    event_type: 'aula',
    title: `E2E Aula ${RUN_STAMP}`,
    topic: RUN_ID,
    starts_at: `${saoPauloDate(4)}T14:00:00-03:00`,
    duration_hours: 1,
    modality: 'Online',
    location: `${BASE_URL}/agenda?e2e=${RUN_STAMP}`,
    target_audience: 'Equipe E2E',
    audience_goal: 1,
    responsible_user_id: adminProfile.id,
    responsible_name: adminProfile.name || ADMIN_EMAIL,
    ticket_price_text: '0',
    visit_reason: 'Validacao E2E',
    product_name: `E2E PMR ${RUN_STAMP}`,
    status: 'agendado',
    created_by: adminProfile.id,
  }).select('id').single(), 'insert schedule event')
  created.eventId = event.id

  await expectNoError(await userClient.from('eventos_agenda_consultoria').update({
    topic: `${RUN_ID} editado`,
    status: 'agendado',
  }).eq('id', event.id), 'update schedule event')

  return { client_id: client.id, visit_id: visit.id, event_id: event.id, slug: created.clientSlug }
}

async function validateEvidence() {
  let negativeOk = false
  const noEvidence = await userClient.rpc('concluir_visita_consultoria', { p_visita_id: created.visitId })
  if (noEvidence.error) {
    negativeOk = /evid/i.test(noEvidence.error.message)
  }

  const storagePath = `${created.clientId}/${created.visitId}/${RUN_STAMP}-evidence.txt`
  created.storagePaths.push(storagePath)
  const file = new Blob([`${RUN_ID} evidence ${nowIso()}`], { type: 'text/plain' })
  const upload = await userClient.storage.from('evidencias-consultoria').upload(storagePath, file, {
    contentType: 'text/plain',
    upsert: true,
  })
  if (upload.error) throw new Error(`upload evidence: ${upload.error.message}`)

  const evidence = await expectNoError(await userClient.from('evidencias_visita').insert({
    visita_id: created.visitId,
    tipo: 'documento',
    nome_arquivo: `${RUN_STAMP}-evidence.txt`,
    caminho_storage: storagePath,
    content_type: 'text/plain',
    tamanho_bytes: file.size,
    observacao: RUN_ID,
    enviado_por: (await userClient.auth.getUser()).data.user?.id,
  }).select('id').single(), 'insert evidence row')
  created.evidenceIds.push(evidence.id)

  const completed = await expectNoError(
    await userClient.rpc('concluir_visita_consultoria', { p_visita_id: created.visitId }),
    'complete visit with evidence',
  )
  if (completed.status !== 'concluida') throw new Error(`Visit completion returned ${completed.status}`)
  return { negative_without_evidence_ok: negativeOk, evidence_id: evidence.id, completed_status: completed.status }
}

async function invokeExternalFunctions() {
  const external = []

  async function invokeReport(name, body, expectedEmail = true) {
    const response = await userClient.functions.invoke(name, { body })
    if (response.error) {
      external.push({ name, status: 'WARN', message: response.error.message })
      return
    }
    const report = response.data?.reports?.[0]
    const emailStatus = report?.email || response.data?.message || 'ok'
    external.push({
      name,
      status: expectedEmail && emailStatus !== 'sent' ? 'WARN' : 'PASS',
      email: emailStatus,
      recipients: report?.recipients,
      dry_run: report?.dry_run,
    })
  }

  await invokeReport('relatorio-matinal', { store_id: created.storeId, force: true, dry_run: false })
  await invokeReport('feedback-semanal', { store_id: created.storeId, force: true, dry_run: false })
  await invokeReport('relatorio-mensal', { store_id: created.storeId, force: true, dry_run: false })

  const visitReport = await userClient.functions.invoke('send-visit-report', { body: { visitId: created.visitId } })
  const visitEmailStatus = visitReport.data?.email?.status
  const visitMessage = visitReport.error?.message || visitReport.data?.message || visitEmailStatus || JSON.stringify(visitReport.data || {})
  external.push({
    name: 'send-visit-report',
    status: visitReport.error || visitEmailStatus !== 'sent' || /invalid|error|erro|falha|failed/i.test(String(visitMessage)) ? 'WARN' : 'PASS',
    email: visitEmailStatus,
    warnings: visitReport.data?.email?.warnings,
    message: visitMessage || 'ok',
  })

  const eventForSync = await expectNoError(await admin.from('eventos_agenda_consultoria').select(`
    id,event_type,title,topic,starts_at,duration_hours,modality,location,target_audience,audience_goal,
    responsible_name,ticket_price_text,visit_reason,product_name,google_event_id,status,
    responsible:usuarios!eventos_agenda_consultoria_responsavel_usuario_id_fkey(email)
  `).eq('id', created.eventId).maybeSingle(), 'load event for google sync')

  const calendarSync = await userClient.functions.invoke('google-calendar-sync', {
    body: {
      action: 'upsert',
      event: {
        id: eventForSync.id,
        event_type: eventForSync.event_type,
        title: eventForSync.title,
        topic: eventForSync.topic,
        starts_at: eventForSync.starts_at,
        duration_hours: eventForSync.duration_hours,
        modality: eventForSync.modality,
        location: eventForSync.location,
        target_audience: eventForSync.target_audience,
        audience_goal: eventForSync.audience_goal,
        responsible_name: eventForSync.responsible_name,
        responsible_email: eventForSync.responsible?.email || null,
        ticket_price_text: eventForSync.ticket_price_text,
        visit_reason: eventForSync.visit_reason,
        product_name: eventForSync.product_name,
        google_event_id: eventForSync.google_event_id,
        status: eventForSync.status,
      },
    },
  })
  external.push({
    name: 'google-calendar-sync',
    status: calendarSync.error ? 'WARN' : calendarSync.data?.centralConnected ? 'PASS' : 'WARN',
    message: calendarSync.error?.message || JSON.stringify({
      ok: calendarSync.data?.ok,
      centralConnected: calendarSync.data?.centralConnected,
      userConnected: calendarSync.data?.userConnected,
      errors: calendarSync.data?.errors,
    }),
  })

  for (const item of external) record('Integracoes externas', item.name, item.status, item)
  return { integrations: external.length, sent: external.filter((item) => item.email === 'sent').length }
}

function exportWorkbook(rows, filename, sheet = 'Dados') {
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheet)
  const output = path.join(DOWNLOAD_DIR, filename)
  XLSX.writeFile(wb, output)
  artifacts.push(output)
  const stat = fs.statSync(output)
  if (stat.size <= 0) throw new Error(`Export file is empty: ${output}`)
  return { output, bytes: stat.size }
}

async function validateCliDownloads() {
  const [stores, checkins, products, clients] = await Promise.all([
    userClient.from('lojas').select('id,name,active').eq('id', created.storeId),
    userClient.from('lancamentos_diarios').select('*').eq('store_id', created.storeId),
    userClient.from('produtos_digitais').select('id,name,status').eq('id', created.productId),
    created.clientId
      ? userClient.from('clientes_consultoria').select('id,name,status').eq('id', created.clientId)
      : Promise.resolve({ data: [], error: null }),
  ])
  for (const [label, res] of [['stores', stores], ['checkins', checkins], ['products', products], ['clients', clients]]) {
    if (res.error) throw new Error(`${label}: ${res.error.message}`)
  }
  const files = [
    exportWorkbook(stores.data, `lojas-${RUN_STAMP}.xlsx`, 'Lojas'),
    exportWorkbook(checkins.data, `matinal-api-${RUN_STAMP}.xlsx`, 'Matinal'),
    exportWorkbook(products.data, `produtos-${RUN_STAMP}.xlsx`, 'Produtos'),
  ]
  if (created.clientId) {
    files.push(exportWorkbook(clients.data, `consultoria-${RUN_STAMP}.xlsx`, 'Consultoria'))
  }
  return {
    files: files.map((file) => ({ name: path.basename(file.output), bytes: file.bytes })),
    consulting_client_export: created.clientId ? 'pass' : 'skipped_due_to_consulting_fixture_failure',
  }
}

async function validateUi(password) {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)

  async function screenshot(name) {
    const output = path.join(SCREENSHOT_DIR, `${String(artifacts.length + 1).padStart(2, '0')}-${slugify(name)}.png`)
    await page.screenshot({ path: output, fullPage: true })
    artifacts.push(output)
    return output
  }

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.locator('#login-email').fill(ADMIN_EMAIL)
    await page.locator('#login-password').fill(password)
    await page.locator('button[type="submit"]').click()
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(2500)
    const loginBody = await page.locator('body').innerText().catch(() => '')
    if (loginBody.includes('Proteja sua conta com uma nova senha') || loginBody.includes('Segurança MX')) {
      throw new Error('Force password change overlay appeared in UI')
    }
    if (page.url().includes('/login')) {
      throw new Error('UI remained on login after submit')
    }
    await screenshot('login-dashboard')

    const storeSlug = slugify(created.storeName)
    const clientSlug = created.clientSlug || created.clientId
    const routes = [
      ['Painel Geral', '/painel'],
      ['Lojas', '/lojas'],
      ['Loja Dashboard E2E', `/lojas/${storeSlug}`],
      ['Loja Equipe E2E', `/lojas/${storeSlug}?tab=equipe`],
      ['Consultoria', '/consultoria/clientes'],
      ['Consultoria Cliente E2E', `/consultoria/clientes/${clientSlug}`],
      ['Consultoria Visita E2E', `/consultoria/clientes/${clientSlug}/visitas/1`],
      ['Agenda', '/agenda'],
      ['Benchmarks', '/relatorios/performance-vendas'],
      ['Performance Vendedor', '/relatorios/performance-vendedor'],
      ['Classificacao', '/classificacao'],
      ['Matinal Oficial', '/relatorio-matinal'],
      ['Devolutivas PDI', '/devolutivas'],
      ['PDI', '/pdi'],
      ['Rotina', '/rotina'],
      ['Treinamentos', '/treinamentos'],
      ['Produtos Digitais', '/produtos'],
      ['Notificacoes', '/notificacoes'],
      ['Configuracao Operacional', '/configuracoes/operacional'],
      ['Parametros PMR', '/configuracoes/consultoria-pmr'],
      ['Reprocessamento', '/configuracoes/reprocessamento'],
      ['Auditoria', '/auditoria'],
      ['Configuracoes', '/configuracoes'],
    ]

    const configTabs = [
      'perfil',
      'seguranca',
      'notificacoes',
      'equipe-usuarios',
      'lojas-rede',
      'operacional-loja',
      'consultoria-pmr',
      'catalogos',
      'broadcasts',
      'integracoes',
      'sistema-mx',
      'aparencia',
    ]
    for (const tab of configTabs) routes.push([`Configuracoes ${tab}`, `/configuracoes?aba=${tab}`])

    const routeFindings = []
    for (const [label, route] of routes) {
      const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' }).catch((error) => ({ error }))
      await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
      await page.waitForTimeout(800)
      const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '')
      const status = response?.status?.() || (response?.error ? 0 : 200)
      const bad =
        status >= 500 ||
        text.trim().length < 20 ||
        text.includes('Acessar sistema') ||
        text.includes('Proteja sua conta com uma nova senha')
      const shot = await screenshot(label)
      routeFindings.push({ label, route, status, ok: !bad, screenshot: path.relative(ROOT, shot) })
      record('UI rotas', label, bad ? 'FAIL' : 'PASS', { route, status, text_length: text.length })
    }

    async function browserDownload(label, route, locatorRegex, filename) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
      const button = page.getByRole('button', { name: locatorRegex }).first()
      await button.waitFor({ state: 'visible', timeout: 15000 })
      const downloadPromise = page.waitForEvent('download', { timeout: 20000 })
      await button.click()
      const download = await downloadPromise
      const output = path.join(DOWNLOAD_DIR, filename)
      await download.saveAs(output)
      artifacts.push(output)
      const bytes = fs.statSync(output).size
      if (bytes <= 0) throw new Error(`${label} download is empty`)
      record('UI downloads', label, 'PASS', { file: path.relative(ROOT, output), bytes })
    }

    await browserDownload('Matinal XLSX', '/relatorio-matinal', /PLANILHA/i, `ui-matinal-${RUN_STAMP}.xlsx`).catch((error) => {
      record('UI downloads', 'Matinal XLSX', 'WARN', { message: error.message })
    })
    await browserDownload('Performance XLSX', '/relatorios/performance-vendas', /EXPORTAR (BI|MATRIZ)/i, `ui-performance-${RUN_STAMP}.xlsx`).catch((error) => {
      record('UI downloads', 'Performance XLSX', 'WARN', { message: error.message })
    })

    await page.goto(`${BASE_URL}/consultoria/clientes/${clientSlug}?tab=roi`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    const roiButton = page.getByRole('button', { name: /EXPORTAR RELAT.RIO DE CHOQUE/i }).first()
    if (await roiButton.isVisible().catch(() => false)) {
      try {
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
        await roiButton.click()
        const download = await downloadPromise
        const output = path.join(DOWNLOAD_DIR, `ui-roi-${RUN_STAMP}.pdf`)
        await download.saveAs(output)
        artifacts.push(output)
        record('UI downloads', 'ROI PDF', 'PASS', { file: path.relative(ROOT, output), bytes: fs.statSync(output).size })
      } catch (error) {
        record('UI downloads', 'ROI PDF', 'WARN', { message: error.message })
      }
    } else {
      record('UI downloads', 'ROI PDF', 'WARN', { message: 'ROI export button not visible' })
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${BASE_URL}/painel`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {})
    await screenshot('mobile-painel')
    const menuButton = page.getByRole('button', { name: /menu|abrir/i }).first()
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click().catch(() => {})
      await page.waitForTimeout(500)
      await screenshot('mobile-menu')
    }

    const failedRoutes = routeFindings.filter((item) => !item.ok)
    return { routes: routeFindings.length, failed_routes: failedRoutes.length, screenshots: routeFindings.length + 2 }
  } finally {
    await context.close()
    await browser.close()
  }
}

async function tryDelete(label, fn) {
  try {
    await fn()
    return true
  } catch (error) {
    cleanupWarnings.push(`${label}: ${error.message}`)
    return false
  }
}

async function cleanup() {
  fs.writeFileSync(CLEANUP_PATH, JSON.stringify(created, null, 2))
  artifacts.push(CLEANUP_PATH)

  if (created.eventId) {
    await userClient.functions.invoke('google-calendar-sync', {
      body: { action: 'delete', event: { id: created.eventId } },
    }).catch(() => null)
  }

  for (const storagePath of created.storagePaths) {
    await tryDelete(`storage remove ${storagePath}`, async () => {
      const { error } = await admin.storage.from('evidencias-consultoria').remove([storagePath])
      if (error) throw error
    })
  }

  const tableDeletes = [
    ['evidencias_visita', (q) => created.visitId ? q.eq('visita_id', created.visitId) : null],
    ['documentos_loja', (q) => created.visitId ? q.eq('visita_id', created.visitId) : null],
    ['eventos_agenda_consultoria', (q) => created.eventId ? q.eq('id', created.eventId) : null],
    ['visitas_consultoria', (q) => created.clientId ? q.eq('client_id', created.clientId) : null],
    ['contatos_cliente_consultoria', (q) => created.clientId ? q.eq('client_id', created.clientId) : null],
    ['unidades_cliente_consultoria', (q) => created.clientId ? q.eq('client_id', created.clientId) : null],
    ['modulos_cliente_consultoria', (q) => created.clientId ? q.eq('client_id', created.clientId) : null],
    ['atribuicoes_consultoria', (q) => created.clientId ? q.eq('client_id', created.clientId) : null],
    ['financeiro_consultoria', (q) => created.clientId ? q.eq('client_id', created.clientId) : null],
    ['clientes_consultoria', (q) => created.clientId ? q.eq('id', created.clientId) : null],
    ['relatorios_devolutivas_semanais', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['logs_reprocessamento', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['notificacoes', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['devolutivas', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['lancamentos_diarios', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['vendedores_loja', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['vinculos_loja', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['regras_entrega_loja', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['regras_metas_loja', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['benchmarks_loja', (q) => created.storeId ? q.eq('store_id', created.storeId) : null],
    ['produtos_digitais', (q) => created.productId ? q.eq('id', created.productId) : null],
    ['lojas', (q) => created.storeId ? q.eq('id', created.storeId) : null],
  ]

  for (const [table, build] of tableDeletes) {
    await tryDelete(table, async () => {
      const query = build(admin.from(table).delete())
      if (!query) return
      const { error } = await query
      if (error) throw error
    })
  }

  if (created.testUserId) {
    await tryDelete('usuarios test user', async () => {
      const { error } = await admin.from('usuarios').delete().eq('id', created.testUserId)
      if (error) throw error
    })
    await tryDelete('auth test user', async () => {
      const { error } = await admin.auth.admin.deleteUser(created.testUserId)
      if (error) throw error
    })
  }

  const checks = []
  async function countTable(table, build) {
    const query = build(admin.from(table).select('id', { count: 'exact', head: true }))
    if (!query) return
    const { count, error } = await query
    checks.push({ table, count: error ? null : count, error: error?.message || null })
  }

  await countTable('lojas', (q) => created.storeId ? q.eq('id', created.storeId) : null)
  await countTable('usuarios', (q) => created.testUserId ? q.eq('id', created.testUserId) : null)
  await countTable('clientes_consultoria', (q) => created.clientId ? q.eq('id', created.clientId) : null)
  await countTable('produtos_digitais', (q) => created.productId ? q.eq('id', created.productId) : null)
  await countTable('eventos_agenda_consultoria', (q) => created.eventId ? q.eq('id', created.eventId) : null)
  await countTable('visitas_consultoria', (q) => created.visitId ? q.eq('id', created.visitId) : null)

  const leftovers = checks.filter((item) => item.count && item.count > 0)
  record('Limpeza', 'cleanup registry', cleanupWarnings.length ? 'WARN' : 'PASS', { cleanupWarnings, checks })
  record('Limpeza', 'leftover verification', leftovers.length ? 'FAIL' : 'PASS', { leftovers, checks })
  return { warnings: cleanupWarnings, checks, leftovers }
}

function writeAudit() {
  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {})
  const overall = (counts.FAIL || counts.BLOCKED) ? 'FAIL' : (counts.WARN ? 'PASS_WITH_WARNINGS' : 'PASS')
  const lines = []
  lines.push(`# Validacao E2E Admin Master MX - ${RUN_STAMP}`)
  lines.push('')
  lines.push(`- Run ID: \`${RUN_ID}\``)
  lines.push(`- Usuario validado: \`${ADMIN_EMAIL}\``)
  lines.push(`- Ambiente: \`${BASE_URL}\``)
  lines.push(`- Status geral: \`${overall}\``)
  lines.push(`- Senha: nao registrada neste artefato.`)
  lines.push('')
  lines.push('## Resumo')
  lines.push('')
  lines.push(`| Status | Total |`)
  lines.push(`| --- | ---: |`)
  for (const status of ['PASS', 'WARN', 'FAIL', 'BLOCKED']) {
    lines.push(`| ${status} | ${counts[status] || 0} |`)
  }
  lines.push('')
  lines.push('## Resultados')
  lines.push('')
  lines.push('| Secao | Validacao | Status | Detalhes |')
  lines.push('| --- | --- | --- | --- |')
  for (const item of results) {
    const detail = JSON.stringify(item.details || {})
      .replace(/\|/g, '\\|')
      .slice(0, 900)
    lines.push(`| ${item.section} | ${item.name} | ${item.status} | \`${detail}\` |`)
  }
  lines.push('')
  lines.push('## Artefatos')
  lines.push('')
  for (const artifact of artifacts) {
    lines.push(`- \`${path.relative(ROOT, artifact)}\``)
  }
  lines.push('')
  lines.push('## Limpeza')
  lines.push('')
  lines.push('- Todos os registros E2E conhecidos foram removidos ou verificados no bloco de limpeza.')
  lines.push('- A conta real validada foi preservada: papel, usuario e senha nao foram alterados pelo runner.')
  fs.writeFileSync(AUDIT_PATH, `${lines.join('\n')}\n`)
  console.log(`Audit written: ${AUDIT_PATH}`)
  return { auditPath: AUDIT_PATH, overall, counts }
}

async function main() {
  console.log(`Run ID: ${RUN_ID}`)
  console.log(`Artifacts: ${ARTIFACT_DIR}`)
  const password = await promptHidden(`Password for ${ADMIN_EMAIL}: `)
  let preflightData = null

  try {
    preflightData = await step('Preflight', 'account, role and password login', () => preflight(password))
    await step('Preflight', 'permission matrix', validatePermissions, { continue: true })
    await step('CLI/API', 'store CRUD and operational rules', createStoreAndRules, { continue: true })
    if (created.storeId) {
      await step('CLI/API', 'team/user CRUD, seller tenure and checkins', () => createTeamAndCheckins(preflightData.profile), { continue: true })
      await step('CLI/API', 'digital product CRUD', validateProducts, { continue: true })
      await step('CLI/API', 'consulting client, visit and agenda CRUD', () => validateConsulting(preflightData.profile), { continue: true })
      if (created.visitId) await step('CLI/API', 'evidence upload and visit completion', validateEvidence, { continue: true })
      if (created.storeId && created.visitId && created.eventId) {
        await step('Integracoes externas', 'reports, visit email and calendar sync', invokeExternalFunctions, { continue: true, warn: true })
      }
      await step('Downloads', 'CLI workbook exports', validateCliDownloads, { continue: true })
      if (created.clientSlug) await step('UI', 'production navigation, tabs and browser downloads', () => validateUi(password), { continue: true })
    }
  } finally {
    await cleanup()
    const summary = writeAudit()
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.json'), JSON.stringify({ summary, results, created }, null, 2))
    finalized = true
  }

  const failed = results.some((item) => item.status === 'FAIL' || item.status === 'BLOCKED')
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  record('Runner', 'fatal error', 'FAIL', { message: error.message })
  if (finalized) process.exit(1)
  cleanup()
    .catch((cleanupError) => record('Limpeza', 'fatal cleanup', 'FAIL', { message: cleanupError.message }))
    .finally(() => {
      writeAudit()
      process.exit(1)
    })
})
