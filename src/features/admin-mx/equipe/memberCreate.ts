/**
 * Regras puras de criação de membro da equipe MX — port do Base44
 * `ConsultantCreateModal` (relatório v1.2: "Adicionar Membro"). Sem importar o
 * Supabase, testável sem banco.
 */

/** Papéis internos MX criáveis pela página /equipe (usuarios.role). */
export const MEMBER_ROLE_OPTIONS = [
  { value: 'administrador_geral', label: 'Administrador Geral' },
  { value: 'administrador_mx', label: 'Administrador MX' },
  { value: 'consultor_mx', label: 'Consultor MX' },
] as const

export type MemberRole = (typeof MEMBER_ROLE_OPTIONS)[number]['value']

/** Situações do perfil do consultor (perfil_consultor_mx.situacao). */
export const MEMBER_SITUATION_OPTIONS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'afastado', label: 'Afastado' },
  { value: 'ferias', label: 'Férias' },
  { value: 'inativo', label: 'Inativo' },
] as const

export type MemberSituation = (typeof MEMBER_SITUATION_OPTIONS)[number]['value']

export type MemberCreateDraft = {
  name: string
  email: string
  phone: string
  role: MemberRole
  store_id: string
  situation: MemberSituation
}

export function emptyMemberCreate(): MemberCreateDraft {
  return {
    name: '',
    email: '',
    phone: '',
    role: 'consultor_mx',
    store_id: '',
    situation: 'ativo',
  }
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

/** Consultores MX ganham perfil (perfil_consultor_mx); admins só usuarios. */
export function requiresConsultantProfile(role: MemberRole): boolean {
  return role === 'consultor_mx'
}
