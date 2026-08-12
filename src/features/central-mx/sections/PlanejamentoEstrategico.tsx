import { useMemo } from 'react'
import { LineChart, Target, TrendingUp, AlertOctagon, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import {
  CENTRAL_MX_PLANNING_INDICATORS,
  type CentralMxIndicatorValue,
} from '@/lib/central-mx-engine'
import { cn } from '@/lib/utils'

/**
 * Tela Planejamento Estratégico — Sprint 1 (S1-T3).
 *
 * Estrutura aprovada no `.docx §330`:
 *   • 5 cards principais (visão sintética)
 *   • Tabela anual: Meta / Realizado / Ano Anterior
 *   • Indicadores cadastrados (catálogo do PRD + ata)
 *
 * Sem excesso de gráficos: cards e status.
 *
 * O componente é uma `view`: recebe `planningIndicators` do `OwnerExecutiveCockpit`
 * (já alimentado pela engine TS) — ou pode ser usado standalone em uma rota futura.
 */

type Props = {
  planningIndicators: CentralMxIndicatorValue[]
  periodLabel: string
}

const TONE_MAP: Record<string, string> = {
  completo: 'border-status-success/30 bg-status-success-surface text-status-success',
  parcial: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
  pendente: 'border-border bg-gray-50 text-muted-foreground',
  ok: 'border-status-success/30 bg-status-success-surface text-status-success',
  watch: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
  miss: 'border-status-error/30 bg-status-error-surface text-status-error',
  pending: 'border-border bg-gray-50 text-muted-foreground',
}

const STATUS_LABEL: Record<string, string> = {
  completo: 'Completo',
  parcial: 'Parcial',
  pendente: 'Pendente',
  ok: 'Atingido',
  watch: 'Atenção',
  miss: 'Abaixo',
  pending: 'Sem dado',
}

function achievementFor(indicator: CentralMxIndicatorValue): number | null {
  if (indicator.meta == null || indicator.realizado == null || indicator.meta === 0) {
    return null
  }
  return (Number(indicator.realizado) / Number(indicator.meta)) * 100
}

export function PlanejamentoEstrategico({ planningIndicators, periodLabel }: Props) {
  const fallbackIndicators = useMemo<CentralMxIndicatorValue[]>(
    () =>
      CENTRAL_MX_PLANNING_INDICATORS.map((def) => ({
        ...def,
        score: null,
        status: 'pendente',
        missing: ['meta', 'realizado', 'anoAnterior'],
        meta: null,
        realizado: null,
        anoAnterior: null,
      })),
    [],
  )
  const indicators = planningIndicators.length ? planningIndicators : fallbackIndicators

  const totals = useMemo(() => {
    const total = indicators.length
    const ok = indicators.filter((i) => i.status === 'completo').length
    const watch = indicators.filter((i) => i.status === 'parcial').length
    const pending = indicators.filter((i) => i.status === 'pendente').length
    const miss = indicators.filter((i) => {
      const value = achievementFor(i)
      return value != null && value < 70
    }).length
    const averageScore =
      indicators.reduce(
        (acc, item) => (item.score == null ? acc : { sum: acc.sum + item.score, n: acc.n + 1 }),
        { sum: 0, n: 0 },
      )
    return {
      total,
      ok,
      watch,
      miss,
      pending,
      score: averageScore.n ? Math.round(averageScore.sum / averageScore.n) : null,
    }
  }, [indicators])

  const cards: Array<{
    icon: typeof LineChart
    label: string
    value: string
    detail: string
    tone: 'ok' | 'watch' | 'miss' | 'pending'
  }> = [
    {
      icon: LineChart,
      label: 'Indicadores cadastrados',
      value: totals.total.toString(),
      detail: 'cobrindo todos os departamentos',
      tone: 'ok',
    },
    {
      icon: TrendingUp,
      label: 'Score médio',
      value: totals.score == null ? '—' : totals.score.toString(),
      detail: 'pesos do .docx §250',
      tone: totals.score == null ? 'pending' : totals.score >= 70 ? 'ok' : 'watch',
    },
    {
      icon: CheckCircle2,
      label: 'Atingidos',
      value: totals.ok.toString(),
      detail: 'realizado ≥ meta',
      tone: 'ok',
    },
    {
      icon: AlertOctagon,
      label: 'Em atenção',
      value: (totals.watch + totals.miss).toString(),
      detail: `${totals.miss} abaixo • ${totals.watch} no risco`,
      tone: totals.miss > 0 ? 'miss' : totals.watch > 0 ? 'watch' : 'ok',
    },
    {
      icon: Target,
      label: 'Sem dado',
      value: totals.pending.toString(),
      detail: 'indicadores aguardando fonte',
      tone: totals.pending > 0 ? 'pending' : 'ok',
    },
  ]

  return (
    <section className="space-y-mx-lg" aria-label="Planejamento estratégico">
      <header className="space-y-mx-xs">
        <Typography variant="h2" className="tracking-tight">
          Planejamento estratégico
        </Typography>
        <Typography variant="p" tone="muted" className="font-bold normal-case tracking-normal">
          Painel anual com indicadores ativos do catálogo — visão {periodLabel}. Estrutura conforme
          aprovado em `.docx §330` (5 cards + tabela completa).
        </Typography>
      </header>

      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card
            key={card.label}
            className={cn('rounded-2xl border p-mx-md', TONE_MAP[card.tone])}
          >
            <div className="flex items-center gap-mx-sm">
              <div className="rounded-2xl bg-white/40 p-mx-xs">
                <card.icon size={18} aria-hidden="true" />
              </div>
              <Typography
                variant="caption"
                className=""
              >
                {card.label}
              </Typography>
            </div>
            <Typography as="p" variant="h2" className="mt-mx-sm">
              {card.value}
            </Typography>
            <Typography variant="tiny" className="block font-bold normal-case tracking-normal">
              {card.detail}
            </Typography>
          </Card>
        ))}
      </div>

      <Card className="p-mx-md">
        <header className="mb-mx-sm flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-mx-indigo-50 p-mx-xs text-status-success-text">
            <LineChart size={18} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Tabela anual — Meta vs. Realizado vs. Ano Anterior
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              {totals.total} indicador(es) cadastrado(s) — fonte: catálogo Central MX (.docx
              §330).
            </Typography>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left">
              <tr className="bg-gray-50">
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Indicador</th>
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Depto</th>
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Meta</th>
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Realizado</th>
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Ano anterior</th>
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">% Ating.</th>
                <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((indicator) => (
                <tr key={indicator.code} className="border-t border-border/60">
                  <td className="px-mx-sm py-mx-xs font-bold">
                    {indicator.label}
                    <Typography variant="tiny" tone="muted" className="block font-normal normal-case">
                      {indicator.code}
                    </Typography>
                  </td>
                  <td className="px-mx-sm py-mx-xs uppercase">{indicator.department}</td>
                  <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                    {indicator.meta == null ? '—' : Number(indicator.meta).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                    {indicator.realizado == null
                      ? '—'
                      : Number(indicator.realizado).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                    {indicator.anoAnterior == null
                      ? '—'
                      : Number(indicator.anoAnterior).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                    {(() => {
                      const achievement = achievementFor(indicator)
                      return achievement == null ? '—' : `${Math.round(achievement)}%`
                    })()}
                  </td>
                  <td className="px-mx-sm py-mx-xs">
                    <Badge variant="outline" className={cn('font-bold', TONE_MAP[indicator.status])}>
                      {STATUS_LABEL[indicator.status] ?? indicator.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {!indicators.length && (
                <tr>
                  <td colSpan={7} className="px-mx-sm py-mx-md text-center">
                    <Typography variant="tiny" tone="muted" className="font-bold">
                      Catálogo ainda sem indicadores cadastrados.
                    </Typography>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
