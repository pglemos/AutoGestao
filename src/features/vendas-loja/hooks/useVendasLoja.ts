import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cancelarVendaRpc } from '@/features/crm/lib/cancelarVenda'
import { filterStoreSales, filterStoreSalesBySellerIds, getStoreSaleCompetence, type StoreSaleCandidate } from '../lib/store-sales'

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

type VendaLojaEventRow = {
  id: string
  cliente_id: string
  data_evento: string
  data_competencia: string | null
  oportunidade_id: string | null
  seller_user_id: string
  seller: { name: string } | null
  oportunidade: {
    id: string
    cliente_id: string
    veiculo_interesse: string | null
    valor_negociado: number | string | null
    etapa: string | null
    data_competencia: string | null
    sale_date: string | null
    closed_at: string | null
    cancelada_em: string | null
    motivo_cancelamento: string | null
    cliente: { nome: string } | null
    seller: { name: string } | null
  } | null
}

function parse(
  rows: unknown,
  periodStart?: string | null,
  periodEnd?: string | null,
  activeSellerIds?: readonly string[],
): VendaLoja[] {
  if (!Array.isArray(rows)) return []

  const candidates: StoreSaleCandidate[] = (rows as VendaLojaEventRow[]).map(row => {
    const opportunity = row.oportunidade
    return {
      event_id: row.id,
      oportunidade_id: row.oportunidade_id || opportunity?.id || null,
      data_evento: row.data_evento,
      data_competencia: row.data_competencia,
      oportunidade_data_competencia: opportunity?.data_competencia || null,
      oportunidade_sale_date: opportunity?.sale_date || null,
      // A existência do evento oficial é o fato de venda. A oportunidade
      // pode ainda estar sem etapa materializada, mas isso não pode remover
      // a venda da lista nem fazer a contagem detalhada divergir da RPC.
      etapa: opportunity?.etapa === 'cancelada' ? 'cancelada' : 'ganho',
      cliente_id: opportunity?.cliente_id || row.cliente_id || null,
      cliente_nome: opportunity?.cliente?.nome || null,
      veiculo_interesse: opportunity?.veiculo_interesse || null,
      valor_negociado: Number(opportunity?.valor_negociado) || 0,
      seller_user_id: row.seller_user_id || null,
      seller_nome: opportunity?.seller?.name || row.seller?.name || null,
      closed_at: opportunity?.closed_at || null,
      cancelada_em: opportunity?.cancelada_em || null,
      motivo_cancelamento: opportunity?.motivo_cancelamento || null,
    }
  })

  const periodRows = filterStoreSales(candidates, periodStart, periodEnd)
  const scopedRows = activeSellerIds ? filterStoreSalesBySellerIds(periodRows, activeSellerIds) : periodRows

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
    competencia: getStoreSaleCompetence(row) as string,
    closed_at: row.closed_at,
    cancelada_em: row.cancelada_em,
    motivo_cancelamento: row.motivo_cancelamento,
  }))
}

/**
 * Vendas fechadas (ganho + cancelada) de uma loja, para o painel de
 * gerente/dono. Consulta os eventos oficiais de venda e a oportunidade
 * vinculada. O período é aplicado pela competência comercial, igual ao
 * vendedor_performance_oficial, para não misturar histórico antigo com o
 * indicador selecionado.
 */
export function useVendasLoja(
  storeId: string | null,
  periodStart?: string | null,
  periodEnd?: string | null,
  // Opcional porque vem depois de parâmetros opcionais (TS1016). `null` é um
  // escopo resolvido válido: quer dizer "ainda não sei quem são os vendedores
  // ativos" e segura a consulta, em vez de cair em toda a história da loja.
  activeSellerIds?: readonly string[] | null,
) {
  const [vendas, setVendas] = useState<VendaLoja[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // `== null` cobre null e undefined: omitir o argumento é o mesmo que ainda não
  // ter resolvido o escopo. `Array.from(new Set(undefined))` lançaria.
  const activeSellerIdsKey = activeSellerIds == null
    ? null
    : Array.from(new Set(activeSellerIds)).sort().join(',')

  const fetchVendas = useCallback(async () => {
    if (!storeId) { setVendas([]); setLoading(false); return }
    // Wait for the parent dashboard to resolve the active seller membership.
    // An empty list is a valid resolved scope: it means there are no active
    // sellers and must not fall back to all historical store events.
    if (activeSellerIdsKey === null) { setError(null); setVendas([]); setLoading(true); return }
    if (activeSellerIdsKey === '') { setError(null); setVendas([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const rows: unknown[] = []
      const pageSize = 500
      const scopedSellerIds = activeSellerIdsKey.split(',')

      for (let from = 0; ; from += pageSize) {
        let query = supabase
          .from('eventos_comerciais')
          .select(`
            id,
            cliente_id,
            data_evento,
            data_competencia,
            oportunidade_id,
            seller_user_id,
            seller:usuarios!eventos_comerciais_seller_user_id_fkey(name),
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
              cliente:clientes(nome),
              seller:usuarios!oportunidades_seller_user_id_fkey(name)
            )
          `)
          .eq('loja_id', storeId)
          .eq('tipo_evento', 'venda_realizada')
        if (scopedSellerIds) query = query.in('seller_user_id', scopedSellerIds)
        const { data, error: fetchError } = await query
          .order('data_evento', { ascending: false })
          .order('id', { ascending: false })
          .range(from, from + pageSize - 1)

        if (fetchError) throw fetchError
        const page = (data || []) as unknown[]
        rows.push(...page)
        if (page.length < pageSize) break
      }

      setVendas(parse(rows, periodStart, periodEnd, scopedSellerIds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas da loja.')
      setVendas([])
    } finally {
      setLoading(false)
    }
  }, [activeSellerIdsKey, periodEnd, periodStart, storeId])

  useEffect(() => { void fetchVendas() }, [fetchVendas])

  const cancelarVenda = useCallback(async (id: string, motivo: string): Promise<{ error: string | null }> => {
    const { error: cancelError } = await cancelarVendaRpc(id, motivo)
    if (cancelError) return { error: cancelError }
    await fetchVendas()
    return { error: null }
  }, [fetchVendas])

  return { vendas, loading, error, refetch: fetchVendas, cancelarVenda }
}
