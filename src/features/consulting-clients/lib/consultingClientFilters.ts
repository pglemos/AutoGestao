import type { ConsultingClient } from '@/lib/schemas/consulting-client.schema'

function normalize(value: unknown): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function filterConsultingClients(clients: ConsultingClient[], search: string): ConsultingClient[] {
  const term = normalize(search)
  if (!term) return clients
  return clients.filter(client => [client.name, client.legal_name, client.product_name, client.cnpj].some(value => normalize(value).includes(term)))
}
