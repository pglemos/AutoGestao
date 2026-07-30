import { useMemo, useState } from 'react'
import { ArrowRight, Gauge, Loader2, Lock, Search } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { Input } from '@/components/atoms/Input'
import {
  CENTRAL_MX_BENCHMARK_PRIVACY_MIN,
  useCentralMxBenchmark,
  type CentralMxBenchmarkPeerGroup,
} from '../hooks/useCentralMxBenchmark'

/**
 * Painel interativo de Benchmarking — Blitz 48h Dia 2 (T4).
 *
 * Permite ao perfil executivo digitar um indicador (code do catálogo MX) e
 * escolher o grupo de comparação (mercado, região, porte, segmento). A RPC
 * `public.get_benchmark` (Wave 3) devolve a posição da loja vs. peers.
 * Quando o recorte tem menos de 5 lojas, exibimos apenas a média geral por
 * privacidade (delta N6 da ata 2026-05-22 §00:37).
 */

type Props = {
  storeId: string | null | undefined
  period?: string
}

const PEER_OPTIONS: { value: CentralMxBenchmarkPeerGroup; label: string }[] = [
  { value: 'mercado', label: 'Mercado geral' },
  { value: 'regiao', label: 'Região' },
  { value: 'porte', label: 'Porte da loja' },
  { value: 'segmento', label: 'Segmento' },
]

const SUGGESTED_METRICS = [
  'gross_margin_pct',
  'sales_volume',
  'stock_turnover_rate',
  'lead_to_schedule_rate',
  'training_completion_rate',
]

export function CentralMxBenchmarkInteractive({ storeId, period }: Props) {
  const [metricCode, setMetricCode] = useState<string>('gross_margin_pct')
  const [peerGroup, setPeerGroup] = useState<CentralMxBenchmarkPeerGroup>('mercado')
  const benchmark = useCentralMxBenchmark()

  const lojaValue = benchmark.data?.loja_value
  const peerAvg = benchmark.data?.peer_avg
  const peerMedian = benchmark.data?.peer_median
  const peerTop = benchmark.data?.peer_top
  const peerCount = benchmark.data?.peer_count ?? 0
  const percentile = benchmark.data?.loja_percentile
  const rank = benchmark.data?.loja_rank

  const summaryLine = useMemo(() => {
    if (!benchmark.data) return 'Selecione indicador e grupo para comparar.'
    if (benchmark.privacyApplied) {
      return `Recorte com ${peerCount} loja(s) — exibindo apenas média geral por privacidade.`
    }
    if (lojaValue == null || peerAvg == null) {
      return 'Sem dado suficiente para esta combinação.'
    }
    const deltaPct = peerAvg ? ((lojaValue - peerAvg) / peerAvg) * 100 : 0
    return `${peerCount} loja(s) no recorte • diferença vs. média: ${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`
  }, [benchmark.data, benchmark.privacyApplied, lojaValue, peerAvg, peerCount])

  return (
    <Card className="p-mx-lg">
      <div className="flex items-start gap-mx-sm">
        <div className="rounded-mx-xl bg-mx-indigo-50 p-mx-sm text-brand-primary">
          <Gauge size={20} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="h3" className="">
            Benchmark interativo
          </Typography>
          <Typography variant="tiny" tone="muted" className="block">
            {summaryLine}
          </Typography>
        </div>
        {benchmark.privacyApplied && (
          <Badge variant="outline" className="">
            <Lock size={12} className="mr-1" />
            Privacidade
          </Badge>
        )}
      </div>

      <div className="mt-mx-md grid grid-cols-1 gap-mx-sm md:grid-cols-3">
        <div>
          <label
            htmlFor="benchmark-metric-code"
            className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
          >
            Indicador (code)
          </label>
          <Input
            id="benchmark-metric-code"
            value={metricCode}
            onChange={(event) => setMetricCode(event.target.value.trim())}
            placeholder="ex: gross_margin_pct"
            className="font-mono-numbers"
          />
        </div>
        <div>
          <label
            htmlFor="benchmark-peer-group"
            className="block text-mx-tiny font-black uppercase tracking-widest text-text-tertiary"
          >
            Grupo de comparação
          </label>
          <select
            id="benchmark-peer-group"
            value={peerGroup}
            onChange={(event) => setPeerGroup(event.target.value as CentralMxBenchmarkPeerGroup)}
            className="w-full h-mx-14 sm:h-12 rounded-mx-md border border-border-default bg-white px-5 text-sm font-black uppercase shadow-inner outline-none focus:border-brand-primary/30 focus:ring-4 focus:ring-brand-primary/5"
          >
            {PEER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            className="w-full"
            variant="primary"
            disabled={!storeId || benchmark.loading || !metricCode}
            onClick={() =>
              storeId &&
              benchmark.fetchBenchmark({
                storeId,
                metricCode,
                peerGroup,
                period,
              })
            }
          >
            {benchmark.loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            <span className="ml-1">Comparar</span>
          </Button>
        </div>
      </div>

      {benchmark.error && (
        <div className="mt-mx-md rounded-mx-md border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error">
            {benchmark.error}
          </Typography>
        </div>
      )}

      <div className="mt-mx-md grid grid-cols-2 gap-mx-sm md:grid-cols-4">
        <MetricCell label="Minha loja" value={lojaValue} />
        <MetricCell label="Média peer" value={peerAvg} />
        <MetricCell label="Mediana peer" value={peerMedian} />
        <MetricCell label="Top peer" value={peerTop} />
      </div>

      {benchmark.data && (
        <div className="mt-mx-md flex flex-wrap items-center justify-between gap-mx-sm rounded-mx-xl border border-border-default bg-surface-alt p-mx-sm">
          <div className="flex items-center gap-mx-xs">
            <Typography variant="tiny" tone="muted" className="">
              Ranking
            </Typography>
            <Typography variant="caption" className="">
              {rank ?? '—'} de {peerCount}
            </Typography>
          </div>
          <div className="flex items-center gap-mx-xs">
            <Typography variant="tiny" tone="muted" className="">
              Percentil
            </Typography>
            <Typography variant="caption" className="">
              {percentile != null ? `${Number(percentile).toFixed(1)}%` : '—'}
            </Typography>
          </div>
          {peerCount < CENTRAL_MX_BENCHMARK_PRIVACY_MIN && (
            <Typography variant="tiny" tone="muted" className="font-bold normal-case tracking-normal">
              Mínimo de {CENTRAL_MX_BENCHMARK_PRIVACY_MIN} lojas no recorte para liberar detalhes.
            </Typography>
          )}
        </div>
      )}

      <div className="mt-mx-md flex flex-wrap items-center gap-mx-xs">
        <Typography variant="tiny" tone="muted" className="">
          Sugestões
        </Typography>
        {SUGGESTED_METRICS.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setMetricCode(code)}
            className="rounded-mx-md border border-border-default bg-white px-mx-xs py-mx-tiny text-mx-tiny font-black uppercase tracking-widest text-text-secondary hover:border-brand-primary/40 hover:text-brand-primary"
          >
            {code}
            <ArrowRight size={10} className="ml-1 inline" />
          </button>
        ))}
      </div>
    </Card>
  )
}

function MetricCell({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-mx-xl border border-border-default bg-white p-mx-sm">
      <Typography variant="tiny" tone="muted" className="">
        {label}
      </Typography>
      <Typography as="p" variant="h3" className="mt-mx-tiny">
        {value == null ? '—' : Number(value).toFixed(2)}
      </Typography>
    </div>
  )
}
