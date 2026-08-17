export const INSCRICAO_STATUSES = ['aguardando', 'aprovado', 'devolvido', 'rejeitado', 'mesclado'] as const
export type InscricaoStatus = (typeof INSCRICAO_STATUSES)[number]

export const INSCRICAO_STATUS_LABELS: Record<InscricaoStatus, string> = {
  aguardando: 'Aguardando validação MX',
  aprovado: 'Aprovado',
  devolvido: 'Devolvido',
  rejeitado: 'Rejeitado',
  mesclado: 'Mesclado',
}

export type InscricaoRow = {
  id: string
  client_id: string
  link_id: string | null
  nome: string
  email: string
  telefone: string | null
  loja_id: string | null
  funcao_declarada: string | null
  data_nascimento: string | null
  status: string
  loja_aprovada_id: string | null
  papeis_aprovados: unknown
  visao_padrao: string | null
  equipe_aprovada: string | null
  motivo_devolucao: string | null
  motivo_rejeicao: string | null
  merged_into_id: string | null
  created_at: string
  updated_at: string
}

export type AprovacaoDraft = {
  loja_aprovada_id: string
  papeis_aprovados: string[]
  visao_padrao: string
  equipe_aprovada: string
}

export function emptyAprovacaoDraft(): AprovacaoDraft {
  return { loja_aprovada_id: '', papeis_aprovados: [], visao_padrao: '', equipe_aprovada: '' }
}

/** Erro bloqueante da aprovação, ou null. */
export function validateAprovacaoDraft(draft: AprovacaoDraft): string | null {
  if (!draft.loja_aprovada_id) return 'Selecione a loja de destino.'
  if (draft.papeis_aprovados.length === 0) return 'Atribua ao menos um papel.'
  return null
}

/** Papéis permitidos na aprovação (ClientRoles do base44, normalizados). */
export const APROVACAO_PAPEIS = [
  { value: 'DONO', label: 'Dono' },
  { value: 'DIRETOR', label: 'Diretor / Sócio' },
  { value: 'GERENTE_COMERCIAL', label: 'Gerente' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'PRODUTO_ESTOQUE', label: 'Produto e Estoque' },
  { value: 'FINANCEIRO_ADMINISTRATIVO', label: 'Financeiro / Administrativo' },
  { value: 'RH', label: 'RH' },
  { value: 'OPERACOES', label: 'Operações' },
] as const

export type AprovacaoPapel = (typeof APROVACAO_PAPEIS)[number]['value']

export const INSCRICAO_VISOES_PADRAO = ['DONO', 'GERENCIAL', 'VENDEDOR', 'DEPARTAMENTAL'] as const
export type InscricaoVisaoPadrao = (typeof INSCRICAO_VISOES_PADRAO)[number]

/** Pessoas já aprovadas para um e-mail (dedupe de duplicidade). */
export function existingApprovedByEmail(persons: Array<{ email: string }>, email: string) {
  const normalized = email.trim().toLowerCase()
  return persons.filter(person => person.email.trim().toLowerCase() === normalized)
}