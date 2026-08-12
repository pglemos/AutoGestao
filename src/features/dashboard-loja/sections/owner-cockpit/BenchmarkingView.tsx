import { useEffect, useMemo, useState } from 'react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import type { DashboardData } from './types'
import { formatPlanningValue, scoreStatus } from './format'
import { MXScoreCompact, SectionTitle, SideList } from './primitives'
import { useCentralMxBenchmark, type CentralMxBenchmarkPeerGroup, type CentralMxBenchmarkState } from '../../hooks/useCentralMxBenchmark'

export function BenchmarkingView({
  data,
  mxScore,
  marginPercent,
}: {
  data: DashboardData
  mxScore: number | null
  marginPercent: number | null
}) {
  const [region, setRegion] = useState('Sul')
  const [size, setSize] = useState('Médio')
  const [brand, setBrand] = useState('Todas')
  const [segment, setSegment] = useState('Multimarcas')
  const salesBenchmark = useCentralMxBenchmark()
  const marginBenchmark = useCentralMxBenchmark()
  const funnelBenchmark = useCentralMxBenchmark()

  const filterOptions = {
    Região: { current: region, set: setRegion, options: ['Sul', 'Sudeste', 'Nordeste', 'Centro-Oeste', 'Norte'] },
    'Porte da Loja': { current: size, set: setSize, options: ['Pequeno', 'Médio', 'Grande'] },
    'Marca / Grupo': { current: brand, set: setBrand, options: ['Todas', 'Chevrolet', 'Fiat', 'Volkswagen'] },
    Segmento: { current: segment, set: setSegment, options: ['Novos', 'Seminovos', 'Multimarcas'] },
  }

  const peerGroup: CentralMxBenchmarkPeerGroup = region !== 'Sul' ? 'regiao' : size !== 'Médio' ? 'porte' : segment !== 'Multimarcas' ? 'segmento' : 'mercado'

  useEffect(() => {
    const storeId = data.operationalStore?.id
    if (!storeId) return
    const query = { storeId, peerGroup, period: data.periodEndDate }
    void Promise.all([
      salesBenchmark.fetchBenchmark({ ...query, metricCode: 'sales_volume' }),
      marginBenchmark.fetchBenchmark({ ...query, metricCode: 'gross_margin_pct' }),
      funnelBenchmark.fetchBenchmark({ ...query, metricCode: 'lead_to_schedule_rate' }),
    ])
  }, [brand, data.operationalStore?.id, data.periodEndDate, funnelBenchmark.fetchBenchmark, marginBenchmark.fetchBenchmark, peerGroup, salesBenchmark.fetchBenchmark, segment, size, region])

  const benchmarkValue = (state: CentralMxBenchmarkState) => state.data?.peer_avg ?? null
  const bestValue = (state: CentralMxBenchmarkState) => state.data?.peer_top ?? null

  const rows = [
    {
      label: 'Vendas Totais (Unid.)', 
      store: data.metrics.totalSales, 
      group: benchmarkValue(salesBenchmark),
      best: bestValue(salesBenchmark),
      status: benchmarkValue(salesBenchmark) == null ? 'Pendente' : data.metrics.totalSales >= benchmarkValue(salesBenchmark)! ? 'Bom' : 'Atenção'
    },
    { 
      label: 'Margem Média de Venda (%)', 
      store: marginPercent, 
      group: benchmarkValue(marginBenchmark),
      best: bestValue(marginBenchmark),
      status: marginPercent === null ? 'Pendente' : marginPercent >= 18 ? 'Bom' : 'Atenção' 
    },
    { 
      label: 'Conversão Leads > Agendamento (%)', 
      store: data.funilData.tx_lead_agd, 
      group: benchmarkValue(funnelBenchmark),
      best: bestValue(funnelBenchmark),
      status: benchmarkValue(funnelBenchmark) == null ? 'Pendente' : data.funilData.tx_lead_agd >= benchmarkValue(funnelBenchmark)! ? 'Bom' : 'Atenção'
    },
    { 
      label: 'Custo por Venda', 
      store: data.latestDRE?.cac ?? null, 
      group: null, 
      best: null, 
      status: data.latestDRE ? 'Acompanhar' : 'Pendente' 
    },
    { 
      label: 'MX Score', 
      store: mxScore, 
      group: null, 
      best: null, 
      status: scoreStatus(mxScore) 
    },
  ]

  const opportunities = useMemo(() => rows.filter(row => row.status === 'Atenção').map(row => row.label), [rows])

  return (
    <div className="space-y-mx-md">
      <SectionTitle title="Benchmarking" subtitle={`Compare sua loja com dados reais do recorte ${peerGroup}.`} />
      <Card className="p-mx-lg">
        <div className="grid grid-cols-1 gap-mx-sm md:grid-cols-4">
          {Object.entries(filterOptions).map(([label, { current, set, options }]) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white px-mx-md py-mx-sm flex flex-col gap-1">
              <Typography variant="tiny" tone="muted" className="block text-xs">{label}</Typography>
              <select
                value={current}
                onChange={(e) => set(e.target.value)}
                className="mt-mx-xs w-full bg-transparent font-bold text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary rounded-xl p-1 border border-gray-100 cursor-pointer"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-mx-lg">
          <Typography variant="h3" className="text-xl">Indicadores Comparados</Typography>
          <div className="mt-mx-md overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-gray-50 text-left text-mx-tiny font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-mx-sm py-mx-sm">Indicador</th>
                  <th className="px-mx-sm py-mx-sm">Sua Loja</th>
                  <th className="px-mx-sm py-mx-sm">Benchmark</th>
                  <th className="px-mx-sm py-mx-sm">Melhor Grupo</th>
                  <th className="px-mx-sm py-mx-sm">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map(row => (
                  <tr key={row.label}>
                    <td className="px-mx-sm py-mx-sm font-bold">{row.label}</td>
                    <td className="px-mx-sm py-mx-sm font-bold">{formatPlanningValue(row.store)}</td>
                    <td className="px-mx-sm py-mx-sm font-bold">{formatPlanningValue(row.group)}</td>
                    <td className="px-mx-sm py-mx-sm font-bold">{formatPlanningValue(row.best)}</td>
                    <td className="px-mx-sm py-mx-sm"><span className="rounded-xl border border-status-warning/20 bg-status-warning-surface px-mx-sm py-mx-xs text-mx-tiny font-bold text-status-warning">{row.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="space-y-mx-md">
          <MXScoreCompact score={mxScore} />
          <SideList title="Principais Oportunidades" items={opportunities.length ? opportunities : ['Nenhum desvio com benchmark disponível.']} />
        </div>
      </div>
    </div>
  )
}
