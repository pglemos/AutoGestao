import { ArrowLeft, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { MxEmptyState, MxErrorState, MxField, MxLoadingState, MxModuleHeader, MxModulePage, MxStatusBanner, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'
import { useSellerPerformanceController } from './hooks/useSellerPerformanceController'
import { SellerPerformanceSummary } from './sections/SellerPerformanceSummary'
import { SellerPerformanceCharts } from './sections/SellerPerformanceCharts'
import { SellerPerformanceTable } from './sections/SellerPerformanceTable'

export function SellerPerformancePage() {
  const state = useSellerPerformanceController()
  const navigate = useNavigate()
  return <MxModulePage id="seller-performance"><MxModuleHeader eyebrow="Relatórios e diagnóstico" title="Performance por Vendedor" description="Leitura individual e comparativa com contexto único de vendedor e loja." actions={<><Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft size={18} />Voltar</Button><Button variant="secondary" onClick={() => void state.refresh()} disabled={state.refreshing}><RefreshCw size={18} className={state.refreshing ? 'animate-spin motion-reduce:animate-none' : ''} />Atualizar</Button></>} />{state.error && state.ranking.length ? <MxStatusBanner tone="warning">Dados anteriores preservados. {state.error}</MxStatusBanner> : null}<MxToolbar><MxField label="Buscar vendedor" className="min-w-[240px] flex-1"><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input className="pl-9" value={state.search} onChange={event => state.setSearch(event.target.value)} /></div></MxField></MxToolbar>{state.loading ? <MxLoadingState label="Carregando vendedores" /> : state.error && !state.ranking.length ? <MxErrorState description={state.error} retry={() => void state.refresh()} /> : state.outOfScope ? <MxErrorState title="Fora do escopo autorizado" description="O vendedor selecionado não pertence à loja informada." /> : <>{state.selected ? <><SellerPerformanceSummary seller={state.selected} /><SellerPerformanceCharts seller={state.selected} /></> : <MxEmptyState title="Selecione um vendedor" description="Use a tabela abaixo para abrir a leitura individual." />}<SellerPerformanceTable rows={state.rows} onSelect={state.selectSeller} /></>}</MxModulePage>
}
export default SellerPerformancePage
