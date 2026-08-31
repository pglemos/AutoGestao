import { generateStrongTemporaryPassword } from '@/lib/auth/passwordPolicy'
import { resolveFunctionInvokeError, supabase } from '@/lib/supabase'
import { requiresConsultantProfile, resolveMemberRoleOption, validateMemberCreate, formatMemberCityUf, type MemberCreateDraft } from './memberCreate'
import { saveConsultantQualifications } from './consultantProfile'

type RegisterUserResponse = {
  success?: boolean
  error?: string
  user_id?: string
}

/**
 * Cria um membro da equipe MX via edge function `register-user` (service role).
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
  const roleOption = resolveMemberRoleOption(draft.role)

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
      role: roleOption.authRole,
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
    const cidade = formatMemberCityUf(draft.city, draft.state)
    const capacidadeOnline = draft.capacidade_online.trim() ? Number(draft.capacidade_online) : null
    const capacidadePresencial = draft.capacidade_presencial.trim() ? Number(draft.capacidade_presencial) : null
    const { error: profileError } = await supabase.from('perfil_consultor_mx').insert({
      user_id: id,
      papel_interno: roleOption.papelInterno ?? 'consultor_mx',
      situacao: draft.situation,
      cidade: cidade || null,
      capacidade_online: Number.isFinite(capacidadeOnline) ? capacidadeOnline : null,
      capacidade_presencial: Number.isFinite(capacidadePresencial) ? capacidadePresencial : null,
      created_at: now,
      updated_at: now,
    })
    if (profileError) return { error: profileError.message, id }

    if (draft.enabled_programs.length) {
      const { data: products } = await supabase
        .from('programas_visita_consultoria')
        .select('program_key, name, total_visits')
        .in('program_key', draft.enabled_programs)
      const qualifications = (products ?? []).map(product => ({
        program_key: product.program_key,
        name: product.name ?? product.program_key,
        total_visits: product.total_visits ?? 0,
        enabled: true,
        encounters: [] as number[],
      }))
      const saved = await saveConsultantQualifications(id, qualifications)
      if (saved.error) return { error: saved.error, id }
    }
  }

  if (draft.store_id) {
    const { error: linkError } = await supabase.from('vinculos_loja').insert({
      user_id: id,
      store_id: draft.store_id,
      role: 'gerente',
      is_active: true,
    })
    if (linkError) return { error: linkError.message, id }
  }

  return { error: null, id, temporaryPassword }
}
