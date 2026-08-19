/**
 * Regras puras da edição de usuário da equipe MX — port do Base44
 * (UserEditModal + tabs) sem importar o Supabase, testável sem banco.
 */

export const TEAM_PAPEL_OPTIONS = [
  { value: 'consultor_mx', label: 'Consultor MX' },
  { value: 'consultor_especialista', label: 'Consultor Especialista' },
  { value: 'coordenador_consultoria', label: 'Coordenador de Consultoria' },
  { value: 'administrador_mx', label: 'Administrador MX' },
] as const

export const VIEW_OPTIONS = [
  { value: 'DONO', label: 'Dono', requiresRole: ['DONO_MASTER', 'DONO_SOCIO'] },
  { value: 'GERENCIAL', label: 'Gerencial', requiresRole: ['DONO_MASTER', 'DONO_SOCIO', 'DIRETOR', 'GERENTE_COMERCIAL'] },
  { value: 'VENDEDOR', label: 'Vendedor', requiresRole: ['VENDEDOR', 'GERENTE_COMERCIAL', 'DONO_MASTER', 'DONO_SOCIO'] },
  { value: 'DEPARTAMENTAL', label: 'Departamental', requiresRole: ['MARKETING', 'PRODUTO_ESTOQUE', 'FINANCEIRO_ADMINISTRATIVO', 'RH', 'OPERACOES', 'DIRETOR'] },
] as const

/**
 * Papéis que um vínculo de loja pode ter, no vocabulário de `vinculos_loja.role`
 * — o mesmo que ranking, dashboard, check-in e RLS leem.
 *
 * Antes esta lista trazia os tipos de atribuição do Base44
 * (RESPONSAVEL_PRINCIPAL, CORRESPONSAVEL, ACESSO_ADICIONAL, …), gravados em
 * `vinculos_equipe_loja`. Nenhuma outra parte do sistema consulta essa tabela e
 * ela está vazia, então toda atribuição feita por aqui era invisível.
 */
export const ASSIGNMENT_TYPES = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'dono', label: 'Dono' },
] as const

export const USER_STATUS_OPTIONS = [
  { value: 'EM_PREPARACAO', label: 'Em preparação' },
  { value: 'CONVITE_PENDENTE', label: 'Convite pendente' },
  { value: 'CONVIDADO', label: 'Convidado' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'FERIAS', label: 'Férias' },
  { value: 'AFASTADO', label: 'Afastado' },
  { value: 'SUSPENSO', label: 'Suspenso' },
  { value: 'DESATIVADO', label: 'Desativado' },
] as const

export const USER_STATUS_LABELS = Object.fromEntries(USER_STATUS_OPTIONS.map(s => [s.value, s.label])) as Record<
  (typeof USER_STATUS_OPTIONS)[number]['value'], string
>

export const DECLARED_FUNCTIONS = [
  'Consultor de Vendas',
  'Gerente de Vendas',
  'Gerente Geral',
  'Diretor',
  'Sócio',
] as const

export type UserPersonalDraft = {
  full_name: string
  preferred_name: string
  birth_date: string
  email: string
  phone: string
  declared_function: string
  entry_date: string
  photo: string
  notes: string
  relationship_consent: boolean
}

export function emptyUserPersonal(): UserPersonalDraft {
  return {
    full_name: '',
    preferred_name: '',
    birth_date: '',
    email: '',
    phone: '',
    declared_function: '',
    entry_date: '',
    photo: '',
    notes: '',
    relationship_consent: false,
  }
}

/**
 * Erros bloqueantes dos dados pessoais — espelha os campos obrigatórios do Base44.
 *
 * A data de nascimento é obrigatória para quem entra agora, mas não pode ser
 * cobrada de quem já está cadastrado sem ela: os 489 usuários da base vieram de
 * importação sem esse campo, e exigi-lo na edição desabilitava o botão de salvar
 * para todos eles — nenhum usuário era editável. Só bloqueia, então, quando o
 * cadastro já tinha data e o formulário a apagou.
 */
export function validateUserPersonal(
  draft: UserPersonalDraft,
  options: { birthDateAlreadyOnRecord?: boolean } = {},
): string[] {
  const errors: string[] = []
  if (!draft.full_name.trim()) errors.push('Nome completo é obrigatório.')
  if (!draft.email.trim()) errors.push('E-mail é obrigatório.')
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) errors.push('E-mail inválido.')
  if (!draft.birth_date && options.birthDateAlreadyOnRecord) {
    errors.push('Data de nascimento é obrigatória.')
  }
  return errors
}

export type RoleGrantDraft = {
  id?: string
  role: string
  is_primary: boolean
  valid_from: string
  valid_until: string
  status: 'ATIVO' | 'ENCERRADO' | 'INATIVO'
  change_reason: string
}

export const ROLE_GRANT_ROLES = [
  'DONO_MASTER',
  'DONO_SOCIO',
  'DIRETOR',
  'GERENTE_COMERCIAL',
  'VENDEDOR',
  'MARKETING',
  'PRODUTO_ESTOQUE',
  'FINANCEIRO_ADMINISTRATIVO',
  'RH',
  'OPERACOES',
] as const

