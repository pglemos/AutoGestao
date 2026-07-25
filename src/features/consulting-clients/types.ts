import type { ConsultingClient } from '@/lib/schemas/consulting-client.schema'

export type ConsultingClientDraft = {
  name: string
  legal_name: string
  cnpj: string
  product_name: string
  notes: string
  enabled_modules: string[]
}

export type ConsultingClientRow = ConsultingClient

export const EMPTY_CONSULTING_CLIENT_DRAFT: ConsultingClientDraft = {
  name: '',
  legal_name: '',
  cnpj: '',
  product_name: '',
  notes: '',
  enabled_modules: [],
}
