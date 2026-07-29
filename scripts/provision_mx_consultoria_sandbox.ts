import { createClient, type User } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const APPLY = process.argv.includes('--apply')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const STORE_NAME = 'MX CONSULTORIA'
const STORE_ALIASES = ['MX CONSULTORIA', 'MX PERFORMANCE', 'LOJA TESTE AIOX', 'LOJA TESTE E2E', 'TESTE']
const PASSWORD = process.env.MX_E2E_PASSWORD
if (!PASSWORD) throw new Error('MX_E2E_PASSWORD is required')
const STARTED_AT = '2026-05-01'

const ADMIN_MASTER_MX_USERS = [
  { email: 'gestao@mxconsultoria.com.br', name: 'Daniel', role: 'administrador_geral', membershipRole: null },
  { email: 'joseroberto20161@gmail.com', name: 'José', role: 'administrador_geral', membershipRole: null },
  { email: 'marianedcs@gmail.com', name: 'Mariane', role: 'administrador_geral', membershipRole: null },
  { email: 'gedson.freire.localiza@gmail.com', name: 'Gedson', role: 'administrador_geral', membershipRole: null },
  { email: 'synvollt@gmail.com', name: 'SynVolt', role: 'administrador_geral', membershipRole: null },
  { email: 'camarajoaoaugusto@gmail.com', name: 'João', role: 'administrador_geral', membershipRole: null },
] as const

const STORE_USERS = [
  { email: 'dono@mxgestaopreditiva.com.br', name: 'Dono MX Consultoria', role: 'dono', membershipRole: 'dono' },
  { email: 'gerente@mxgestaopreditiva.com.br', name: 'Gerente MX Consultoria', role: 'gerente', membershipRole: 'gerente' },
  { email: 'vendedor@mxgestaopreditiva.com.br', name: 'Vendedor MX Consultoria 1', role: 'vendedor', membershipRole: 'vendedor' },
  { email: 'vendedor2@mxgestaopreditiva.com.br', name: 'Vendedor MX Consultoria 2', role: 'vendedor', membershipRole: 'vendedor' },
] as const

const SANDBOX_USERS = [...ADMIN_MASTER_MX_USERS, ...STORE_USERS] as const

const LEGACY_INTERNAL_TEST_EMAILS = [
  'administrador.geral@mxgestaopreditiva.com.br',
  'admin@mxgestaopreditiva.com.br',
  'consultor.mx@mxgestaopreditiva.com.br',
] as const

type SandboxUser = (typeof SANDBOX_USERS)[number]
type StoreRow = { id: string; name: string; active: boolean | null; created_at: string | null }
type PublicUserRow = { id: string; email: string; role: string; active: boolean | null }

function lower(email: string) {
  return email.trim().toLowerCase()
}

async function listAllAuthUsers() {
  const users: User[] = []
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

async function ensureStore() {
  const { data, error } = await supabase
    .from('lojas')
    .select('id,name,active,created_at')
    .in('name', STORE_ALIASES)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`select lojas: ${error.message}`)

  const stores = (data || []) as StoreRow[]
  const canonical =
    stores.find((store) => store.name === STORE_NAME) ||
    stores.find((store) => store.name === 'MX PERFORMANCE') ||
    stores[0]

  if (!APPLY) {
    return canonical || { id: '[novo]', name: STORE_NAME, active: true, created_at: null }
  }

  if (!canonical) {
    const { data: inserted, error: insertError } = await supabase
      .from('lojas')
      .insert({
        name: STORE_NAME,
        manager_email: 'gerente@mxgestaopreditiva.com.br',
        active: true,
        source_mode: 'native_app',
        legal_name: 'MX CONSULTORIA',
        partners: [{ name: 'MX CONSULTORIA', role: 'Sandbox' }],
      })
      .select('id,name,active,created_at')
      .single()

    if (insertError) throw new Error(`insert ${STORE_NAME}: ${insertError.message}`)
    return inserted as StoreRow
  }

  const { data: updated, error: updateError } = await supabase
    .from('lojas')
    .update({
      name: STORE_NAME,
      manager_email: 'gerente@mxgestaopreditiva.com.br',
      active: true,
      source_mode: 'native_app',
      legal_name: 'MX CONSULTORIA',
      partners: [{ name: 'MX CONSULTORIA', role: 'Sandbox' }],
      updated_at: new Date().toISOString(),
    })
    .eq('id', canonical.id)
    .select('id,name,active,created_at')
    .single()

  if (updateError) throw new Error(`update ${STORE_NAME}: ${updateError.message}`)
  return updated as StoreRow
}

