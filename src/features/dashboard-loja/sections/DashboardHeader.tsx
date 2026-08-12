import {
  Building2,
  CalendarDays,
  ChevronDown,
  Globe,
  Receipt,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import { cn, slugify } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { TabNavPill } from '@/components/molecules/TabNavPill'
import { LastUpdated } from '@/components/molecules/LastUpdated'
import { isPerfilInternoMx } from '@/hooks/useAuth'
import type { Store, UserRole } from '@/types/database'
import { format, parseISO } from 'date-fns'
import type { ViewMode } from '../hooks/useDashboardLojaData'

export type DashboardTab = 'performance' | 'metas' | 'equipe'

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
}

const LOJA_TABS = [
  { key: 'performance' as const, label: 'Performance', mobileLabel: 'Perf.', icon: Globe },
  { key: 'metas' as const, label: 'Metas', mobileLabel: 'Metas', icon: Target },
  { key: 'equipe' as const, label: 'Equipe', mobileLabel: 'Equipe', icon: Users },
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

  const navigateToStore = (newStoreId: string) => {
    const newStore = selectableStores.find(store => store.id === newStoreId)
    if (!newStore) return
    setActiveStoreId(newStoreId)
    navigate(`/lojas/${slugify(newStore.name)}?id=${newStoreId}${activeTab === 'performance' ? '' : `&tab=${activeTab}`}`)
  }

  if (isPerfilInternoMx(role)) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <header data-mx-module-header="" className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
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
              <label className="relative min-w-48">
                <Building2 size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  id="store-dashboard-select"
                  name="store-dashboard-select"
                  aria-label="Selecionar unidade"
                  value={selectedStoreId || ''}
                  onChange={event => navigateToStore(event.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-border bg-white pl-9 pr-8 text-sm font-semibold text-foreground outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {selectableStores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </label>

              <nav className="flex rounded-xl bg-gray-100 p-1" aria-label="Abas da loja">
                {LOJA_TABS.map(tab => {
                  const Icon = tab.icon
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => onTabChange(tab.key)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${active ? 'bg-white text-emerald-700 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Icon size={14} />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.mobileLabel}</span>
                    </button>
                  )
                })}
              </nav>

              {activeTab === 'performance' && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefetching}
                  aria-label={`Atualizar performance. ${lastSyncLabel}`}
                  title={lastSyncLabel}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <RefreshCw size={15} className={cn(isRefetching && 'animate-spin')} />
                  Atualizar
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <LastUpdated value={lastSyncAt} />
          {syncWarning && (
            <div role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              {syncWarning}
            </div>
          )}
        </div>

        {activeTab === 'performance' && (
          <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-end">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <h2 className="font-semibold text-foreground">{periodContext.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{periodContext.description}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex h-10 rounded-xl bg-gray-100 p-1">
                  {PERIODO_TABS.map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setViewMode(tab.key)}
                      className={`rounded-lg px-4 text-xs font-semibold transition ${viewMode === tab.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-muted-foreground'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

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
                    className="mt-1 block h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-muted-foreground"
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
                    className="mt-1 block h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-muted-foreground"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => onTabChange('metas')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Target size={15} />
                Ver metas
              </button>
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <>
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-mx-md md:gap-mx-lg border-b border-border pb-10 shrink-0">
        <div className="flex flex-col gap-mx-xs text-center xl:text-left min-w-0">
          <Typography variant="tiny" tone="brand" className="opacity-60 text-mx-tiny">
            Status de Unidade
          </Typography>
          <div className="flex items-center justify-center lg:justify-start gap-mx-sm">
            <div className="h-mx-10 w-mx-xs shrink-0 rounded-mx-full bg-emerald-600 shadow-sm" aria-hidden="true" />
            <Typography variant="h1" className="max-w-full text-3xl sm:text-5xl tracking-tighter break-words">
              {storeName}
            </Typography>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center xl:justify-end gap-mx-sm shrink-0 w-full xl:w-auto max-w-full">
          {isOwner && selectableStores.length > 1 && (
            <label htmlFor="owner-store-select" className="flex w-full flex-col gap-mx-tiny rounded-xl border border-border-subtle bg-white px-mx-md py-mx-xs shadow-sm sm:w-mx-sidebar-expanded">
              <span className="text-mx-micro font-bold uppercase tracking-widest text-muted-foreground">Trocar unidade</span>
              <select
                aria-label="Trocar unidade"
                id="owner-store-select"
                name="owner-store-select"
                value={selectedStoreId || ''}
                onChange={event => navigateToStore(event.target.value)}
                className="min-w-0 bg-transparent text-sm font-bold uppercase text-foreground outline-none"
              >
                {selectableStores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </label>
          )}
          <TabNavPill tabs={LOJA_TABS} activeTab={activeTab} onTabChange={onTabChange} className="mx-store-dashboard-tabs max-w-full overflow-x-auto" buttonClassName="h-mx-8 sm:h-mx-10 px-2 sm:px-6 shrink-0" aria-label="Abas da loja" />

          {activeTab === 'performance' && (
            <Button variant="outline" onClick={onRefresh} aria-label={`Atualizar performance. ${lastSyncLabel}`} title={lastSyncLabel} className="h-mx-10 sm:h-mx-14 bg-white px-mx-md hover:bg-gray-50">
              <RefreshCw size={18} className={cn(isRefetching && 'animate-spin')} />
              Atualizar
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-mx-sm sm:flex-row sm:items-center sm:justify-between">
        <LastUpdated value={lastSyncAt} />
        {syncWarning && (
          <div role="alert" className="rounded-xl border border-status-warning/20 bg-status-warning-surface px-mx-md py-mx-sm text-mx-tiny font-bold uppercase tracking-tight text-status-warning">
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
                'grid grid-cols-1 gap-mx-sm rounded-xl border border-border-subtle bg-gray-50 p-mx-sm sm:grid-cols-2',
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
            <Button type="button" variant="outline" onClick={() => onTabChange('metas')} className="h-mx-11 rounded-2xl bg-white border-border-subtle hover:bg-gray-50">
              <Target size={16} className="mr-2" />
              Metas que alimentam a leitura
            </Button>
          </div>
        </Card>
      )}
    </>
  )
}

export default DashboardHeader
