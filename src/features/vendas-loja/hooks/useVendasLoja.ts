import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cancelarVendaRpc, type CancelarVendaReferencia } from '@/features/crm/lib/cancelarVenda'
import { buildStoreSaleCandidates, filterStoreSales, getStoreSaleDisplayDate, type StoreSaleEventRow } from '../lib/store-sales'

export type VendaLoja = {
  id: string
  event_id: string
  oportunidade_id: string | null
  cliente_id: string
  cliente_nome: string
  veiculo_interesse: string | null
  valor_negociado: number
  etapa: 'ganho' | 'cancelada'
  seller_user_id: string
  seller_nome: string
  competencia: string
  closed_at: string | null
  cancelada_em: string | null
  motivo_cancelamento: string | null
}

function parse(rows: unknown): VendaLoja[] {
  if (!Array.isArray(rows)) return []

  const candidates = buildStoreSaleCandidates(rows as StoreSaleEventRow[])

  const scopedRows = filterStoreSales(candidates)

  return scopedRows.map(row => ({
    id: row.oportunidade_id || row.event_id,
    event_id: row.event_id,
    oportunidade_id: row.oportunidade_id,
    cliente_id: row.cliente_id || '',
    cliente_nome: row.cliente_nome || 'Cliente',
    veiculo_interesse: row.veiculo_interesse,
    valor_negociado: row.valor_negociado,
    etapa: row.etapa as 'ganho' | 'cancelada',
    seller_user_id: row.seller_user_id || '',
    seller_nome: row.seller_nome || 'Vendedor',
    competencia: getStoreSaleDisplayDate(row) || '',
    closed_at: row.closed_at,
    cancelada_em: row.cancelada_em,
    motivo_cancelamento: row.motivo_cancelamento,
  }))
}

/**
 * Vendas fechadas (ganho + cancelada) de uma loja, para o painel de
 * gerente/dono. Consulta os eventos oficiais de venda e a oportunidade
 * vinculada. A lista operacional não herda o período do indicador do
 * dashboard: gerente, dono e área interna MX precisam localizar qualquer
 * venda histórica da unidade para poder corrigi-la. O período continua sendo
 * uma regra dos agregadores, não uma limitação da auditoria detalhada.
 */
export function useVendasLoja(storeId: string | null) {
  const [vendas, setVendas] = useState<VendaLoja[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendas = useCallback(async () => {
    if (!storeId) { setVendas([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const rows: unknown[] = []
      const pageSize = 500

      for (let from = 0; ; from += pageSize) {
        let query = supabase
          .from('eventos_comerciais')
          .select(`
            id,
            tipo_evento,
            cliente_id,
            data_evento,
            data_competencia,
            oportunidade_id,
            evento_origem_id,
            agendamento_id,
            seller_user_id,
            metadata,
            observacao,
            seller:usuarios!eventos_comerciais_seller_user_id_fkey(name),
            cliente:clientes!eventos_comerciais_cliente_id_fkey(nome),
            oportunidade:oportunidades!eventos_comerciais_oportunidade_id_fkey(
              id,
              cliente_id,
              veiculo_interesse,
              valor_negociado,
              etapa,
              data_competencia,
              sale_date,
              closed_at,
              cancelada_em,
              motivo_cancelamento,
              cliente:clientes!oportunidades_cliente_id_fkey(nome),
              seller:usuarios!oportunidades_seller_user_id_fkey(name)
            )
          `)
          .eq('loja_id', storeId)
          .in('tipo_evento', ['venda_realizada', 'venda_cancelada'])
        const { data, error: fetchError } = await query
          .order('data_evento', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + pageSize - 1)

        if (fetchError) throw fetchError
        const page = (data || []) as unknown[]
        rows.push(...page)
        if (page.length < pageSize) break
      }

      setVendas(parse(rows))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas da loja.')
      setVendas([])
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => { void fetchVendas() }, [fetchVendas])

  const cancelarVenda = useCallback(async (referencia: CancelarVendaReferencia, motivo: string): Promise<{ error: string | null }> => {
    const { error: cancelError } = await cancelarVendaRpc(referencia, motivo)
    if (cancelError) return { error: cancelError }
    await fetchVendas()
    return { error: null }
  }, [fetchVendas])

  return { vendas, loading, error, refetch: fetchVendas, cancelarVenda }
}
