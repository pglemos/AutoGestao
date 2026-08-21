import { supabase } from '@/lib/supabase'
import { requiresConsultantProfile, validateMemberCreate, type MemberCreateDraft } from './memberCreate'

function newUserId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

/**
 * Cria um membro da equipe MX: grava usuarios (nome, e-mail, papel, acesso) e,
 * quando o papel é consultor_mx, o perfil do consultor (perfil_consultor_mx).
 * A loja principal opcional vira um vínculo ativo em `vinculos_loja` — a
 * mesma tabela que ranking, dashboard, check-in e RLS leem (ver comentário
 * em userEdit.ts sobre por que não é `vinculos_equipe_loja`, tabela morta).
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
    const { error: linkError } = await supabase.from('vinculos_loja').insert({
      user_id: id,
      store_id: draft.store_id,
      // Membro interno MX não é vendedor nem dono da loja; entra como gerente,
      // que é o papel de acesso operacional em `vinculos_loja`.
      role: 'gerente',
      is_active: true,
    })
    if (linkError) return { error: linkError.message }
  }

  return { error: null, id }
}
