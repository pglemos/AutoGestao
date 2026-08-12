import { Fragment, useMemo, useState } from 'react'
import { BarChart3, ChevronDown, ChevronRight, DollarSign, Megaphone, Package, Settings, ShoppingCart, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AREA_LIST } from './strategicIndicatorCatalog'
import { MONTHS, SELECTED_MONTH_INDEX, AREA_STYLES, CARD_ICON_STYLES, SPARK_COLORS, formatCellValue, consolidateValues, getConsolidatedLabel, normalizeText, calculatePercentageOfTarget } from './strategicUtils'
import MiniChart from './MiniChart'
import StrategicPlanOverviewFilters from './StrategicPlanOverviewFilters'
import ViewSelector from './ViewSelector'
import CellWithTooltip from './CellWithTooltip'
import { TooltipProvider } from '@/components/ui/tooltip'

const CARD_ICONS = { dollar: DollarSign, barChart: BarChart3, shoppingCart: ShoppingCart, package: Package, users: Users }
const AREA_ICONS = { Vendas: ShoppingCart, Marketing: Megaphone, Estoque: Package, Financeiro: Wallet, Operacional: Settings }
const executiveCardConfigs = [
  { id: 'sales', indicatorId: 'SP-001', title: 'Vendas Total', icon: 'barChart', iconColor: 'purple', sparkType: 'bar', sparkColor: 'purple' },
  { id: 'leads', indicatorId: 'SP-023', title: 'Leads Recebidos', icon: 'shoppingCart', iconColor: 'orange', sparkType: 'line', sparkColor: 'orange' },
  { id: 'inventory', indicatorId: 'SP-031', title: 'Estoque Total', icon: 'package', iconColor: 'blue', sparkType: 'line', sparkColor: 'blue' },
  { id: 'appointments', indicatorId: 'SP-017', title: 'Agendamentos', icon: 'users', iconColor: 'teal', sparkType: 'line', sparkColor: 'teal' },
  { id: 'visits', indicatorId: 'SP-018', title: 'Visitas', icon: 'dollar', iconColor: 'green', sparkType: 'line', sparkColor: 'green' },
]

