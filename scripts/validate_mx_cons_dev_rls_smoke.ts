import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

loadEnv({ quiet: true })

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error('SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const supabaseUrlValue: string = supabaseUrl
const anonKeyValue: string = anonKey
const serviceRoleKeyValue: string = serviceRoleKey
const password = process.env.MX_E2E_PASSWORD
if (!password) throw new Error('MX_E2E_PASSWORD is required')

type SmokeUser = {
  label: string
  email: string
  password: string
  shouldReadProbeVisit: boolean
  shouldReadCatalog: boolean
}

const users: SmokeUser[] = [
  {
    label: 'admin_mx',
    email: 'admin@mxgestaopreditiva.com.br',
    password,
    shouldReadProbeVisit: true,
    shouldReadCatalog: true,
  },
  {
    label: 'dono',
    email: 'dono@mxgestaopreditiva.com.br',
    password,
    shouldReadProbeVisit: false,
    shouldReadCatalog: true,
  },
  {
    label: 'gerente',
    email: 'gerente@mxgestaopreditiva.com.br',
    password,
    shouldReadProbeVisit: false,
    shouldReadCatalog: true,
  },
  {
    label: 'vendedor',
    email: 'vendedor@mxgestaopreditiva.com.br',
    password,
    shouldReadProbeVisit: false,
    shouldReadCatalog: true,
  },
]

function createAnonClient() {
  return createClient(supabaseUrlValue, anonKeyValue, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function createAdminClient() {
  return createClient(supabaseUrlValue, serviceRoleKeyValue, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function signIn(client: SupabaseClient, user: SmokeUser) {
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })

  if (error) throw new Error(`${user.label}: login failed: ${error.message}`)
}

async function createProbeVisit() {
  const admin = createAdminClient()
  const { data: adminUser, error: adminUserError } = await admin
    .from('usuarios')
    .select('id')
    .eq('email', 'admin@mxgestaopreditiva.com.br')
    .single()

  if (adminUserError || !adminUser) {
    throw new Error(`Could not find admin probe user: ${adminUserError?.message || 'missing row'}`)
  }

  const slug = `rls-smoke-${Date.now()}`
  const { data: consultingClient, error: clientError } = await admin
    .from('clientes_consultoria')
    .insert({
      name: `RLS Smoke ${Date.now()}`,
      slug,
      status: 'ativo',
      current_visit_step: 0,
      modality: 'Presencial',
      created_by: adminUser.id,
    })
    .select('id')
    .single()

  if (clientError || !consultingClient) {
    throw new Error(`Could not create probe client: ${clientError?.message || 'missing row'}`)
  }

  const { data: visit, error: visitError } = await admin
    .from('visitas_consultoria')
    .insert({
      client_id: consultingClient.id,
      visit_number: 8,
      scheduled_at: new Date().toISOString(),
      duration_hours: 3,
      modality: 'Online',
      status: 'agendada',
      consultant_id: adminUser.id,
      objective: 'RLS smoke probe',
    })
    .select('id')
    .single()

  if (visitError || !visit) {
    await admin.from('clientes_consultoria').delete().eq('id', consultingClient.id)
    throw new Error(`Could not create probe visit: ${visitError?.message || 'missing row'}`)
  }

  return { admin, clientId: consultingClient.id as string, visitId: visit.id as string }
}

async function cleanupProbe(admin: SupabaseClient, clientId: string) {
  await admin.from('atribuicoes_consultoria').delete().eq('client_id', clientId)
  await admin.from('visitas_consultoria').delete().eq('client_id', clientId)
  await admin.from('clientes_consultoria').delete().eq('id', clientId)
}

async function countProbeVisit(client: SupabaseClient, visitId: string) {
  const { count, error } = await client
    .from('visitas_consultoria')
    .select('id', { count: 'exact', head: true })
    .eq('id', visitId)

  return { count: count ?? 0, error }
}

async function countCatalog(client: SupabaseClient) {
  const { count, error } = await client
    .from('catalogo_metricas_consultoria')
    .select('*', { count: 'exact', head: true })

  return { count: count ?? 0, error }
}

async function checkUser(user: SmokeUser, visitId: string) {
  const client = createAnonClient()
  await signIn(client, user)

  const consultoria = await countProbeVisit(client, visitId)
  const catalog = await countCatalog(client)

  await client.auth.signOut()

  const canReadProbeVisit = !consultoria.error && consultoria.count > 0
  const catalogAllowed = !catalog.error && catalog.count >= 0

  const failures: string[] = []
  if (canReadProbeVisit !== user.shouldReadProbeVisit) {
    failures.push(
      `probe visitas_consultoria expected ${user.shouldReadProbeVisit ? 'readable' : 'blocked'}, got ${canReadProbeVisit ? 'readable' : `blocked/empty (${consultoria.error?.message || '0 rows'})`}`,
    )
  }
  if (catalogAllowed !== user.shouldReadCatalog) {
    failures.push(
      `catalogo_metricas_consultoria expected ${user.shouldReadCatalog ? 'readable' : 'blocked'}, got ${catalogAllowed ? 'readable' : `blocked (${catalog.error?.message})`}`,
    )
  }

  return {
    user: user.label,
    probeVisit: canReadProbeVisit ? 'readable' : `blocked/empty: ${consultoria.error?.message || '0 rows'}`,
    catalog: catalogAllowed ? 'readable' : `blocked: ${catalog.error?.message}`,
    failures,
  }
}

async function main() {
  const probe = await createProbeVisit()
  const results = []

  try {
    for (const user of users) results.push(await checkUser(user, probe.visitId))
  } finally {
    await cleanupProbe(probe.admin, probe.clientId)
  }

  console.table(results.map(({ user, probeVisit, catalog }) => ({ user, probeVisit, catalog })))

  const failures = results.flatMap((result) => result.failures.map((failure) => `${result.user}: ${failure}`))
  if (failures.length) {
    console.error('\nRLS smoke failed:')
    for (const failure of failures) console.error(`- ${failure}`)
    process.exit(1)
  }

  console.log('\nRLS smoke passed.')
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
