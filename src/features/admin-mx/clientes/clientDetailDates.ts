export type ClientDetailDateSource = {
  scheduled_activation_at?: string | null
  contract_start_date?: string | null
}

/**
 * Resolve a data exibida no detalhe sem assumir que o cliente já foi carregado.
 * A primeira renderização da página acontece com `client === null`.
 */
export function resolveClientPlannedStartDate(client: ClientDetailDateSource | null | undefined): string | null {
  return client?.scheduled_activation_at ?? client?.contract_start_date ?? null
}
