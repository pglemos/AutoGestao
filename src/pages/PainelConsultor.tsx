import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  Car,
  RefreshCw,
  Search,
  Shield,
  Store,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { getSupabaseFunctionUrl, supabase as originalSupabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useAllStoreGoals } from '@/hooks/useGoals'
import { cn, slugify } from '@/lib/utils'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import {
  MxEmptyState,
  MxField,
  MxLoadingState,
  MxMetricCard,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import { getOperationalStatus, getDiasInfo, calcularProjecao } from '@/lib/calculations'
import type { DailyCheckin, Store as StoreRecord } from '@/types/database'

type StoreDiagnostic = {
  id: string
  name: string
  leads: number
  agd: number
  vis: number
  sales: number
  goal: number
  gap: number
  proj: number
  ritmo: number
  efficiency: number
  sellers: number
  checkedInToday: number
  disciplinePct: number
}

type NetworkAggregateRow = {
  store_id: string
  sales: number | string | null
  leads: number | string | null
  agd: number | string | null
  vis: number | string | null
}

type StoreListRow = Pick<StoreRecord, 'id' | 'name'>
type ActiveSellerRow = { store_id: string }
type TodayCheckinRow = Pick<DailyCheckin, 'store_id' | 'seller_user_id'>
type DateRange = { start: string; end: string }

type SortConfig = {
  key: keyof StoreDiagnostic
  direction: 'asc' | 'desc'
}

type Timeframe = 'hoje' | 'ontem' | 'semanal' | 'mensal' | 'personalizada'

const MAX_CUSTOM_RANGE_DAYS = 366

const timeframeLabels: Record<Timeframe, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  semanal: 'Semana',
  mensal: 'Mês',
  personalizada: 'Personalizado',
}

const reportLabels = {
  matinal: 'Relatório matinal',
  semanal: 'Relatório semanal',
  mensal: 'Relatório mensal',
} as const

function statusVariant(label: string): 'success' | 'warning' | 'danger' | 'info' {
  if (label === 'EXCELÊNCIA' || label === 'NO RITMO') return 'success'
  if (label === 'ALERTA RITMO') return 'warning'
  if (label === 'CRÍTICO' || label === 'INDISCIPLINA') return 'danger'
  return 'info'
}

function resolveRange(selectedTimeframe: Timeframe, customRange: DateRange): DateRange {
  const now = new Date()
  let start = now
  let end = now

  switch (selectedTimeframe) {
    case 'hoje':
      start = startOfDay(now)
      end = endOfDay(now)
      break
    case 'ontem': {
      const yesterday = subDays(now, 1)
      start = startOfDay(yesterday)
      end = endOfDay(yesterday)
      break
    }
    case 'semanal':
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case 'mensal':
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case 'personalizada':
      return customRange
  }

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  }
}

function validateCustomRange(range: DateRange): string | null {
  const start = parseISO(range.start)
  const end = parseISO(range.end)

  if (!range.start || !range.end || !isValid(start) || !isValid(end)) {
    return 'Informe datas válidas para início e fim.'
  }
  if (end < start) return 'A data final não pode ser anterior à data inicial.'
  if (differenceInCalendarDays(end, start) > MAX_CUSTOM_RANGE_DAYS) {
    return `O período personalizado pode ter no máximo ${MAX_CUSTOM_RANGE_DAYS} dias.`
  }
  return null
}

