import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxModuleHeader } from '@/components/module/MxModuleVisualPrimitives'

export function NetworkDashboardHeader({ refreshing, lastUpdatedAt, onRefresh }: {
  refreshing: boolean
  lastUpdatedAt: Date | null
  onRefresh: () => void
}) {
  return (
    <MxModuleHeader
      eyebrow="Rede e gestão"
      title="Painel Geral"
      description={lastUpdatedAt ? `Visão consolidada da rede. Atualizado às ${lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : 'Visão consolidada da rede, disciplina operacional e prioridades.'}
      actions={(
        <Button variant="managerSecondary" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={18} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
          Atualizar
        </Button>
      )}
    />
  )
}