async function removeExtraStores(canonicalStoreId: string) {
  const { data, error } = await supabase
    .from('lojas')
    .select('id,name,active,created_at')
    .in('name', STORE_ALIASES)
    .neq('id', canonicalStoreId)

  if (error) throw new Error(`select lojas extras: ${error.message}`)

  const extras = (data || []) as StoreRow[]
  if (!extras.length) return []

  if (!APPLY) return extras

  const { error: deleteError } = await supabase
    .from('lojas')
    .delete()
    .in('id', extras.map((store) => store.id))

  if (deleteError) throw new Error(`delete lojas extras: ${deleteError.message}`)
  return extras
}

async function ensureAuthUser(authUsers: User[], userInfo: SandboxUser) {
  const email = lower(userInfo.email)
  const existing = authUsers.find((user) => lower(user.email || '') === email)

  if (!APPLY) {
    return {
      id: existing?.id || `[novo:${email}]`,
      email,
      action: existing ? 'atualizaria' : 'criaria',
    }
  }

  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        name: userInfo.name,
        role: userInfo.role,
      },
    })
    if (error) throw new Error(`update auth ${email}: ${error.message}`)
    return { id: existing.id, email, action: 'atualizado' }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      name: userInfo.name,
      role: userInfo.role,
      must_change_password: false,
    },
  })

  if (error || !data.user) throw new Error(`create auth ${email}: ${error?.message || 'sem user'}`)
  return { id: data.user.id, email, action: 'criado' }
}