export default function PainelConsultor() {
  const navigate = useNavigate()
  const { setActiveStoreId } = useAuth()
  const { metas, loading: goalsLoading } = useAllStoreGoals()
  const requestSequence = useRef(0)

  const initialRange = useMemo<DateRange>(
    () => ({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
    [],
  )

  const [diagnostics, setDiagnostics] = useState<Record<string, StoreDiagnostic>>({})
  const [networkLoading, setNetworkLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [isTriggering, setIsTriggering] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'alert' | 'critical' | 'target'>('all')
  const [timeframe, setTimeframe] = useState<Timeframe>('mensal')
  const [customRangeDraft, setCustomRangeDraft] = useState<DateRange>(initialRange)
  const [appliedCustomRange, setAppliedCustomRange] = useState<DateRange>(initialRange)
  const [showCustomPicker, setShowCustomPicker] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'sales', direction: 'desc' })

  const handleStoreClick = (storeId: string, storeName: string) => {
    setActiveStoreId(storeId)
    navigate(`/lojas/${slugify(storeName)}`)
    toast.info('Unidade selecionada para monitoramento.')
  }

  const triggerReport = async (type: keyof typeof reportLabels) => {
    setIsTriggering(type)
    try {
      const { data: errorBody, error } = await originalSupabase.functions.invoke(`relatorio-${type}`)

      if (!error) {
        toast.success(`${reportLabels[type]} disparado com sucesso.`)
      } else {
        toast.error(`Falha ao disparar: ${errorBody?.error || error.message}`)
      }
    } catch {
      toast.error('Erro de conexão com o servidor de automação.')
    } finally {
      setIsTriggering(null)
    }
  }

  const fetchNetworkSnapshot = useCallback(
    async ({
      selectedTimeframe,
      selectedCustomRange,
      isManual = false,
    }: {
      selectedTimeframe: Timeframe
      selectedCustomRange: DateRange
      isManual?: boolean
    }) => {
      const requestId = ++requestSequence.current
      if (isManual) setIsRefetching(true)
      else setNetworkLoading(true)

      try {
        const range = resolveRange(selectedTimeframe, selectedCustomRange)
        const rangeError = validateCustomRange(range)
        if (rangeError) throw new Error(rangeError)

        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
        const [summaryResult, storesResult, sellersResult, todayCheckinsResult] = await Promise.all([
          originalSupabase.rpc('get_resumo_rede_periodo', {
            p_start_date: range.start,
            p_end_date: range.end,
            p_scope: 'daily',
          }),
          originalSupabase.from('lojas').select('id, name'),
          originalSupabase.from('vendedores_loja').select('store_id').eq('is_active', true),
          originalSupabase.rpc('get_lancamentos_referencia_dia', {
            p_reference_date: yesterday,
            p_scope: 'daily',
          }),
        ])

        if (summaryResult.error) throw summaryResult.error
        if (storesResult.error) throw storesResult.error
        if (sellersResult.error) throw sellersResult.error
        if (todayCheckinsResult.error) throw todayCheckinsResult.error

        const aggregateRows = (summaryResult.data || []) as NetworkAggregateRow[]
        const allStores = (storesResult.data || []) as StoreListRow[]
        const sellers = (sellersResult.data || []) as ActiveSellerRow[]
        const todayCheckins = (todayCheckinsResult.data || []) as TodayCheckinRow[]

        const salesMap = new Map<
          string,
          { total: number; leads: number; agd: number; vis: number }
        >()
        for (const row of aggregateRows) {
          salesMap.set(row.store_id, {
            total: Number(row.sales || 0),
            leads: Number(row.leads || 0),
            agd: Number(row.agd || 0),
            vis: Number(row.vis || 0),
          })
        }

        const sellerMap = new Map<string, number>()
        for (const seller of sellers) {
          sellerMap.set(seller.store_id, (sellerMap.get(seller.store_id) || 0) + 1)
        }

        const checkedInMap = new Map<string, number>()
        for (const checkin of todayCheckins) {
          checkedInMap.set(checkin.store_id, (checkedInMap.get(checkin.store_id) || 0) + 1)
        }

        const diagnosticsMap: Record<string, StoreDiagnostic> = {}
        const days = getDiasInfo(yesterday)
        const daysElapsed = days.decorridos
        const totalDays = days.total

        for (const store of allStores) {
          const aggregate = salesMap.get(store.id) || { total: 0, leads: 0, agd: 0, vis: 0 }
          const goal = metas.find((item) => item.store_id === store.id)?.target || 0
          const projection =
            selectedTimeframe === 'mensal'
              ? calcularProjecao(aggregate.total, daysElapsed, totalDays)
              : aggregate.total
          const sellersCount = sellerMap.get(store.id) || 0
          const checkedInCount = checkedInMap.get(store.id) || 0
          const targetUntilToday = (goal / totalDays) * daysElapsed
          const efficiency =
            targetUntilToday > 0 ? (aggregate.total / targetUntilToday) * 100 : 100
          const nominalPace = Math.max(0, (goal - aggregate.total) / Math.max(days.restantes, 1))

          diagnosticsMap[store.id] = {
            id: store.id,
            name: store.name,
            sales: aggregate.total,
            leads: aggregate.leads,
            agd: aggregate.agd,
            vis: aggregate.vis,
            goal,
            gap: selectedTimeframe === 'mensal' ? Math.max(goal - aggregate.total, 0) : 0,
            proj: projection,
            ritmo: Math.round(nominalPace * 10) / 10,
            efficiency: Math.round(efficiency),
            sellers: sellersCount,
            checkedInToday: checkedInCount,
            disciplinePct: sellersCount > 0 ? (checkedInCount / sellersCount) * 100 : 100,
          }
        }

        if (requestId !== requestSequence.current) return
        setDiagnostics(diagnosticsMap)
      } catch (error) {
        if (requestId !== requestSequence.current) return
        const message = error instanceof Error ? error.message : ''
        toast.error(message || 'Não foi possível atualizar a visão da rede.')
      } finally {
        if (requestId === requestSequence.current) {
          setNetworkLoading(false)
          setIsRefetching(false)
        }
      }
    },
    [metas],
  )

  useEffect(() => {
    if (!goalsLoading) {
      void fetchNetworkSnapshot({
        selectedTimeframe: timeframe,
        selectedCustomRange: appliedCustomRange,
      })
    }
  }, [appliedCustomRange, fetchNetworkSnapshot, goalsLoading, timeframe])

  const handleApplyCustomRange = () => {
    const validationError = validateCustomRange(customRangeDraft)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setAppliedCustomRange(customRangeDraft)
    setTimeframe('personalizada')
    setShowCustomPicker(false)
  }

  const handleSort = (key: keyof StoreDiagnostic) => {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === 'desc'
          ? 'asc'
          : 'desc',
    }))
  }

  const filteredAndSortedStores = useMemo(() => {
    let result = Object.values(diagnostics)

    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase()
      result = result.filter((store) => store.name.toLowerCase().includes(normalizedSearch))
    }

    if (statusFilter !== 'all') {
      result = result.filter((store) => {
        const status = getOperationalStatus(store.efficiency, store.disciplinePct)
        if (statusFilter === 'alert') return status.label === 'ALERTA RITMO'
        if (statusFilter === 'critical') {
          return status.label === 'CRÍTICO' || status.label === 'INDISCIPLINA'
        }
        if (statusFilter === 'target') {
          return status.label === 'NO RITMO' || status.label === 'EXCELÊNCIA'
        }
        return true
      })
    }

    result.sort((first, second) => {
      const firstValue = first[sortConfig.key]
      const secondValue = second[sortConfig.key]
      if (typeof firstValue === 'string' && typeof secondValue === 'string') {
        return sortConfig.direction === 'desc'
          ? secondValue.localeCompare(firstValue)
          : firstValue.localeCompare(secondValue)
      }
      return sortConfig.direction === 'desc'
        ? (secondValue as number) - (firstValue as number)
        : (firstValue as number) - (secondValue as number)
    })

    return result
  }, [diagnostics, searchTerm, sortConfig, statusFilter])

  const globalStats = useMemo(() => {
    const stores = Object.values(diagnostics)
    const totalSales = stores.reduce((sum, store) => sum + store.sales, 0)
    const totalGoal = stores.reduce((sum, store) => sum + store.goal, 0)
    const totalGap = stores.reduce((sum, store) => sum + store.gap, 0)
    const totalLeads = stores.reduce((sum, store) => sum + store.leads, 0)
    const totalAgd = stores.reduce((sum, store) => sum + store.agd, 0)
    const totalVis = stores.reduce((sum, store) => sum + store.vis, 0)
    const averageDiscipline = Math.round(
      stores.reduce((sum, store) => sum + store.disciplinePct, 0) / Math.max(stores.length, 1),
    )
    const criticalStores = stores.filter((store) => {
      const status = getOperationalStatus(store.efficiency, store.disciplinePct)
      return status.label === 'CRÍTICO' || status.label === 'INDISCIPLINA'
    }).length

    return {
      totalSales,
      totalGoal,
      totalGap,
      totalLeads,
      totalAgd,
      totalVis,
      averageDiscipline,
      criticalStores,
      globalAchievement: totalGoal > 0 ? Math.round((totalSales / totalGoal) * 100) : 0,
    }
  }, [diagnostics])

  if (goalsLoading || networkLoading) {
    return (
      <MxModulePage>
        <MxModuleHeader
          eyebrow="Gestão da rede"
          title="Rede operacional"
          description="Consolidando metas, produção e disciplina das lojas."
        />
        <MxSectionCard>
          <MxLoadingState label="Carregando visão da rede" />
        </MxSectionCard>
      </MxModulePage>
    )
  }

  return (
    <MxModulePage>
      <MxModuleHeader
        eyebrow="Gestão da rede"
        title="Rede operacional"
        description={`${filteredAndSortedStores.length} lojas monitoradas no período selecionado. Use os indicadores para priorizar acompanhamento e ação.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                void fetchNetworkSnapshot({
                  selectedTimeframe: timeframe,
                  selectedCustomRange: appliedCustomRange,
                  isManual: true,
                })
              }
              disabled={isRefetching}
            >
              <RefreshCw
                size={18}
                className={cn(isRefetching && 'animate-spin')}
                aria-hidden="true"
              />
              Atualizar
            </Button>
            <Button asChild>
              <Link to="/lojas">
                <Store size={18} aria-hidden="true" />
                Gerenciar lojas
              </Link>
            </Button>
          </>
        }
      />

      <MxToolbar aria-label="Filtros do painel da rede" className="relative">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-mx-xs">
          <Calendar size={18} className="text-text-tertiary" aria-hidden="true" />
          {(['hoje', 'ontem', 'semanal', 'mensal'] as const).map((option) => (
            <Button
              key={option}
              variant={timeframe === option ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe(option)}
            >
              {timeframeLabels[option]}
            </Button>
          ))}
          <Button
            variant={timeframe === 'personalizada' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setShowCustomPicker((current) => !current)}
          >
            Personalizado
          </Button>

          <AnimatePresence>
            {showCustomPicker ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute left-mx-sm top-full z-50 mt-mx-xs w-[min(22rem,calc(100vw-2rem))]"
              >
                <MxSectionCard className="p-mx-md shadow-mx-lg">
                  <div className="mb-mx-md flex items-center justify-between gap-mx-sm">
                    <Typography variant="h3" className="text-base">
                      Período personalizado
                    </Typography>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCustomPicker(false)}
                      aria-label="Fechar período personalizado"
                    >
                      <X size={18} aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="grid gap-mx-sm sm:grid-cols-2">
                    <MxField label="Início" htmlFor="network-range-start">
                      <Input
                        id="network-range-start"
                        type="date"
                        value={customRangeDraft.start}
                        onChange={(event) =>
                          setCustomRangeDraft((current) => ({
                            ...current,
                            start: event.target.value,
                          }))
                        }
                      />
                    </MxField>
                    <MxField label="Fim" htmlFor="network-range-end">
                      <Input
                        id="network-range-end"
                        type="date"
                        value={customRangeDraft.end}
                        onChange={(event) =>
                          setCustomRangeDraft((current) => ({
                            ...current,
                            end: event.target.value,
                          }))
                        }
                      />
                    </MxField>
                  </div>
                  <Typography variant="tiny" tone="muted" className="mt-mx-xs block">
                    Período máximo: {MAX_CUSTOM_RANGE_DAYS} dias.
                  </Typography>
                  <Button className="mt-mx-md w-full" onClick={handleApplyCustomRange}>
                    Aplicar período
                  </Button>
                </MxSectionCard>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-mx-xs">
          {(['matinal', 'semanal', 'mensal'] as const).map((reportType) => (
            <Button
              key={reportType}
              variant="ghost"
              size="sm"
              disabled={isTriggering !== null}
              onClick={() => void triggerReport(reportType)}
            >
              {isTriggering === reportType ? (
                <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
              ) : null}
              {reportLabels[reportType]}
            </Button>
          ))}
        </div>
      </MxToolbar>

      <section
        aria-label="Resumo da rede"
        className="grid grid-cols-1 gap-mx-md sm:grid-cols-2 xl:grid-cols-4"
      >
        <MxMetricCard
          title={`Vendas no ${timeframeLabels[timeframe].toLowerCase()}`}
          value={globalStats.totalSales}
          detail={`Meta da rede: ${globalStats.totalGoal} • ${globalStats.globalAchievement}% realizado`}
          icon={Car}
          tone="brand"
        />
        <MxMetricCard
          title="Fluxo comercial"
          value={globalStats.totalAgd}
          detail={`${globalStats.totalLeads} leads • ${globalStats.totalVis} visitas`}
          icon={TrendingUp}
          tone="info"
        />
        <MxMetricCard
          title="Lojas críticas"
          value={globalStats.criticalStores}
          detail={`${globalStats.totalGap} vendas de gap consolidado`}
          icon={AlertTriangle}
          tone={globalStats.criticalStores > 0 ? 'danger' : 'success'}
        />
        <MxMetricCard
          title="Disciplina média"
          value={`${globalStats.averageDiscipline}%`}
          detail="Aderência aos registros diários"
          icon={Shield}
          tone={globalStats.averageDiscipline < 80 ? 'warning' : 'success'}
        />
      </section>

      <MxSectionCard>
        <div className="flex flex-col gap-mx-md border-b border-border-subtle p-mx-md lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-mx-sm">
            <span className="grid h-mx-10 w-mx-10 shrink-0 place-items-center rounded-mx-lg bg-status-success-surface text-brand-primary">
              <Activity size={20} aria-hidden="true" />
            </span>
            <div>
              <Typography as="h2" variant="h3" className="text-lg">
                Performance das lojas
              </Typography>
              <Typography variant="p" className="mt-mx-tiny text-sm text-text-secondary">
                Compare volume, meta, projeção, ritmo e disciplina sem sair da visão da rede.
              </Typography>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-mx-sm sm:flex-row sm:flex-wrap">
            <div className="relative min-w-0 sm:w-mx-sidebar-expanded">
              <Search
                size={17}
                className="pointer-events-none absolute left-mx-sm top-1/2 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <Input
                aria-label="Localizar unidade"
                placeholder="Localizar unidade"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-mx-10"
              />
            </div>
            <div className="flex flex-wrap gap-mx-xs" aria-label="Filtrar status">
              {(
                [
                  ['all', 'Todas'],
                  ['alert', 'Em alerta'],
                  ['critical', 'Críticas'],
                  ['target', 'No ritmo'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  variant={statusFilter === value ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {filteredAndSortedStores.length === 0
            ? 'Nenhuma loja encontrada com os filtros atuais.'
            : `${filteredAndSortedStores.length} ${filteredAndSortedStores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}.`}
        </p>

        {filteredAndSortedStores.length === 0 ? (
          <MxEmptyState
            icon={Building2}
            title="Nenhuma loja encontrada"
            description="Ajuste a busca ou os filtros para voltar a exibir as unidades da rede."
          />
        ) : (
          <MxTableSurface className="overflow-x-visible rounded-none border-0">
            <table className="w-full table-fixed text-left text-xs sm:text-sm [&_td]:overflow-hidden [&_th]:overflow-hidden">
              <thead className="bg-surface-alt">
                <tr className="border-b border-border-subtle">
                  {(
                    [
                      ['name', 'Unidade', 'text-left', 'w-[20%]'],
                      ['leads', 'Leads', 'text-right', 'w-[6%]'],
                      ['agd', 'Agend.', 'text-right', 'w-[7%]'],
                      ['vis', 'Visitas', 'text-right', 'w-[6%]'],
                      ['sales', 'Vendas', 'text-right', 'w-[6%]'],
                      ['goal', 'Meta', 'text-right', 'w-[6%]'],
                      ['gap', 'Gap', 'text-right', 'w-[5%]'],
                      ['proj', 'Projeção', 'text-right', 'w-[7%]'],
                      ['ritmo', 'Ritmo', 'text-right', 'w-[6%]'],
                    ] as const
                  ).map(([key, label, alignment, width]) => (
                    <th key={key} className={cn('px-mx-xs py-mx-xs', alignment, width)}>
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className="truncate font-semibold text-text-secondary transition-colors hover:text-brand-primary"
                      >
                        {label}
                      </button>
                    </th>
                  ))}
                  <th className="w-[13%] px-mx-xs py-mx-xs text-center font-semibold text-text-secondary">
                    Situação
                  </th>
                  <th className="w-[13%] px-mx-xs py-mx-xs text-right font-semibold text-text-secondary">
                    Disciplina
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-white">
                {filteredAndSortedStores.map((store, index) => {
                  const status = getOperationalStatus(store.efficiency, store.disciplinePct)
                  return (
                    <motion.tr
                      key={store.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.015, 0.2) }}
                      className="transition-colors hover:bg-surface-alt"
                    >
                      <td className="px-mx-xs py-mx-xs">
                        <button
                          type="button"
                          onClick={() => handleStoreClick(store.id, store.name)}
                          className="flex w-full min-w-0 items-center gap-mx-xs rounded-mx-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
                          aria-label={`Abrir unidade ${store.name}`}
                        >
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-mx-lg bg-status-success-surface text-brand-primary">
                            <Building2 size={14} aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <Typography variant="p" className="block truncate font-semibold text-text-primary">
                              {store.name}
                            </Typography>
                            <Typography variant="tiny" tone="muted" className="block truncate">
                              {store.checkedInToday}/{store.sellers} vendedores
                            </Typography>
                          </span>
                        </button>
                      </td>
                      <td className="px-mx-xs py-mx-xs text-right tabular-nums">{store.leads}</td>
                      <td className="px-mx-xs py-mx-xs text-right tabular-nums">{store.agd}</td>
                      <td className="px-mx-xs py-mx-xs text-right tabular-nums">{store.vis}</td>
                      <td className="px-mx-xs py-mx-xs text-right font-semibold tabular-nums text-brand-primary">
                        {store.sales}
                      </td>
                      <td className="px-mx-xs py-mx-xs text-right tabular-nums text-text-secondary">
                        {store.goal}
                      </td>
                      <td className="px-mx-xs py-mx-xs text-right font-semibold tabular-nums text-status-error">
                        {store.gap}
                      </td>
                      <td className="px-mx-xs py-mx-xs text-right font-semibold tabular-nums">
                        {store.proj}
                      </td>
                      <td className="px-mx-xs py-mx-xs text-right tabular-nums">
                        {store.ritmo}
                      </td>
                      <td className="px-mx-xs py-mx-xs text-center">
                        <Badge variant={statusVariant(status.label)} className="whitespace-nowrap">
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-mx-xs py-mx-xs text-right">
                        <div className="flex items-center justify-end gap-mx-xs">
                          <span
                            className="h-1.5 w-8 shrink-0 overflow-hidden rounded-mx-full bg-border-subtle"
                            aria-hidden="true"
                          >
                            <span
                              className={cn(
                                'block h-full rounded-mx-full',
                                store.disciplinePct < 80
                                  ? 'bg-status-warning'
                                  : 'bg-status-success',
                              )}
                              style={{ width: `${Math.min(store.disciplinePct, 100)}%` }}
                            />
                          </span>
                          <span className="min-w-[2.5rem] text-right font-semibold tabular-nums">
                            {Math.round(store.disciplinePct)}%
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </MxTableSurface>
        )}
      </MxSectionCard>

      <MxSectionCard className="p-mx-md">
        <div className="grid gap-mx-md md:grid-cols-3">
          <div className="flex items-start gap-mx-sm">
            <Target className="mt-mx-tiny text-brand-primary" size={20} aria-hidden="true" />
            <div>
              <Typography variant="h3" className="text-base">Foco de decisão</Typography>
              <Typography variant="p" className="mt-mx-xs text-sm text-text-secondary">
                Priorize lojas críticas e preserve as que estão no ritmo.
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-mx-sm">
            <Users className="mt-mx-tiny text-brand-primary" size={20} aria-hidden="true" />
            <div>
              <Typography variant="h3" className="text-base">Disciplina da equipe</Typography>
              <Typography variant="p" className="mt-mx-xs text-sm text-text-secondary">
                Acompanhe a proporção de vendedores com registro diário.
              </Typography>
            </div>
          </div>
          <div className="flex items-start gap-mx-sm">
            <Activity className="mt-mx-tiny text-brand-primary" size={20} aria-hidden="true" />
            <div>
              <Typography variant="h3" className="text-base">Leitura operacional</Typography>
              <Typography variant="p" className="mt-mx-xs text-sm text-text-secondary">
                Use volume, projeção e gap na mesma sequência visual.
              </Typography>
            </div>
          </div>
        </div>
      </MxSectionCard>
    </MxModulePage>
  )
}
