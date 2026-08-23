/**
 * Fonte única do card Plano Estratégico (Visão Geral / Validar e Ativar / painel).
 * Conta distinct indicadores da versão EXIBIDA — não células mês×unidade.
 *
 * displayVersion = última publicada ao Dono (published_at), mesmo que exista
 * rascunho de revisão. Status do card acompanha essa versão, não o rascunho.
 */

import {
  fetchClientProductPackage,
  fetchClientUnits,
  fetchCyclePlanningValues,
  fetchUnitsPlanningValues,
} from './clientPlanningRepository'
import {
  buildPublicationCardFromRows,
  type PublicationCardSummary,
} from './planCycle'
import {
  fetchCurrentCycle,
  fetchLatestPublishedCycle,
  type PlanCycle,
} from './planCycleRepository'

export type ClientStrategicPlanPublicationSummary = {
  card: PublicationCardSummary
  /** Ciclo usado nas contagens do card (versão exibida). */
  cycle: PlanCycle
  /** Ciclo vigente de edição (pode ser rascunho de revisão). */
  draftCycle: PlanCycle | null
  revisionInProgress: boolean
  rosterCodes: string[]
  rowsLen: number
  rowsWithMeta: number
  source: 'published_cycle' | 'current_cycle' | 'legacy_units'
}

export async function getClientStrategicPlanPublicationSummary(input: {
  clientAccountId: string
  referenceYear: number
}): Promise<{
  summary: ClientStrategicPlanPublicationSummary | null
  error: string | null
}> {
  const [currentResult, publishedResult] = await Promise.all([
    fetchCurrentCycle(input.clientAccountId, input.referenceYear),
    fetchLatestPublishedCycle(input.clientAccountId, input.referenceYear),
  ])
  if (currentResult.error) return { summary: null, error: currentResult.error }
  if (publishedResult.error) return { summary: null, error: publishedResult.error }

  const draftCycle = currentResult.cycle
  const publishedCycle = publishedResult.cycle

  // Prioridade: snapshot publicado ao Dono > ciclo vigente.
  const displayCycle = publishedCycle ?? draftCycle
  if (!displayCycle) return { summary: null, error: null }

  const revisionInProgress = Boolean(
    publishedCycle
    && draftCycle
    && draftCycle.id !== publishedCycle.id
    && (draftCycle.status === 'rascunho' || draftCycle.status === 'em_validacao'),
  )

  const packageResult = await fetchClientProductPackage(input.clientAccountId)
  const rosterCodes = packageResult.ok ? packageResult.resolution.indicatorCodes : []

  let rows = (await fetchCyclePlanningValues(displayCycle.id)).rows
  let source: ClientStrategicPlanPublicationSummary['source'] = publishedCycle
    ? 'published_cycle'
    : 'current_cycle'

  // Legado: metas sem ciclo_id (antes da migração). Só se o ciclo exibido estiver vazio.
  if (rows.length === 0) {
    const unitsResult = await fetchClientUnits(input.clientAccountId)
    const unitIds = unitsResult.units.filter(unit => unit.active).map(unit => unit.id)
    const legacy = await fetchUnitsPlanningValues(unitIds, input.referenceYear)
    if (!legacy.error && legacy.rows.length > 0) {
      rows = legacy.rows
      source = 'legacy_units'
    }
  }

  // Card: se há versão publicada, status exibido é Publicado mesmo com rascunho paralelo.
  const cardStatus = publishedCycle ? 'publicado' as const : displayCycle.status
  const card = buildPublicationCardFromRows({
    cycleStatus: cardStatus,
    rosterCodes,
    rows,
  })

  const rowsWithMeta = rows.filter(
    row => row.meta != null && Number.isFinite(Number(row.meta)),
  ).length

  return {
    summary: {
      card,
      cycle: displayCycle,
      draftCycle: revisionInProgress ? draftCycle : null,
      revisionInProgress,
      rosterCodes,
      rowsLen: rows.length,
      rowsWithMeta,
      source,
    },
    error: null,
  }
}
