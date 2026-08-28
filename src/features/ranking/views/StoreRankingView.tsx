import { useMemo, useState } from 'react'
import { Info, Trophy } from 'lucide-react'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { LastUpdated } from '@/components/molecules/LastUpdated'
import { RankingErrorBoundary } from '@/features/ranking/components/RankingErrorBoundary'
import { RankingSkeleton } from '@/features/ranking/components/RankingSkeleton'
import { RankingErrorNotice, RankingPeriodTabs, RankingRefreshButton, RankingUnitSelect } from '@/features/ranking/components/RankingControls'
import { SellerProfileModal } from '@/features/ranking/components/SellerProfileModal'
import { PodioRanking } from '@/features/ranking/components/base44/PodioRanking'
import { SuaPosicao } from '@/features/ranking/components/base44/SuaPosicao'
import { CorridaPeriodo } from '@/features/ranking/components/base44/CorridaPeriodo'
import { TabelaRanking } from '@/features/ranking/components/base44/TabelaRanking'
import { useStoreRankingPageData } from '@/features/ranking/hooks/useStoreRankingPageData'
import { PageCanvas } from '@/design-system/page'

const GOAL_MODE_LABEL: Record<string, string> = {
  even: 'a meta da loja dividida igualmente entre os vendedores',
  custom: 'metas individuais definidas vendedor a vendedor',
  proportional: 'a meta da loja rateada proporcionalmente',
}

/**
 * Ranking por Loja — estrutura do protótipo Base44 (topbar com troféu,
 * abas de período, Pódio + Sua posição, Corrida, Tabela).
 */
export function StoreRankingView() {
  const data = useStoreRankingPageData()
  const [sellerAberto, setSellerAberto] = useState<string | null>(null)

  const sellerSelecionado = useMemo(
    () => data.rankingEntries.find(entry => entry.user_id === sellerAberto) ?? null,
    [data.rankingEntries, sellerAberto]
  )

  if (data.loading) {
    return <RankingSkeleton ariaLabel="Carregando o ranking da loja" variant="store" />
  }

  const modoMeta = data.individualGoalMode ? GOAL_MODE_LABEL[data.individualGoalMode] : null

  return (
    <RankingErrorBoundary sectionName="Ranking da Loja">
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="min-h-full w-full min-w-0 bg-surface-alt font-body">
        <div className="flex w-full min-w-0 flex-col gap-4">
          <SellerPageHeader
            icon={Trophy}
            title="Ranking"
            subtitle="Acompanhe sua posição e a corrida do período na sua loja."
            actions={(
              <div className="flex items-center gap-3 flex-wrap">
                <RankingPeriodTabs value={data.periodo} onChange={data.setPeriodo} />
                <RankingUnitSelect id="store-ranking-unit" value={data.unidade} unidades={data.unidades} onChange={data.setUnidade} />
                <LastUpdated value={data.lastUpdatedAt} />
                <RankingRefreshButton onRefresh={data.handleRefresh} isRefetching={data.isRefetching} />
              </div>
            )}
          />

          {modoMeta && (
            <div className="flex items-center gap-2 bg-brand-primary-subtle border border-brand-primary/20 rounded-xl px-4 py-2">
              <Info className="w-4 h-4 text-brand-primary-active flex-shrink-0" aria-hidden="true" />
              <p className="text-mx-tiny text-brand-primary-active">
                <strong>Ordenado por volume de vendas.</strong> A meta individual segue {modoMeta}.
              </p>
            </div>
          )}

          {data.error && (
            <RankingErrorNotice message={data.error} onRetry={data.handleRefresh} isRetrying={data.isRefetching} />
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            <PodioRanking top3={data.top3} />
            {data.euVendedor && (
              <SuaPosicao
                posicao={data.posicao}
                total={data.totalVendedores}
                atingimento={data.atingimento}
                faltamValor={data.faltamValor}
              />
            )}
          </div>

          <CorridaPeriodo
            vendedores={data.vendedores.slice(0, 8)}
            metaLoja={data.metaPeriodo}
            metaCorrida={data.metaCorrida}
            meuId={data.meuId}
          />

          <TabelaRanking
            vendedores={data.vendedores}
            meuId={data.meuId}
            onSelect={vendedor => setSellerAberto(vendedor.id)}
          />
        </div>

        {sellerSelecionado && (
          <SellerProfileModal seller={sellerSelecionado} onClose={() => setSellerAberto(null)} />
        )}
      </PageCanvas>
    </RankingErrorBoundary>
  )
}

export default StoreRankingView
