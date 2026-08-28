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
 * Venda **cancelada não conta**. A contagem por canal ignorava isso e inflava
 * os indicadores: na rede, 15 de 554 vendas tinham a oportunidade em
 * `cancelada` e continuavam somando. A regra segue a função canônica
 * `vendas_oficiais_deduplicadas_periodo`: fora quem tem oportunidade
 * cancelada, e fora quem tem evento `venda_cancelada` apontando para ele.
 *
 * DÉBITO CONHECIDO: essa regra vive no servidor e está replicada aqui porque
 * a função canônica tem EXECUTE revogado para o cliente. O certo é expor
 * `canal` pelo caminho oficial e apagar esta duplicação — enquanto ela
 * existir, uma mudança na regra de cancelamento precisa ser feita nos dois
 * lugares.
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

    void (async () => {
      const eventos = await fetchAllRows<{
        id: string
        canal: string | null
        tipo_evento: string
        oportunidade_id: string | null
      }>((from, to) =>
        supabase
          .from('eventos_comerciais')
          .select('id, canal, tipo_evento, oportunidade_id')
          .eq('loja_id', storeId)
          .in('tipo_evento', ['venda_realizada', 'pos_venda_realizado'])
          .gte('data_competencia', inicio)
          .lt('data_competencia', fim)
          .range(from, to),
      )
      if (!ativo || eventos.error) return

      const rows = eventos.rows
      const brutas = rows.filter(row => row.tipo_evento === 'venda_realizada')

      // O cancelamento não é filtrado por competência: uma venda de julho pode
      // ser cancelada em agosto e continua não valendo para julho.
      const cancelamentos = await fetchAllRows<{
        evento_origem_id: string | null
        oportunidade_id: string | null
      }>((from, to) =>
        supabase
          .from('eventos_comerciais')
          .select('evento_origem_id, oportunidade_id')
          .eq('loja_id', storeId)
          .eq('tipo_evento', 'venda_cancelada')
          .range(from, to),
      )
      if (!ativo || cancelamentos.error) return

      const eventosCancelados = new Set(
        cancelamentos.rows.map(row => row.evento_origem_id).filter((id): id is string => Boolean(id)),
      )
      const oportunidadesCanceladas = new Set(
        cancelamentos.rows.map(row => row.oportunidade_id).filter((id): id is string => Boolean(id)),
      )

      const idsOportunidade = [...new Set(brutas.map(row => row.oportunidade_id).filter((id): id is string => Boolean(id)))]
      const etapaCancelada = new Set<string>()
      if (idsOportunidade.length > 0) {
        const oportunidades = await fetchAllRows<{ id: string; etapa: string | null }>((from, to) =>
          supabase.from('oportunidades').select('id, etapa').in('id', idsOportunidade).range(from, to),
        )
        if (!ativo || oportunidades.error) return
        oportunidades.rows.filter(row => row.etapa === 'cancelada').forEach(row => etapaCancelada.add(row.id))
      }

      const vendas = brutas.filter(row => {
        if (eventosCancelados.has(row.id)) return false
        if (!row.oportunidade_id) return true
        return !etapaCancelada.has(row.oportunidade_id) && !oportunidadesCanceladas.has(row.oportunidade_id)
      })

      setSales({
        internet: vendas.filter(row => row.canal === 'internet').length,
        doorFlow: vendas.filter(row => row.canal === 'showroom' || row.canal === 'porta').length,
        afterSales: rows.filter(row => row.tipo_evento === 'pos_venda_realizado').length,
        other: vendas.filter(row => row.canal === null || row.canal === undefined).length,
        totalSales: vendas.length,
      })
    })()

    return () => { ativo = false }
  }, [storeId, period])

  return sales
}
