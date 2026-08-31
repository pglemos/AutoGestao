/**
 * Regras puras de criação de membro da equipe MX — port do Base44
 * `ConsultantCreateModal` (relatório v1.2: "Adicionar Membro"). Sem importar o
 * Supabase, testável sem banco.
 */

import { OFFICIAL_CONSULTING_PRODUCT_KEYS } from '../produtos/officialConsultingCatalog'

/** Papéis exibidos no Base44, mapeados para roles canônicas do app. */
export const MEMBER_ROLE_OPTIONS = [
  { value: 'consultor_mx', label: 'Consultor MX', authRole: 'consultor_mx', papelInterno: 'consultor_mx' },
  { value: 'consultor_especialista', label: 'Consultor Especialista', authRole: 'consultor_mx', papelInterno: 'consultor_especialista' },
  { value: 'coordenador_consultoria', label: 'Coordenador de Consultoria', authRole: 'consultor_mx', papelInterno: 'coordenador_consultoria' },
  { value: 'administrador_implantacao', label: 'Administrador de Implantação', authRole: 'administrador_mx', papelInterno: 'administrador_implantacao' },
  { value: 'administrador_principal', label: 'Administrador Principal', authRole: 'administrador_geral', papelInterno: null },
  { value: 'administrador_produto', label: 'Administrador de Produto', authRole: 'administrador_mx', papelInterno: 'administrador_produto' },
  { value: 'administrador_dados', label: 'Administrador de Dados', authRole: 'administrador_mx', papelInterno: 'administrador_dados' },
  { value: 'suporte_mx', label: 'Suporte MX', authRole: 'administrador_mx', papelInterno: 'suporte_mx' },
  { value: 'gestao_mx', label: 'Gestão MX', authRole: 'administrador_mx', papelInterno: 'gestao_mx' },
] as const

export type MemberRoleOption = (typeof MEMBER_ROLE_OPTIONS)[number]
export type MemberRole = MemberRoleOption['value']

/** Situações do perfil do consultor (perfil_consultor_mx.situacao). */
export const MEMBER_SITUATION_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'afastado', label: 'Afastado' },
  { value: 'ferias', label: 'Férias' },
  { value: 'inativo', label: 'Inativo' },
] as const

export type MemberSituation = (typeof MEMBER_SITUATION_OPTIONS)[number]['value']

export const MEMBER_PROGRAM_OPTIONS = OFFICIAL_CONSULTING_PRODUCT_KEYS.map(key => ({
  value: key,
  label: key === 'pmr_online' ? 'PMR Online'
    : key === 'pmr_hibrido' ? 'PMR Híbrido'
    : key === 'pmr_plus' ? 'PMR Plus'
    : 'PPA',
}))

export type MemberCreateDraft = {
  name: string
  email: string
  phone: string
  role: MemberRole
  store_id: string
  situation: MemberSituation
  enabled_programs: string[]
}

export function emptyMemberCreate(): MemberCreateDraft {
  return {
    name: '',
    email: '',
    phone: '',
    role: 'consultor_mx',
    store_id: '',
    situation: 'ativo',
    enabled_programs: [],
  }
}

export function resolveMemberRoleOption(role: MemberRole): MemberRoleOption {
  return MEMBER_ROLE_OPTIONS.find(option => option.value === role) ?? MEMBER_ROLE_OPTIONS[0]
}

/** Erros bloqueantes da criação — espelha os NOT NULL e CHECKs do banco. */
export function validateMemberCreate(draft: MemberCreateDraft): string[] {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Nome é obrigatório.')
  if (!draft.email.trim()) errors.push('E-mail é obrigatório.')
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) errors.push('E-mail inválido.')
  if (!MEMBER_ROLE_OPTIONS.some(option => option.value === draft.role)) errors.push('Selecione um papel interno MX válido.')
  if (!MEMBER_SITUATION_OPTIONS.some(option => option.value === draft.situation)) errors.push('Selecione uma situação válida.')
  return errors
}

/** Consultores e coordenadores ganham perfil (perfil_consultor_mx). */
export function requiresConsultantProfile(role: MemberRole): boolean {
  const option = resolveMemberRoleOption(role)
  return option.authRole === 'consultor_mx'
}
