import { Activity, Package, ShieldCheck, Users, UserRoundCheck } from 'lucide-react'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'
import type { DigitalProductMetrics as Metrics } from '../types'

export function DigitalProductMetrics({ metrics }: { metrics: Metrics }) {
  return (
    <MxMetricGrid className="xl:grid-cols-5">
      <MxMetricCard title="Total" value={metrics.total} detail="Produtos visíveis no contexto atual" icon={Package} />
      <MxMetricCard title="Ativos" value={metrics.ativos} detail="Itens publicados no catálogo" icon={ShieldCheck} tone="success" />
      <MxMetricCard title="Públicos" value={metrics.audiencesCovered} detail="Perfis cobertos pelos produtos" icon={Users} tone="info" />
      <MxMetricCard title="Vendedores" value={metrics.vendedores} detail="Produtos destinados ao time comercial" icon={UserRoundCheck} tone="violet" />
      <MxMetricCard title="Engajamento" value={metrics.usageTelemetry} detail="Métrica ainda não integrada" icon={Activity} tone="neutral" />
    </MxMetricGrid>
  )
}
