import { Edit3, PlusCircle, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import StrategicHeader from '@/components/owner/strategic/StrategicHeader'
import StrategicPlanTabs from '@/components/owner/strategic/StrategicPlanTabs'
import StrategicIndicatorSelector from '@/components/owner/strategic/StrategicIndicatorSelector'
import StrategicIndicatorSummaryCards from '@/components/owner/strategic/StrategicIndicatorSummaryCards'
import StrategicIndicatorReading from '@/components/owner/strategic/StrategicIndicatorReading'
import StrategicIndicatorGuidance from '@/components/owner/strategic/StrategicIndicatorGuidance'
import StrategicIndicatorComparisonTable from '@/components/owner/strategic/StrategicIndicatorComparisonTable'
import StrategicIndicatorChart from '@/components/owner/strategic/StrategicIndicatorChart'
import StrategicPlanOverview from '@/components/owner/strategic/StrategicPlanOverview'
import EditTargetsDrawer from '@/components/owner/strategic/EditTargetsDrawer'
import CreateActionModal from '@/components/owner/strategic/CreateActionModal'
import StrategicExportMenu from '@/components/owner/strategic/StrategicExportMenu'
import TargetHistoryPanel from '@/components/owner/strategic/TargetHistoryPanel'
import FiltersDrawer from '@/components/owner/strategic/FiltersDrawer'
import DisplayModeSelector from '@/components/owner/strategic/DisplayModeSelector'
import { usePlanningWorkspace } from '@/features/planning-workspace'
import { useStrategicPlanController, type StrategicPlanController } from './useStrategicPlanController'

export function StrategicPlanWorkspace({ onUpdated }: { onUpdated?: (at: Date) => void }) {
  const controller = useStrategicPlanController({ onUpdated })
  return <StrategicPlanView controller={controller} />
}

export function StrategicPlanView({ controller }: { controller: StrategicPlanController }) {
  const { shell, capabilities, storeId } = usePlanningWorkspace()
  const pageClass = shell === 'owner'
    ? 'flex min-h-0 flex-1 flex-col space-y-6 pb-20 lg:pb-0'
    : 'space-y-4'

  if (controller.loading) {
    return (
      <div id="page-plano-estrategico" aria-label="Plano Estratégico" className={pageClass} aria-busy="true">
        <div className="space-y-4">
          {shell === 'owner' ? <div className="h-16 animate-pulse rounded-lg bg-white/60" /> : null}
          <div className="h-10 w-64 animate-pulse rounded-lg bg-white/60" />
          <div className="h-16 animate-pulse rounded-xl bg-white/60" />
          <div className="h-28 animate-pulse rounded-xl bg-white/60" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[58%_42%]">
            <div className="h-[360px] animate-pulse rounded-xl bg-white/60" />
            <div className="h-[360px] animate-pulse rounded-xl bg-white/60" />
          </div>
        </div>
      </div>
    )
  }

  if (controller.error) {
    return (
      <div id="page-plano-estrategico" aria-label="Plano Estratégico" className={pageClass}>
        <div className="rounded-xl border border-destructive/30 bg-card p-6" role="alert">
          <h2 className="text-lg font-semibold text-foreground">Não foi possível carregar o Plano Estratégico</h2>
          <p className="mt-2 text-sm text-muted-foreground">{controller.error}</p>
          <Button className="mt-4" onClick={() => void controller.reload()}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  if (!storeId) {
    return (
      <div id="page-plano-estrategico" aria-label="Plano Estratégico" className={pageClass}>
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Selecione uma loja para carregar o Plano Estratégico.
        </div>
      </div>
    )
  }

  return (
    <div id="page-plano-estrategico" aria-label="Plano Estratégico" className={pageClass}>
      <div className="space-y-4">
        {shell === 'owner' ? <StrategicHeader /> : null}
        <StrategicPlanTabs tab={controller.tab} onTabChange={controller.setTab} />

        {controller.tab === 'resumo' && controller.indicator ? (
          <section id="spe-tab-panel-resumo" role="tabpanel" aria-label="Resumo" className="space-y-4">
            <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-2.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <StrategicIndicatorSelector
                  value={controller.selectedIndicatorId}
                  onChange={controller.setSelectedIndicatorId}
                  areaFilter={controller.areaFilter}
                  onAreaFilterChange={controller.setAreaFilter}
                  compact
                />
                <DisplayModeSelector
                  value={controller.displayMode}
                  onChange={controller.setDisplayMode}
                  hideBoth={controller.isMobile}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => controller.setFiltersOpen(true)} className="text-muted-foreground">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                </Button>
                {capabilities.canEditTargets ? (
                  <Button variant="outline" size="sm" onClick={() => controller.setEditOpen(true)}>
                    <Edit3 className="h-4 w-4" /> Editar Metas
                  </Button>
                ) : null}
                {capabilities.canCreateActions ? (
                  <Button
                    variant={controller.isActionPrimary ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => controller.setActionOpen(true)}
                  >
                    <PlusCircle className="h-4 w-4" /> {controller.existingAction ? 'Plano criado' : 'Criar Plano de Ação'}
                  </Button>
                ) : null}
                <StrategicExportMenu
                  repository={controller.repository}
                  indicatorId={controller.selectedIndicatorId}
                  year={controller.year}
                />
              </div>
            </div>

            <StrategicIndicatorSummaryCards series={controller.indicator} />

            <div className={`grid grid-cols-1 gap-4 ${controller.effectiveDisplayMode === 'both' ? 'xl:grid-cols-[58%_42%]' : ''}`}>
              {controller.effectiveDisplayMode !== 'chart' ? (
                <StrategicIndicatorComparisonTable series={controller.indicator} height={360} />
              ) : null}
              {controller.effectiveDisplayMode !== 'table' ? (
                <StrategicIndicatorChart series={controller.indicator} height={360} />
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <StrategicIndicatorReading series={controller.indicator} />
              <StrategicIndicatorGuidance
                series={controller.indicator}
                onCreateAction={() => controller.setActionOpen(true)}
              />
            </div>

            <TargetHistoryPanel
              repository={controller.repository}
              indicatorId={controller.selectedIndicatorId}
              year={controller.year}
              onRestored={() => void controller.handleSaved()}
            />
          </section>
        ) : null}

        {controller.tab === 'visao-geral' ? (
          <section id="spe-tab-panel-visao-geral" role="tabpanel" aria-label="Visão Geral">
            <StrategicPlanOverview
            repository={controller.repository}
            onCardClick={controller.handleCardClick}
            onRowClick={controller.handleRowClick}
            year={controller.year}
            refreshKey={controller.refreshKey}
          />
          </section>
        ) : null}

        {capabilities.canEditTargets ? (
          <EditTargetsDrawer
            repository={controller.repository}
            open={controller.editOpen}
            onOpenChange={controller.setEditOpen}
            indicator={controller.indicator}
            year={controller.year}
            onSaved={() => void controller.handleSaved()}
          />
        ) : null}
        {capabilities.canCreateActions ? (
          <CreateActionModal
            repository={controller.repository}
            open={controller.actionOpen}
            onOpenChange={controller.setActionOpen}
            indicator={controller.indicator}
            year={controller.year}
            onCreated={() => void controller.handleSaved()}
          />
        ) : null}
        <FiltersDrawer open={controller.filtersOpen} onOpenChange={controller.setFiltersOpen} />
      </div>
    </div>
  )
}
