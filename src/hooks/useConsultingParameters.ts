import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  canManageInternalMxArea,
  getInternalMxAccessMode,
  getInternalMxReadOnlyMessage,
} from '@/design-system/internal-mx/internalMxAccessPolicy'
import {
  parseConsultingMetricCatalogArray,
  parseConsultingParameterValueArray,
  type ConsultingMetricCatalogItem,
  type ConsultingParameterValue,
} from '@/lib/schemas/consulting-client.schema'

type ActiveSet = {
  id: string
  name: string
  version: string
  active: boolean
  source_reference: string | null
}

export function useConsultingParameters() {
  const { role } = useAuth()
  const [catalog, setCatalog] = useState<ConsultingMetricCatalogItem[]>([])
  const [values, setValues] = useState<ConsultingParameterValue[]>([])
  const [activeSet, setActiveSet] = useState<ActiveSet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const accessMode = getInternalMxAccessMode('pmr-parameters', role)
  const canManage = canManageInternalMxArea('pmr-parameters', role)
  const readOnlyMessage = getInternalMxReadOnlyMessage('pmr-parameters')

  const fetchParameters = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [catalogRes, setRes] = await Promise.all([
      supabase.from('catalogo_metricas_consultoria').select('*').eq('active', true).order('sort_order', { ascending: true }),
      supabase.from('conjuntos_parametros_consultoria').select('*').eq('active', true).maybeSingle(),
    ])

    if (catalogRes.error || setRes.error) {
      setError(catalogRes.error?.message || setRes.error?.message || 'Erro ao carregar parâmetros.')
      setLoading(false)
      return
    }

    setCatalog(parseConsultingMetricCatalogArray(catalogRes.data || []))
    setActiveSet((setRes.data as ActiveSet) || null)

    if (setRes.data?.id) {
      const { data, error: valuesError } = await supabase
        .from('valores_parametros_consultoria')
        .select('*, metric:catalogo_metricas_consultoria(*)')
        .eq('parameter_set_id', setRes.data.id)

      if (valuesError) {
        setError(valuesError.message)
        setValues([])
      } else {
        setValues(parseConsultingParameterValueArray(data || []))
      }
    } else {
      setValues([])
    }
    setLoading(false)
  }, [])

  const updateParameterValue = useCallback(async (input: Partial<ConsultingParameterValue> & { metric_key: string }) => {
    if (!canManage) return { error: readOnlyMessage }
    if (!activeSet?.id) return { error: 'Nenhum conjunto de parâmetros PMR está ativo.' }

    const { error: upsertError } = await supabase
      .from('valores_parametros_consultoria')
      .upsert({
        parameter_set_id: activeSet.id,
        metric_key: input.metric_key,
        market_average: input.market_average ?? null,
        best_practice: input.best_practice ?? null,
        target_default: input.target_default ?? null,
        red_threshold: input.red_threshold ?? null,
        yellow_threshold: input.yellow_threshold ?? null,
        green_threshold: input.green_threshold ?? null,
        formula: input.formula || {},
        notes: input.notes || null,
      }, { onConflict: 'parameter_set_id,metric_key' })

    if (upsertError) return { error: upsertError.message }
    await fetchParameters()
    return { error: null }
  }, [activeSet?.id, canManage, fetchParameters, readOnlyMessage])

  useEffect(() => {
    void fetchParameters()
  }, [fetchParameters])

  const valueByMetric = useMemo(() => new Map(values.map((value) => [value.metric_key, value])), [values])

  return {
    catalog,
    values,
    valueByMetric,
    activeSet,
    loading,
    error,
    accessMode,
    canManage,
    readOnlyMessage,
    updateParameterValue,
    refetch: fetchParameters,
  }
}