async function ensurePublicUser(userId: string, userInfo: SandboxUser) {
  if (!APPLY) return

  const { error } = await supabase
    .from('usuarios')
    .upsert(
      {
        id: userId,
        email: lower(userInfo.email),
        name: userInfo.name,
        role: userInfo.role,
        active: true,
        is_venda_loja: false,
        must_change_password: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )

  if (error) throw new Error(`upsert usuario ${userInfo.email}: ${error.message}`)
}

async function resetStoreMemberships(storeId: string, publicUsers: Array<PublicUserRow & { membershipRole: string | null }>) {
  const storeScopedUsers = publicUsers.filter((user) => user.membershipRole)
  const storeScopedUserIds = storeScopedUsers.map((user) => user.id)
  if (!storeScopedUserIds.length) return

  if (!APPLY) return

  const { error: deleteMembershipsError } = await supabase
    .from('vinculos_loja')
    .delete()
    .in('user_id', storeScopedUserIds)

  if (deleteMembershipsError) throw new Error(`delete vinculos sandbox: ${deleteMembershipsError.message}`)

  const { error: insertMembershipsError } = await supabase
    .from('vinculos_loja')
    .insert(storeScopedUsers.map((user) => ({
      user_id: user.id,
      store_id: storeId,
      role: user.membershipRole,
    })))

  if (insertMembershipsError) throw new Error(`insert vinculos sandbox: ${insertMembershipsError.message}`)

  const { error: reactivateMembershipUsersError } = await supabase
    .from('usuarios')
    .update({ active: true, must_change_password: false, updated_at: new Date().toISOString() })
    .in('id', storeScopedUserIds)

  if (reactivateMembershipUsersError) {
    throw new Error(`reativar usuarios com vinculo sandbox: ${reactivateMembershipUsersError.message}`)
  }

  const sellerIds = storeScopedUsers
    .filter((user) => user.membershipRole === 'vendedor')
    .map((user) => user.id)

  if (!sellerIds.length) return

  const { error: deleteSellersError } = await supabase
    .from('vendedores_loja')
    .delete()
    .in('seller_user_id', sellerIds)

  if (deleteSellersError) throw new Error(`delete vendedores sandbox: ${deleteSellersError.message}`)

  const { error: insertSellersError } = await supabase
    .from('vendedores_loja')
    .insert(sellerIds.map((sellerId) => ({
      store_id: storeId,
      seller_user_id: sellerId,
      started_at: STARTED_AT,
      ended_at: null,
      is_active: true,
      closing_month_grace: false,
    })))

  if (insertSellersError) throw new Error(`insert vendedores sandbox: ${insertSellersError.message}`)

  const { error: reactivateError } = await supabase
    .from('usuarios')
    .update({ active: true, must_change_password: false, updated_at: new Date().toISOString() })
    .in('id', storeScopedUserIds)

  if (reactivateError) throw new Error(`reativar usuarios sandbox: ${reactivateError.message}`)
}

async function ensureStoreRules(storeId: string) {
  if (!APPLY) return

  const recipients = SANDBOX_USERS
    .filter((user) => user.role !== 'vendedor')
    .map((user) => lower(user.email))

  const { error: deliveryError } = await supabase
    .from('regras_entrega_loja')
    .upsert(
      {
        store_id: storeId,
        matinal_recipients: recipients,
        weekly_recipients: recipients,
        monthly_recipients: recipients,
        timezone: 'America/Sao_Paulo',
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' },
    )

  if (deliveryError) throw new Error(`upsert regras_entrega_loja: ${deliveryError.message}`)

  const { data: existingGoals, error: existingGoalsError } = await supabase
    .from('regras_metas_loja')
    .select('store_id')
    .eq('store_id', storeId)
    .maybeSingle()

  if (existingGoalsError) throw new Error(`select regras_metas_loja: ${existingGoalsError.message}`)

  if (!existingGoals) {
    const { error: goalsError } = await supabase
      .from('regras_metas_loja')
      .insert({
        store_id: storeId,
        monthly_goal: 100,
        individual_goal_mode: 'even',
        include_venda_loja_in_store_total: true,
        include_venda_loja_in_individual_goal: false,
        bench_lead_agd: 20,
        bench_agd_visita: 60,
        bench_visita_vnd: 33,
        projection_mode: 'calendar',
        updated_at: new Date().toISOString(),
      })

    if (goalsError) throw new Error(`insert regras_metas_loja: ${goalsError.message}`)
  }

  const { error: benchmarksError } = await supabase
    .from('benchmarks_loja')
    .upsert(
      {
        store_id: storeId,
        lead_to_agend: 20,
        agend_to_visit: 60,
        visit_to_sale: 33,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id' },
    )

  if (benchmarksError) throw new Error(`upsert benchmarks_loja: ${benchmarksError.message}`)
}

async function deactivateLegacyInternalTestUsers() {
  if (!APPLY) return

  const { error } = await supabase
    .from('usuarios')
    .update({ active: false, updated_at: new Date().toISOString() })
    .in('email', LEGACY_INTERNAL_TEST_EMAILS)

  if (error) throw new Error(`desativar usuarios internos legados: ${error.message}`)
}

async function main() {
  console.log(`Modo: ${APPLY ? 'APLICAR' : 'DRY-RUN'}\n`)

  const store = await ensureStore()
  console.log(`Loja canonica: ${store.name} (${store.id})`)

  const extras = await removeExtraStores(store.id)
  if (extras.length) {
    console.log(`Lojas extras ${APPLY ? 'removidas' : 'que seriam removidas'}:`)
    for (const extra of extras) console.log(`- ${extra.name} (${extra.id})`)
  } else {
    console.log('Nenhuma loja extra de teste/MX encontrada.')
  }

  const authUsers = await listAllAuthUsers()
  const provisionedUsers: Array<PublicUserRow & { membershipRole: string | null; action: string }> = []

  for (const userInfo of SANDBOX_USERS) {
    const authUser = await ensureAuthUser(authUsers, userInfo)
    await ensurePublicUser(authUser.id, userInfo)
    provisionedUsers.push({
      id: authUser.id,
      email: authUser.email,
      role: userInfo.role,
      active: true,
      membershipRole: userInfo.membershipRole,
      action: authUser.action,
    })
  }

  await resetStoreMemberships(store.id, provisionedUsers)
  await ensureStoreRules(store.id)
  await deactivateLegacyInternalTestUsers()

  console.log('\nUsuarios provisionados:')
  console.table(provisionedUsers.map((user) => ({
    email: user.email,
    role: user.role,
    loja: user.membershipRole ? STORE_NAME : 'perfil interno MX',
    action: user.action,
  })))
  if (APPLY) {
    console.log('\nUsuarios internos legados desativados:')
    for (const email of LEGACY_INTERNAL_TEST_EMAILS) console.log(`- ${email}`)
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
