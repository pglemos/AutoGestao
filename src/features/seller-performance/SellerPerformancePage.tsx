import { ArrowLeft, Calendar, Filter, RefreshCw, Search, SlidersHorizontal, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import {
  MxEmptyState,
  MxErrorState,
  MxField,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxStatusBanner,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { cn } from '@/lib/utils'
import { useSellerPerformanceController } from './hooks/useSellerPerformanceController'
import type { PeriodPreset, SellerSortOption } from './lib/sellerPerformanceViewModel'
import { SellerPerformanceCharts } from './sections/SellerPerformanceCharts'
import { SellerPerformanceSummary } from './sections/SellerPerformanceSummary'
import { SellerPerformanceTable } from './sections/SellerPerformanceTable'

function formatDateBR(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

export function SellerPerformancePage() {
  const state = useSellerPerformanceController()
  const navigate = useNavigate()

  const totalSalesInPeriod = state.rows.reduce((sum, row) => sum + (row.vnd_total || 0), 0)

  return (
    <MxModulePage id="seller-performance">
      <MxModuleHeader
        eyebrow="Relatórios e diagnóstico"
        title="Performance por Vendedor"
        description="Leitura individual e comparativa com filtro de período, acompanhamento em tempo real e ordenação de equipe."
        actions={
          <>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2 text-xs font-semibold text-emerald-800 shadow-xs">
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  state.isRealtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                )}
              />
              <Zap size={13} className="text-emerald-600" />
              <span>{state.isRealtimeActive ? 'Real-time ativo' : 'Conectando tempo real...'}</span>
            </div>

            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} />
              Voltar
            </Button>

            <Button
              variant="secondary"
              onClick={() => void state.refresh()}
              disabled={state.refreshing}
            >
              <RefreshCw
                size={18}
                className={state.refreshing ? 'animate-spin motion-reduce:animate-none' : ''}
              />
              Atualizar
            </Button>
          </>
        }
      />

      {state.error && state.ranking.length ? (
        <MxStatusBanner tone="warning">
          Dados anteriores preservados. {state.error}
        </MxStatusBanner>
      ) : null}

      <MxToolbar className="gap-4">
        <MxField label="Buscar vendedor" className="min-w-[220px] flex-1">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="pl-9"
              placeholder="Digite o nome..."
              value={state.search}
              onChange={event => state.setSearch(event.target.value)}
            />
          </div>
        </MxField>

        <MxField label="Período" className="min-w-[168px]">
          <div className="relative">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Select
              className="pl-9"
              value={state.period}
              onChange={event => state.setPeriod(event.target.value as PeriodPreset)}
            >
              <option value="mes_atual">Mês atual</option>
              <option value="hoje">Hoje</option>
              <option value="mes_anterior">Mês anterior</option>
              <option value="ultimos_30_dias">Últimos 30 dias</option>
              <option value="custom">Personalizado</option>
            </Select>
          </div>
        </MxField>

        {state.period === 'custom' ? (
          <>
            <MxField label="Data inicial" className="w-[148px]">
              <Input
                type="date"
                value={state.customStartDate}
                onChange={event => state.setCustomStartDate(event.target.value)}
              />
            </MxField>
            <MxField label="Data final" className="w-[148px]">
              <Input
                type="date"
                value={state.customEndDate}
                onChange={event => state.setCustomEndDate(event.target.value)}
              />
            </MxField>
          </>
        ) : null}

        <MxField label="Classificar por" className="min-w-[208px]">
          <div className="relative">
            <SlidersHorizontal
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Select
              className="pl-9"
              value={state.sortBy}
              onChange={event => state.setSortBy(event.target.value as SellerSortOption)}
            >
              <option value="sales_desc">Vendas (Maior primeiro)</option>
              <option value="sales_asc">Vendas (Menor primeiro)</option>
              <option value="name_asc">Nome do Vendedor (A - Z)</option>
              <option value="name_desc">Nome do Vendedor (Z - A)</option>
              <option value="attainment_desc">Atingimento de Meta (%)</option>
              <option value="leads_desc">Volume de Leads</option>
            </Select>
          </div>
        </MxField>
      </MxToolbar>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-2xs text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-emerald-600" />
          <span>
            Período selecionado: <strong className="text-foreground">{state.dateRange.label}</strong> (
            {formatDateBR(state.dateRange.startDate)} até {formatDateBR(state.dateRange.endDate)})
          </span>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span>Vendedores na lista: <strong className="text-foreground">{state.rows.length}</strong></span>
          <span>Vendas no período: <strong className="text-emerald-700">{totalSalesInPeriod}</strong></span>
        </div>
      </div>

      {state.loading ? (
        <MxLoadingState label="Carregando performance dos vendedores" />
      ) : state.error && !state.ranking.length ? (
        <MxErrorState
          description={state.error}
          retry={() => void state.refresh()}
        />
      ) : state.outOfScope ? (
        <MxErrorState
          title="Fora do escopo autorizado"
          description="O vendedor selecionado não pertence à loja informada."
        />
      ) : (
        <>
          {state.selected ? (
            <>
              <SellerPerformanceSummary seller={state.selected} />
              <SellerPerformanceCharts seller={state.selected} />
            </>
          ) : (
            <MxEmptyState
              title="Selecione um vendedor"
              description="Use a tabela abaixo para abrir a leitura individual."
            />
          )}

          <SellerPerformanceTable
            rows={state.rows}
            onSelect={state.selectSeller}
            sortBy={state.sortBy}
            onSortChange={state.setSortBy}
          />
        </>
      )}
    </MxModulePage>
  )
}

export default SellerPerformancePage
