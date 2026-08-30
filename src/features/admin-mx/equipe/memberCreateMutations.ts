import { generateStrongTemporaryPassword } from '@/lib/auth/passwordPolicy'
import { resolveFunctionInvokeError, supabase } from '@/lib/supabase'
import { requiresConsultantProfile, validateMemberCreate, type MemberCreateDraft } from './memberCreate'

type RegisterUserResponse = {
  success?: boolean
  error?: string
  user_id?: string
}

/**
 * Cria um membro da equipe MX via edge function `register-user` (service role).
 * Insert direto em `usuarios` toma 403 para consultor MX: RLS exige
 * `eh_administrador_mx()`. A senha temporária força troca no primeiro acesso
 * (`must_change_password` vem de `internal_mx_finalize_registered_user`).
 */
export async function createTeamMember(draft: MemberCreateDraft): Promise<{
  error: string | null
  id?: string
  temporaryPassword?: string
}> {
  const errors = validateMemberCreate(draft)
  if (errors.length) return { error: errors[0] }

  const email = draft.email.trim().toLowerCase()
  const name = draft.name.trim()

  const { data: duplicate } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (duplicate) return { error: 'Este e-mail já está vinculado a outro usuário.' }

  const temporaryPassword = generateStrongTemporaryPassword()
  const { data, error: invokeError } = await supabase.functions.invoke<RegisterUserResponse>('register-user', {
    body: {
      name,
      email,
      password: temporaryPassword,
      phone: draft.phone.trim() || null,
      role: draft.role,
      is_active: draft.situation !== 'inativo',
    },
  })
  if (invokeError || !data?.success) {
    return {
      error: await resolveFunctionInvokeError(invokeError, data, 'Não foi possível criar o membro da equipe.'),
    }
  }

  const id = typeof data.user_id === 'string' && data.user_id ? data.user_id : undefined
  if (!id) return { error: 'O cadastro não devolveu o identificador do usuário.' }

  const now = new Date().toISOString()

  if (requiresConsultantProfile(draft.role)) {
    const { error: profileError } = await supabase.from('perfil_consultor_mx').insert({
      user_id: id,
      papel_interno: 'consultor_mx',
      situacao: draft.situation,
      created_at: now,
      updated_at: now,
    })
    if (profileError) return { error: profileError.message, id }
  }

  if (draft.store_id) {
    const { error: linkError } = await supabase.from('vinculos_loja').insert({
      user_id: id,
      store_id: draft.store_id,
      // Membro interno MX não é vendedor nem dono da loja; entra como gerente,
      // que é o papel de acesso operacional em `vinculos_loja`.
      role: 'gerente',
      is_active: true,
    })
    if (linkError) return { error: linkError.message, id }
  }

  return { error: null, id, temporaryPassword }
}
