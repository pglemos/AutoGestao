import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!)

const LOGINS = [
    { email: 'admin@mxgestaopreditiva.com.br', role: 'administrador_mx', name: 'Admin MX' },
    { email: 'dono@mxgestaopreditiva.com.br', role: 'dono', name: 'Dono MX' },
    { email: 'gerente@mxgestaopreditiva.com.br', role: 'gerente', name: 'Gerente MX' },
    { email: 'vendedor@mxgestaopreditiva.com.br', role: 'vendedor', name: 'Vendedor MX' }
]
const PASSWORD = process.env.MX_E2E_PASSWORD
if (!PASSWORD) throw new Error('MX_E2E_PASSWORD is required')

async function retry<T>(fn: () => PromiseLike<T>, retries = 3): Promise<T> {
    try {
        return await fn()
    } catch (err) {
        if (retries > 0) {
            console.log(`Retrying... (${retries} left)`)
            await new Promise(r => setTimeout(r, 1000))
            return retry(fn, retries - 1)
        }
        throw err
    }
}

async function repair() {
    console.log('--- REPAIRING SYSTEM ---')

    const { data: lojas } = await retry(async () =>
        await supabase.from('lojas').select('id, name').eq('active', true).limit(1)
    )
    if (!lojas || lojas.length === 0) {
        console.error('No active lojas!')
        return
    }
    const storeId = lojas[0].id

    for (const uInfo of LOGINS) {
        console.log(`\nUser: ${uInfo.email}`)

        // 1. Auth
        const authUsersResponse = await retry(async () => await supabase.auth.admin.listUsers())
        const authUsers = (authUsersResponse.data?.users ?? []) as Array<{ id: string; email?: string | null }>
        let authUser = authUsers.find((u) => u.email === uInfo.email)

        if (!authUser) {
            console.log('Creating auth user...')
            const { data: newUser, error } = await supabase.auth.admin.createUser({
                email: uInfo.email,
                password: PASSWORD,
                email_confirm: true
            })
            if (error) { console.error('Error:', error.message); continue }
            authUser = newUser.user
        } else {
            console.log('Updating password...')
            await supabase.auth.admin.updateUserById(authUser.id, { password: PASSWORD })
        }

        if (!authUser) continue

        // 2. Profile
        console.log('Upserting profile...')
        await retry(async () => await supabase.from('usuarios').upsert({
            id: authUser!.id,
            email: uInfo.email,
            name: uInfo.name,
            role: uInfo.role,
            active: true
        }))

        // 3. Membership
        console.log('Ensuring membership...')
        const { data: mems } = await retry(async () =>
            await supabase.from('vinculos_loja').select('id').eq('user_id', authUser!.id).eq('store_id', storeId)
        )
        if (!mems || mems.length === 0) {
            await retry(async () => await supabase.from('vinculos_loja').insert({
                user_id: authUser!.id,
                store_id: storeId,
                role: uInfo.role === 'administrador_mx' ? 'gerente' : uInfo.role
            }))
        }
    }
    console.log('\nDone.')
}

repair().catch(console.error)
