// Hook que carrega e move o ciclo do plano estratégico de um cliente/ano.
//
// O ciclo é por cliente, não por loja: se a loja selecionada for uma filial, a
// matriz é resolvida primeiro. Se a loja não tiver cliente vinculado, o hook
// fica ocioso (não é erro — a tela continua funcionando como sempre).
//
// A prontidão local usa todas as unidades ativas expostas por useClientScope.
// A RPC continua sendo a autoridade final para validar e publicar.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchClientOfStore, fetchClientProductPackage } from './clientPlanningRepository'
import { diffRosterAgainstPackage } from './clientProductPackage'
import {
  ensureCycle,
  fetchCurrentCycle,
  transitionCycle,
  validateCycleReadiness,
  type PlanCycle,
} from './planCycleRepository'
import {
  validatePlanReadiness,
  readinessSummary,
  type PlanReadiness,
} from './planCycle'
import { resolveUnitPolicy, type UnitPolicy } from './unitPolicy'
import type { StrategicSeries } from './strategicPlan.types'
import type { PlanningValueRow } from './clientPlanningConsolidation'

export type PlanCycleState = {
  cycle: PlanCycle | null
  readiness: PlanReadiness | null
  /** Texto curto para o banner — derivado de `readinessSummary`. */
  summary: string | null
  /**
   * Plano medido contra o roster do produto contratado. `null` quando o pacote
   * não pôde ser resolvido ou o plano ainda não carregou.
   */
  packageAlignment: { missing: string[]; extra: string[]; aligned: boolean; disjoint: boolean } | null
  loading: boolean
  readinessLoading: boolean
  transitioning: boolean
  error: string | null
  /**
   * `null` quando não há cliente vinculado à loja — ocultar o banner neste caso.
   */
  clientId: string | null
  canManageCycle: boolean
  /** Inicia o ciclo se ainda não existe (idempotente). */
  initCycle: () => Promise<void>
  /** Move para `em_validacao`. Só disponível se `canManageCycle`. */
  submitForValidation: () => Promise<void>
  /** Publica o ciclo. Só disponível se `canManageCycle` e `readiness.canPublish`. */
  publishCycle: () => Promise<void>
  reload: () => void
}

/**
 * Constrói `metaByUnit` no formato de `validatePlanReadiness` a partir das
 * `series` do repositório estratégico (v1: storeId como única unidade).
 */
function buildMetaByUnit(
  series: StrategicSeries[],
  unitId: string,
  policies: Record<string, UnitPolicy>,
): Record<string, Record<string, Record<number, number | null>>> {
  const result: Record<string, Record<string, Record<number, number | null>>> = {}
  for (const s of series) {
    const byMonth: Record<number, number | null> = {}
    for (let m = 1; m <= 12; m++) {
      const val = s.targetValues[m - 1]
      byMonth[m] = val ?? null
    }
    const isCompanyScoped = policies[s.code]?.unit_entry_mode === 'COMPANY_ONLY'
      || policies[s.code]?.unit_entry_mode === 'SHARED_COMPANY_VALUE'
    result[s.code] = { [isCompanyScoped ? '__empresa__' : unitId]: byMonth }
  }
  return result
}

function buildMetaByUnitFromRows(
  rows: PlanningValueRow[],
  indicatorCodes: string[],
  unitIds: string[],
  policies: Record<string, UnitPolicy>,
): Record<string, Record<string, Record<number, number | null>>> {
  const result: Record<string, Record<string, Record<number, number | null>>> = {}
  for (const code of indicatorCodes) {
    result[code] = {}
    const isCompanyScoped = policies[code]?.unit_entry_mode === 'COMPANY_ONLY'
      || policies[code]?.unit_entry_mode === 'SHARED_COMPANY_VALUE'
    const scopes = isCompanyScoped ? ['__empresa__'] : unitIds
    for (const scopeId of scopes) {
      result[code][scopeId] = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index + 1, null]))
    }
  }
  for (const row of rows) {
    if (!row.month || !result[row.indicator_code]?.[row.loja_id]) continue
    const isCompanyScoped = policies[row.indicator_code]?.unit_entry_mode === 'COMPANY_ONLY'
      || policies[row.indicator_code]?.unit_entry_mode === 'SHARED_COMPANY_VALUE'
    const scopeId = isCompanyScoped ? '__empresa__' : row.loja_id
    if (isCompanyScoped && row.loja_id !== unitIds[0]) continue
    if (!result[row.indicator_code]?.[scopeId]) continue
    result[row.indicator_code][scopeId][row.month] = row.meta ?? null
  }
  return result
}

