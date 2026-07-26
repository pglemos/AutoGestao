import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import type {
  CentralMxPlanoAcaoRow,
  CentralMxPlanoStatus,
} from './useCentralMxPlanosAcao'
import { scopeToDb } from '../lib/scopeType'

/**
 * Hook do Sprint 3 — S3-T1 (delta N1 da ata 2026-05-22 §00:25).
 *
 * Diferente do `useCentralMxPlanosAcao` (que só carrega scope='loja'), este
 * hook busca planos em 3 escopos simultaneamente para a loja escolhida:
 *   • escopo 'loja'        — scope_id = storeId
 *   • escopo 'departamento' — scope_id em departamentos_mx.id da loja
 *   • escopo 'vendedor'     — scope_id em vendedores_loja.seller_user_id da loja
 *
 * O resultado é exposto agrupado, para uma UI com tabs por escopo.
 */

export type CentralMxPlanoScope = 'loja' | 'departamento' | 'vendedor'

export type SegmentedPlanos = {
  loja: CentralMxPlanoAcaoRow[]
  departamento: CentralMxPlanoAcaoRow[]
  vendedor: CentralMxPlanoAcaoRow[]
}

const EMPTY_SEGMENTED: SegmentedPlanos = { loja: [], departamento: [], vendedor: [] }

export type UseCentralMxPlanosAcaoSegmentadoResult = {
  planos: SegmentedPlanos
  totals: Record<CentralMxPlanoScope, number>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  marcarConcluido: (planoId: string, eficaciaNota?: string) => Promise<void>
  countsByStatus: Record<CentralMxPlanoStatus, number>
}

type Options = {
  includeConcluidos?: boolean
}

export function useCentralMxPlanosAcaoSegmentado(
  storeId: string | null | undefined,
  options: Options = {},
): UseCentralMxPlanosAcaoSegmentadoResult {
  const [planos, setPlanos] = useState<SegmentedPlanos>(EMPTY_SEGMENTED)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!storeId) {
      setPlanos(EMPTY_SEGMENTED)
      return
    }
    setLoading(true)
    setError(null)
    try {
      // 1. Coletar ids de escopos derivados da loja
      const [deptRes, sellerRes] = await Promise.all([
        supabase
          .from('departamentos_mx')
          .select('id')
          .eq('loja_id', storeId)
          .eq('status', 'ativo'),
        supabase
          .from('vendedores_loja')
          .select('seller_user_id')
          .eq('store_id', storeId)
          .eq('is_active', true),
      ])
      if (deptRes.error) throw deptRes.error
      if (sellerRes.error) throw sellerRes.error
      const deptIds = (deptRes.data ?? []).map((row) => row.id as string)
      const sellerIds = (sellerRes.data ?? []).map((row) => row.seller_user_id as string)

      const baseSelect =
        'id, codigo, scope_type, scope_id, objetivo, departamento, indicador, problema, acao, como, responsavel_id, prazo, status, prioridade, origem, origem_ref_id, origem_ref_table, eficacia_score, eficacia_nota, progresso, iniciado_at, created_at, updated_at, concluido_at'
      const statusFilter: CentralMxPlanoStatus[] = options.includeConcluidos
        ? ['pendente', 'em_andamento', 'atrasado', 'concluido', 'validando_eficacia']
        : ['pendente', 'em_andamento', 'atrasado', 'validando_eficacia']

      const lojaQuery = supabase
        .from('planos_acao')
        .select(baseSelect)
        .eq('scope_type', scopeToDb('loja'))
        .eq('scope_id', storeId)
        .in('status', statusFilter)
        .order('prazo', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      const deptQuery = deptIds.length
        ? supabase
            .from('planos_acao')
            .select(baseSelect)
            .eq('scope_type', scopeToDb('departamento'))
            .in('scope_id', deptIds)
            .in('status', statusFilter)
            .order('prazo', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
        : null

      const sellerQuery = sellerIds.length
        ? supabase
            .from('planos_acao')
            .select(baseSelect)
            .eq('scope_type', scopeToDb('vendedor'))
            .in('scope_id', sellerIds)
            .in('status', statusFilter)
            .order('prazo', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
        : null

      const [lojaRes, deptPlanosRes, sellerPlanosRes] = await Promise.all([
        lojaQuery,
        deptQuery ?? Promise.resolve({ data: [], error: null } as never),
        sellerQuery ?? Promise.resolve({ data: [], error: null } as never),
      ])

      if (lojaRes.error) throw lojaRes.error
      if (deptPlanosRes.error) throw deptPlanosRes.error
      if (sellerPlanosRes.error) throw sellerPlanosRes.error

      setPlanos({
        loja: (lojaRes.data ?? []) as CentralMxPlanoAcaoRow[],
        departamento: (deptPlanosRes.data ?? []) as CentralMxPlanoAcaoRow[],
        vendedor: (sellerPlanosRes.data ?? []) as CentralMxPlanoAcaoRow[],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar planos segmentados.'
      setError(message)
      setPlanos(EMPTY_SEGMENTED)
    } finally {
      setLoading(false)
    }
  }, [storeId, options.includeConcluidos])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

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
        await fetchAll()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Não foi possível concluir o plano.')
      }
    },
    [fetchAll],
  )

  const totals = useMemo<Record<CentralMxPlanoScope, number>>(
    () => ({
      loja: planos.loja.length,
      departamento: planos.departamento.length,
      vendedor: planos.vendedor.length,
    }),
    [planos],
  )

  const countsByStatus = useMemo<Record<CentralMxPlanoStatus, number>>(() => {
    const acc: Record<CentralMxPlanoStatus, number> = {
      pendente: 0,
      em_andamento: 0,
      atrasado: 0,
      concluido: 0,
      validando_eficacia: 0,
    }
    for (const list of [planos.loja, planos.departamento, planos.vendedor]) {
      for (const plano of list) {
        acc[plano.status] = (acc[plano.status] ?? 0) + 1
      }
    }
    return acc
  }, [planos])

  return {
    planos,
    totals,
    loading,
    error,
    refresh: fetchAll,
    marcarConcluido,
    countsByStatus,
  }
}
