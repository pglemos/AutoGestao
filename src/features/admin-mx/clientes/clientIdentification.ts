import { BLOCKED_CLIENT_NAMES, isValidCnpj, onlyDigits } from '../novo-cliente/newClientDraft'
import { BRAZILIAN_UFS, maskStoreCnpj } from './storeForm'

export const CLIENT_STRUCTURE_TYPES = ['LOJA_UNICA', 'GRUPO', 'REDE'] as const
export type ClientStructureType = (typeof CLIENT_STRUCTURE_TYPES)[number]

export const CLIENT_STRUCTURE_LABEL: Record<ClientStructureType, string> = {
  LOJA_UNICA: 'Loja Única',
  GRUPO: 'Grupo',
  REDE: 'Rede',
}

export const BRAZILIAN_UF_LABELS: Record<(typeof BRAZILIAN_UFS)[number], string> = {
  AC: 'AC — Acre',
  AL: 'AL — Alagoas',
  AP: 'AP — Amapá',
  AM: 'AM — Amazonas',
  BA: 'BA — Bahia',
  CE: 'CE — Ceará',
  DF: 'DF — Distrito Federal',
  ES: 'ES — Espírito Santo',
  GO: 'GO — Goiás',
  MA: 'MA — Maranhão',
  MT: 'MT — Mato Grosso',
  MS: 'MS — Mato Grosso do Sul',
  MG: 'MG — Minas Gerais',
  PA: 'PA — Pará',
  PB: 'PB — Paraíba',
  PR: 'PR — Paraná',
  PE: 'PE — Pernambuco',
  PI: 'PI — Piauí',
  RJ: 'RJ — Rio de Janeiro',
  RN: 'RN — Rio Grande do Norte',
  RS: 'RS — Rio Grande do Sul',
  RO: 'RO — Rondônia',
  RR: 'RR — Roraima',
  SC: 'SC — Santa Catarina',
  SP: 'SP — São Paulo',
  SE: 'SE — Sergipe',
  TO: 'TO — Tocantins',
}

export type ClientIdentificationDraft = {
  legalName: string
  cnpj: string
  shortName: string
  city: string
  state: string
  structureType: ClientStructureType | ''
  notes: string
  businessPhase: string
  contractEndDate: string
}

export const CLIENT_BUSINESS_PHASES = [
  { value: 'ESTRUTURACAO', label: 'Estruturação' },
  { value: 'CRESCIMENTO', label: 'Crescimento' },
  { value: 'CONSOLIDACAO', label: 'Consolidação' },
  { value: 'EXPANSAO', label: 'Expansão' },
  { value: 'RECUPERACAO', label: 'Recuperação' },
] as const

export function clientBusinessPhaseLabel(value: string | null | undefined) {
  const normalized = String(value ?? '').trim()
  if (!normalized) return 'Não configurada'
  return CLIENT_BUSINESS_PHASES.find(phase => phase.value === normalized)?.label ?? normalized
}

export function emptyClientIdentificationDraft(): ClientIdentificationDraft {
  return {
    legalName: '',
    cnpj: '',
    shortName: '',
    city: '',
    state: '',
    structureType: 'LOJA_UNICA',
    notes: '',
    businessPhase: '',
    contractEndDate: '',
  }
}

export function validateClientIdentificationDraft(
  draft: ClientIdentificationDraft,
  options: { requireAddress?: boolean } = {},
): string[] {
  const requireAddress = options.requireAddress !== false
  const errors: string[] = []
  if (!draft.legalName.trim()) errors.push('Informe a razão social.')
  if (!draft.cnpj.trim()) errors.push('Informe o CNPJ.')
  else if (!isValidCnpj(draft.cnpj)) errors.push('CNPJ inválido.')
  const shortName = (draft.shortName.trim() || draft.legalName.trim()).toUpperCase()
  if (BLOCKED_CLIENT_NAMES.includes(shortName)) errors.push('Não é possível cadastrar a própria MX como cliente.')
  const city = draft.city.trim()
  const state = draft.state.trim()
  if (requireAddress) {
    if (!city) errors.push('Informe a cidade.')
    if (!state) errors.push('Informe a UF.')
    else if (!(BRAZILIAN_UFS as readonly string[]).includes(state.toUpperCase())) errors.push('UF inválida.')
  } else if (city || state) {
    if (!city) errors.push('Informe a cidade.')
    if (!state) errors.push('Informe a UF.')
    else if (!(BRAZILIAN_UFS as readonly string[]).includes(state.toUpperCase())) errors.push('UF inválida.')
  }
  if (draft.structureType && !CLIENT_STRUCTURE_TYPES.includes(draft.structureType)) errors.push('Tipo de estrutura inválido.')
  if (draft.contractEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(draft.contractEndDate)) errors.push('Fim do contrato inválido.')
  if (draft.businessPhase && !CLIENT_BUSINESS_PHASES.some(phase => phase.value === draft.businessPhase)) errors.push('Fase empresarial inválida.')
  return errors
}

export function resolveClientShortName(draft: ClientIdentificationDraft): string {
  return draft.shortName.trim() || draft.legalName.trim()
}

export function identificationCnpjDigits(draft: ClientIdentificationDraft): string {
  return onlyDigits(draft.cnpj)
}

export function isClientStructureType(value: string | null | undefined): value is ClientStructureType {
  return Boolean(value && CLIENT_STRUCTURE_TYPES.includes(value as ClientStructureType))
}

export function clientStructureDisplay(value: string | null | undefined): string {
  return isClientStructureType(value) ? CLIENT_STRUCTURE_LABEL[value] : '—'
}

export function resolveIdentificationUnit<T extends {
  id: string
  is_primary: boolean
  store_type: string | null
  synthetic?: boolean
}>(units: T[]): T | null {
  const persistable = units.filter(unit => !unit.synthetic)
  return persistable.find(unit => unit.is_primary)
    ?? persistable.find(unit => unit.store_type === 'matriz')
    ?? persistable[0]
    ?? null
}

export function buildClientIdentificationDraft(input: {
  name: string
  legalName: string | null
  cnpj: string | null
  notes: string | null
  structureType: string | null
  city: string | null
  state: string | null
  businessPhase?: string | null
  contractEndDate?: string | null
}): ClientIdentificationDraft {
  return {
    legalName: input.legalName ?? '',
    cnpj: maskStoreCnpj(input.cnpj ?? ''),
    shortName: input.name ?? '',
    city: input.city ?? '',
    state: (input.state ?? '').toUpperCase(),
    structureType: isClientStructureType(input.structureType) ? input.structureType : 'LOJA_UNICA',
    notes: input.notes ?? '',
    businessPhase: input.businessPhase ?? '',
    contractEndDate: String(input.contractEndDate ?? '').slice(0, 10),
  }
}
