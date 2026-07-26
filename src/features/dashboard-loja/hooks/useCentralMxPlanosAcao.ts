import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { scopeToDb } from '../lib/scopeType'

/**
 * Hook do Blitz 48h Dia 2 — T1.
 *
 * Lê os planos de ação persistidos em `public.planos_acao` para uma loja
 * específica e expõe a ação `marcarConcluido(id)`. As leituras respeitam as
 * RLS criadas em `20260527150000_planos_acao_schema.sql`.
 */

export type CentralMxPlanoStatus =
  | 'pendente'
  | 'em_andamento'
  | 'atrasado'
  | 'concluido'
  | 'validando_eficacia'

export type CentralMxPlanoOrigin = 'alerta' | 'score' | 'consultor' | 'manual'

export type CentralMxPlanoPriority = 'critica' | 'alta' | 'media' | 'baixa'

export type CentralMxPlanoAcaoRow = {
  id: string
  codigo: string | null
  scope_type: 'loja' | 'departamento' | 'vendedor' | 'consultor'
  scope_id: string
  objetivo: string | null
  departamento: string
  indicador: string
  problema: string
  acao: string
  como: string | null
  responsavel_id: string | null
  prazo: string | null
  status: CentralMxPlanoStatus
  prioridade: CentralMxPlanoPriority
  origem: CentralMxPlanoOrigin
  origem_ref_id: string | null
  origem_ref_table: string | null
  eficacia_score: number | null
  eficacia_nota: string | null
  progresso: number
  iniciado_at: string | null
  created_at: string
  updated_at: string
  concluido_at: string | null
}

type Filters = {
  status?: CentralMxPlanoStatus[]
  origem?: CentralMxPlanoOrigin[]
  responsavelId?: string
  includeConcluidos?: boolean
}

export type UseCentralMxPlanosAcaoResult = {
  planos: CentralMxPlanoAcaoRow[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  marcarConcluido: (planoId: string, eficaciaNota?: string) => Promise<void>
  counts: Record<CentralMxPlanoStatus, number>
}

const EMPTY_COUNTS: Record<CentralMxPlanoStatus, number> = {
  pendente: 0,
  em_andamento: 0,
  atrasado: 0,
  concluido: 0,
  validando_eficacia: 0,
}

export function useCentralMxPlanosAcao(
  storeId: string | null | undefined,
  filters: Filters = {},
): UseCentralMxPlanosAcaoResult {
  const [planos, setPlanos] = useState<CentralMxPlanoAcaoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlanos = useCallback(async () => {
    if (!storeId) {
      setPlanos([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('planos_acao')
        .select(
          'id, codigo, scope_type, scope_id, objetivo, departamento, indicador, problema, acao, como, responsavel_id, prazo, status, prioridade, origem, origem_ref_id, origem_ref_table, eficacia_score, eficacia_nota, progresso, iniciado_at, created_at, updated_at, concluido_at',
        )
        .eq('scope_type', scopeToDb('loja'))
        .eq('scope_id', storeId)
        .order('prazo', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (filters.status?.length) {
        query = query.in('status', filters.status)
      } else if (!filters.includeConcluidos) {
        query = query.in('status', ['pendente', 'em_andamento', 'atrasado', 'validando_eficacia'])
      }
      if (filters.origem?.length) {
        query = query.in('origem', filters.origem)
      }
      if (filters.responsavelId) {
        query = query.eq('responsavel_id', filters.responsavelId)
      }
      const { data, error: queryError } = await query
      if (queryError) throw queryError
      setPlanos((data ?? []) as CentralMxPlanoAcaoRow[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar planos de ação'
      setError(message)
      setPlanos([])
    } finally {
      setLoading(false)
    }
  }, [storeId, filters.status, filters.origem, filters.responsavelId, filters.includeConcluidos])

  useEffect(() => {
    fetchPlanos()
  }, [fetchPlanos])

  const marcarConcluido = useCallback(
    async (planoId: string, eficaciaNota?: string) => {
      try {
        const { error: updateError } = await supabase.rpc('atualizar_plano_acao', {
          p_plano_id: planoId,
          p_status: 'concluido',
          p_progresso: 100,
          p_eficacia_nota: eficaciaNota?.trim() || null,
        })
        if (updateError) throw updateError
        toast.success('Plano marcado como concluído.')
        await fetchPlanos()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Não foi possível concluir o plano.')
      }
    },
    [fetchPlanos],
  )

  const counts = useMemo<Record<CentralMxPlanoStatus, number>>(() => {
    if (!planos.length) return EMPTY_COUNTS
    return planos.reduce(
      (acc, plano) => {
        acc[plano.status] = (acc[plano.status] ?? 0) + 1
        return acc
      },
      { ...EMPTY_COUNTS },
    )
  }, [planos])

  return { planos, loading, error, refresh: fetchPlanos, marcarConcluido, counts }
}
