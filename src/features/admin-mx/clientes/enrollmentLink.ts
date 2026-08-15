export const ENROLLMENT_PROFILES = [
  { value: 'DONO_SOCIO', label: 'Dono / Sócio' },
  { value: 'DIRETOR', label: 'Diretor' },
  { value: 'GERENTE', label: 'Gerente' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'PRODUTO_ESTOQUE', label: 'Produto e Estoque' },
  { value: 'PESSOAS_RH', label: 'Pessoas - RH' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'OPERACOES', label: 'Operações' },
] as const

export type EnrollmentProfile = (typeof ENROLLMENT_PROFILES)[number]['value']

export const ENROLLMENT_LINK_STATUSES = ['ativo', 'expirado', 'limite_atingido', 'cancelado'] as const
export type EnrollmentLinkStatus = (typeof ENROLLMENT_LINK_STATUSES)[number]

export type EnrollmentLinkDraft = {
  perfil_acesso: EnrollmentProfile
  nome_interno: string
  validade_dias: number
  limite_usos: number
}

export function emptyEnrollmentLinkDraft(): EnrollmentLinkDraft {
  return { perfil_acesso: 'VENDEDOR', nome_interno: '', validade_dias: 7, limite_usos: 10 }
}

/** Erro bloqueante do link, ou null. */
export function validateEnrollmentLinkDraft(draft: EnrollmentLinkDraft): string | null {
  if (!ENROLLMENT_PROFILES.some(profile => profile.value === draft.perfil_acesso)) {
    return 'Selecione o perfil de acesso do link.'
  }
  if (!Number.isInteger(draft.validade_dias) || draft.validade_dias < 1 || draft.validade_dias > 30) {
    return 'Validade deve ficar entre 1 e 30 dias.'
  }
  if (!Number.isInteger(draft.limite_usos) || draft.limite_usos < 1 || draft.limite_usos > 100) {
    return 'Limite de usos deve ficar entre 1 e 100.'
  }
  return null
}

/** Token curto e legível (Base44 usa substring(2,12) de random base36). */
export function generateEnrollmentToken(): string {
  return Math.random().toString(36).substring(2, 12)
}

/** URL pública de autocadastro do cliente. */
export function buildEnrollmentUrl(origin: string, clientSlug: string, token: string): string {
  const base = origin.replace(/\/+$/, '')
  const profileSlug = 'cadastro'
  return `${base}/${profileSlug}/${encodeURIComponent(clientSlug)}/${token}`
}

/**
 * Estado do link considerando validade e limite de usos. `createdAt` e
 * `usedCount` vêm do banco; o restante é decisão pura para exibição.
 */
export function resolveEnrollmentLinkStatus(input: {
  createdAt: string
  validadeDias: number
  limiteUsos: number
  usosConsumidos: number
  status: EnrollmentLinkStatus
  now?: Date
}): EnrollmentLinkStatus {
  if (input.status === 'cancelado') return 'cancelado'
  const now = input.now ?? new Date()
  const expiresAt = new Date(new Date(input.createdAt).getTime() + input.validadeDias * 24 * 60 * 60 * 1000)
  if (now > expiresAt) return 'expirado'
  if (input.usosConsumidos >= input.limiteUsos) return 'limite_atingido'
  return 'ativo'
}

/** Restam N usos enquanto o link estiver válido. */
export function enrollmentLinkRemainingUses(input: {
  validadeDias: number
  limiteUsos: number
  usosConsumidos: number
  createdAt: string
  now?: Date
}): number {
  if (resolveEnrollmentLinkStatus(input) !== 'ativo') return 0
  return Math.max(0, input.limiteUsos - input.usosConsumidos)
}
