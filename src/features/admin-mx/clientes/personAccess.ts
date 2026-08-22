export const PERSON_PROFILES = [
  { value: 'DONO', label: 'Dono', description: 'Governança principal da conta' },
  { value: 'DIRETOR', label: 'Diretor / Sócio', description: 'Acesso estratégico e gerencial' },
  { value: 'GERENTE_COMERCIAL', label: 'Gerente', description: 'Gestão comercial e equipes' },
  { value: 'VENDEDOR', label: 'Vendedor', description: 'Vendas e atendimento' },
  { value: 'MARKETING', label: 'Marketing', description: 'Campanhas e comunicação' },
  { value: 'PRODUTO_ESTOQUE', label: 'Produto e Estoque', description: 'Gestão de estoque' },
  { value: 'FINANCEIRO_ADMINISTRATIVO', label: 'Financeiro / Administrativo', description: 'Finanças e administração' },
  { value: 'RH', label: 'RH', description: 'Gestão de pessoas' },
  { value: 'OPERACOES', label: 'Operações', description: 'Operações e processos' },
] as const

export type PersonProfile = (typeof PERSON_PROFILES)[number]['value']

export const PERSON_DEFAULT_VIEWS = ['DONO', 'GERENCIAL', 'VENDEDOR', 'DEPARTAMENTAL'] as const
export type PersonDefaultView = (typeof PERSON_DEFAULT_VIEWS)[number]

export const PERSON_STATUSES = ['em_preparacao', 'ativo', 'inativo'] as const
export type PersonStatus = (typeof PERSON_STATUSES)[number]

export const PERSON_STATUS_LABELS: Record<PersonStatus, string> = {
  em_preparacao: 'Em preparação',
  ativo: 'Ativo',
  inativo: 'Inativo',
}

export type PersonAccessDraft = {
  nome: string
  email: string
  telefone: string
  funcao_declarada: string
  papeis: PersonProfile[]
  lojas_autorizadas: string[]
  is_dono_master: boolean
  visao_padrao: PersonDefaultView | ''
}

export function personToAccessDraft(person: {
  nome: string
  email: string
  telefone: string | null
  funcao_declarada: string | null
  papeis: unknown
  lojas_autorizadas?: unknown
  is_dono_master: boolean
  visao_padrao?: string | null
}): PersonAccessDraft {
  const papeis = (Array.isArray(person.papeis) ? person.papeis : []).filter(
    (role): role is PersonProfile => PERSON_PROFILES.some(item => item.value === role),
  )
  const visao = person.visao_padrao && PERSON_DEFAULT_VIEWS.includes(person.visao_padrao as PersonDefaultView)
    ? person.visao_padrao as PersonDefaultView
    : ''
  return {
    nome: person.nome,
    email: person.email,
    telefone: person.telefone ?? '',
    funcao_declarada: person.funcao_declarada ?? '',
    papeis,
    lojas_autorizadas: Array.isArray(person.lojas_autorizadas) ? person.lojas_autorizadas as string[] : [],
    is_dono_master: person.is_dono_master,
    visao_padrao: visao,
  }
}

export function emptyPersonAccessDraft(): PersonAccessDraft {
  return {
    nome: '',
    email: '',
    telefone: '',
    funcao_declarada: '',
    papeis: [],
    lojas_autorizadas: [],
    is_dono_master: false,
    visao_padrao: '',
  }
}

/** Erros bloqueantes do cadastro de pessoa. Lista vazia = pode salvar. */
export function validatePersonAccessDraft(draft: PersonAccessDraft): string[] {
  const errors: string[] = []
  if (!draft.nome.trim()) errors.push('Informe o nome.')
  if (!draft.email.trim()) errors.push('Informe o e-mail.')
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) errors.push('E-mail inválido.')
  if (draft.papeis.length === 0) errors.push('Selecione ao menos um perfil de acesso.')
  if (draft.is_dono_master && !draft.papeis.includes('DONO')) errors.push('Dono Master exige o perfil Dono.')
  if (draft.visao_padrao && !PERSON_DEFAULT_VIEWS.includes(draft.visao_padrao)) errors.push('Visão padrão inválida.')
  return errors
}

export type OwnerMasterResolution = {
  status: 'NOT_CONFIGURED' | 'VALID' | 'DUPLICATE_MASTER' | 'INACTIVE' | 'OWNER_WITHOUT_MASTER'
  person?: {
    id: string
    nome: string
    email: string
    telefone: string | null
    funcao_declarada: string | null
    status: PersonStatus
    papeis: string[]
  }
  count: number
}

/**
 * Resolve o Dono Master da conta (Base44 resolveClientOwnerMaster): deve
 * existir, estar ativo, ter perfil Dono e ser único.
 */
export function resolveOwnerMaster(
  persons: Array<{
    id: string
    nome: string
    email: string
    telefone: string | null
    funcao_declarada: string | null
    is_dono_master: boolean
    status: string
    papeis: unknown
  }>,
): OwnerMasterResolution {
  const masters = persons.filter(person => person.is_dono_master)
  if (masters.length === 0) {
    const donos = persons.filter(person => {
      const papeis = Array.isArray(person.papeis) ? (person.papeis as string[]) : []
      return papeis.includes('DONO')
    })
    if (donos.length > 0) return { status: 'OWNER_WITHOUT_MASTER', count: donos.length }
    return { status: 'NOT_CONFIGURED', count: 0 }
  }
  if (masters.length > 1) return { status: 'DUPLICATE_MASTER', count: masters.length }

  const person = masters[0]
  const papeis = Array.isArray(person.papeis) ? (person.papeis as string[]) : []
  const ativo = person.status === 'ativo' || person.status === 'em_preparacao'
  const temDono = papeis.includes('DONO')

  if (!ativo || !temDono) {
    return {
      status: 'INACTIVE',
      count: 1,
      person: {
        id: person.id,
        nome: person.nome,
        email: person.email,
        telefone: person.telefone,
        funcao_declarada: person.funcao_declarada,
        status: person.status as PersonStatus,
        papeis,
      },
    }
  }

  return {
    status: 'VALID',
    count: 1,
    person: {
      id: person.id,
      nome: person.nome,
      email: person.email,
      telefone: person.telefone,
      funcao_declarada: person.funcao_declarada,
      status: person.status as PersonStatus,
      papeis,
    },
  }
}
