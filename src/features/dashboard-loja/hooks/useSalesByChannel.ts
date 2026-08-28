import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllRows } from '@/lib/supabasePagination'

/**
 * Vendas do mês por canal, para os indicadores de origem de venda do catálogo.
 *
 * Só dois canais têm correspondência inequívoca com a metodologia:
 *
 *   - `internet` → Vendas - Internet
 *   - `showroom` e `porta` → Vendas - Fluxo de Porta
 *
 * `carteira` NÃO é dividido entre "carteira empresa" e "carteira vendedor": o
 * evento não distingue as duas, e ratear produziria dois números plausíveis e
 * errados. Esses indicadores seguem sem realizado até a origem registrar a
 * diferença.
 *
 * Venda sem canal registrado conta como **Vendas - Outros**, por decisão da MX
 * em 2026-08-27. Eram 48 de 554 vendas invisíveis em todo indicador de origem;
 * agora têm onde aparecer. A leitura correta de `sales_other` é "venda cuja
 * origem não foi registrada", não "veio de um quinto canal".
 *
 * O recorte usa `data_competencia` — a competência canônica da metodologia —,
 * nunca `data_evento`.
 */
export type SalesByChannel = {
  internet: number | null
  doorFlow: number | null
  /** Eventos `pos_venda_realizado` no mesmo recorte de competência. */
  afterSales: number | null
  /** Vendas sem canal registrado — ver nota sobre `sales_other` acima. */
  other: number | null
  /** Total de vendas do mês — denominador de `% de Pós-Venda`. */
  totalSales: number | null
}

const VAZIO: SalesByChannel = { internet: null, doorFlow: null, afterSales: null, other: null, totalSales: null }

export function useSalesByChannel(storeId: string | null, period: string): SalesByChannel {
  const [sales, setSales] = useState<SalesByChannel>(VAZIO)

  useEffect(() => {
    if (!storeId || !/^\d{4}-\d{2}$/.test(period)) {
      setSales(VAZIO)
      return
    }
    let ativo = true
    const inicio = `${period}-01`
    const [ano, mes] = period.split('-').map(Number)
    const fim = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

    void fetchAllRows<{ canal: string | null; tipo_evento: string }>((from, to) =>
      supabase
        .from('eventos_comerciais')
        .select('canal, tipo_evento')
        .eq('loja_id', storeId)
        .in('tipo_evento', ['venda_realizada', 'pos_venda_realizado'])
        .gte('data_competencia', inicio)
        .lt('data_competencia', fim)
        .range(from, to),
    ).then(({ rows, error }) => {
      if (!ativo || error) return
      const vendas = rows.filter(row => row.tipo_evento === 'venda_realizada')
      setSales({
        internet: vendas.filter(row => row.canal === 'internet').length,
        doorFlow: vendas.filter(row => row.canal === 'showroom' || row.canal === 'porta').length,
        afterSales: rows.filter(row => row.tipo_evento === 'pos_venda_realizado').length,
        other: vendas.filter(row => row.canal === null || row.canal === undefined).length,
        totalSales: vendas.length,
      })
    })

    return () => { ativo = false }
  }, [storeId, period])

  return sales
}
