import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { slugify } from '@/lib/utils'
import { DashboardErrorBoundary } from '@/features/dashboard-loja/components/DashboardErrorBoundary'
import { ResolvingStoreSpinner } from '@/features/dashboard-loja/sections/DashboardEmptyStates'
import { useStoreResolution } from '@/features/dashboard-loja/hooks/useStoreResolution'
import { ConsultorIaStoreSection } from './sections/ConsultorIaStoreSection'
import { PageTemplate } from '@/components/templates/PageTemplate'

export function StoreConsultorIa() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const { lojas, loading: storesLoading } = useStores()
  const activeStores = useMemo(() => (lojas || []).filter(store => store.active), [lojas])

  const {
    selectedStoreId,
    selectedStore,
    requestedStoreForbidden,
    storeResolutionIssue,
    resolving,
  } = useStoreResolution({ activeStores, storesLoading })

  const fallbackPath = role === 'vendedor' ? '/home' : role === 'gerente' ? '/classificacao' : isPerfilInternoMx(role) ? '/clientes' : '/minhas-lojas'
  const backPath = selectedStore?.name ? `/lojas/${slugify(selectedStore.name)}` : fallbackPath

  if (resolving || storesLoading) {
    return <ResolvingStoreSpinner />
  }

  if (!selectedStoreId) {
    return (
      <PageTemplate as="div" width="dashboard" bottomClearance="navigation">
        <Card className="mx-auto max-w-2xl border-none bg-white">
          <EmptyState
            size="lg"
            icon={<Building2 />}
            title={requestedStoreForbidden ? 'Loja fora do seu vínculo' : 'Unidade não localizada'}
            description={
              requestedStoreForbidden
                ? 'Seu perfil não possui vínculo ativo com esta unidade.'
                : storeResolutionIssue || 'Não encontramos uma unidade ativa para abrir o Consultor IA.'
            }
            nextStep="Volte para sua área principal e escolha uma loja ativa. Se a loja foi renomeada ou criada recentemente, solicite ao Admin MX revisar seu vínculo."
            action={
              <Button onClick={() => navigate(fallbackPath, { replace: true })} className="rounded-mx-full bg-gray-900 px-mx-xl">
                Voltar
              </Button>
            }
          />
        </Card>
        </PageTemplate>
    )
  }

  return (
    <PageTemplate as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-mx-md">
      <PageHeading
        icon={Sparkles}
        title="Consultor IA"
        subtitle={`Prioridades da unidade, orientações registradas e recomendações de ação. ${selectedStore?.name ? `(${selectedStore.name})` : ''}`}
        actions={
          <Button type="button" variant="outline" className="h-mx-11 w-fit bg-white" onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} />
            Voltar para loja
          </Button>
        }
      />

        <DashboardErrorBoundary sectionName="ConsultorIaStoreSection">
          <ConsultorIaStoreSection storeId={selectedStoreId} />
        </DashboardErrorBoundary>
      </PageTemplate>
  )
}

export default StoreConsultorIa
