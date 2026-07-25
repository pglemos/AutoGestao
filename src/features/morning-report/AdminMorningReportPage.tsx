import { Download, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { MxField, MxMetricCard, MxMetricGrid, MxTableSurface, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import { Activity, Building2, CheckCircle2, Target } from 'lucide-react'
import { ReportPageShell } from '@/features/internal-reports/ReportPageShell'
import { useAdminMorningReportController } from './hooks/useAdminMorningReportController'

export default function AdminMorningReportPage() {
  const state = useAdminMorningReportController()
  return (
    <ReportPageShell
      id="morning-report"
      eyebrow="Relatórios e diagnóstico"
      title="Relatório matinal"
      description="Consolidação diária da rede, fechamentos, volume e disciplina operacional."
      loading={state.loading}
      refreshing={state.refreshing}
      error={state.error}
      hasData={state.allRows.length > 0}
      onRetry={state.refresh}
      actions={(
        <>
          <Button variant="managerSecondary" size="icon" onClick={() => void state.refresh()} aria-label="Atualizar relatório">
            <RefreshCw size={18} className={state.refreshing ? 'animate-spin' : ''} />
          </Button>
          <Button variant="managerSecondary" onClick={state.exportCsv} disabled={state.allRows.length === 0}>
            <Download size={18} /> Exportar CSV
          </Button>
        </>
      )}
      filters={(
        <MxToolbar>
          <MxField label="Buscar unidade" className="w-full sm:max-w-sm">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input value={state.search} onChange={event => state.setSearch(event.target.value)} className="pl-9" placeholder="Nome da unidade" />
            </div>
          </MxField>
          <span className="text-xs text-gray-500">{state.lastUpdatedAt ? `Atualizado às ${state.lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando atualização'}</span>
        </MxToolbar>
      )}
      metrics={(
        <MxMetricGrid>
          <MxMetricCard title="Unidades" value={state.summary.stores} detail="Unidades ativas na leitura" icon={Building2} />
          <MxMetricCard title="Vendas informadas" value={state.summary.sales} detail="Referência diária consolidada" icon={Activity} tone="info" />
          <MxMetricCard title="Atingimento" value={`${state.summary.attainment}%`} detail={`Meta consolidada: ${state.summary.goal}`} icon={Target} tone={state.summary.attainment >= 100 ? 'success' : 'warning'} />
          <MxMetricCard title="Disciplina" value={`${state.summary.discipline}%`} detail={`${state.summary.checkedIn} de ${state.summary.sellers} vendedores`} icon={CheckCircle2} tone={state.summary.discipline >= 90 ? 'success' : 'warning'} />
        </MxMetricGrid>
      )}
    >
      <MxTableSurface>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr><th className="px-4 py-3">Unidade</th><th className="px-4 py-3 text-right">Vendas</th><th className="px-4 py-3 text-right">Meta</th><th className="px-4 py-3 text-right">Fechamentos</th><th className="px-4 py-3 text-right">Leads</th><th className="px-4 py-3 text-right">Visitas</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {state.rows.map(row => <tr key={row.storeId}><td className="px-4 py-3 font-medium text-gray-800">{row.storeName}</td><td className="px-4 py-3 text-right tabular-nums">{row.sales}</td><td className="px-4 py-3 text-right tabular-nums">{row.goal}</td><td className="px-4 py-3 text-right tabular-nums">{row.checkedIn}/{row.sellers}</td><td className="px-4 py-3 text-right tabular-nums">{row.leads}</td><td className="px-4 py-3 text-right tabular-nums">{row.visits}</td></tr>)}
          </tbody>
        </table>
      </MxTableSurface>
    </ReportPageShell>
  )
}
