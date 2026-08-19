import { supabase } from '@/lib/supabase'
import { todayIso, type ManagerDelegationDraft, type RoleGrantDraft, type StoreAssignmentDraft, type UserPersonalDraft } from './userEdit'

export type TeamUserDetail = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  active: boolean | null
  role: string | null
  preferred_name: string | null
  birth_date: string | null
  declared_function: string | null
  entry_date: string | null
  notes: string | null
  relationship_consent: boolean
  default_view: string | null
  perfil: {
    papel_interno: string | null
    situacao: string | null
    cidade: string | null
  } | null
  roleGrants: RoleGrantDraft[]
  storeAssignments: StoreAssignmentDraft[]
  delegations: ManagerDelegationDraft[]
}

const ROLE_GRANT_TO_MX: Record<string, string> = {
  DONO_MASTER: 'master',
  DONO_SOCIO: 'master',
  DIRETOR: 'director',
  GERENTE_COMERCIAL: 'sales_manager',
  VENDEDOR: 'seller',
  MARKETING: 'marketing',
  PRODUTO_ESTOQUE: 'product',
  FINANCEIRO_ADMINISTRATIVO: 'finance',
  RH: 'hr',
  OPERACOES: 'operations',
}

/** Resolve o id do papel canônico MX a partir do código de papel Base44. */
export async function resolveRoleIdForGrant(role: string): Promise<string | null> {
  const code = ROLE_GRANT_TO_MX[role] ?? role
  const { data } = await supabase.from('roles').select('id').eq('code', code).maybeSingle()
  return data?.id ?? null
}

export async function fetchTeamUserDetail(userId: string): Promise<TeamUserDetail> {
  const [userRes, profileRes, grantsRes, storesRes, delegRes, rolesRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, name, email, phone, avatar_url, active, role, preferred_name, birth_date, declared_function, entry_date, notes, relationship_consent, default_view')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('perfil_consultor_mx').select('papel_interno, situacao, cidade').eq('user_id', userId).maybeSingle(),
    supabase.from('user_roles').select('id, role_id, is_primary, status, valid_from, valid_until, change_reason').eq('user_id', userId),
    supabase
      .from('vinculos_loja')
      .select('id, store_id, role, is_active, created_at, ended_at, lojas(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase.from('delegacoes_gerenciais').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('roles').select('id, code'),
  ])
  if (userRes.error) throw new Error(userRes.error.message)
  if (!userRes.data) throw new Error('Usuário não encontrado.')

  const user = userRes.data

  const roleCodeToId = new Map((rolesRes.data ?? []).map(r => [r.code, r.id]))
  const idToCode = new Map((rolesRes.data ?? []).map(r => [r.id, r.code]))
  const mxToBase44 = Object.fromEntries(Object.entries(ROLE_GRANT_TO_MX).map(([base44, mx]) => [mx, base44]))

  const roleGrants = (grantsRes.data ?? []).map(g => {
    const mxCode = idToCode.get(g.role_id)
    return {
      id: g.id,
      role: mxCode ? (mxToBase44[mxCode] ?? mxCode) : '',
      is_primary: g.is_primary,
      valid_from: g.valid_from ?? '',
      valid_until: g.valid_until ?? '',
      status: (g.status === 'ativo' ? 'ATIVO' : g.status === 'encerrado' ? 'ENCERRADO' : 'INATIVO') as RoleGrantDraft['status'],
      change_reason: g.change_reason ?? '',
    }
  })

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    active: user.active,
    role: user.role,
    preferred_name: user.preferred_name,
    birth_date: user.birth_date,
    declared_function: user.declared_function,
    entry_date: user.entry_date,
    notes: user.notes,
    relationship_consent: user.relationship_consent,
    default_view: user.default_view,
    perfil: profileRes.data
      ? { papel_interno: profileRes.data.papel_interno, situacao: profileRes.data.situacao, cidade: profileRes.data.cidade }
      : null,
    roleGrants,
    // `vinculos_loja` não guarda loja principal nem vigência inicial. O vínculo
    // ativo mais antigo responde como principal, e a data de criação serve de
    // início — é o que o dado real permite afirmar.
    storeAssignments: (storesRes.data ?? []).map((s, index, all) => ({
      id: s.id,
      store_id: s.store_id,
      store_name: (s.lojas as { name?: string } | null)?.name ?? '',
      assignment_type: s.role,
      is_primary: s.is_active && all.findIndex(other => other.is_active) === index,
      valid_from: s.created_at ?? '',
      valid_until: s.ended_at ?? '',
      status: (s.is_active ? 'ATIVO' : 'ENCERRADO') as StoreAssignmentDraft['status'],
    })),
    delegations: (delegRes.data ?? []).map(d => ({
      id: d.id,
      store_id: d.loja_id,
      store_name: d.loja_nome,
      access_level: d.nivel_acesso,
      valid_from: d.valid_from ?? '',
      valid_until: d.valid_until,
      reason: d.motivo ?? '',
      authorized_by: d.autorizado_por ?? '',
      status: (d.status === 'ativo' ? 'ATIVO' : 'ENCERRADO') as ManagerDelegationDraft['status'],
    })),
  }
}

