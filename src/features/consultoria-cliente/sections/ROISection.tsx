import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '@/lib/toast'
import { Download, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { downloadHtmlAsPdf } from '@/lib/pdf/downloadHtmlAsPdf'
import { chartTokens } from '@/lib/charts/tokens'
import type { ConsultingClientDetail, VisitOneQuantData } from '@/features/consultoria/types'

type Props = { client: ConsultingClientDetail }

function isVisitOneQuantData(value: unknown): value is VisitOneQuantData {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<VisitOneQuantData>
  return Array.isArray(candidate.sales) && Boolean(candidate.marketing) && Boolean(candidate.stock)
}

export function ROISection({ client }: Props) {
  const initialQuantData = client.visits?.find((v) => v.visit_number === 1)?.quant_data
  const initialData = isVisitOneQuantData(initialQuantData) ? initialQuantData : null
  const financials = [...(client.financials || [])].sort(
    (a, b) => new Date(a.reference_date).getTime() - new Date(b.reference_date).getTime(),
  )
  const currentData = financials.length > 0 ? financials[financials.length - 1] : null
  const initialAverageSales = (initialData?.sales.reduce((acc, c) => acc + (c.value || 0), 0) || 0) / 3

  const handleDownloadROI = async () => {
    const element = document.getElementById('roi-report-content')
    if (!element) return

    const opt = {
      margin: 10,
      filename: `Relatorio-ROI-${client.slug || 'cliente'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    } as const

    toast.loading('Gerando Relatório de Choque...')
    await downloadHtmlAsPdf(element, opt)
    toast.success('Relatório de ROI gerado!')
  }

  const chartData = financials.map((f) => {
    const inv = (client.inventory_snapshots || []).find((s) => s.reference_month === f.reference_date.substring(0, 7))
    return {
      mes: format(new Date(f.reference_date), 'MMM', { locale: ptBR }).toUpperCase(),
      vendas: f.volume_vendas || 0,
      conversao: (f.volume_leads || 0) > 0 ? ((f.volume_vendas || 0) / (f.volume_leads || 1)) * 100 : 0,
      margem: f.revenue > 0 ? (f.net_profit / f.revenue) * 100 : 0,
      estoque: inv?.percent_over_90_days || 0,
    }
  })

  const before = {
    sales: initialAverageSales,
    leads: initialData?.marketing?.leads || 0,
    conversion: (initialData?.marketing?.leads || 0) > 0
      ? (initialAverageSales / (initialData?.marketing?.leads || 1)) * 100
      : 0,
  }

  const after = {
    sales: currentData?.volume_vendas || 0,
    leads: currentData?.volume_leads || 0,
    conversion: (currentData?.volume_leads || 0) > 0
      ? ((currentData?.volume_vendas || 0) / (currentData?.volume_leads || 1)) * 100
      : 0,
  }

  const roi = before.sales > 0 ? ((after.sales - before.sales) / before.sales) * 100 : 0

  return (
    <div className="space-y-mx-lg animate-in fade-in slide-in-from-bottom-4 duration-500 pb-mx-xl">
      <div className="flex justify-end">
        <Button
          variant="secondary"
          className="text-white"
          onClick={handleDownloadROI}
          icon={<Download className="w-mx-4 h-mx-4" />}
        >
          EXPORTAR RELATÓRIO DE CHOQUE (PDF)
        </Button>
      </div>

      <div id="roi-report-content" className="space-y-mx-lg bg-gray-50 p-mx-md rounded-2xl print:p-0 print:bg-white">
        <Card className="p-mx-xl text-white border-none shadow-mx-2xl relative overflow-hidden">
          <div className="absolute top-mx-0 right-mx-0 p-mx-lg opacity-10"><TrendingUp size={200} strokeWidth={1} /></div>
          <div className="relative z-10">
            <Typography variant="h3" className="text-white/70 mb-mx-xs">Relatório de Choque: ROI da Consultoria</Typography>
            <div className="flex items-baseline gap-mx-md">
              <Typography variant="h1" className="text-6xl">{roi > 0 ? '+' : ''}{roi.toFixed(1)}%</Typography>
              <Typography variant="h3" className="text-white/80">DE CRESCIMENTO EM VENDAS</Typography>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-mx-lg">
          <div className="xl:col-span-2">
            <Card className="p-mx-lg bg-white border h-full">
              <Typography variant="h3" className="mb-mx-md">Evolução Histórica (PMR)</Typography>
              <div className="h-mx-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTokens.grid()} />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: chartTokens.axisTick() }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: chartTokens.axisTick() }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: chartTokens.accent() }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" />
                    <Line yAxisId="left" type="monotone" dataKey="vendas" name="Vendas" stroke={chartTokens.primary()} strokeWidth={4} dot={{ r: 6, fill: chartTokens.primary(), strokeWidth: 2, stroke: chartTokens.dotStroke() }} activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="conversao" name="Conversão %" stroke={chartTokens.accent()} strokeWidth={4} dot={{ r: 6, fill: chartTokens.accent(), strokeWidth: 2, stroke: chartTokens.dotStroke() }} />
                    <Line yAxisId="right" type="monotone" dataKey="margem" name="Margem %" stroke={chartTokens.series.s3()} strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: chartTokens.series.s3() }} />
                    <Line yAxisId="right" type="monotone" dataKey="estoque" name="Estoque +90d %" stroke={chartTokens.danger()} strokeWidth={2} dot={{ r: 4, fill: chartTokens.danger() }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="space-y-mx-lg">
            <Card className="p-mx-lg bg-white border">
              <Typography variant="h3" className="mb-mx-md flex items-center gap-mx-xs">
                <div className="w-mx-xs h-mx-xs bg-status-error rounded-mx-full" /> MÉDIA ANTES (D0)
              </Typography>
              <div className="space-y-mx-md">
                <div className="flex justify-between items-center border-b border-gray-100 pb-mx-xs">
                  <Typography variant="p" className="font-bold">VENDAS/MÊS</Typography>
                  <Typography variant="h3">{before.sales.toFixed(1)}</Typography>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-mx-xs">
                  <Typography variant="p" className="font-bold">LEADS/MÊS</Typography>
                  <Typography variant="h3">{before.leads}</Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="p" className="font-bold">CONVERSÃO GERAL</Typography>
                  <Typography variant="h3">{before.conversion.toFixed(1)}%</Typography>
                </div>
              </div>
            </Card>

            <Card className="p-mx-lg bg-white border">
              <Typography variant="h3" className="mb-mx-md flex items-center gap-mx-xs">
                <div className="w-mx-xs h-mx-xs bg-status-success rounded-mx-full" /> RESULTADO ATUAL
              </Typography>
              <div className="space-y-mx-md">
                <div className="flex justify-between items-center border-b border-gray-100 pb-mx-xs">
                  <Typography variant="p" className="font-bold">VENDAS/MÊS</Typography>
                  <div className="flex items-center gap-mx-xs">
                    <Typography variant="h3" className="text-status-success">{after.sales}</Typography>
                    {after.sales > before.sales && <Badge className="bg-status-success/10 text-status-success border-none text-mx-micro">+{((after.sales - before.sales)).toFixed(0)}</Badge>}
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-mx-xs">
                  <Typography variant="p" className="font-bold">LEADS/MÊS</Typography>
                  <Typography variant="h3">{after.leads}</Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="p" className="font-bold">CONVERSÃO GERAL</Typography>
                  <div className="flex items-center gap-mx-xs">
                    <Typography variant="h3" className={after.conversion > before.conversion ? 'text-status-success' : ''}>{after.conversion.toFixed(1)}%</Typography>
                    {after.conversion > before.conversion && <Badge className="bg-status-success/10 text-status-success border-none text-mx-micro">+{((after.conversion - before.conversion)).toFixed(1)}pp</Badge>}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-mx-lg bg-white border">
              <Typography variant="h3" className="mb-mx-md flex items-center gap-mx-xs">
                <div className="w-mx-xs h-mx-xs bg-emerald-600 rounded-mx-full" /> GANHOS DE EFICIÊNCIA
              </Typography>
              <div className="space-y-mx-md">
                <div className="flex justify-between items-center border-b border-gray-100 pb-mx-xs">
                  <Typography variant="p" className="font-bold">TEMPO DE RESPOSTA</Typography>
                  <Typography variant="h3" className="text-status-success">-45%</Typography>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-mx-xs">
                  <Typography variant="p" className="font-bold">ADERÊNCIA RITUAIS</Typography>
                  <Typography variant="h3" className="text-status-success">98%</Typography>
                </div>
                <div className="flex justify-between items-center">
                  <Typography variant="p" className="font-bold">QUALIDADE CRM</Typography>
                  <Typography variant="h3" className="text-status-success">A+</Typography>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ROISection
