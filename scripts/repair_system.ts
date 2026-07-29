import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)

const USERS = [
    { email: 'admin@mxgestaopreditiva.com.br', role: 'administrador_mx', name: 'Admin MX' },
    { email: 'dono@mxgestaopreditiva.com.br', role: 'dono', name: 'Dono MX' },
    { email: 'gerente@mxgestaopreditiva.com.br', role: 'gerente', name: 'Gerente MX' },
    { email: 'vendedor@mxgestaopreditiva.com.br', role: 'vendedor', name: 'Vendedor MX' }
]
const PASSWORD = process.env.MX_E2E_PASSWORD
if (!PASSWORD) throw new Error('MX_E2E_PASSWORD is required')

async function repairSystem() {
    console.log('--- REPAIRING AUTH AND USERS ---')

    // 1. Get an active store
    const { data: lojas } = await supabase.from('lojas').select('id, name').eq('active', true).limit(1)
    if (!lojas || lojas.length === 0) {
        console.error('No active lojas found! Creating one...')
        const { data: newStore } = await supabase.from('lojas').insert({ name: 'Loja Matriz MX', active: true }).select().single()
        lojas?.push(newStore as any)
    }
    const storeId = lojas![0].id
    console.log(`Using Store: ${lojas![0].name} (${storeId})`)

    for (const uInfo of USERS) {
        console.log(`\nProcessing ${uInfo.email}...`)

        // A. Ensure Auth User
        const authUsersResponse = await supabase.auth.admin.listUsers()
        const authUsers = (authUsersResponse.data?.users ?? []) as Array<{ id: string; email?: string | null }>
        let authUser = authUsers.find((u) => u.email === uInfo.email)

        if (!authUser) {
            console.log(`Creating auth user ${uInfo.email}...`)
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: uInfo.email,
                password: PASSWORD,
                email_confirm: true
            })
            if (createError) {
                console.error(`Error creating ${uInfo.email}:`, createError.message)
                continue
            }
            authUser = newUser.user
        } else {
            console.log(`Updating auth user ${uInfo.email}...`)
            await supabase.auth.admin.updateUserById(authUser.id, { password: PASSWORD })
        }

        if (!authUser) continue

        // B. Ensure public.usuarios record
        console.log(`Upserting public.usuarios for ${authUser.id}...`)
        const { error: userError } = await supabase.from('usuarios').upsert({
            id: authUser.id,
            email: uInfo.email,
            name: uInfo.name,
            role: uInfo.role,
            active: true
        })
        if (userError) console.error(`Error upserting user ${uInfo.email}:`, userError.message)

        // C. Ensure Membership
        console.log(`Ensuring membership for ${authUser.id} in store ${storeId}...`)
        const { data: vinculos_loja } = await supabase.from('vinculos_loja').select('*').eq('user_id', authUser.id).eq('store_id', storeId)
        if (!vinculos_loja || vinculos_loja.length === 0) {
            const { error: memError } = await supabase.from('vinculos_loja').insert({
                user_id: authUser.id,
                store_id: storeId,
                role: uInfo.role === 'administrador_mx' ? 'gerente' : uInfo.role
            })
            if (memError) console.error(`Error creating membership for ${uInfo.email}:`, memError.message)
        }
    }

    console.log('\nRepair complete.')
}

repairSystem().catch(console.error)
