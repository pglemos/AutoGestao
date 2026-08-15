import { useEffect, useMemo, useState } from 'react'
import { endOfMonth, format, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'
import { Search, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/atoms/EmptyState'
import type { RankingEntry, Store } from '@/types/database'
import type { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { ManagerTeamKanban, type ManagerTeamAction } from './ManagerTeamKanban'
import { buildManagerTeamCard, type ManagerTeamView } from './manager-team-kanban'
import { buildManagerTeamActionTarget, buildManagerTeamContext } from './manager-team-navigation'
import { ManagerSellerProfileModal } from './ManagerSellerProfileModal'

type TeamPeriod = 'current' | 'previous' | 'last30'
type DashboardData = ReturnType<typeof useDashboardLojaData>

type SellerRow = RankingEntry & { checked_in?: boolean }

export function ManagerTeamPerformance({ data, storeName, selectableStores = [], onStoreChange }: { data: DashboardData; storeName: string; selectableStores?: Store[]; onStoreChange?: (storeId: string) => void }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<TeamPeriod>('current')
  const [view, setView] = useState<ManagerTeamView>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rows = data.metrics.ranking
  const filtered = useMemo(() => rows.filter(row => row.user_name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))), [rows, search])
  const cards = useMemo(() => filtered.map(buildManagerTeamCard), [filtered])
  const selected = useMemo(() => rows.find(row => row.user_id === selectedId) ?? null, [rows, selectedId])
  const selectedCard = useMemo(() => selected ? buildManagerTeamCard(selected) : null, [selected])

  useEffect(() => {
    const reference = parseISO(data.referenceDate)
    data.setViewMode('month')
    if (period === 'previous') {
      const previous = subMonths(reference, 1)
      data.setStartDate(format(startOfMonth(previous), 'yyyy-MM-dd'))
      data.setEndDate(format(endOfMonth(previous), 'yyyy-MM-dd'))
    } else if (period === 'last30') {
      data.setStartDate(format(subDays(reference, 29), 'yyyy-MM-dd'))
      data.setEndDate(data.referenceDate)
    } else {
      data.setStartDate(format(startOfMonth(reference), 'yyyy-MM-dd'))
      data.setEndDate(data.referenceDate)
    }
  }, [data.referenceDate, data.setEndDate, data.setStartDate, data.setViewMode, period])

  useEffect(() => () => data.setViewMode('day'), [data.setViewMode])

  const openProfile = (row: SellerRow) => { setSelectedId(row.user_id) }
  const handleAction = (action: ManagerTeamAction, row: RankingEntry) => {
    try {
      sessionStorage.setItem('mx_contexto_navegacao', JSON.stringify(buildManagerTeamContext(row, period, view)))
    } catch {
      // Navegação contextual é uma melhoria; não bloqueia a ação se o storage estiver indisponível.
    }
    navigate(buildManagerTeamActionTarget(action, row, data.referenceDate))
  }

  if (data.loading) return <ManagerTeamLoadingState />

  return <section className="font-reference-sans flex flex-col gap-5" aria-label="Performance da equipe">
    <ManagerHomeReturnLink />
    <header className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-xl font-bold text-foreground">Minha Equipe</h1><p className="mt-0.5 text-sm text-muted-foreground">Acompanhe a evolução da equipe e identifique onde sua atuação gerencial é necessária.</p></div><div className="flex flex-wrap items-end gap-2"><div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-team-search">Buscar</label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground" size={15}/><input id="manager-team-search" aria-label="Buscar vendedor" placeholder="Vendedor..." value={search} onChange={event => setSearch(event.target.value)} className="w-44 rounded-xl border border-border px-3 py-2 pl-9 text-sm font-normal leading-5 focus:outline-none focus:ring-2 focus:ring-status-success"/></div></div><div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-team-period">Período</label><select id="manager-team-period" value={period} onChange={event => setPeriod(event.target.value as TeamPeriod)} aria-label="Período da equipe" className="block rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground"><option value="current">Mês atual</option><option value="previous">Mês anterior</option><option value="last30">Últimos 30 dias</option></select></div>{selectableStores.length > 1 && onStoreChange ? <div><label className="mb-1 block text-xs text-muted-foreground" htmlFor="manager-team-store">Unidade</label><select id="manager-team-store" aria-label="Unidade da equipe" value={data.selectedStoreId || ''} onChange={event => onStoreChange(event.target.value)} className="block min-w-[140px] rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground"><option value="">Todas</option>{selectableStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select></div> : null}</div></div>
    </header>

    {filtered.length ? <ManagerTeamKanban cards={cards} view={view} storeName={storeName} onViewChange={setView} onOpenProfile={openProfile} onAction={handleAction}/> : rows.length === 0
      ? <EmptyState size="sm" variant="dataset" icon={<Users size={24} />} title="Nenhum vendedor vinculado a este gerente." />
      : <EmptyState size="sm" variant="filter" title="Nenhum vendedor corresponde à busca." />}

    <ManagerSellerProfileModal
      open={Boolean(selected)}
      seller={selected}
      card={selectedCard}
      storeName={storeName}
      onClose={() => setSelectedId(null)}
      onOpenFeedback={() => selected && handleAction('feedback', selected)}
      onOpenRoutine={() => selected && handleAction('routine', selected)}
      onOpenTraining={() => selected && handleAction('training', selected)}
    />
  </section>
}

function ManagerTeamLoadingState() {
  return <section className="font-reference-sans flex flex-col gap-5" aria-label="Performance da equipe" aria-busy="true">
      <header className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-52 animate-pulse rounded-xl bg-muted" />
            <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </header>
      <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-10 w-80 max-w-full animate-pulse rounded-xl bg-muted" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {['Críticos', 'Atenção', 'Em dia'].map(label => <section key={label} className="min-h-[280px] overflow-hidden rounded-2xl border border-border-subtle bg-white" aria-label={`Carregando coluna ${label}`}>
          <div className="h-14 animate-pulse bg-muted" />
          <div className="space-y-3 p-3">
            <div className="h-56 animate-pulse rounded-2xl bg-surface-alt" />
          </div>
        </section>)}
      </div>
  </section>
}
