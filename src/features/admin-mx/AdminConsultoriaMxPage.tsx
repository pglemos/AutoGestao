import { ChevronDown, FileText, History as HistoryIcon, MoreHorizontal, Plus, RefreshCw, Sparkles } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { MxErrorState, MxLoadingState, MxModuleHeader, MxModulePage, MxSectionCard } from '@/components/module/MxModuleVisualPrimitives'
import { TabNav } from '@/components/molecules/TabNav'
import { METHODOLOGY_NAV_TABS } from './consultoria-mx/methodology'
import { useConsultoriaMxController, type ConsultoriaMxTab } from './consultoria-mx/useConsultoriaMx'
import { OverviewTab } from './consultoria-mx/OverviewTab'
import { MethodologyByProductTab } from './consultoria-mx/MethodologyByProductTab'
import { LibraryTab } from './consultoria-mx/LibraryTab'
import { ReportTemplatesTab } from './consultoria-mx/ReportTemplatesTab'
import { HistoryTab } from './consultoria-mx/HistoryTab'

type MenuContentProps = {
  align?: 'start' | 'center' | 'end'
  className?: string
  children?: ReactNode
}

type MenuItemProps = {
  children?: ReactNode
  disabled?: boolean
  onSelect?: () => void
}

const MenuContent = DropdownMenuContent as unknown as ComponentType<MenuContentProps>
const MenuItem = DropdownMenuItem as unknown as ComponentType<MenuItemProps>

export function AdminConsultoriaMxPage() {
  const controller = useConsultoriaMxController()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const go = (tab: ConsultoriaMxTab) => () => controller.setTab(tab)
  const activeNavigationTab = controller.tab === 'biblioteca'
    ? 'biblioteca'
    : controller.tab === 'relatorios'
    ? 'relatorios'
    : 'visao'

  return (
    <MxModulePage id="admin-mx-consultoria" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Sparkles}
          eyebrow="Administração MX"
          title="Consultoria MX"
          description="Configure a metodologia, os conteúdos e as entregas padrão de cada encontro da consultoria."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" size="sm" onClick={go('produtos')} aria-label="Configurar produto">
                <FileText size={14} />Configurar Produto
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" aria-label="Mais ações da metodologia">
                    <MoreHorizontal size={15} />Mais ações<ChevronDown size={14} aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <MenuContent align="end" className="w-60">
                  <MenuItem onSelect={controller.navigateToAddMaterial}><Plus size={16} />Adicionar material</MenuItem>
                  <MenuItem onSelect={controller.navigateToCreateReportTemplate}><FileText size={16} />Criar modelo de relatório</MenuItem>
                  <MenuItem onSelect={go('historico')}><HistoryIcon size={16} />Abrir histórico</MenuItem>
                  <MenuItem disabled={controller.loading} onSelect={() => void controller.refetch()}><RefreshCw size={16} />Atualizar metodologia</MenuItem>
                </MenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <TabNav
          tabs={METHODOLOGY_NAV_TABS.map(tab => ({ key: tab.id, label: tab.label }))}
          activeTab={activeNavigationTab}
          onTabChange={(tab) => controller.setTab(tab as ConsultoriaMxTab)}
          ariaLabel="Seções da metodologia"
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
