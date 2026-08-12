import { useState } from 'react'
import { RefreshCw, Zap } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxErrorState, MxLoadingState, MxModuleHeader, MxModulePage, MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useOperationalDiagnosticsController } from './hooks/useOperationalDiagnosticsController'
import { DiagnosticFindingTable } from './components/DiagnosticFindingTable'
import { DiagnosticDetailDrawer } from './components/DiagnosticDetailDrawer'
import { CorrectiveActionPanel } from './components/CorrectiveActionPanel'
import { DiagnosticMetrics } from './sections/DiagnosticMetrics'
import { DiagnosticFilters } from './sections/DiagnosticFilters'
import { DiagnosticHistory } from './sections/DiagnosticHistory'
import type { DiagnosticFinding } from './types'

export function OperationalDiagnosticsPage() {
  const state = useOperationalDiagnosticsController()
  const [selected, setSelected] = useState<DiagnosticFinding | null>(null)
  if (!state.internal && state.role !== 'gerente') return <MxModulePage id="diagnostic-forbidden"><MxErrorState title="Acesso restrito" description="Diagnóstico operacional disponível para Admin MX e Gerente." /></MxModulePage>
  return <MxModulePage id="operational-diagnostics"><MxModuleHeader eyebrow="Relatórios e diagnóstico" title="Diagnóstico Operacional" description="Leitura do funil MX 20/60/33 com evidências e orientação de ação." actions={<Button onClick={state.refresh} disabled={state.refreshing}><RefreshCw size={18} className={state.refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />Atualizar</Button>} />{state.error && state.checkins.length ? <MxStatusBanner tone="warning">Dados anteriores preservados. {state.error}</MxStatusBanner> : null}{state.loading && !state.checkins.length ? <MxLoadingState label="Carregando diagnóstico" /> : state.error && !state.checkins.length ? <MxErrorState description={state.error} retry={state.refresh} /> : <><DiagnosticMetrics funnel={state.funnel} /><DiagnosticFilters /><MxSectionCard><MxSectionHeader title="Achados" description="Evidências e prioridades identificadas na leitura atual." actions={<Zap size={18} className="text-status-success-text" />} /><div className="p-5"><DiagnosticFindingTable findings={state.findings} onSelect={setSelected} /></div></MxSectionCard><CorrectiveActionPanel finding={selected || state.findings[0] || null} /><DiagnosticHistory /></>}<DiagnosticDetailDrawer finding={selected} onClose={() => setSelected(null)} /></MxModulePage>
}
export default OperationalDiagnosticsPage
