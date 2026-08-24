import { BarChart3, CheckCircle2, RefreshCw, ShoppingCart, Store as StoreIcon, Target, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import type { Store } from '@/types/database'
import { CLIENT_SALES_TIME_ZONE, type ClientSalesPeriod } from './clientSales'
import { useClientSales } from './useClientSales'

const PERIOD_OPTIONS: Array<{ value: ClientSalesPeriod; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'last15days', label: 'Últimos 15 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'custom', label: 'Data personalizada' },
]
const COUNT_FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: CLIENT_SALES_TIME_ZONE })

function formatCount(value: number): string { return COUNT_FORMATTER.format(Math.round(value)) }
function formatPercent(value: number | null): string { return value === null ? '—' : `${PERCENT_FORMATTER.format(value)}%` }
function formatDate(dateKey: string | null): string {
  if (!dateKey) return '—'
  const [year, month, day] = dateKey.split('-').map(Number)
  return DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day, 12)))
}
function formatRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} a ${formatDate(endDate)}`
}
function progressTone(attainment: number | null): 'brand' | 'success' | 'warning' | 'neutral' {
  if (attainment === null) return 'neutral'
  if (attainment >= 100) return 'success'
  if (attainment >= 70) return 'brand'
  return 'warning'
}

export interface ClientSalesOverviewProps { stores: Store[] }

export function ClientSalesOverview({ stores }: ClientSalesOverviewProps) {
  const [period, setPeriod] = useState<ClientSalesPeriod>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const { range, rangeError, rows, totals, loading, error, refetch } = useClientSales({ stores, period, customStartDate, customEndDate })

  return (
    <MxSectionCard data-testid="client-sales-overview">
      <MxSectionHeader
        title={<span className="flex items-center gap-2"><ShoppingCart size={16} aria-hidden="true" />Vendas por loja</span>}
        description={range ? `Quantidade de vendas, meta mensal e atingimento · ${formatRange(range.startDate, range.endDate)}` : 'Quantidade de vendas, meta mensal e atingimento por loja.'}
        actions={<div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <label className="flex min-w-44 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
            Período de vendas
            <MxSelect data-testid="client-sales-period" aria-label="Filtrar vendas por período" value={period} onChange={event => setPeriod(event.target.value as ClientSalesPeriod)} className="h-11">
              {PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </MxSelect>
          </label>
          <Button variant="outline" size="sm" className="h-11" onClick={() => void refetch()} disabled={loading}><RefreshCw size={14} className="mr-1.5" />Atualizar</Button>
        </div>}
      />

      {period === 'custom' ? <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-alt/40 p-4 sm:flex-row sm:items-end sm:p-5">
        <label htmlFor="client-sales-custom-start" className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">Data inicial
          <MxInput data-testid="client-sales-custom-start" id="client-sales-custom-start" type="date" aria-label="Data inicial das vendas" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="h-11" />
        </label>
        <label htmlFor="client-sales-custom-end" className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">Data final
          <MxInput data-testid="client-sales-custom-end" id="client-sales-custom-end" type="date" aria-label="Data final das vendas" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="h-11" />
        </label>
      </div> : null}

      {rangeError ? <MxStatusBanner tone="warning" className="m-4 sm:m-5">{rangeError}</MxStatusBanner>
        : loading ? <MxLoadingState label="Carregando vendas por loja" />
          : error ? <MxErrorState description={error} retry={() => void refetch()} />
            : !stores.length ? <MxEmptyState title="Nenhuma loja disponível" description="Não há lojas no escopo atual para exibir vendas." icon={StoreIcon} variant="dataset" />
              : <>
                <div className="p-4 pb-0 sm:p-5 sm:pb-0"><MxMetricGrid className="gap-3 lg:grid-cols-4">
                  <MxMetricCard title="Vendas no período" value={formatCount(totals.totalSales)} detail={range ? formatRange(range.startDate, range.endDate) : 'Período inválido'} icon={ShoppingCart} tone="success" />
                  <MxMetricCard title="Meta mensal da rede" value={formatCount(totals.totalMonthlyGoal)} detail={`${totals.configuredGoalStores} de ${rows.length} lojas com meta`} icon={Target} tone="info" />
                  <MxMetricCard title="Atingimento" value={formatPercent(totals.totalAttainment)} detail="Vendas do período ÷ meta mensal" icon={TrendingUp} tone={totals.totalAttainment !== null && totals.totalAttainment >= 100 ? 'success' : 'warning'} />
                  <MxMetricCard title="Lojas com venda" value={`${formatCount(totals.storesWithSales)}/${formatCount(rows.length)}`} detail="Lojas que venderam no período" icon={CheckCircle2} tone="brand" />
                </MxMetricGrid></div>
                <div className="p-4 pt-4 sm:p-5 sm:pt-5">{rows.length === 0 ? <MxEmptyState title="Nenhuma venda encontrada" description="Não há vendas oficiais para o período selecionado. Tente outro filtro de data." icon={BarChart3} variant="filter" /> : <MxTableSurface aria-label="Vendas por loja" data-testid="client-sales-table">
                  <Table className="min-w-[920px]"><TableHeader><TableRow>
                    <TableHead>Loja</TableHead><TableHead className="text-right">Vendas no período</TableHead><TableHead className="text-right">Meta mensal</TableHead><TableHead>Atingimento</TableHead><TableHead>Última venda</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader><TableBody>{rows.map(row => <TableRow key={row.storeId} data-store-id={row.storeId}>
                    <TableCell><div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-status-success-surface text-status-success-text" aria-hidden="true"><StoreIcon size={16} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground" title={row.storeName}>{row.storeName}</p><div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{row.parentStoreName ? <span>Filial de {row.parentStoreName}</span> : <span>Matriz</span>}{!row.active ? <><span aria-hidden="true">·</span><span>Inativa</span></> : null}</div></div></div></TableCell>
                    <TableCell className="text-right"><span className="text-lg font-bold text-foreground">{formatCount(row.sales)}</span><span className="ml-1 text-xs text-muted-foreground">vendas</span></TableCell>
                    <TableCell className="text-right"><span className="font-semibold text-foreground">{row.monthlyGoal > 0 ? formatCount(row.monthlyGoal) : '—'}</span><span className="ml-1 text-xs text-muted-foreground">{row.monthlyGoal > 0 ? 'vendas' : 'sem meta'}</span></TableCell>
                    <TableCell>{row.monthlyGoal > 0 && row.attainment !== null ? <div className="min-w-48"><MxProgress value={row.attainment} tone={progressTone(row.attainment)} label={`${formatCount(row.sales)} de ${formatCount(row.monthlyGoal)}`} /></div> : <span className="text-sm text-muted-foreground">{row.monthlyGoal > 0 ? 'Atingimento indisponível' : 'Meta não configurada'}</span>}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.lastSaleDate)}</TableCell>
                    <TableCell><Badge variant={row.monthlyGoal > 0 && row.attainment !== null && row.attainment >= 100 ? 'success' : row.monthlyGoal > 0 && row.attainment === null ? 'outline' : row.sales > 0 ? 'warning' : 'outline'}>{row.monthlyGoal > 0 && row.attainment !== null && row.attainment >= 100 ? 'Meta atingida' : row.monthlyGoal > 0 && row.attainment === null ? 'Atingimento indisponível' : row.sales > 0 ? 'Com vendas' : 'Sem vendas'}</Badge></TableCell>
                  </TableRow>)}</TableBody></Table>
                </MxTableSurface>}</div>
              </>}
    </MxSectionCard>
  )
}
