/** URLs canônicas do editor Admin do Plano Estratégico (prompts Base44 #05/#09). */

export type AdminStrategicPlanNavInput = {
  clientId: string
  clientSlug?: string | null
  cycleId?: string | null
  year?: number | null
  storeId?: string | null
}

export function buildAdminStrategicPlanHref(input: AdminStrategicPlanNavInput): string {
  const params = new URLSearchParams()
  params.set('clientId', input.clientId)
  if (input.cycleId) params.set('cycleId', input.cycleId)
  if (input.year != null) params.set('year', String(input.year))
  // storeId só como contexto; o editor resolve pelo cycleId/clientId.
  if (input.storeId) params.set('storeId', input.storeId)
  if (input.clientSlug) {
    return `/clientes/${encodeURIComponent(input.clientSlug)}/plano-estrategico?${params.toString()}`
  }
  return `/plano-estrategico?${params.toString()}`
}

/**
 * Ciclo que o Admin abre ao clicar em “Abrir Plano Estratégico”.
 * Com revisão em paralelo, edita o rascunho; senão o ciclo do card (publicado ou vigente).
 */
export function resolveAdminEditableCycleId(summary: {
  cycle?: { id: string } | null
  draftCycle?: { id: string } | null
  revisionInProgress?: boolean
} | null | undefined): string | null {
  if (!summary) return null
  if (summary.revisionInProgress && summary.draftCycle?.id) return summary.draftCycle.id
  return summary.cycle?.id ?? null
}

/** Handler único de navegação (prompt #09) — mesmos params em todos os atalhos. */
export function openCurrentStrategicPlanHref(input: AdminStrategicPlanNavInput): string {
  return buildAdminStrategicPlanHref(input)
}
