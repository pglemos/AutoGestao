// Hook que carrega e move o ciclo do plano estratégico de um cliente/ano.
//
// O ciclo é por cliente, não por loja: se a loja selecionada for uma filial, a
// matriz é resolvida primeiro. Se a loja não tiver cliente vinculado, o hook
// fica ocioso (não é erro — a tela continua funcionando como sempre).
//
// Prontidão v1: usa o storeId como única unidade de cobertura, e as policies
// do catálogo de defaults (UNIT_POLICY_DEFAULTS). Cobertura suficiente para o
// estado atual de produção (uma loja por cliente, catálogo de 95 indicadores).
// Quando useClientScope expuser o consolidado completo, os inputs podem ser
// trocados sem mudar o banner.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchClientOfStore, fetchClientProductPackage } from './clientPlanningRepository'
import { diffRosterAgainstPackage } from './clientProductPackage'
import { ensureCycle, fetchCurrentCycle, transitionCycle, type PlanCycle } from './planCycleRepository'
import {
  validatePlanReadiness,
  readinessSummary,
  type PlanReadiness,
} from './planCycle'
import { resolveUnitPolicy, type UnitPolicy } from './unitPolicy'
import type { StrategicSeries } from './strategicPlan.types'

export type PlanCycleState = {
  cycle: PlanCycle | null
  readiness: PlanReadiness | null
  /** Texto curto para o banner — derivado de `readinessSummary`. */
  summary: string | null
  /**
   * Plano medido contra o roster do produto contratado. `null` quando o pacote
   * não pôde ser resolvido ou o plano ainda não carregou.
   */
  packageAlignment: { missing: string[]; extra: string[]; aligned: boolean } | null
  loading: boolean
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
): Record<string, Record<string, Record<number, number | null>>> {
  const result: Record<string, Record<string, Record<number, number | null>>> = {}
  for (const s of series) {
    const byMonth: Record<number, number | null> = {}
    for (let m = 1; m <= 12; m++) {
      const val = s.targetValues[m - 1]
      byMonth[m] = val ?? null
    }
    result[s.code] = { [unitId]: byMonth }
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
}): PlanCycleState {
  const { storeId, year, userId, canManageCycle, series } = input

  const [clientId, setClientId] = useState<string | null>(null)
  const [packageVersionId, setPackageVersionId] = useState<string | null>(null)
  /** Roster do produto contratado. `null` enquanto não resolvido ou se bloqueado. */
  const [packageIndicatorCodes, setPackageIndicatorCodes] = useState<string[] | null>(null)
  const [cycle, setCycle] = useState<PlanCycle | null>(null)
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken(t => t + 1), [])

  // ─── Carrega cliente + ciclo ───────────────────────────────────────────────
  useEffect(() => {
    if (!storeId) {
      setClientId(null)
      setCycle(null)
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
  const readiness = useMemo<PlanReadiness | null>(() => {
    if (!storeId || series.length === 0) return null
    const indicatorCodes = series.map(s => s.code)
    const policies = buildPolicies(indicatorCodes)
    const metaByUnit = buildMetaByUnit(series, storeId)
    return validatePlanReadiness({
      indicatorCodes,
      activeUnitIds: [storeId],
      policies,
      metaByUnit,
    })
  }, [storeId, series])

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
  }, [cycle, canManageCycle, readiness, userId])

  return {
    cycle,
    readiness,
    summary,
    packageAlignment,
    loading,
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
