// Escopo de leitura das metas: uma unidade ou o consolidado do cliente.
//
// A tela de metas sempre trabalhou com uma loja por vez. Quando a loja
// selecionada pertence a um cliente com mais de uma unidade, passa a existir um
// segundo escopo possível — o consolidado —, e é ele que responde "qual a meta
// do cliente".

import { useCallback, useEffect, useMemo, useState } from 'react'
import { activeUnits, hasMultipleUnits, type ClientUnit } from './clientUnits'
import {
  consolidateClientPlanning,
  resolvePolicies,
  type ConsolidatedClientPlanning,
  type PlanningValueRow,
} from './clientPlanningConsolidation'
import { fetchClientOfStore, fetchClientUnits, fetchUnitsPlanningValues } from './clientPlanningRepository'
import type { ConsolidationIndicator } from './unitConsolidation'

export const CONSOLIDATED_SCOPE = 'CONSOLIDADO' as const

export type PlanningScope = typeof CONSOLIDATED_SCOPE | string

export type ClientScopeState = {
  clientId: string | null
  units: ClientUnit[]
  /** Valores mensais de todas as unidades ativas; usado pela prontidão do ciclo. */
  values: PlanningValueRow[]
  /** Só há consolidado a oferecer quando o cliente tem mais de uma unidade ativa. */
  supportsConsolidated: boolean
  consolidated: ConsolidatedClientPlanning | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Carrega as unidades do cliente dono da loja selecionada e, quando há mais de
 * uma, o consolidado do ano.
 */
export function useClientScope(
  storeId: string | null,
  year: number,
  indicators: ConsolidationIndicator[],
): ClientScopeState {
  const [clientId, setClientId] = useState<string | null>(null)
  const [units, setUnits] = useState<ClientUnit[]>([])
  const [rows, setRows] = useState<PlanningValueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken(token => token + 1), [])

  useEffect(() => {
    if (!storeId) {
      setClientId(null)
      setUnits([])
      setRows([])
      setError(null)
      return
    }

    let active = true
    setLoading(true)

    void (async () => {
      const client = await fetchClientOfStore(storeId)
      if (!active) return
      if (client.error || !client.clientId) {
        // Loja sem cliente vinculado continua funcionando como sempre: uma loja,
        // sem consolidado. Não é erro de tela.
        setClientId(null)
        setUnits([])
        setRows([])
        setError(client.error)
        setLoading(false)
        return
      }

      setClientId(client.clientId)
      const unitsResult = await fetchClientUnits(client.clientId)
      if (!active) return
      if (unitsResult.error) {
        setUnits([])
        setRows([])
        setError(unitsResult.error)
        setLoading(false)
        return
      }

      const ids = activeUnits(unitsResult.units).map(unit => unit.id)
      const valuesResult = ids.length > 1
        ? await fetchUnitsPlanningValues(ids, year)
        : { rows: [] as PlanningValueRow[], error: null }
      if (!active) return

      setUnits(unitsResult.units)
      setRows(valuesResult.rows)
      setError(valuesResult.error)
      setLoading(false)
    })()

    return () => { active = false }
  }, [storeId, year, reloadToken])

  const supportsConsolidated = hasMultipleUnits(units)

  const consolidated = useMemo(() => {
    if (!supportsConsolidated || indicators.length === 0) return null
    return consolidateClientPlanning({
      rows,
      units,
      indicators,
      policies: resolvePolicies(indicators),
    })
  }, [supportsConsolidated, rows, units, indicators])

  return { clientId, units, values: rows, supportsConsolidated, consolidated, loading, error, reload }
}
