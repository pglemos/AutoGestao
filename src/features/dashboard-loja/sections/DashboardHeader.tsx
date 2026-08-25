import {
  Building2,
  CalendarDays,
  Globe,
  Receipt,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import type { MouseEvent } from 'react'
import { cn, slugify } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { TabNavPill } from '@/components/molecules/TabNavPill'
import { LastUpdated } from '@/components/molecules/LastUpdated'
import { Combobox, type ComboboxOption } from '@/components/atoms/Combobox'
import { isPerfilInternoMx } from '@/lib/auth/roles'
import type { Store, UserRole } from '@/types/database'
import { format, parseISO } from 'date-fns'
import type { ViewMode } from '../hooks/useDashboardLojaData'
import type { AdminLiveSummary } from '../lib/admin-live-overview'

export type DashboardTab = 'performance' | 'metas' | 'equipe' | 'vendas'

type DashboardHeaderProps = {
  role: UserRole | null
  isOwner: boolean
  storeName: string
  selectedStoreId: string | null
  selectableStores: Store[]
  setActiveStoreId: (id: string) => void
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  isRefetching: boolean
  syncWarning: string | null
  lastSyncAt: Date | null
  lastSyncLabel: string
  onRefresh: () => void
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  referenceDate: string
  startDate: string
  setStartDate: (d: string) => void
  endDate: string
  setEndDate: (d: string) => void
  liveSummary?: AdminLiveSummary | null
}

const LOJA_TABS = [
  { key: 'performance' as const, label: 'Performance', mobileLabel: 'Perf.', icon: Globe },
  { key: 'metas' as const, label: 'Metas', mobileLabel: 'Metas', icon: Target },
  { key: 'equipe' as const, label: 'Equipe', mobileLabel: 'Equipe', icon: Users },
  { key: 'vendas' as const, label: 'Vendas', mobileLabel: 'Vendas', icon: Receipt },
]

const PERIODO_TABS = [
  { key: 'month' as const, label: 'Mês' },
  { key: 'day' as const, label: 'D-1' },
]

export function DashboardHeader({
  role,
  isOwner,
  storeName,
  selectedStoreId,
  selectableStores,
  setActiveStoreId,
  activeTab,
  onTabChange,
  isRefetching,
  syncWarning,
  lastSyncAt,
  lastSyncLabel,
  onRefresh,
  viewMode,
  setViewMode,
  referenceDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  liveSummary = null,
}: DashboardHeaderProps) {
  const navigate = useNavigate()

  const periodContext = viewMode === 'day'
    ? {
        title: 'Leitura D-1',
        description: `Dados do dia de referência ${format(parseISO(referenceDate), 'dd/MM/yyyy')}.`,
      }
    : {
        title: 'Intervalo manual',
        description: `Dados consolidados de ${format(parseISO(startDate), 'dd/MM/yyyy')} até ${format(parseISO(endDate), 'dd/MM/yyyy')}.`,
      }

  const storeOptions: ComboboxOption<string>[] = selectableStores.map(store => ({
    value: store.id,
    label: store.name,
    keywords: `${slugify(store.name)} ${store.id}`,
  }))

  const navigateToStore = (newStoreId: string) => {
    const newStore = selectableStores.find(store => store.id === newStoreId)
    if (!newStore) return
    setActiveStoreId(newStoreId)
    navigate(`/lojas/${slugify(newStore.name)}?id=${newStoreId}${activeTab === 'performance' ? '' : `&tab=${activeTab}`}`)
  }

  if (isPerfilInternoMx(role)) {
    return (
      <>
        <header data-mx-module-header="" className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-status-success-surface text-status-success-text">
                <Building2 size={20} />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-foreground">Visão da unidade</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Acompanhe resultado, execução da equipe e qualidade dos fechamentos.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Combobox
                label="Selecionar unidade"
                value={selectedStoreId || undefined}
                onValueChange={navigateToStore}
                options={storeOptions}
                placeholder="Selecionar unidade"
                searchPlaceholder="Buscar unidade por nome..."
                emptyLabel="Nenhuma unidade encontrada."
                className="!h-mx-11 w-full sm:min-w-64 sm:w-64"
              />

              <TabNavPill tabs={LOJA_TABS} activeTab={activeTab} onTabChange={onTabChange} buttonClassName="h-mx-11 px-3" aria-label="Abas da loja" />

              {activeTab === 'performance' && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefetching}
                  aria-label={`Atualizar performance. ${lastSyncLabel}`}
                  title={lastSyncLabel}
                  className="inline-flex min-h-mx-11 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primary-hover disabled:opacity-50"
                >
                  <RefreshCw size={15} className={cn(isRefetching && 'animate-spin')} />
                  Atualizar
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <LastUpdated value={lastSyncAt} label="Performance" emptyLabel="Ainda não atualizada nesta sessão" />
          {syncWarning && (
            <div role="alert" aria-live="polite" className="rounded-xl border border-status-warning/20 bg-status-warning-surface px-3 py-2 text-xs font-medium text-status-warning-text">
              {syncWarning}
            </div>
          )}
        </div>

        {activeTab === 'performance' && (
          <LivePrioritySummary summary={liveSummary} />
        )}

        {activeTab === 'performance' && (
          <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-end">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-info-surface text-status-info-text">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <h2 className="font-semibold text-foreground">{periodContext.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{periodContext.description}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <TabNavPill tabs={PERIODO_TABS} activeTab={viewMode} onTabChange={(mode) => setViewMode(mode as ViewMode)} buttonClassName="h-mx-11 px-5" aria-label="Período do dashboard" />

                <label className="text-xs text-muted-foreground">
                  Início
                  <input
                    type="date"
                    aria-label="Data inicial do período"
                    disabled={viewMode === 'day'}
                    value={startDate}
                    onChange={event => {
                      setStartDate(event.target.value)
                      setViewMode('month')
                    }}
                    className="mt-1 block h-mx-11 rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-status-success disabled:bg-surface-alt disabled:text-muted-foreground"
                  />
                </label>

                <label className="text-xs text-muted-foreground">
                  Fim
                  <input
                    type="date"
                    aria-label="Data final do período"
                    disabled={viewMode === 'day'}
                    value={endDate}
                    onChange={event => {
                      setEndDate(event.target.value)
                      setViewMode('month')
                    }}
                    className="mt-1 block h-mx-11 rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-status-success disabled:bg-surface-alt disabled:text-muted-foreground"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => onTabChange('metas')}
                className="inline-flex min-h-mx-11 items-center justify-center gap-2 rounded-xl border border-status-success/30 px-3 text-sm font-semibold text-status-success-text hover:bg-status-success-surface"
              >
                <Target size={15} />
                Ver metas
              </button>
            </div>
          </section>
        )}
      </>
    )
  }

  return (
    <>
      <header data-mx-module-header="" className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-status-success-surface text-status-success-text">
              <Building2 size={20} />
            </span>
            <div className="min-w-0">
              <Typography variant="tiny" tone="brand" className="opacity-60 text-mx-tiny">
                Status de Unidade
              </Typography>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl break-words">
                {storeName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOwner && selectableStores.length > 1 && (
              <Combobox
                label="Trocar unidade"
                value={selectedStoreId || undefined}
                onValueChange={navigateToStore}
                options={storeOptions}
                placeholder="Selecionar unidade"
                searchPlaceholder="Buscar unidade por nome..."
                emptyLabel="Nenhuma unidade encontrada."
                className="!h-mx-11 w-full sm:min-w-64 sm:w-64"
              />
            )}
            <TabNavPill tabs={LOJA_TABS} activeTab={activeTab} onTabChange={onTabChange} className="mx-store-dashboard-tabs max-w-full overflow-x-auto" buttonClassName="h-mx-11 px-2 sm:px-6 shrink-0" aria-label="Abas da loja" />

            {activeTab === 'performance' && (
              <Button variant="outline" onClick={onRefresh} aria-label={`Atualizar performance. ${lastSyncLabel}`} title={lastSyncLabel} className="h-mx-11 bg-white px-mx-md hover:bg-surface-alt">
                <RefreshCw size={15} className={cn(isRefetching && 'animate-spin')} />
                Atualizar
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-mx-sm sm:flex-row sm:items-center sm:justify-between">
        <LastUpdated value={lastSyncAt} label="Performance" emptyLabel="Ainda não atualizada nesta sessão" />
        {syncWarning && (
          <div role="alert" aria-live="polite" className="rounded-xl border border-status-warning/20 bg-status-warning-surface px-mx-md py-mx-sm text-mx-tiny font-bold uppercase tracking-tight text-status-warning-text">
            {syncWarning}
          </div>
        )}
      </div>

      {activeTab === 'performance' && (
        <Card className="border bg-white p-mx-md">
          <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-[auto_1fr_auto] xl:items-center">
            <div className="min-w-0">
              <Typography variant="h3" className="tracking-tight">{periodContext.title}</Typography>
              <Typography variant="p" tone="muted" className="mt-mx-tiny text-sm">{periodContext.description}</Typography>
            </div>
            <div className="flex flex-col gap-mx-sm sm:flex-row sm:items-center">
              <TabNavPill tabs={PERIODO_TABS} activeTab={viewMode} onTabChange={(mode) => setViewMode(mode as ViewMode)} buttonClassName="h-mx-11 px-5" aria-label="Período do dashboard" />
              <div className={cn(
                'grid grid-cols-1 gap-mx-sm rounded-xl border border-border-subtle bg-surface-alt p-mx-sm sm:grid-cols-2',
                viewMode === 'day' && 'opacity-50',
              )}>
                <label className="space-y-mx-tiny">
                  <span className="block text-mx-micro font-bold uppercase tracking-widest text-muted-foreground">Início</span>
                  <input type="date" aria-label="Data inicial do período" disabled={viewMode === 'day'} value={startDate} onChange={event => { setStartDate(event.target.value); setViewMode('month') }} className="h-mx-12 w-full min-w-mx-40 rounded-xl border border-border-subtle bg-white px-mx-sm text-sm font-bold text-foreground outline-none focus:border-brand-primary" />
                </label>
                <label className="space-y-mx-tiny">
                  <span className="block text-mx-micro font-bold uppercase tracking-widest text-muted-foreground">Fim</span>
                  <input type="date" aria-label="Data final do período" disabled={viewMode === 'day'} value={endDate} onChange={event => { setEndDate(event.target.value); setViewMode('month') }} className="h-mx-12 w-full min-w-mx-40 rounded-xl border border-border-subtle bg-white px-mx-sm text-sm font-bold text-foreground outline-none focus:border-brand-primary" />
                </label>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => onTabChange('metas')} className="h-mx-11 rounded-2xl bg-white border-border-subtle hover:bg-surface-alt">
              <Target size={16} className="mr-2" />
              Metas que alimentam a leitura
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}

function LivePrioritySummary({ summary }: { summary: AdminLiveSummary | null }) {
  const scrollToSellers = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const target = document.getElementById('admin-live-sellers')
    if (!target) return
    window.history.replaceState(null, '', '#admin-live-sellers')
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section aria-label="Prioridades operacionais" className="flex flex-col gap-3 border-y border-border-subtle px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Prioridades de hoje</p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {summary
            ? `${summary.pending} fechamento${summary.pending === 1 ? '' : 's'} pendente${summary.pending === 1 ? '' : 's'}${summary.divergences ? ` · ${summary.divergences} divergência${summary.divergences === 1 ? '' : 's'} para revisar` : ''}`
            : 'Consultando fechamentos e divergências...'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {summary?.pending ? (
          <a href="#admin-live-sellers" onClick={scrollToSellers} className="inline-flex min-h-mx-11 items-center rounded-xl border border-status-warning/30 bg-status-warning-surface px-3 text-sm font-semibold text-status-warning-text hover:bg-status-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2">
            Ver pendências
          </a>
        ) : null}
        {summary?.divergences ? (
          <a href="#admin-live-sellers" onClick={scrollToSellers} className="inline-flex min-h-mx-11 items-center rounded-xl border border-status-error/20 bg-status-error-surface px-3 text-sm font-semibold text-status-error-text hover:bg-status-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2">
            Revisar divergências
          </a>
        ) : null}
      </div>
    </section>
  )
}

export default DashboardHeader