function ExecutiveCard({ card, series, onClick }) {
  const Icon = CARD_ICONS[card.icon] || DollarSign
  const value = series.currentValues[SELECTED_MONTH_INDEX]
  const areaStyle = AREA_STYLES[series.area] || {}
  return (
    <button type="button" onClick={onClick} className={`flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-all hover:shadow-md ${areaStyle.border || ''}`}>
      <div className={`h-1 ${areaStyle.dot || 'bg-muted'}`} />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${CARD_ICON_STYLES[card.iconColor]}`}><Icon className="h-5 w-5" /></div><p className="text-sm font-medium">{card.title}</p></div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{formatCellValue(value, series.displayFormat, series.decimalPlaces)}</p>
        <div className="mt-auto h-8 pt-2"><MiniChart data={series.currentValues.filter(item => item !== null)} colorClass={SPARK_COLORS[card.sparkColor]} type={card.sparkType} /></div>
      </div>
    </button>
  )
}

export default function StrategicPlanOverview({ repository, onCardClick, onRowClick, year, refreshKey = 0 }) {
  const [view, setView] = useState('meta')
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [resultFilter, setResultFilter] = useState('all')
  const [expanded, setExpanded] = useState({})
  const allSeries = useMemo(() => repository.getOverviewData(year) || [], [repository, year, refreshKey])
  const filtered = useMemo(() => {
    const term = normalizeText(search)
    return allSeries.filter(series => {
      if (areaFilter !== 'all' && series.area !== areaFilter) return false
      if (resultFilter !== 'all') {
        const current = consolidateValues(series.currentValues, series.aggregationMode, SELECTED_MONTH_INDEX)
        const target = consolidateValues(series.targetValues, series.aggregationMode, SELECTED_MONTH_INDEX)
        const percentage = calculatePercentageOfTarget(current, target)
        if (percentage === null) return false
        if (resultFilter === 'above' && percentage < 100) return false
        if (resultFilter === 'below' && (percentage >= 100 || percentage <= 80)) return false
        if (resultFilter === 'critical' && percentage > 80) return false
      }
      return !term || normalizeText(`${series.name} ${series.code} ${series.area}`).includes(term)
    })
  }, [allSeries, search, areaFilter, resultFilter])
  const executiveCards = executiveCardConfigs.map(config => ({ config, series: allSeries.find(item => item.id === config.indicatorId) }))
  const clearFilters = () => { setSearch(''); setAreaFilter('all'); setResultFilter('all') }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {executiveCards.map(({ config, series }) => series ? <ExecutiveCard key={config.id} card={config} series={series} onClick={() => onCardClick(config.indicatorId)} /> : null)}
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Indicadores Estratégicos</h3><div className="flex items-center gap-2"><Button variant="ghost" size="sm" onClick={() => setExpanded(Object.fromEntries(AREA_LIST.map(area => [area, true])))}>Expandir todas</Button><Button variant="ghost" size="sm" onClick={() => setExpanded({})}>Recolher todas</Button><ViewSelector value={view} onChange={setView} /></div></div>
        <StrategicPlanOverviewFilters search={search} onSearchChange={setSearch} area={areaFilter} onAreaChange={setAreaFilter} result={resultFilter} onResultChange={setResultFilter} onClear={clearFilters} total={allSeries.length} filtered={filtered.length} />
      </div>
      <div className="rounded-xl border border-border bg-card shadow-sm"><div className="overflow-x-auto"><TooltipProvider><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="border-b bg-surface-alt"><th className="sticky left-0 z-20 min-w-[220px] bg-surface-alt px-3 py-2 text-left text-xs font-semibold">Indicador</th>{MONTHS.map((month, index) => <th key={month} className={`px-2 py-2 text-center text-xs font-semibold ${index === SELECTED_MONTH_INDEX ? 'border-b-2 border-status-info/50 bg-status-info-surface text-status-info-text' : 'text-muted-foreground'}`}>{month}</th>)}<th className="bg-muted px-3 py-2 text-center text-xs font-semibold">{getConsolidatedLabel('sum', SELECTED_MONTH_INDEX)}</th></tr></thead><tbody>
        {AREA_LIST.map(area => {
          const indicators = filtered.filter(series => series.area === area)
          if (!indicators.length) return null
          const style = AREA_STYLES[area]
          const AreaIcon = AREA_ICONS[area]
          const isExpanded = Boolean(expanded[area])
          return <Fragment key={area}><tr className={`border-b ${style.lightBg}`}><td colSpan={14} className="px-3 py-2"><button type="button" onClick={() => setExpanded(current => ({ ...current, [area]: !current[area] }))} className="flex items-center gap-2">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{AreaIcon ? <div className={`flex h-6 w-6 items-center justify-center rounded ${style.iconBg}`}><AreaIcon className="h-3.5 w-3.5" /></div> : null}<span className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>{area}</span><span className="rounded-full bg-card px-1.5 py-0.5 text-xs text-muted-foreground">{indicators.length}</span></button></td></tr>{isExpanded ? indicators.map(series => {
            const values = view === 'meta' ? series.targetValues : view === 'realizado' ? series.currentValues : series.previousYearValues
            const consolidated = consolidateValues(values, series.aggregationMode, SELECTED_MONTH_INDEX)
            return <tr key={series.id} className="cursor-pointer border-b border-border/40 hover:bg-surface-alt/50" onClick={() => onRowClick(series.id)}><td className="sticky left-0 z-10 min-w-[220px] bg-card px-3 py-1.5 text-left text-xs font-medium"><div className="flex flex-col"><span>{series.name}</span><span className="text-muted-foreground">{series.code}</span></div></td>{values.map((value, index) => <CellWithTooltip key={index} value={value} series={series} monthIndex={index} currentView={view} className={`px-2 py-1.5 text-center text-xs ${index === SELECTED_MONTH_INDEX ? 'bg-status-info-surface/60 font-medium text-status-info-text' : 'text-muted-foreground'}`} />)}<CellWithTooltip value={consolidated} series={series} monthIndex={SELECTED_MONTH_INDEX} currentView={view} isConsolidated className="bg-surface-alt/80 px-3 py-1.5 text-center text-xs font-semibold" /></tr>
          }) : null}</Fragment>
        })}
      </tbody></table></TooltipProvider></div></div>
    </div>
  )
}
