import { supabase } from '@/lib/supabase'
import { requiresConsultantProfile, validateMemberCreate, type MemberCreateDraft } from './memberCreate'

function newUserId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Cria um membro da equipe MX: grava usuarios (nome, e-mail, papel, acesso) e,
 * quando o papel é consultor_mx, o perfil do consultor (perfil_consultor_mx).
 * A loja principal opcional vira um vínculo ativo principal em
 * vinculos_equipe_loja.
 */
export async function createTeamMember(draft: MemberCreateDraft): Promise<{ error: string | null; id?: string }> {
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

  const id = newUserId()
  const now = new Date().toISOString()

  const { error: userError } = await supabase.from('usuarios').insert({
    id,
    name,
    email,
    phone: draft.phone.trim() || null,
    role: draft.role,
    active: draft.situation !== 'inativo',
    must_change_password: true,
    updated_at: now,
  })
  if (userError) return { error: userError.message }

  if (requiresConsultantProfile(draft.role)) {
    const { error: profileError } = await supabase.from('perfil_consultor_mx').insert({
      user_id: id,
      papel_interno: 'consultor_mx',
      situacao: draft.situation,
      created_at: now,
      updated_at: now,
    })
    if (profileError) {
      await supabase.from('usuarios').delete().eq('id', id)
      return { error: profileError.message }
    }
  }

  if (draft.store_id) {
    const { data: store } = await supabase.from('lojas').select('name').eq('id', draft.store_id).maybeSingle()
    const { error: linkError } = await supabase.from('vinculos_equipe_loja').insert({
      user_id: id,
      loja_id: draft.store_id,
      loja_nome: store?.name ?? '',
      assignment_type: 'responsavel_principal',
      is_primary: true,
      valid_from: new Date().toISOString().slice(0, 10),
      status: 'ativo',
    })
    if (linkError) return { error: linkError.message }
  }

  return { error: null, id }
}
