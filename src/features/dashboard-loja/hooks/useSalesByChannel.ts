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
 * O recorte usa `data_competencia` — a competência canônica da metodologia —,
 * nunca `data_evento`.
 */
export type SalesByChannel = {
  internet: number | null
  doorFlow: number | null
}

const VAZIO: SalesByChannel = { internet: null, doorFlow: null }

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

    void fetchAllRows<{ canal: string | null }>((from, to) =>
      supabase
        .from('eventos_comerciais')
        .select('canal')
        .eq('loja_id', storeId)
        .eq('tipo_evento', 'venda_realizada')
        .gte('data_competencia', inicio)
        .lt('data_competencia', fim)
        .range(from, to),
    ).then(({ rows, error }) => {
      if (!ativo || error) return
      setSales({
        internet: rows.filter(row => row.canal === 'internet').length,
        doorFlow: rows.filter(row => row.canal === 'showroom' || row.canal === 'porta').length,
      })
    })

    return () => { ativo = false }
  }, [storeId, period])

  return sales
}
