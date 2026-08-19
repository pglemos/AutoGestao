// View model do Plano Estratégico para o Dono.
//
// Constrói a visão oficial de metas, realizados e ano anterior para o Dono:
//   - Lê o ciclo vigente (publicado) do cliente no ano.
//   - Se não houver ciclo publicado, devolve estrutura vazia sem inventar metas.
//   - Resolve o roster de indicadores pelo pacote do produto contratado.
//   - Aplica a consolidação multiunidade ou filtra por loja quando scopeType === 'STORE'.
//   - Usa as regras de atingimento, variação e acumulado de `planPerformance.ts`.

import { fetchCurrentCycle, type PlanCycle } from './planCycleRepository'
import {
  fetchClientProductPackage,
  fetchClientUnits,
  fetchUnitsPlanningValues,
} from './clientPlanningRepository'
import {
  consolidateClientPlanning,
  resolvePolicies,
} from './clientPlanningConsolidation'
import type { ConsolidationIndicator } from './unitConsolidation'
import type { ClientUnit } from './clientUnits'

export type OwnerStrategicPlanScope = 'ALL_STORES' | 'STORE'

export type OwnerStrategicPlanViewModelInput = {
  clientId: string
  year: number
  scopeType?: OwnerStrategicPlanScope
  storeId?: string | null
}

export type OwnerStrategicPlanViewModel = {
  publishedCycle: PlanCycle | null
  currentCycle: PlanCycle | null
  clientId: string
  year: number
  scopeType: OwnerStrategicPlanScope
  storeId: string | null
  units: ClientUnit[]
  indicatorCodes: string[]
  indicators: ConsolidationIndicator[]
  metaValueMap: Record<string, Record<number, number | null>>
  actualValueMap: Record<string, Record<number, number | null>>
  previousYearValueMap: Record<string, Record<number, number | null>>
}

/**
 * Monta o ViewModel do plano estratégico do Dono.
 */
export async function getOwnerStrategicPlanViewModel(
  input: OwnerStrategicPlanViewModelInput,
): Promise<OwnerStrategicPlanViewModel> {
  const { clientId, year, scopeType = 'ALL_STORES', storeId = null } = input

  const emptyResult = (currentCycle: PlanCycle | null = null, units: ClientUnit[] = []): OwnerStrategicPlanViewModel => ({
    publishedCycle: null,
    currentCycle,
    clientId,
    year,
    scopeType,
    storeId,
    units,
    indicatorCodes: [],
    indicators: [],
    metaValueMap: {},
    actualValueMap: {},
    previousYearValueMap: {},
  })

  // 1. Ciclo vigente
  const { cycle: currentCycle, error: cycleErr } = await fetchCurrentCycle(clientId, year)
  if (cycleErr || !currentCycle) {
    return emptyResult(null)
  }

  // 2. Unidades do cliente
  const { units, error: unitsErr } = await fetchClientUnits(clientId)
  if (unitsErr || units.length === 0) {
    return emptyResult(currentCycle, [])
  }

  // 3. Se não está publicado, não é meta oficial para o Dono
  if (currentCycle.status !== 'publicado') {
    return emptyResult(currentCycle, units)
  }

  // 4. Pacote de produto contratado → Roster de indicadores
  const packageRes = await fetchClientProductPackage(clientId)
  if (!packageRes.ok) {
    return emptyResult(currentCycle, units)
  }

  const indicatorCodes = packageRes.resolution.indicatorCodes
  const indicators: ConsolidationIndicator[] = packageRes.resolution.items.map(item => ({
    code: item.metric_key,
    name: item.label_snapshot ?? item.metric_key,
    department: item.area_snapshot ?? 'comercial',
    formula_expression: null,
  }))

  // 5. Determina quais lojas carregar conforme escopo
  const activeUnits = units.filter(u => u.active)
  const targetUnits = scopeType === 'STORE' && storeId
    ? activeUnits.filter(u => u.id === storeId)
    : activeUnits

  const targetUnitIds = targetUnits.map(u => u.id)
  if (targetUnitIds.length === 0) {
    return emptyResult(currentCycle, units)
  }

  // 6. Busca valores
  const { rows, error: valuesErr } = await fetchUnitsPlanningValues(targetUnitIds, year)
  if (valuesErr) {
    return emptyResult(currentCycle, units)
  }

  // 7. Consolida valores
  const policies = resolvePolicies(indicators)
  const consolidated = consolidateClientPlanning({
    rows,
    units: targetUnits,
    indicators,
    policies,
  })

  return {
    publishedCycle: currentCycle,
    currentCycle,
    clientId,
    year,
    scopeType,
    storeId,
    units,
    indicatorCodes,
    indicators,
    metaValueMap: consolidated.meta.valueMap,
    actualValueMap: consolidated.realizado.valueMap,
    previousYearValueMap: consolidated.ano_anterior.valueMap,
  }
}
