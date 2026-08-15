import { supabase } from '@/lib/supabase'

export const CONSULTANT_ROLES = ['consultor_mx', 'consultor_especialista', 'coordenador_consultoria', 'administrador_mx'] as const
export const CONSULTANT_SITUATIONS = ['ativo', 'afastado', 'ferias', 'inativo'] as const

export type ConsultantRole = (typeof CONSULTANT_ROLES)[number]
export type ConsultantSituation = (typeof CONSULTANT_SITUATIONS)[number]

export const SITUATION_LABEL: Record<ConsultantSituation, string> = {
  ativo: 'Ativo',
  afastado: 'Afastado',
  ferias: 'Férias',
  inativo: 'Inativo',
}

export const ROLE_LABEL: Record<ConsultantRole, string> = {
  consultor_mx: 'Consultor MX',
  consultor_especialista: 'Consultor Especialista',
  coordenador_consultoria: 'Coordenador de Consultoria',
  administrador_mx: 'Administrador MX',
}

export type ConsultantProfile = {
  user_id: string
  papel_interno: ConsultantRole
  situacao: ConsultantSituation
  cidade: string
  capacidade_online: number | null
  capacidade_presencial: number | null
  observacoes: string
}

export type ConsultantClient = { client_id: string; name: string; assignment_role: string | null }

export type ProductQualification = {
  program_key: string
  name: string
  total_visits: number
  enabled: boolean
  /** Encontros marcados; vazio = conduz o produto inteiro. */
  encounters: number[]
}

export function emptyConsultantProfile(userId: string): ConsultantProfile {
  return { user_id: userId, papel_interno: 'consultor_mx', situacao: 'ativo', cidade: '', capacidade_online: null, capacidade_presencial: null, observacoes: '' }
}

/** Erro bloqueante do perfil, ou null. */
export function validateConsultantProfile(profile: ConsultantProfile): string | null {
  if (!CONSULTANT_ROLES.includes(profile.papel_interno)) return 'Selecione um papel interno válido.'
  if (!CONSULTANT_SITUATIONS.includes(profile.situacao)) return 'Selecione uma situação válida.'
  if (profile.capacidade_online !== null && profile.capacidade_online < 0) return 'Capacidade online não pode ser negativa.'
  if (profile.capacidade_presencial !== null && profile.capacidade_presencial < 0) return 'Capacidade presencial não pode ser negativa.'
  return null
}

/** Um consultor só entra na escala quando está ativo e habilitado no produto. */
export function canBeScheduled(profile: Pick<ConsultantProfile, 'situacao'>, qualification: Pick<ProductQualification, 'enabled'>) {
  return profile.situacao === 'ativo' && qualification.enabled
}

/** Encontros que o consultor conduz num produto: vazio = todos. */
export function resolveEncounterScope(qualification: ProductQualification): number[] {
  if (!qualification.enabled) return []
  if (!qualification.encounters.length) return Array.from({ length: qualification.total_visits }, (_, index) => index + 1)
  return [...qualification.encounters].sort((a, b) => a - b)
}

export function summarizeCapacity(profile: ConsultantProfile) {
  const online = profile.capacidade_online ?? 0
  const presencial = profile.capacidade_presencial ?? 0
  return { online, presencial, total: online + presencial }
}

export async function fetchConsultantProfile(userId: string): Promise<ConsultantProfile> {
  const { data } = await supabase
    .from('perfil_consultor_mx')
    .select('user_id, papel_interno, situacao, cidade, capacidade_online, capacidade_presencial, observacoes')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return emptyConsultantProfile(userId)
  return {
    user_id: data.user_id,
    papel_interno: data.papel_interno as ConsultantRole,
    situacao: data.situacao as ConsultantSituation,
    cidade: data.cidade ?? '',
    capacidade_online: data.capacidade_online,
    capacidade_presencial: data.capacidade_presencial,
    observacoes: data.observacoes ?? '',
  }
}

export async function saveConsultantProfile(profile: ConsultantProfile): Promise<{ error: string | null }> {
  const invalid = validateConsultantProfile(profile)
  if (invalid) return { error: invalid }
  const { error } = await supabase.from('perfil_consultor_mx').upsert({
    user_id: profile.user_id,
    papel_interno: profile.papel_interno,
    situacao: profile.situacao,
    cidade: profile.cidade.trim() || null,
    capacidade_online: profile.capacidade_online,
    capacidade_presencial: profile.capacidade_presencial,
    observacoes: profile.observacoes.trim() || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  return { error: error?.message ?? null }
}

export async function fetchConsultantClients(userId: string): Promise<ConsultantClient[]> {
  const { data: assignments } = await supabase
    .from('atribuicoes_consultoria')
    .select('client_id, assignment_role')
    .eq('user_id', userId)
    .eq('active', true)
  const ids = (assignments ?? []).map(item => item.client_id).filter((id): id is string => Boolean(id))
  if (!ids.length) return []
  const { data: clients } = await supabase.from('clientes_consultoria').select('id, name').in('id', ids)
  const names = new Map((clients ?? []).map(client => [client.id, client.name]))
  return (assignments ?? [])
    .filter(item => item.client_id)
    .map(item => ({ client_id: item.client_id as string, name: names.get(item.client_id as string) ?? 'Cliente removido', assignment_role: item.assignment_role }))
}

export async function fetchConsultantQualifications(userId: string): Promise<ProductQualification[]> {
  const [{ data: products }, { data: enabled }, { data: encounters }] = await Promise.all([
    supabase.from('programas_visita_consultoria').select('program_key, name, total_visits, status').neq('status', 'arquivado').order('name', { ascending: true }),
    supabase.from('qualificacoes_produto_consultor').select('program_key').eq('user_id', userId),
    supabase.from('qualificacoes_encontro_consultor').select('program_key, visit_number').eq('user_id', userId),
  ])
  const enabledKeys = new Set((enabled ?? []).map(item => item.program_key))
  const byProduct = new Map<string, number[]>()
  for (const item of encounters ?? []) {
    byProduct.set(item.program_key, [...(byProduct.get(item.program_key) ?? []), item.visit_number])
  }
  return (products ?? []).map(product => ({
    program_key: product.program_key,
    name: product.name ?? product.program_key,
    total_visits: product.total_visits ?? 0,
    enabled: enabledKeys.has(product.program_key),
    encounters: byProduct.get(product.program_key) ?? [],
  }))
}

/** Substitui as qualificações do consultor pelo estado atual da tela. */
export async function saveConsultantQualifications(userId: string, qualifications: ProductQualification[]): Promise<{ error: string | null }> {
  const enabled = qualifications.filter(item => item.enabled)

  const { error: clearProducts } = await supabase.from('qualificacoes_produto_consultor').delete().eq('user_id', userId)
  if (clearProducts) return { error: clearProducts.message }
  const { error: clearEncounters } = await supabase.from('qualificacoes_encontro_consultor').delete().eq('user_id', userId)
  if (clearEncounters) return { error: clearEncounters.message }

  if (enabled.length) {
    const { error } = await supabase
      .from('qualificacoes_produto_consultor')
      .insert(enabled.map(item => ({ user_id: userId, program_key: item.program_key })))
    if (error) return { error: error.message }
  }

  const encounters = enabled.flatMap(item => item.encounters.map(visit => ({ user_id: userId, program_key: item.program_key, visit_number: visit })))
  if (encounters.length) {
    const { error } = await supabase.from('qualificacoes_encontro_consultor').insert(encounters)
    if (error) return { error: error.message }
  }

  return { error: null }
}