/**
 * Resolve policies do catálogo de defaults para um conjunto de códigos.
 * Não requer dados externos — basta o UNIT_POLICY_DEFAULTS embutido.
 */
function buildPolicies(codes: string[]): Record<string, UnitPolicy> {
  const result: Record<string, UnitPolicy> = {}
  for (const code of codes) {
    result[code] = resolveUnitPolicy(code)
  }
  return result
}

/**
 * @param storeId        Loja selecionada na tela (pode ser filial).
 * @param year           Ano do planejamento.
 * @param userId         Usuário autenticado — gravado em `published_by`.
 * @param canManageCycle Mapeado de `capabilities.canEditTargets`.
 * @param series         Séries já carregadas pelo repositório estratégico.
 */
export function usePlanCycle(input: {
  storeId: string | null
  year: number
  userId: string | null
  canManageCycle: boolean
  series: StrategicSeries[]
  activeUnitIds?: string[]
  planningRows?: PlanningValueRow[]
}): PlanCycleState {
  const { storeId, year, userId, canManageCycle, series, activeUnitIds = [], planningRows = [] } = input

  const [clientId, setClientId] = useState<string | null>(null)
  const [packageVersionId, setPackageVersionId] = useState<string | null>(null)
  /** Roster do produto contratado. `null` enquanto não resolvido ou se bloqueado. */
  const [packageIndicatorCodes, setPackageIndicatorCodes] = useState<string[] | null>(null)
  const [cycle, setCycle] = useState<PlanCycle | null>(null)
  const [serverReadiness, setServerReadiness] = useState<PlanReadiness | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken(t => t + 1), [])

  // ─── Carrega cliente + ciclo ───────────────────────────────────────────────
  useEffect(() => {
    setClientId(null)
    setCycle(null)
    setPackageVersionId(null)
    setPackageIndicatorCodes(null)
    setServerReadiness(null)
    setReadinessLoading(false)
    if (!storeId) {
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    void (async () => {
      const clientResult = await fetchClientOfStore(storeId)
      if (!active) return

      if (clientResult.error || !clientResult.clientId) {
        // Loja sem cliente vinculado: hook fica ocioso, sem erro de tela.
        setClientId(null)
        setCycle(null)
        setLoading(false)
        return
      }

      const cid = clientResult.clientId
      setClientId(cid)

      // Versão do pacote para congelar no ciclo quando ele for criado, e o
      // roster contratado, que é contra quem a prontidão precisa ser medida.
      const pkg = await fetchClientProductPackage(cid)
      if (!active) return
      if (!pkg.ok && pkg.reason === 'ERRO_ACESSO_DADOS') setError(pkg.message)
      setPackageVersionId(pkg.ok ? pkg.resolution.packageVersion.id : null)
      setPackageIndicatorCodes(pkg.ok ? pkg.resolution.indicatorCodes : null)

      // Ciclo vigente (não revisado) do cliente/ano.
      const cycleResult = await fetchCurrentCycle(cid, year)
      if (!active) return
      if (cycleResult.error) {
        setError(cycleResult.error)
      } else {
        setCycle(cycleResult.cycle)
      }
      setLoading(false)
    })()

    return () => { active = false }
  }, [storeId, year, reloadToken])

  // ─── Prontidão — recalculada sempre que series mudam ──────────────────────
  const localReadiness = useMemo<PlanReadiness | null>(() => {
    if (!storeId) return null
    const indicatorCodes = packageIndicatorCodes?.length
      ? packageIndicatorCodes
      : series.map(s => String(s.metricCode || s.code))
    if (indicatorCodes.length === 0) return null
    const policies = buildPolicies(indicatorCodes)
    const unitIds = activeUnitIds.length > 0 ? activeUnitIds : [storeId]
    const metaByUnit = planningRows.length > 0
      ? buildMetaByUnitFromRows(planningRows, indicatorCodes, unitIds, policies)
      : buildMetaByUnit(series, storeId, policies)
    return validatePlanReadiness({
      indicatorCodes,
      activeUnitIds: unitIds,
      policies,
      metaByUnit,
    })
  }, [activeUnitIds, packageIndicatorCodes, planningRows, series, storeId])

  useEffect(() => {
    if (!cycle || !canManageCycle) {
      setServerReadiness(null)
      setReadinessLoading(false)
      return
    }
    let active = true
    setServerReadiness(null)
    setReadinessLoading(true)
    void (async () => {
      const result = await validateCycleReadiness(cycle.id)
      if (!active) return
      if (result.error) setError(result.error)
      else setServerReadiness(result.readiness)
      setReadinessLoading(false)
    })()
    return () => { active = false }
  }, [cycle?.id, cycle?.status, canManageCycle, reloadToken])

  const readiness = cycle && canManageCycle ? serverReadiness : localReadiness

  const summary = readiness ? readinessSummary(readiness) : null

  /**
   * O plano confere com o produto contratado?
   *
   * A prontidão acima mede o que a tela carregou; esta medida compara com o
   * pacote do contrato. Sem ela um plano a que faltam indicadores do pacote —
   * ou que ficou para trás quando o pacote mudou de versão — se declara pronto.
   */
  const packageAlignment = useMemo(() => {
    if (!packageIndicatorCodes || series.length === 0) return null
    // O pacote guarda `metric_key`, que corresponde a `metricCode` — não a
    // `code`. A série carrega os dois, e comparar pelo campo errado acusaria
    // divergência total em todo plano. Mesma regra de `canonicalIndicatorCode`.
    const planCodes = series.map(s => String(s.metricCode || s.code))
    return diffRosterAgainstPackage(planCodes, packageIndicatorCodes)
  }, [packageIndicatorCodes, series])

  // ─── Ações ────────────────────────────────────────────────────────────────
  const initCycle = useCallback(async () => {
    if (!clientId) return
    setTransitioning(true)
    setError(null)
    const result = await ensureCycle({ clientId, year, packageVersionId, userId })
    if (result.error) setError(result.error)
    else setCycle(result.cycle)
    setTransitioning(false)
  }, [clientId, year, packageVersionId, userId])

  const submitForValidation = useCallback(async () => {
    if (!cycle || !canManageCycle) return
    setTransitioning(true)
    setError(null)
    const result = await transitionCycle({ cycle, to: 'em_validacao', userId })
    if (result.error) setError(result.error)
    else setCycle(result.cycle)
    setTransitioning(false)
  }, [cycle, canManageCycle, userId])

  const publishCycle = useCallback(async () => {
    if (!cycle || !canManageCycle) return
    if (readinessLoading) {
      setError('A validação do plano ainda está em andamento. Aguarde e tente novamente.')
      return
    }
    if (!readiness?.canPublish) {
      setError('Há pendências que impedem a publicação. Verifique a lista de pendências.')
      return
    }
    setTransitioning(true)
    setError(null)
    const result = await transitionCycle({ cycle, to: 'publicado', userId })
    if (result.error) setError(result.error)
    else setCycle(result.cycle)
    setTransitioning(false)
  }, [cycle, canManageCycle, readiness, readinessLoading, userId])

  return {
    cycle,
    readiness,
    summary,
    packageAlignment,
    loading,
    readinessLoading,
    transitioning,
    error,
    clientId,
    canManageCycle,
    initCycle,
    submitForValidation,
    publishCycle,
    reload,
  }
}
