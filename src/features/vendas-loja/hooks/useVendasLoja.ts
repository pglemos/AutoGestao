import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cancelarVendaRpc } from '@/features/crm/lib/cancelarVenda'

export type VendaLoja = {
  id: string
  cliente_id: string
  cliente_nome: string
  veiculo_interesse: string | null
  valor_negociado: number
  etapa: 'ganho' | 'cancelada'
  seller_user_id: string
  seller_nome: string
  closed_at: string | null
  cancelada_em: string | null
  motivo_cancelamento: string | null
}

type VendaLojaRow = {
  id: string
  cliente_id: string
  veiculo_interesse: string | null
  valor_negociado: number
  etapa: string
  seller_user_id: string
  closed_at: string | null
  cancelada_em: string | null
  motivo_cancelamento: string | null
  cliente: { nome: string } | null
  seller: { name: string } | null
}

function parse(rows: unknown): VendaLoja[] {
  if (!Array.isArray(rows)) return []
  const out: VendaLoja[] = []
  for (const row of rows as VendaLojaRow[]) {
    if (row.etapa !== 'ganho' && row.etapa !== 'cancelada') continue
    out.push({
      id: row.id,
      cliente_id: row.cliente_id,
      cliente_nome: row.cliente?.nome || 'Cliente',
      veiculo_interesse: row.veiculo_interesse,
      valor_negociado: row.valor_negociado,
      etapa: row.etapa,
      seller_user_id: row.seller_user_id,
      seller_nome: row.seller?.name || 'Vendedor',
      closed_at: row.closed_at,
      cancelada_em: row.cancelada_em,
      motivo_cancelamento: row.motivo_cancelamento,
    })
  }
  return out
}

/**
 * Vendas fechadas (ganho + cancelada) de uma loja, para o painel de
 * gerente/dono. Consulta oportunidades direto — vendedor_performance_oficial
 * só retorna agregado por vendedor, sem oportunidade_id linkável. RLS
 * (oportunidades_store_read) já libera SELECT para is_manager_of/is_owner_of.
 */
export function useVendasLoja(storeId: string | null) {
  const [vendas, setVendas] = useState<VendaLoja[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendas = useCallback(async () => {
    if (!storeId) { setVendas([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('oportunidades')
        .select('id, cliente_id, veiculo_interesse, valor_negociado, etapa, seller_user_id, closed_at, cancelada_em, motivo_cancelamento, cliente:clientes(nome), seller:usuarios!oportunidades_seller_user_id_fkey(name)')
        .eq('loja_id', storeId)
        .in('etapa', ['ganho', 'cancelada'])
        .order('closed_at', { ascending: false, nullsFirst: false })
        .limit(200)
      if (fetchError) { setError(fetchError.message); setVendas([]) }
      else setVendas(parse(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas da loja.')
      setVendas([])
    } finally {
      setLoading(false)
    }
  }, [storeId])

  useEffect(() => { fetchVendas() }, [fetchVendas])

  const cancelarVenda = useCallback(async (id: string, motivo: string): Promise<{ error: string | null }> => {
    const { error: cancelError } = await cancelarVendaRpc(id, motivo)
    if (cancelError) return { error: cancelError }
    await fetchVendas()
    return { error: null }
  }, [fetchVendas])

  return { vendas, loading, error, refetch: fetchVendas, cancelarVenda }
}
