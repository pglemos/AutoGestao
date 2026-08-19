import { Building2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Card } from '@/components/molecules/Card'
import { EmptyState } from '@/components/atoms/EmptyState'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { PageCanvas } from '@/design-system/page'

/** Spinner "Identificando Unidade" — usado durante store resolution. */
export function ResolvingStoreSpinner() {
  return (
    <PageCanvas width="dashboard" bottomClearance="navigation" className="flex min-h-full flex-col gap-mx-lg" role="status" aria-busy="true" aria-live="polite" aria-label="Identificando unidade">
      <div className="flex items-center gap-mx-md rounded-2xl border border-border-subtle bg-white p-mx-lg">
        <RefreshCw className="h-mx-8 w-mx-8 animate-spin text-status-success-text" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-mx-xs">
          <Skeleton className="h-mx-8 w-56" />
          <Typography variant="caption" tone="muted" className="animate-pulse">Identificando unidade...</Typography>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-mx-lg sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-mx-xl rounded-2xl" />)}
      </div>
      <div className="grid min-h-[320px] grid-cols-1 gap-mx-lg xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <Skeleton className="h-full min-h-[320px] rounded-2xl" />
        <Skeleton className="h-full min-h-[320px] rounded-2xl" />
      </div>
    </PageCanvas>
  )
}

/** Skeleton de carregamento da aba performance. */
export function PerformanceLoadingSkeleton() {
  return (
    <div className="w-full h-full bg-surface-alt animate-in fade-in duration-500">
    <PageCanvas
      width="dashboard"
      className="flex flex-col gap-mx-lg"
      aria-busy="true"
      aria-live="polite"
      aria-label="Carregando performance"
    >
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-mx-lg border-b border-border pb-10">
        <div className="space-y-mx-xs">
          <Skeleton className="h-mx-10 w-full max-w-mx-64" />
          <Skeleton className="h-mx-xs w-full max-w-mx-48" />
        </div>
        <div className="flex gap-mx-sm">
          <Skeleton className="h-mx-14 w-mx-14 rounded-2xl" />
          <Skeleton className="h-mx-14 w-mx-48 rounded-2xl" />
        </div>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-mx-lg shrink-0">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-mx-xl rounded-2xl" />)}
      </div>
    </PageCanvas>
    </div>
  )
}

type OwnerStoreUnavailableProps = {
  requestedStoreForbidden: boolean
  storeResolutionIssue: string | null
}

/** EmptyState do Dono quando loja é fora do vínculo ou não localizada. */
export function OwnerStoreUnavailable({ requestedStoreForbidden, storeResolutionIssue }: OwnerStoreUnavailableProps) {
  const navigate = useNavigate()
  return (
    <div className="w-full h-full bg-surface-alt">
      <PageCanvas width="focused">
      <Card className="mx-auto max-w-2xl border-none bg-white">
        <EmptyState
          size="lg"
          icon={<Building2 />}
          title={requestedStoreForbidden ? 'Loja fora do seu vínculo' : 'Unidade não localizada'}
          description={
            requestedStoreForbidden
              ? 'Seu perfil de Dono não possui vínculo ativo com esta unidade.'
              : storeResolutionIssue || 'Não encontramos uma unidade ativa para abrir este painel.'
          }
          nextStep="Volte para a visão executiva da rede e escolha uma loja ativa. Se a loja foi renomeada ou criada recentemente, solicite ao Admin MX revisar seu vínculo."
          action={
            <Button onClick={() => navigate('/minhas-lojas', { replace: true })} className="rounded-mx-full bg-gray-900 px-mx-xl">
              Voltar para minhas lojas
            </Button>
          }
        />
      </Card>
      </PageCanvas>
    </div>
  )
}
