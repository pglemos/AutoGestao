import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { test } from '@playwright/test'
import { config as loadEnv } from 'dotenv'

loadEnv()

export function createE2EPassword(prefix = 'MxE2E') {
  const suffix = Math.random().toString(36).slice(2, 10)
  return `${prefix}#${Date.now()}!${suffix}Aa1`
}

export interface E2EUser {
  id: string
  email: string
  password: string
}

type E2ERole = 'administrador_geral' | 'administrador_mx' | 'consultor_mx' | 'dono' | 'gerente' | 'vendedor'

let cachedAdmin: SupabaseClient | null = null
let cachedAnon: SupabaseClient | null = null

export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    test.skip(true, 'E2E setup tests require SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for E2E setup.')
  }

  cachedAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedAdmin
}

export function getSupabaseAnon() {
  if (cachedAnon) return cachedAnon

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    test.skip(true, 'E2E setup tests require SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY.')
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL and SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY are required for E2E setup.')
  }

  cachedAnon = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedAnon
}

export async function createE2EAdminUser(options?: {
  prefix?: string
  email?: string
  name?: string
  password?: string
  mustChangePassword?: boolean
  role?: E2ERole
}) {
  const admin = getSupabaseAdmin()
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const email = options?.email || `${options?.prefix || 'e2e-admin'}-${suffix}@mxperformance.test`
  const password = options?.password || createE2EPassword()
  const mustChangePassword = options?.mustChangePassword ?? false
  const name = options?.name || 'E2E Admin'
  const role = options?.role || 'administrador_geral'

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      must_change_password: mustChangePassword,
    },
  })

  if (createError || !created.user) {
    throw new Error(`Failed to create E2E auth user: ${createError?.message || 'missing user'}`)
  }

  const { error: profileError } = await admin.from('usuarios').upsert(
    {
      id: created.user.id,
      email,
      name,
      role,
      active: true,
      must_change_password: mustChangePassword,
    },
    { onConflict: 'id' },
  )

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id)
    throw new Error(`Failed to create E2E public profile: ${profileError.message}`)
  }

  return {
    id: created.user.id,
    email,
    password,
  } satisfies E2EUser
}

export async function createE2EStoreUser(options: {
  storeId: string
  role: 'dono' | 'gerente' | 'vendedor'
  prefix: string
  name: string
}) {
  const user = await createE2EAdminUser(options)
  const admin = getSupabaseAdmin()
  const { error: membershipError } = await admin.from('vinculos_loja').insert({
    user_id: user.id,
    store_id: options.storeId,
    role: options.role,
    is_active: true,
  })

  if (membershipError) {
    await deleteE2EUser(user.id)
    throw new Error(`Failed to create E2E store membership: ${membershipError.message}`)
  }

  if (options.role === 'vendedor') {
    const { error: sellerError } = await admin.from('vendedores_loja').insert({
      seller_user_id: user.id,
      store_id: options.storeId,
      is_active: true,
    })
    if (sellerError) {
      await deleteE2EUser(user.id)
      throw new Error(`Failed to create E2E store seller: ${sellerError.message}`)
    }
  }

  return user
}

export async function createE2EStore(name: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('lojas')
    // `stores_source_mode_check` só aceita legacy_forms | native_app | hybrid.
    .insert({ name, active: true, source_mode: 'native_app' })
    .select('id, name')
    .single()

  if (error || !data) throw new Error(`Failed to create E2E store: ${error?.message || 'missing row'}`)
  return data as { id: string; name: string }
}

export async function createE2EConsultingClient(options: {
  name: string
  createdBy: string
  storeId?: string
}) {
  const admin = getSupabaseAdmin()
  const slug = options.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  // `clientes_consultoria_active_requires_store_check` recusa cliente ativo sem
  // loja primária. A fixture cria a loja junto quando o chamador não fornece
  // uma, porque um cliente inativo não é navegável pelas telas em teste.
  const store = options.storeId
    ? { id: options.storeId }
    : await createE2EStore(`E2E Loja ${slug}`.slice(0, 60))
  const { data, error } = await admin
    .from('clientes_consultoria')
    .insert({
      name: options.name,
      slug,
      status: 'ativo',
      primary_store_id: store.id,
      current_visit_step: 0,
      modality: 'Presencial',
      created_by: options.createdBy,
    })
    .select('id, slug, name, primary_store_id')
    .single()

  if (error || !data) throw new Error(`Failed to create E2E consulting client: ${error?.message || 'missing row'}`)
  return data as { id: string; slug: string; name: string; primary_store_id: string }
}

