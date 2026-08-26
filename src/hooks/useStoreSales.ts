import { useMemo } from 'react'
import { DailyCheckin, RankingEntry, StoreMetaRules } from '@/types/database'
import { getDiasInfo } from '@/lib/calculations'

interface UseStoreSalesProps {
  checkins: DailyCheckin[]
  ranking: RankingEntry[]
  rules?: StoreMetaRules | null
}

export function useStoreSales({ checkins, ranking, rules }: UseStoreSalesProps) {
  const dias = useMemo(() => getDiasInfo(), [])

  const stats = useMemo(() => {
    const includeVendaLojaInStore = rules?.include_venda_loja_in_store_total ?? true
    const includeVendaLojaInIndividual = rules?.include_venda_loja_in_individual_goal ?? false

    // 1. Filtrar e processar a "Venda Loja" (unidade não-vendedor)
    const vendaLojaEntries = ranking.filter(r => r.is_venda_loja)
    const realSellers = ranking.filter(r => !r.is_venda_loja)

    const totalVendasLojaRaw = vendaLojaEntries.reduce((acc, curr) => acc + curr.vnd_total, 0)
    const totalVendasSellers = realSellers.reduce((acc, curr) => acc + curr.vnd_total, 0)

    // Totais da Loja
    const storeTotalVendas = totalVendasSellers + (includeVendaLojaInStore ? totalVendasLojaRaw : 0)
    const storeTotalLeads = ranking.reduce((acc, curr) => acc + curr.leads, 0)
    const storeTotalAgd = ranking.reduce((acc, curr) => acc + curr.agd_total, 0)
    const storeTotalVis = ranking.reduce((acc, curr) => acc + curr.visitas, 0)
    
    const storeGoal = rules?.monthly_goal ?? 0
    const storeAttainment = storeGoal > 0 ? Math.round((storeTotalVendas / storeGoal) * 100) : 0
    const storeProjection = Math.round((storeTotalVendas / Math.max(dias.decorridos, 1)) * dias.total)

    // 2. Processar Ranking Individual com as regras de meta
    const processedRanking = ranking.map(entry => {
      const isVendaLoja = entry.is_venda_loja
      
      // VENDA LOJA é uma conta operacional: nunca entra no divisor e sempre
      // fica com meta individual zero, independentemente da flag legada.
      const individualGoal = isVendaLoja ? 0 : entry.meta

      const attainment = individualGoal > 0 ? Math.round((entry.vnd_total / individualGoal) * 100) : 0
      
      // Ritmo e Projeção (Venda Loja não tem ritmo de vendedor)
      const projection = isVendaLoja ? entry.vnd_total : Math.round((entry.vnd_total / Math.max(dias.decorridos, 1)) * dias.total)
      const gap = Math.max(0, individualGoal - entry.vnd_total)
      const ritmo = isVendaLoja ? 0 : Math.max(0, Math.ceil(gap / Math.max(dias.restantes, 1)))

      return {
        ...entry,
        meta: individualGoal,
        atingimento: attainment,
        projecao: projection,
        ritmo,
        gap
      }
    })

    return {
      storeTotalVendas,
      storeTotalLeads,
      storeTotalAgd,
      storeTotalVis,
      storeGoal,
      storeAttainment,
      storeProjection,
      processedRanking,
      diasInfo: dias,
      includeVendaLojaInStore,
      includeVendaLojaInIndividual
    }
  }, [ranking, rules, dias])

  return stats
}
