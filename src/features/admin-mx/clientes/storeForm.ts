import { onlyDigits } from '../novo-cliente/newClientDraft'

export type StoreType = 'matriz' | 'filial'
export type StoreStatus = 'ativa' | 'inativa'

export type StoreDraft = {
  id: string | null
  name: string
  store_type: StoreType
  cnpj: string
  internal_code: string
  address_street: string
  address_city: string
  address_state: string
  address_zip: string
  timezone: string
  status: StoreStatus
  opening_date: string
  notes: string
}

export const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export function emptyStoreDraft(type: StoreType = 'filial'): StoreDraft {
  return {
    id: null,
    name: '',
    store_type: type,
    cnpj: '',
    internal_code: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    timezone: 'America/Sao_Paulo',
    status: 'ativa',
    opening_date: '',
    notes: '',
  }
}

/** Erros bloqueantes do cadastro de loja. Lista vazia = pode salvar. */
export function validateStoreDraft(draft: StoreDraft): string[] {
  const errors: string[] = []
  if (!draft.name.trim()) errors.push('Informe o nome da loja.')
  if (draft.cnpj.trim() && onlyDigits(draft.cnpj).length !== 14) errors.push('CNPJ da loja deve ter 14 dígitos.')
  if (draft.address_state && !BRAZILIAN_UFS.includes(draft.address_state.toUpperCase() as (typeof BRAZILIAN_UFS)[number])) {
    errors.push('UF inválida.')
  }
  return errors
}

/** Máscara de CNPJ para o campo de formulário. */
export function maskStoreCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return digits.replace(/^(\d{2})(\d)/, '$1.$2')
  if (digits.length <= 8) return digits.replace(/^(\d{2})(\d{3})(\d)/, '$1.$2.$3')
  if (digits.length <= 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4')
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}
