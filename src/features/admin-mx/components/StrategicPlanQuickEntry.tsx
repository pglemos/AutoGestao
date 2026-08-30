import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Target } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxErrorState, MxLoadingState, MxMetricCard, MxMetricGrid, MxSectionCard } from '@/components/module/MxModuleVisualPrimitives'
import { officialDefinitionUnit } from '../indicadores/canonicalBase44Catalog'
import { MONTH_LABELS, formatDisplay, getFormatConfig } from '../indicadores/indicatorFormulas'
import {
  QUICK_ENTRY_DEPARTMENTS,
  SALES_CHANNEL_CODES,
  matchQuickEntryDepartment,
  monthSeries,
  monthsAreUniform,
  uniqueFilledValue,
  normalizeQuickEntrySeries,
  type TargetIndicator,
} from '../indicadores/metasRealizados'
import { PlanningMonthInput } from './PlanningMonthInput'

type PlanningField = 'meta' | 'realizado' | 'ano_anterior'

type MonthCell = { meta: number | null; realizado: number | null; ano_anterior: number | null }

export function StrategicPlanQuickEntry(props: {
  indicators: TargetIndicator[]
  importIndicators?: TargetIndicator[]
  field: PlanningField
  entryMonth: number
  grid: Record<string, Record<number, MonthCell>>
  readMonthValue: (code: string, month: number) => number | null
  drafts: Record<string, string>
  onDraft: (key: string, raw: string) => void
  onCommit: (code: string, month: number, raw: string) => void
  onCommitYear: (code: string, raw: string) => void
  onApplyJanuary: (code: string) => void
  onCopyPrevious: (code: string) => void
  onClearYear: (code: string) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  readOnly: boolean
  draftKey: (code: string, month: number) => string
  resumo?: Array<{ code: string; label: string; monthValue: number | null; annual: number | null }>
}) {
  const roster = props.importIndicators ?? props.indicators
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(() => new Set(['Comercial']))
  const [customized, setCustomized] = useState<Set<string>>(new Set())

  const grouped = useMemo(() => {
    const byDept = new Map<string, TargetIndicator[]>()
    for (const name of QUICK_ENTRY_DEPARTMENTS) byDept.set(name, [])
    for (const indicator of props.indicators) {
      const dept = matchQuickEntryDepartment(indicator.department)
      if (!byDept.has(dept)) byDept.set(dept, [])
      byDept.get(dept)?.push(indicator)
    }
    return [...byDept.entries()].filter(([, items]) => items.length > 0)
  }, [props.indicators])

  const salesTotal = useMemo(() => {
    let total = 0
    let any = false
    const channels = SALES_CHANNEL_CODES.map(code => {
      const value = props.readMonthValue(code, props.entryMonth)
      if (value != null) {
        any = true
        total += value
      }
      const indicator = roster.find(item => item.code === code)
      return { code, name: indicator?.name ?? code, value }
    })
    return { channels, total: any ? total : null }
  }, [props, roster])

  const toggleDept = (dept: string) => {
    setExpandedDepts(current => {
      const next = new Set(current)
      if (next.has(dept)) next.delete(dept)
      else next.add(dept)
      return next
    })
  }

  if (props.loading) return <MxLoadingState label="Carregando cadastro rápido" />
  if (props.error) return <MxErrorState description={props.error} retry={props.onRetry} />
  if (props.indicators.length === 0) {
    return <MxEmptyState title="Nenhum indicador digitável" description="O ciclo precisa dos 19 indicadores manuais para o Cadastro Rápido." />
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
      <nav aria-label="Departamentos do cadastro rápido" className="space-y-1">
        {grouped.map(([dept, items]) => {
          const filled = items.filter(item => monthSeries(
            Array.from({ length: 12 }, (_, index) => props.readMonthValue(item.code, index + 1)),
          ).every(value => value != null)).length
          const open = expandedDepts.has(dept)
          return (
            <Button
              key={dept}
              type="button"
              variant={open ? 'outline' : 'ghost'}
              className="w-full justify-between"
              aria-expanded={open}
              onClick={() => toggleDept(dept)}
            >
              <span>{dept}</span>
              <span>{filled} / {items.length}</span>
            </Button>
          )
        })}
      </nav>

      <div className="space-y-4">
        {salesTotal.channels.some(channel => channel.value != null) ? (
          <MxSectionCard>
            <div className="space-y-3 p-5">
              <h3 className="text-sm font-semibold text-foreground">Distribuição da Meta de Vendas</h3>
              <MxMetricGrid>
                {salesTotal.channels.map(channel => (
                  <MxMetricCard key={channel.code} title={channel.name.replace('Vendas - ', '')} value={channel.value ?? '—'} detail="Canal no mês selecionado" icon={Target} />
                ))}
                <MxMetricCard title="Vendas Total (mês)" value={salesTotal.total ?? '—'} detail="Soma dos canais digitáveis" icon={Target} tone="success" />
              </MxMetricGrid>
            </div>
          </MxSectionCard>
        ) : null}

        {grouped.map(([dept, items]) => {
          if (!expandedDepts.has(dept)) return null
          const filled = items.filter(item => monthSeries(
            Array.from({ length: 12 }, (_, index) => props.readMonthValue(item.code, index + 1)),
          ).every(value => value != null)).length
          return (
            <MxSectionCard key={dept}>
              <div className="space-y-4 p-5">
                <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => toggleDept(dept)}>
                  <span className="font-semibold text-foreground">{dept} {filled} de {items.length} preenchidas</span>
                  {expandedDepts.has(dept) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="space-y-4">
                  {items.map(indicator => {
                    const config = getFormatConfig(indicator.value_type ?? 'number', indicator.casas_decimais ?? 0)
                    const series = normalizeQuickEntrySeries(monthSeries(Array.from({ length: 12 }, (_, index) => props.readMonthValue(indicator.code, index + 1))))
                    const uniqueFilled = uniqueFilledValue(series)
                    const customizedRow = customized.has(indicator.code) || (uniqueFilled == null && !monthsAreUniform(series))
                    const monthValue = series[props.entryMonth - 1] ?? uniqueFilled
                    return (
                      <div key={indicator.code} className="space-y-2 rounded-xl border border-border-subtle p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">{indicator.name}</p>
                            <p className="text-xs text-muted-foreground">{officialDefinitionUnit(indicator.code)} · {indicator.displayCode ?? indicator.code}</p>
                          </div>
                          {customizedRow ? (
                            <Button variant="ghost" size="sm" onClick={() => {
                              setCustomized(current => { const next = new Set(current); next.delete(indicator.code); return next })
                              if (uniqueFilled != null && !monthsAreUniform(series)) {
                                props.onCommitYear(indicator.code, String(uniqueFilled))
                              }
                            }}>
                              Voltar para valor único
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setCustomized(current => new Set(current).add(indicator.code))}>
                              Personalizar por mês
                            </Button>
                          )}
                        </div>
                        {customizedRow ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                              {MONTH_LABELS.map((label, index) => (
                                <label key={label} className="space-y-1 text-xs text-muted-foreground">
                                  {label}
                                  <PlanningMonthInput
                                    ariaLabel={`${indicator.name} — ${label}`}
                                    displayValue={series[index]}
                                    config={config}
                                    draft={props.drafts[props.draftKey(indicator.code, index + 1)]}
                                    onDraft={raw => props.onDraft(props.draftKey(indicator.code, index + 1), raw)}
                                    onCommit={raw => props.onCommit(indicator.code, index + 1, raw)}
                                  />
                                </label>
                              ))}
                            </div>
                            {props.readOnly ? null : (
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => props.onApplyJanuary(indicator.code)}>Aplicar jan a todos</Button>
                                <Button variant="outline" size="sm" onClick={() => props.onCopyPrevious(indicator.code)}>Copiar mês anterior</Button>
                                <Button variant="outline" size="sm" onClick={() => props.onClearYear(indicator.code)}>Limpar todos</Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">{props.field === 'meta' ? 'Meta mensal:' : props.field === 'realizado' ? 'Realizado mensal:' : 'Ano anterior:'}</p>
                            <PlanningMonthInput
                              ariaLabel={`${indicator.name} — valor único`}
                              displayValue={monthValue}
                              config={config}
                              draft={props.drafts[props.draftKey(indicator.code, props.entryMonth)]}
                              onDraft={raw => props.onDraft(props.draftKey(indicator.code, props.entryMonth), raw)}
                              onCommit={raw => props.onCommitYear(indicator.code, raw)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </MxSectionCard>
          )
        })}
        {props.resumo?.length ? (
          <MxSectionCard>
            <div className="space-y-3 p-5">
              <h3 className="text-sm font-semibold text-foreground">Resumo Calculado</h3>
              <MxMetricGrid>
                {props.resumo.map(item => (
                  <MxMetricCard
                    key={item.code}
                    title={item.label}
                    value={formatDisplay(item.monthValue, getFormatConfig('number', 0))}
                    detail={item.annual == null ? 'Sem base anual' : `Anual ${formatDisplay(item.annual, getFormatConfig('number', 0))}`}
                    icon={Target}
                    tone={item.monthValue == null ? 'neutral' : 'info'}
                  />
                ))}
              </MxMetricGrid>
            </div>
          </MxSectionCard>
        ) : null}
        <p className="text-xs text-muted-foreground">Resultados calculados em tempo real · {formatDisplay(salesTotal.total, getFormatConfig('number', 0))}</p>
      </div>
    </div>
  )
}
