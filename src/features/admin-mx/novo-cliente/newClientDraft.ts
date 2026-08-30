export type NewClientUnit = {
  name: string
  city: string
  state: string
  is_primary: boolean
  /** Loja operacional canônica. Nulo significa "criar ao concluir". */
  store_id?: string | null
}
export type NewClientContact = { name: string; role: string; email: string; phone: string; is_primary: boolean }

export type NewClientDraft = {
  // 1 — Identificação
  name: string
  legal_name: string
  cnpj: string
  notes: string
  // 2 — Estrutura e lojas
  structure_type: 'LOJA_UNICA' | 'GRUPO' | 'REDE'
  /** Loja do sistema (tabela `lojas`) que representa o cliente na operação. */
  primary_store_id: string
  units: NewClientUnit[]
  business_phase: string
  // 3 — Produto e contrato
  product_name: string
  program_template_key: string
  modality: string
  contract_start_date: string
  contract_end_date: string
  // 4 — Jornada e consultores
  implementation_owner_id: string
  consultant_ids: string[]
  // 5 — Módulos
  enabled_modules: string[]
  // 6 — Pessoas e acessos
  contacts: NewClientContact[]
}

export const NEW_CLIENT_STEPS = [
  { id: 1, label: 'Identificação', short: 'ID' },
  { id: 2, label: 'Estrutura e Lojas', short: 'Lojas' },
  { id: 3, label: 'Produto e Contrato', short: 'Contrato' },
  { id: 4, label: 'Jornada e Consultores', short: 'Jornada' },
  { id: 5, label: 'Módulos', short: 'Módulos' },
  { id: 6, label: 'Pessoas e Acessos', short: 'Pessoas' },
  { id: 7, label: 'Revisão e Conclusão', short: 'Concluir' },
] as const

export const BLOCKED_CLIENT_NAMES = ['MX', 'MX PERFORMANCE', 'MX GESTAO PREDITIVA']

export function emptyNewClientDraft(): NewClientDraft {
  return {
    name: '',
    legal_name: '',
    cnpj: '',
    notes: '',
    structure_type: 'LOJA_UNICA',
    primary_store_id: '',
    units: [{ name: '', city: '', state: '', is_primary: true, store_id: null }],
    business_phase: '',
    product_name: '',
    program_template_key: '',
    modality: '',
    contract_start_date: '',
    contract_end_date: '',
    implementation_owner_id: '',
    consultant_ids: [],
    enabled_modules: [],
    contacts: [{ name: '', role: '', email: '', phone: '', is_primary: true }],
  }
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function clientAllowsBranches(structureType: NewClientDraft['structure_type']): boolean {
  return structureType === 'REDE' || structureType === 'GRUPO'
}

export function clientStructureLabel(structureType: string | null | undefined): string {
  if (structureType === 'REDE') return 'Rede'
  if (structureType === 'GRUPO') return 'Grupo'
  if (structureType === 'LOJA_UNICA') return 'Loja Única'
  return '—'
}

/** Validação de CNPJ com os dois dígitos verificadores. */
export function isValidCnpj(value: string) {
  const digits = onlyDigits(value)
  if (digits.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digits)) return false
  const calc = (slice: number) => {
    let weight = slice - 7
    let sum = 0
    for (let index = slice; index >= 1; index -= 1) {
      sum += Number(digits[slice - index]) * weight
      weight -= 1
      if (weight < 2) weight = 9
    }
    const result = sum % 11
    return result < 2 ? 0 : 11 - result
  }
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13])
}

/**
 * Erros bloqueantes de um passo do wizard. Lista vazia = passo liberado.
 */
export function validateNewClientStep(step: number, draft: NewClientDraft): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (!draft.name.trim()) errors.push('Informe o nome do cliente.')
    if (BLOCKED_CLIENT_NAMES.includes(draft.name.trim().toUpperCase())) errors.push('Não é possível cadastrar a própria MX como cliente.')
    if (draft.cnpj.trim() && !isValidCnpj(draft.cnpj)) errors.push('CNPJ inválido.')
  }
  if (step === 2) {
    const named = draft.units.filter(unit => unit.name.trim())
    if (!named.length) errors.push('Cadastre ao menos uma loja.')
    if (named.length && !draft.units.some(unit => unit.is_primary && unit.name.trim())) errors.push('Defina a loja principal.')
    if (draft.structure_type === 'LOJA_UNICA' && named.length > 1) errors.push('Estrutura "Loja única" aceita apenas uma loja.')
    const linkedStoreIds = named
      .map(unit => unit.store_id)
      .filter((storeId): storeId is string => Boolean(storeId))
    if (new Set(linkedStoreIds).size !== linkedStoreIds.length) errors.push('Cada unidade deve apontar para uma loja operacional diferente.')
  }
  if (step === 3) {
    if (!draft.product_name.trim()) errors.push('Selecione o produto contratado.')
    if (draft.contract_start_date && draft.contract_end_date && draft.contract_end_date < draft.contract_start_date) {
      errors.push('Fim do contrato anterior ao início.')
    }
  }
  if (step === 4) {
    if (!draft.implementation_owner_id) errors.push('Defina o responsável MX pela implantação.')
  }
  if (step === 6) {
    const primary = draft.contacts.find(contact => contact.is_primary)
    if (!primary?.name.trim()) errors.push('Informe o contato principal.')
    for (const contact of draft.contacts) {
      if (contact.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email.trim())) {
        errors.push(`E-mail inválido para ${contact.name.trim() || 'contato sem nome'}.`)
      }
    }
  }
  return errors
}

/** Passos que ainda têm pendência — usado no resumo do passo 7. */
export function pendingNewClientSteps(draft: NewClientDraft): number[] {
  return NEW_CLIENT_STEPS.map(step => step.id).filter(id => id !== 7 && validateNewClientStep(id, draft).length > 0)
}

export function newClientSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}