export async function saveUserPersonal(userId: string, draft: UserPersonalDraft): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('usuarios')
    .update({
      name: draft.full_name.trim(),
      preferred_name: draft.preferred_name.trim() || null,
      birth_date: draft.birth_date || null,
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone.trim() || null,
      avatar_url: draft.photo.trim() || null,
      declared_function: draft.declared_function || null,
      entry_date: draft.entry_date || null,
      notes: draft.notes.trim() || null,
      relationship_consent: draft.relationship_consent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export async function saveUserAccess(userId: string, status: string, activatedAt: string): Promise<{ error: string | null }> {
  const active = status !== 'DESATIVADO' && status !== 'SUSPENSO'
  const { error } = await supabase
    .from('usuarios')
    .update({
      active,
      deactivated_at: status === 'DESATIVADO' ? new Date().toISOString() : null,
      deactivation_reason: status === 'DESATIVADO' ? 'Desativado na edição de usuário.' : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  if (error) return { error: error.message }

  if (status === 'DESATIVADO') {
    const now = todayIso()
    const [{ error: rgError }, { error: saError }] = await Promise.all([
      supabase
        .from('user_roles')
        .update({ status: 'encerrado', valid_until: now, change_reason: 'Desativação de acesso.' })
        .eq('user_id', userId)
        .eq('status', 'ativo'),
      supabase
        .from('vinculos_loja')
        .update({ is_active: false, ended_at: now })
        .eq('user_id', userId)
        .eq('is_active', true),
    ])
    if (rgError) return { error: rgError.message }
    if (saError) return { error: saError.message }

    // Desativar acesso precisa encerrar também o vínculo de vendedor: é ele que
    // mantém a pessoa no ranking, no check-in e na contagem de equipe.
    const { error: sellerError } = await supabase
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: now })
      .eq('seller_user_id', userId)
      .eq('is_active', true)
    if (sellerError) return { error: sellerError.message }
  }

  return { error: null }
}

export async function saveDefaultView(userId: string, defaultView: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('usuarios')
    .update({ default_view: defaultView || null, updated_at: new Date().toISOString() })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export async function addRoleGrant(userId: string, grant: RoleGrantDraft): Promise<{ error: string | null }> {
  const roleId = await resolveRoleIdForGrant(grant.role)
  if (!roleId) return { error: 'Papel desconhecido no catálogo de roles.' }
  const { error } = await supabase.from('user_roles').insert({
    user_id: userId,
    role_id: roleId,
    is_primary: grant.is_primary,
    status: grant.status === 'ATIVO' ? 'ativo' : 'encerrado',
    valid_from: grant.valid_from || null,
    valid_until: grant.valid_until || null,
    change_reason: grant.change_reason.trim() || null,
    assigned_at: new Date().toISOString(),
    assigned_by: 'Administrador MX',
  })
  return { error: error?.message ?? null }
}

export async function setRoleGrantPrimary(userId: string, grantId: string): Promise<{ error: string | null }> {
  const [{ error: clearError }, { error: setError }] = await Promise.all([
    supabase.from('user_roles').update({ is_primary: false }).eq('user_id', userId).eq('is_primary', true),
    supabase.from('user_roles').update({ is_primary: true }).eq('id', grantId),
  ])
  if (clearError) return { error: clearError.message }
  if (setError) return { error: setError.message }
  return { error: null }
}

export async function removeRoleGrant(grantId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_roles')
    .update({ status: 'encerrado', valid_until: todayIso() })
    .eq('id', grantId)
  return { error: error?.message ?? null }
}

/**
 * Vincula a pessoa à loja em `vinculos_loja`, a tabela que o resto do sistema lê.
 *
 * Um vendedor precisa também de linha em `vendedores_loja`: é dela que saem
 * ranking, check-in e a contagem de equipe da carteira. Sem as duas, a pessoa
 * aparece vinculada aqui e some de todo o resto.
 */
export async function addStoreAssignment(userId: string, assignment: StoreAssignmentDraft): Promise<{ error: string | null }> {
  const role = assignment.assignment_type.toLowerCase()
  const { error } = await supabase.from('vinculos_loja').insert({
    user_id: userId,
    store_id: assignment.store_id,
    role,
    is_active: true,
  })
  if (error) return { error: error.message }

  if (role === 'vendedor') {
    const { error: sellerError } = await supabase.from('vendedores_loja').insert({
      seller_user_id: userId,
      store_id: assignment.store_id,
      is_active: true,
      started_at: assignment.valid_from || todayIso(),
    })
    if (sellerError) return { error: sellerError.message }
  }
  return { error: null }
}

export async function removeStoreAssignment(assignmentId: string): Promise<{ error: string | null }> {
  const ended = todayIso()
  const { data, error } = await supabase
    .from('vinculos_loja')
    .update({ is_active: false, ended_at: ended })
    .eq('id', assignmentId)
    .select('user_id, store_id, role')
    .maybeSingle()
  if (error) return { error: error.message }

  if (data?.role === 'vendedor') {
    const { error: sellerError } = await supabase
      .from('vendedores_loja')
      .update({ is_active: false, ended_at: ended })
      .eq('seller_user_id', data.user_id)
      .eq('store_id', data.store_id)
      .eq('is_active', true)
    if (sellerError) return { error: sellerError.message }
  }
  return { error: null }
}

export async function createDelegation(userId: string, draft: ManagerDelegationDraft): Promise<{ error: string | null }> {
  const { error } = await supabase.from('delegacoes_gerenciais').insert({
    user_id: userId,
    loja_id: draft.store_id,
    loja_nome: draft.store_name,
    nivel_acesso: draft.access_level.trim(),
    valid_from: draft.valid_from || null,
    valid_until: draft.valid_until,
    motivo: draft.reason.trim() || null,
    autorizado_por: draft.authorized_by.trim() || 'Administrador MX',
    status: 'ativo',
  })
  return { error: error?.message ?? null }
}

export async function endDelegation(delegationId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('delegacoes_gerenciais')
    .update({ status: 'encerrado' })
    .eq('id', delegationId)
  return { error: error?.message ?? null }
}

export type AvailableStore = { id: string; name: string }

export async function fetchAvailableStores(): Promise<AvailableStore[]> {
  const { data, error } = await supabase.from('lojas').select('id, name').eq('active', true).order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as AvailableStore[]
}
