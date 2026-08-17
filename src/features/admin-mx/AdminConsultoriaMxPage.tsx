import { FileText, History as HistoryIcon, Plus, RefreshCw, Sparkles } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { MxErrorState, MxLoadingState, MxModuleHeader, MxModulePage, MxSectionCard } from '@/components/module/MxModuleVisualPrimitives'
import { TabNav } from '@/components/molecules/TabNav'
import { METHODOLOGY_TABS } from './consultoria-mx/methodology'
import { useConsultoriaMxController, type ConsultoriaMxTab } from './consultoria-mx/useConsultoriaMx'
import { OverviewTab } from './consultoria-mx/OverviewTab'
import { MethodologyByProductTab } from './consultoria-mx/MethodologyByProductTab'
import { LibraryTab } from './consultoria-mx/LibraryTab'
import { ReportTemplatesTab } from './consultoria-mx/ReportTemplatesTab'
import { HistoryTab } from './consultoria-mx/HistoryTab'

export function AdminConsultoriaMxPage() {
  const controller = useConsultoriaMxController()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const go = (tab: ConsultoriaMxTab) => () => controller.setTab(tab)

  return (
    <MxModulePage id="admin-mx-consultoria" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Sparkles}
          eyebrow="Administração MX"
          title="Consultoria MX"
          description="Configure a metodologia, os conteúdos e as entregas padrão de cada encontro da consultoria."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={go('produtos')} aria-label="Configurar produto">
                <FileText size={14} />Configurar Produto
              </Button>
              <Button variant="outline" size="sm" onClick={go('biblioteca')} aria-label="Adicionar material">
                <Plus size={14} />Adicionar Material
              </Button>
              <Button variant="outline" size="sm" onClick={go('relatorios')} aria-label="Criar modelo de relatório">
                <FileText size={14} />Criar Modelo de Relatório
              </Button>
              <Button variant="outline" size="sm" onClick={go('historico')} aria-label="Abrir histórico">
                <HistoryIcon size={14} />Abrir Histórico
              </Button>
              <Button variant="outline" onClick={() => void controller.refetch()} aria-label="Atualizar metodologia">
                <RefreshCw size={16} />Atualizar
              </Button>
            </div>
          }
        />

        <TabNav
          tabs={METHODOLOGY_TABS.map(tab => ({ key: tab.id, label: tab.label }))}
          activeTab={controller.tab}
          onTabChange={(tab) => controller.setTab(tab as ConsultoriaMxTab)}
          scrollable
        />

        {controller.loading ? (
          <MxSectionCard><div className="p-5"><MxLoadingState label="Carregando metodologia" /></div></MxSectionCard>
        ) : controller.error ? (
          <MxSectionCard><div className="p-5"><MxErrorState description={controller.error} retry={() => void controller.refetch()} /></div></MxSectionCard>
        ) : (
          <>
            {controller.tab === 'visao' && <OverviewTab rows={controller.rows} onNavigate={controller.setTab} />}
            {controller.tab === 'produtos' && (
              <MethodologyByProductTab
                rows={controller.rows}
                loading={controller.loading}
                error={controller.error}
                controller={controller}
              />
            )}
            {controller.tab === 'biblioteca' && <LibraryTab controller={controller} products={controller.rows} />}
            {controller.tab === 'relatorios' && <ReportTemplatesTab controller={controller} products={controller.rows} />}
            {controller.tab === 'historico' && <HistoryTab />}
          </>
        )}
      </div>
    </MxModulePage>
  )
}

export default AdminConsultoriaMxPage
