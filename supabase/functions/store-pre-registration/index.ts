// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders } from '../_shared/cors.ts'
import { initSentryForEdge, withSentry } from '../_shared/sentry.ts'

const allowedRoles = ['dono', 'gerente', 'vendedor']
const protectedExistingRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp']
const passwordChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*'

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function clean(value: unknown, max = 240) {
  return String(value || '').trim().slice(0, max)
}

function normalizeEmail(value: unknown) {
  return clean(value, 180).toLowerCase()
}

function clientIp(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0]?.trim() || null
}

function imageExtension(mimeType: string) {
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  return 'jpg'
}

function decodeBase64Image(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function generateTemporaryPassword(length = 18) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => passwordChars[byte % passwordChars.length]).join('')
}

async function findAuthUserByEmail(adminClient: any, email: string) {
  let page = 1
  const perPage = 1000

  while (page < 50) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const users = data?.users || []
    const found = users.find((user: any) => normalizeEmail(user.email) === email)
    if (found) return found
    if (users.length < perPage) return null

    page += 1
  }

  return null
}

async function reactivateApprovedStoreAccess(
  adminClient: any,
  userId: string,
  storeId: string,
  role: string,
  existingAuthUser: any,
) {
  const { data: previousRegistration, error: previousRegistrationError } = await adminClient
    .from('pre_cadastros_loja')
    .select('id, role')
    .eq('auth_user_id', userId)
    .eq('store_id', storeId)
    .eq('status', 'synced')
    .maybeSingle()

  if (previousRegistrationError) throw previousRegistrationError
  if (!previousRegistration || previousRegistration.role !== role) return false

  const { error: profileError } = await adminClient
    .from('usuarios')
    .update({ active: true, must_change_password: true })
    .eq('id', userId)
  if (profileError) throw profileError

  const { error: membershipError } = await adminClient
    .from('vinculos_loja')
    .upsert({ user_id: userId, store_id: storeId, role, is_active: true, ended_at: null }, { onConflict: 'user_id,store_id' })
  if (membershipError) throw membershipError

  if (role === 'vendedor') {
    const { data: existingSeller, error: existingSellerError } = await adminClient
      .from('vendedores_loja')
      .select('id')
      .eq('seller_user_id', userId)
      .eq('store_id', storeId)
      .maybeSingle()
    if (existingSellerError) throw existingSellerError

    const sellerMutation = existingSeller
      ? adminClient
          .from('vendedores_loja')
          .update({ is_active: true, ended_at: null })
          .eq('id', existingSeller.id)
      : adminClient
          .from('vendedores_loja')
          .insert({
            seller_user_id: userId,
            store_id: storeId,
            started_at: new Date().toISOString().slice(0, 10),
            ended_at: null,
            is_active: true,
            closing_month_grace: false,
          })
    const { error: sellerError } = await sellerMutation
    if (sellerError) throw sellerError
  }

  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(existingAuthUser?.user_metadata || {}),
      role,
      store_id: storeId,
      must_change_password: true,
    },
  })
  if (authError) throw authError

  return true
}

async function cleanupPendingUser(
  adminClient: any,
  userId: string,
  storeId: string,
  avatarStoragePath: string | null,
  deleteAuthUser = true,
) {
  await adminClient.from('vendedores_loja').delete().eq('seller_user_id', userId).eq('store_id', storeId)
  await adminClient.from('vinculos_loja').update({ is_active: false, ended_at: new Date().toISOString().slice(0, 10) }).eq('user_id', userId).eq('store_id', storeId)
  await adminClient.from('usuarios').delete().eq('id', userId)
  if (avatarStoragePath) await adminClient.storage.from('pre-cadastro-avatares').remove([avatarStoragePath])
  // Identidade órfã adotada (auth.users pré-existente sem linha em usuarios): nunca deletar
  // o auth user nesse caso, só o que criamos nesta chamada (profile/vínculo/avatar acima).
  if (deleteAuthUser) await adminClient.auth.admin.deleteUser(userId)
}

initSentryForEdge()