export async function createE2EConsultingVisit(options: {
  clientId: string
  consultantId: string
  scheduledAt: Date
  visitNumber?: number
  objective?: string
}) {
  const admin = getSupabaseAdmin()
  await admin
    .from('atribuicoes_consultoria')
    .upsert({
      client_id: options.clientId,
      user_id: options.consultantId,
      assignment_role: 'responsavel',
      active: true,
    }, { onConflict: 'client_id,user_id' })

  const { data, error } = await admin
    .from('visitas_consultoria')
    .insert({
      client_id: options.clientId,
      visit_number: options.visitNumber || 1,
      scheduled_at: options.scheduledAt.toISOString(),
      duration_hours: 3,
      modality: 'Presencial',
      status: 'agendada',
      consultant_id: options.consultantId,
      auxiliary_consultant_id: null,
      objective: options.objective || 'E2E agenda filter validation',
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Failed to create E2E consulting visit: ${error?.message || 'missing row'}`)
  return data as { id: string }
}

export async function deleteE2EConsultingData(clientIds: string[]) {
  if (!clientIds.length) return
  const admin = getSupabaseAdmin()
  // Guarda as lojas criadas junto com os clientes antes de apagar o cliente,
  // senão a loja de fixture fica órfã no banco a cada execução.
  const { data: clients } = await admin
    .from('clientes_consultoria')
    .select('primary_store_id, name')
    .in('id', clientIds)
  const fixtureStoreIds = (clients || [])
    .filter((client) => client.primary_store_id && String(client.name).startsWith('E2E '))
    .map((client) => client.primary_store_id as string)

  await admin.from('atribuicoes_consultoria').delete().in('client_id', clientIds)
  await admin.from('visitas_consultoria').delete().in('client_id', clientIds)
  await admin.from('clientes_consultoria').delete().in('id', clientIds)
  if (fixtureStoreIds.length) await admin.from('lojas').delete().in('id', fixtureStoreIds)
}

export async function deleteE2EUser(userId: string) {
  const admin = getSupabaseAdmin()
  const scopedRows: Array<[string, string]> = [
    ['manager_daily_tasks', 'manager_user_id'],
    ['manager_daily_tasks', 'seller_user_id'],
    ['seller_routine_snapshots', 'seller_user_id'],
    ['seller_day_eligibility', 'seller_user_id'],
    ['manager_routine_snapshots', 'manager_user_id'],
    ['manager_lead_conference_items', 'seller_user_id'],
    ['manager_lead_conferences', 'manager_user_id'],
    ['d1_snapshot_items', 'seller_user_id'],
    ['d1_snapshot_batches', 'seller_user_id'],
    ['d1_contact_audit', 'manager_user_id'],
    ['d1_contact_audit', 'seller_user_id'],
    ['logs_rotina_gerente', 'manager_id'],
    ['vendedores_loja', 'seller_user_id'],
    ['vinculos_loja', 'user_id'],
  ]

  for (const [table, column] of scopedRows) {
    const { error } = await admin.from(table).delete().eq(column, userId)
    if (error) throw new Error(`Failed to clean E2E ${table}.${column}: ${error.message}`)
  }

  const { error: profileError } = await admin.from('usuarios').delete().eq('id', userId)
  if (profileError) throw new Error(`Failed to delete E2E public profile: ${profileError.message}`)

  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError) throw new Error(`Failed to delete E2E auth user: ${authError.message}`)
}

export async function getMustChangePassword(userId: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('usuarios')
    .select('must_change_password')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.must_change_password ?? null
}

export async function createPasswordRecoveryLink(email: string, redirectTo: string) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error) throw new Error(`Failed to generate recovery link: ${error.message}`)

  const properties = data.properties as { action_link?: string } | null
  if (!properties?.action_link) throw new Error('Supabase did not return a recovery action link.')
  return properties.action_link
}

export async function createPasswordRecoverySession(email: string) {
  const admin = getSupabaseAdmin()
  const anon = getSupabaseAnon()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) throw new Error(`Failed to generate recovery link: ${error.message}`)
  if (!data.properties?.hashed_token) throw new Error('Supabase did not return a recovery token hash.')

  const { data: verified, error: verifyError } = await anon.auth.verifyOtp({
    type: 'recovery',
    token_hash: data.properties.hashed_token,
  })

  if (verifyError) throw new Error(`Failed to verify recovery token: ${verifyError.message}`)
  if (!verified.session) throw new Error('Supabase recovery verification did not return a session.')

  return {
    accessToken: verified.session.access_token,
    refreshToken: verified.session.refresh_token,
    expiresIn: verified.session.expires_in,
  }
}

export async function getFirstRankingStoreName() {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('vendedores_loja')
    .select('store:store_id(name)')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  const row = data as unknown as { store?: { name?: string } } | null
  return row?.store?.name || null
}