/** Avisos/erros ao adicionar um papel — verifica duplicidade e Dono Master mínimo. */
export function validateRoleGrantAdd(grant: RoleGrantDraft, activeGrants: RoleGrantDraft[]): string[] {
  const errors: string[] = []
  if (!grant.role) errors.push('Selecione um papel.')
  if (activeGrants.some(g => g.role === grant.role && g.status === 'ATIVO')) errors.push('Este papel já está atribuído.')
  if (grant.valid_until && grant.valid_from && grant.valid_until < grant.valid_from) errors.push('A vigência final não pode ser anterior à inicial.')
  return errors
}

/** Impede remoção do último Dono Master ativo da empresa. */
export function canRemoveRoleGrant(grantToRemove: RoleGrantDraft, activeGrants: RoleGrantDraft[]): string | null {
  if (grantToRemove.role !== 'DONO_MASTER') return null
  const activeOwners = activeGrants.filter(g => g.role === 'DONO_MASTER' && g.status === 'ATIVO')
  if (activeOwners.length <= 1) {
    return 'Esta empresa precisa possuir pelo menos um Dono Master ativo. Atribua outro usuário antes de remover este papel.'
  }
  return null
}

/** Visões compatíveis com os papéis ativos. */
export function compatibleViews(activeRoles: string[]): Array<{ value: string; label: string; requiresRole: readonly string[] }> {
  return VIEW_OPTIONS.filter(view => view.requiresRole.some(role => activeRoles.includes(role)))
}

export type StoreAssignmentDraft = {
  id?: string
  store_id: string
  store_name: string
  assignment_type: string
  is_primary: boolean
  valid_from: string
  valid_until: string
  status: 'ATIVO' | 'ENCERRADO' | 'INATIVO'
}

/** Vendedor deve possuir apenas uma loja operacional principal ativa por vez. */
export function validateStoreAssignmentAdd(
  assignment: StoreAssignmentDraft,
  activeAssignments: StoreAssignmentDraft[],
  isVendedor: boolean,
): string[] {
  const errors: string[] = []
  if (!assignment.store_id) errors.push('Selecione uma loja.')
  if (isVendedor && activeAssignments.length >= 1) {
    errors.push('Vendedor deve possuir apenas uma Loja operacional principal ativa por vez. Use o fluxo de Transferência para trocar de Loja.')
  }
  if (assignment.valid_until && assignment.valid_from && assignment.valid_until < assignment.valid_from) {
    errors.push('A vigência final não pode ser anterior à inicial.')
  }
  return errors
}

/** Impede remoção do último gerente de uma loja. */
export function canRemoveStoreAssignment(
  assignmentToRemove: StoreAssignmentDraft,
  activeAssignments: StoreAssignmentDraft[],
  storeName: string,
): string | null {
  if (assignmentToRemove.assignment_type !== 'gerente') return null
  const managersOfStore = activeAssignments.filter(a => a.store_id === assignmentToRemove.store_id && a.assignment_type === 'gerente')
  if (managersOfStore.length <= 1) return `A Loja ${storeName} não pode ficar sem responsável gerencial.`
  return null
}

/** Define o vínculo principal, limpando o anterior. */
export function planPrimaryAssignment(activeAssignments: StoreAssignmentDraft[], targetId: string) {
  return activeAssignments.map(a => ({ ...a, is_primary: a.id === targetId }))
}

export type ManagerDelegationDraft = {
  id?: string
  store_id: string
  store_name: string
  access_level: string
  valid_from: string
  valid_until: string
  reason: string
  authorized_by: string
  status: 'ATIVO' | 'ENCERRADO' | 'INATIVO'
}

export function validateDelegation(draft: ManagerDelegationDraft): string[] {
  const errors: string[] = []
  if (!draft.store_id) errors.push('Loja é obrigatória.')
  if (!draft.valid_until) errors.push('Data final é obrigatória.')
  if (draft.valid_until && draft.valid_from && draft.valid_until < draft.valid_from) {
    errors.push('A vigência final não pode ser anterior à inicial.')
  }
  if (!draft.authorized_by.trim()) errors.push('Autorizador é obrigatório.')
  return errors
}

/** Uma delegação é ativa quando o status está ativo e a vigência cobre hoje. */
export function isDelegationActive(draft: Pick<ManagerDelegationDraft, 'status' | 'valid_until' | 'valid_from'>, today = todayIso()): boolean {
  if (draft.status !== 'ATIVO') return false
  if (!draft.valid_until) return false
  if (draft.valid_until < today) return false
  if (draft.valid_from && draft.valid_from > today) return false
  return true
}

export type UserAccessDraft = {
  status: string
  activated_at: string
}

export function emptyUserAccess(): UserAccessDraft {
  return { status: 'ATIVO', activated_at: '' }
}

/** Plano de encerramento de acessos ao desativar o usuário. */
export function planDeactivation(currentStatus: string) {
  return {
    suspend: currentStatus === 'ATIVO',
    closeRoleGrants: true,
    closeStoreAssignments: true,
  }
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}