serve((req) => withSentry('store-pre-registration', req, async () => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ success: false, error: 'Service is misconfigured' }, 500)
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const storeSlug = clean(url.searchParams.get('store_slug'), 160)
    if (!storeSlug) return jsonResponse({ success: false, error: 'store_slug is required' }, 400)

    const { data: stores, error } = await adminClient
      .from('lojas')
      .select('id, name, active')
      .eq('active', true)

    if (error) return jsonResponse({ success: false, error: error.message }, 500)

    const store = (stores || []).find((item: any) => slugify(item.name) === storeSlug)
    if (!store) return jsonResponse({ success: false, error: 'Loja não localizada' }, 404)

    return jsonResponse({
      success: true,
      store: {
        id: store.id,
        name: store.name,
      },
    })
  }

  if (req.method !== 'POST') return jsonResponse({ success: false, error: 'Method not allowed' }, 405)

  // Endpoint público e sem autenticação: qualquer chamador cria auth.users +
  // usuarios + notifica todos os admins. Sem limite, um bot conseguiria
  // floodar contas fantasma e a fila de aprovação dos admins. Reaproveita o
  // mesmo contador atômico em Postgres da recuperação de senha (mesma tabela,
  // chave com prefixo próprio).
  const rateLimitKey = `store-pre-registration:${clientIp(req) || 'unknown'}`
  const { data: rateLimitAllowed, error: rateLimitError } = await adminClient.rpc(
    'check_and_increment_recovery_rate_limit',
    { p_key: rateLimitKey, p_window_seconds: 60 * 60, p_max_attempts: 5 },
  )
  if (rateLimitError) {
    return jsonResponse({ success: false, error: 'Não foi possível processar agora. Tente novamente em alguns minutos.' }, 502)
  }
  if (!rateLimitAllowed) {
    return jsonResponse({ success: false, error: 'Muitas tentativas de cadastro. Aguarde antes de tentar novamente.' }, 429)
  }

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400)
  }

  const storeId = clean(payload.store_id, 80)
  const fullName = clean(payload.full_name, 180).toLocaleUpperCase('pt-BR')
  const email = normalizeEmail(payload.email)
  const phone = clean(payload.phone, 80)
  const role = clean(payload.role, 40)
  const segment = clean(payload.segment, 120)
  const storeTenure = clean(payload.store_tenure, 120)
  const marketExperience = clean(payload.market_experience, 120)
  const notes = clean(payload.notes, 800)
  const companyLegalName = clean(payload.company_legal_name, 180).toLocaleUpperCase('pt-BR')
  const companyCnpj = clean(payload.company_cnpj, 32)
  const companyAddress = clean(payload.company_address, 300).toLocaleUpperCase('pt-BR')
  const companyAdministrativePhone = clean(payload.company_administrative_phone, 80)
  const avatarBase64 = clean(payload.avatar_base64, 7_200_000)
  const avatarMimeType = clean(payload.avatar_mime_type, 80)
  const hasAvatar = Boolean(avatarBase64 || avatarMimeType)

  if (!storeId || !fullName || !email || !phone || !role || !segment || !storeTenure || !marketExperience) {
    return jsonResponse({ success: false, error: 'Preencha todos os campos obrigatórios.' }, 400)
  }

  if (fullName.split(/\s+/).filter(Boolean).length < 2) {
    return jsonResponse({ success: false, error: 'Informe nome e sobrenome.' }, 400)
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ success: false, error: 'E-mail inválido.' }, 400)
  }

  if (phone.replace(/\D/g, '').length < 10) {
    return jsonResponse({ success: false, error: 'Telefone inválido.' }, 400)
  }

  if (!allowedRoles.includes(role)) {
    return jsonResponse({ success: false, error: 'Papel inválido.' }, 400)
  }

  if (role === 'dono') {
    if (!companyLegalName || companyLegalName.length < 2) {
      return jsonResponse({ success: false, error: 'Informe a razão social da loja.' }, 400)
    }
    if (companyCnpj.replace(/\D/g, '').length !== 14) {
      return jsonResponse({ success: false, error: 'Informe um CNPJ válido com 14 dígitos.' }, 400)
    }
    if (!companyAddress || companyAddress.length < 6) {
      return jsonResponse({ success: false, error: 'Informe o endereço completo da loja.' }, 400)
    }
    if (companyAdministrativePhone.replace(/\D/g, '').length < 10) {
      return jsonResponse({ success: false, error: 'Informe o telefone administrativo da loja.' }, 400)
    }
  }

  if (hasAvatar && (!avatarBase64 || !avatarMimeType)) {
    return jsonResponse({ success: false, error: 'Envie a foto novamente ou continue sem foto.' }, 400)
  }

  if (hasAvatar && !allowedImageTypes.includes(avatarMimeType)) {
    return jsonResponse({ success: false, error: 'Envie uma foto JPG, PNG ou WEBP.' }, 400)
  }

  if (hasAvatar && avatarBase64.length > 7_000_000) {
    return jsonResponse({ success: false, error: 'A foto deve ter no máximo 5MB.' }, 400)
  }

  const { data: store, error: storeError } = await adminClient
    .from('lojas')
    .select('id, name, active')
    .eq('id', storeId)
    .eq('active', true)
    .maybeSingle()

  if (storeError) return jsonResponse({ success: false, error: storeError.message }, 500)
  if (!store) return jsonResponse({ success: false, error: 'Loja não localizada ou inativa.' }, 404)

  // Query direta por e-mail: buscar todos os usuarios com .limit(1000) e filtrar
  // em memória (versão anterior) fica cego pra qualquer conta além da página
  // 1000 assim que a base crescer — falso negativo silencioso de duplicidade.
  const { data: existingUser, error: existingUserError } = await adminClient
    .from('usuarios')
    .select('id, email, active, role')
    .ilike('email', email)
    .maybeSingle()

  if (existingUserError) return jsonResponse({ success: false, error: existingUserError.message }, 500)

  if (existingUser && protectedExistingRoles.includes(existingUser.role)) {
    return jsonResponse({
      success: false,
      error: 'Este e-mail pertence a um perfil interno da MX e não pode ser sobrescrito pelo pré-cadastro da loja.',
    }, 409)
  }

  let existingAuthUser: any = null
  try {
    existingAuthUser = await findAuthUserByEmail(adminClient, email)
  } catch (err) {
    return jsonResponse({ success: false, error: err instanceof Error ? err.message : 'Não foi possível validar o e-mail no Auth.' }, 500)
  }

  const existingAuthRole = clean(existingAuthUser?.user_metadata?.role, 80)
  if (!existingUser && existingAuthUser && protectedExistingRoles.includes(existingAuthRole)) {
    return jsonResponse({
      success: false,
      error: 'Este e-mail pertence a um perfil interno da MX e não pode ser sobrescrito pelo pré-cadastro da loja.',
    }, 409)
  }

  if (existingUser && existingAuthUser && existingUser.id !== existingAuthUser.id) {
    return jsonResponse({
      success: false,
      error: 'Este e-mail possui registros divergentes no sistema. Solicite ajuste do Admin MX antes de refazer o cadastro.',
    }, 409)
  }

  if (existingUser && !existingAuthUser) {
    return jsonResponse({
      success: false,
      error: 'Este e-mail já existe no perfil, mas o login não foi localizado. Solicite ajuste do Admin MX antes de refazer o cadastro.',
    }, 409)
  }

  // Identidade órfã: existe em auth.users mas sem linha em usuarios (ex.: import antigo que
  // nunca completou o perfil). Não é um cadastro real em uso — adota a identidade em vez de
  // barrar o pré-cadastro com "e-mail já existe".
  const isOrphanAuthUser = !existingUser && Boolean(existingAuthUser)

  if ((existingUser || existingAuthUser) && !isOrphanAuthUser) {
    let reactivated = false
    if (
      existingUser &&
      existingAuthUser &&
      existingUser.id === existingAuthUser.id &&
      existingUser.active === false
    ) {
      try {
        reactivated = await reactivateApprovedStoreAccess(
          adminClient,
          existingAuthUser.id,
          store.id,
          role,
          existingAuthUser,
        )
      } catch (err) {
        return jsonResponse({
          success: false,
          error: err instanceof Error ? err.message : 'Não foi possível reativar o acesso existente.',
        }, 500)
      }
    }

    return jsonResponse({
      success: false,
      code: 'existing_user',
      requires_password_reset: true,
      reactivated,
      login_email: email,
      error: 'Este e-mail já possui cadastro. Não criamos outro usuário. Enviamos um link para redefinir sua senha.',
    }, 409)
  }

  let userId = ''
  let createdAuthUser = true

  const userMetadata = {
    name: fullName,
    role,
    phone,
    store_id: store.id,
    must_change_password: true,
  }

  const temporaryPassword = generateTemporaryPassword()

  if (isOrphanAuthUser) {
    createdAuthUser = false
    userId = existingAuthUser.id
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: userMetadata,
    })
    if (updateAuthError) {
      return jsonResponse({ success: false, error: updateAuthError.message }, 500)
    }
  }

  const { data: createdUser, error: createUserError } = isOrphanAuthUser
    ? { data: null, error: null }
    : await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: userMetadata,
      })

  if (!isOrphanAuthUser && (createUserError || !createdUser?.user)) {
    const createMessage = createUserError?.message?.toLowerCase() || ''
    let existingAuthAfterRace: any = null
    try {
      existingAuthAfterRace = await findAuthUserByEmail(adminClient, email)
    } catch {
      existingAuthAfterRace = null
    }
    if (existingAuthAfterRace || createMessage.includes('already') || createMessage.includes('exists') || createMessage.includes('registered') || createMessage.includes('database error creating new user')) {
      return jsonResponse({
        success: false,
        code: 'existing_user',
        requires_password_reset: true,
        login_email: email,
        error: 'Este e-mail já possui cadastro. Não criamos outro usuário. Solicite a redefinição da senha para continuar.',
      }, 409)
    }
    return jsonResponse({ success: false, error: createUserError?.message || 'Não foi possível criar o login provisório.' }, 500)
  }

  if (!isOrphanAuthUser) {
    userId = createdUser!.user!.id
  }

  let avatarUrl: string | null = null
  let avatarStoragePath: string | null = null

  if (hasAvatar) {
    try {
      const imageBytes = decodeBase64Image(avatarBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, ''))
      avatarStoragePath = `pre-cadastros/${store.id}/${userId}.${imageExtension(avatarMimeType)}`
      const { error: uploadError } = await adminClient.storage
        .from('pre-cadastro-avatares')
        .upload(avatarStoragePath, imageBytes, {
          contentType: avatarMimeType,
          upsert: true,
        })

      if (uploadError) throw uploadError
      const { data: publicUrlData } = adminClient.storage.from('pre-cadastro-avatares').getPublicUrl(avatarStoragePath)
      avatarUrl = publicUrlData.publicUrl
    } catch (err) {
      await cleanupPendingUser(adminClient, userId, store.id, avatarStoragePath, createdAuthUser)
      return jsonResponse({ success: false, error: err instanceof Error ? err.message : 'Não foi possível salvar a foto.' }, 500)
    }
  }

  const { error: profileError } = await adminClient.from('usuarios').upsert({
    id: userId,
    email,
    name: fullName,
    phone,
    role,
    avatar_url: avatarUrl,
    active: false,
    must_change_password: true,
    is_venda_loja: role === 'vendedor',
  }, { onConflict: 'id' })

  if (profileError) {
    await cleanupPendingUser(adminClient, userId, store.id, avatarStoragePath, createdAuthUser)
    return jsonResponse({ success: false, error: profileError.message }, 500)
  }

  const { error: membershipError } = await adminClient.from('vinculos_loja').upsert({
    user_id: userId,
    store_id: store.id,
    role,
    is_active: false,
    ended_at: null,
  }, { onConflict: 'user_id,store_id' })

  if (membershipError) {
    await cleanupPendingUser(adminClient, userId, store.id, avatarStoragePath, createdAuthUser)
    return jsonResponse({ success: false, error: membershipError.message }, 500)
  }

  const { data: preRegistration, error: insertError } = await adminClient
    .from('pre_cadastros_loja')
    .insert({
      store_id: store.id,
      store_name_snapshot: store.name,
      full_name: fullName,
      email,
      phone,
      role,
      segment,
      store_tenure: storeTenure,
      market_experience: marketExperience,
      notes: notes || null,
      company_legal_name: role === 'dono' ? companyLegalName : null,
      company_cnpj: role === 'dono' ? companyCnpj : null,
      company_address: role === 'dono' ? companyAddress : null,
      company_administrative_phone: role === 'dono' ? companyAdministrativePhone : null,
      auth_user_id: userId,
      avatar_url: avatarUrl,
      avatar_storage_path: avatarStoragePath,
      temporary_password: null,
      ip_address: clientIp(req),
      user_agent: req.headers.get('user-agent') || null,
    })
    .select('id')
    .single()

  if (insertError) {
    await cleanupPendingUser(adminClient, userId, store.id, avatarStoragePath, createdAuthUser)
    const insertMessage = insertError.message.toLowerCase()
    if (insertMessage.includes('duplicate key') || insertMessage.includes('pre_cadastros_loja_active_email_normalized_uidx')) {
      return jsonResponse({
        success: false,
        code: 'existing_user',
        requires_password_reset: true,
        login_email: email,
        error: 'Este e-mail já possui cadastro. Não criamos outro usuário. Solicite a redefinição da senha para continuar.',
      }, 409)
    }
    return jsonResponse({ success: false, error: insertError.message }, 500)
  }

  await adminClient
    .from('pre_cadastros_loja')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      rejected_at: new Date().toISOString(),
      approval_note: 'Substituído por novo pré-cadastro com o mesmo e-mail.',
    })
    .eq('auth_user_id', userId)
    .eq('status', 'pending')
    .neq('id', preRegistration.id)

  const { data: admins } = await adminClient
    .from('usuarios')
    .select('id')
    .in('role', ['administrador_geral', 'administrador_mx'])
    .eq('active', true)

  if (admins?.length) {
    const senderId = admins[0].id
    const link = `/notificacoes?preRegistrationId=${preRegistration.id}`
    await adminClient.from('notificacoes').insert(admins.map((admin: { id: string }) => ({
      recipient_id: admin.id,
      sender_id: senderId,
      store_id: store.id,
      target_type: 'store',
      target_store_id: store.id,
      title: 'Novo login pendente',
      message: `${fullName} solicitou acesso como ${role} na loja ${store.name}. Valide a hierarquia antes de liberar.`,
      type: 'approval',
      priority: 'high',
      link,
      read: false,
    })))
  }

  return jsonResponse({
    success: true,
    pre_registration_id: preRegistration.id,
    login_email: email,
    status: 'pending_approval',
  })
}))
