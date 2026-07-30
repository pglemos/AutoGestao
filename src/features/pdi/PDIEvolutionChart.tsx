import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { chartTokens, chartSeriesArray } from '@/lib/charts/tokens'
import type { PDIEvolutionResult } from '@/lib/pdi-evolution'

interface PDIEvolutionChartProps {
  evolution: PDIEvolutionResult
}

/**
 * G8 — PDI Evolution Chart (EV-7.2)
 *
 * Line chart comparing competency scores across PDI sessions.
 * X-axis = session dates, Y-axis = scores, one line per competency.
 */
export function PDIEvolutionChart({ evolution }: PDIEvolutionChartProps) {
  const { chartData, competencias } = useMemo(() => {
    if (!evolution.comparavel || evolution.items.length === 0) {
      return { chartData: [], competencias: [] }
    }

    // Collect all unique session dates across all competencies in order
    const sessionMap = new Map<string, { sessaoId: string; dateLabel: string; sortKey: string }>()
    for (const item of evolution.items) {
      for (const ponto of item.pontos) {
        if (!sessionMap.has(ponto.sessaoId)) {
          sessionMap.set(ponto.sessaoId, {
            sessaoId: ponto.sessaoId,
            dateLabel: ponto.dateLabel,
            sortKey: ponto.date,
          })
        }
      }
    }

    const sessions = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(a.sortKey).getTime() - new Date(b.sortKey).getTime(),
    )

    // Build data: one object per session, with each competency as a key
    const data = sessions.map(session => {
      const row: Record<string, string | number> = { dateLabel: session.dateLabel }
      for (const item of evolution.items) {
        const ponto = item.pontos.find(p => p.sessaoId === session.sessaoId)
        if (ponto) {
          row[item.competencia] = ponto.nota
        }
      }
      return row
    })

    const comps = evolution.items.map(item => item.competencia)

    return { chartData: data, competencias: comps }
  }, [evolution])

  if (!evolution.comparavel) {
    return (
      <Card className="mt-mx-sm border bg-white p-mx-lg">
        <Typography variant="h3" className="text-base tracking-normal">
          Grafico de Evolucao
        </Typography>
        <Typography variant="caption" tone="muted" className="mt-1 block normal-case tracking-normal">
          O grafico de evolucao estara disponivel apos a segunda sessao PDI com competencias avaliadas em comum.
        </Typography>
      </Card>
    )
  }

  const colors = chartSeriesArray()

  return (
    <Card className="mt-mx-sm border bg-white p-mx-lg">
      <Typography variant="h3" className="mb-mx-md text-base tracking-normal">
        Evolucao de Competencias entre Sessoes
      </Typography>

      {/* Accessible table for screen readers */}
      <table className="sr-only">
        <caption>Evolucao das notas de competencias entre sessoes PDI</caption>
        <thead>
          <tr>
            <th scope="col">Sessao</th>
            {competencias.map(c => (
              <th key={c} scope="col">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chartData.map((row, idx) => (
            <tr key={idx}>
              <td>{row.dateLabel}</td>
              {competencias.map(c => (
                <td key={c}>{row[c] ?? '-'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="h-80 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={chartTokens.grid()} strokeDasharray="3 3" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: chartTokens.axisTickStrong(), fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={{ stroke: chartTokens.grid() }}
            />
            <YAxis
              tick={{ fill: chartTokens.axisTickMuted(), fontSize: 11, fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${chartTokens.grid()}`,
                fontSize: 12,
                fontWeight: 700,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, fontWeight: 700 }}
              iconType="circle"
              iconSize={8}
            />
            {competencias.map((comp, idx) => (
              <Line
                key={comp}
                type="monotone"
                dataKey={comp}
                name={comp}
                stroke={colors[idx % colors.length]}
                strokeWidth={2}
                dot={{
                  r: 4,
                  fill: colors[idx % colors.length],
                  stroke: chartTokens.dotStroke(),
                  strokeWidth: 2,
                }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
