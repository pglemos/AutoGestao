import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { MxModuleHeader } from '@/components/module/MxModuleVisualPrimitives'

export function NetworkDashboardHeader({ refreshing, lastUpdatedAt, realtimeStatus, onRefresh }: {
  refreshing: boolean
  lastUpdatedAt: Date | null
  realtimeStatus: 'connecting' | 'connected' | 'degraded'
  onRefresh: () => void
}) {
  return (
    <MxModuleHeader
      eyebrow="Rede e gestão"
      title="Painel Geral"
      description={lastUpdatedAt ? `Visão consolidada da rede. Atualizado às ${lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : 'Visão consolidada da rede, disciplina operacional e prioridades.'}
      actions={(
        <>
          <Badge variant={realtimeStatus === 'connected' ? 'success' : realtimeStatus === 'degraded' ? 'warning' : 'outline'}>
            {realtimeStatus === 'connected' ? <><Wifi size={14} aria-hidden="true" /> Tempo real ativo</> : realtimeStatus === 'degraded' ? <><WifiOff size={14} aria-hidden="true" /> Atualização manual</> : <><RefreshCw size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Conectando</>}
          </Badge>
          <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={18} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />
            Atualizar
          </Button>
        </>
      )}
    />
  )
}
