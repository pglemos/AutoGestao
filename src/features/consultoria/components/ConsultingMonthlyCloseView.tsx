import { useMemo } from 'react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useConsultingMetrics } from '@/hooks/useConsultingMetrics'
import { BarChart3, Car, Database, Megaphone, ShoppingCart, Users } from 'lucide-react'

type Props = {
  clientId: string
}

function monthKey(value?: string | null) {
  return String(value || '').slice(0, 7)
}

function formatMonth(month: string) {
  if (!month) return 'Sem referência'
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ConsultingMonthlyCloseView({ clientId }: Props) {
  const metrics = useConsultingMetrics(clientId)

  const latestMonth = useMemo(() => {
    return [
      ...metrics.marketing.map((row) => monthKey(row.reference_month)),
      ...metrics.sales.map((row) => monthKey(row.sale_date)),
      ...metrics.inventory.map((row) => monthKey(row.reference_month)),
      ...metrics.financials.map((row) => monthKey(row.reference_date)),
    ].filter(Boolean).sort().at(-1) || ''
  }, [metrics.financials, metrics.inventory, metrics.marketing, metrics.sales])

  const summary = useMemo(() => {
    const marketingRows = metrics.marketing.filter((row) => monthKey(row.reference_month) === latestMonth)
    const salesRows = metrics.sales.filter((row) => monthKey(row.sale_date) === latestMonth)
    const inventory = metrics.inventory.find((row) => monthKey(row.reference_month) === latestMonth)
    const sellers = new Set(salesRows.map((row) => String(row.seller_name || '').trim()).filter(Boolean))
    const leads = marketingRows.reduce((sum, row) => sum + row.leads_volume, 0)
    const internetSales = marketingRows.reduce((sum, row) => sum + row.sales_volume, 0)
    const investment = marketingRows.reduce((sum, row) => sum + row.investment, 0)
    const avgTicket = salesRows.length
      ? salesRows.reduce((sum, row) => sum + Number(row.sale_value || 0), 0) / salesRows.length
      : 0

    return {
      marketingRows,
      salesRows,
      inventory,
      sellers: sellers.size,
      leads,
      internetSales,
      investment,
      costPerInternetSale: internetSales ? investment / internetSales : 0,
      avgTicket,
    }
  }, [latestMonth, metrics.inventory, metrics.marketing, metrics.sales])

  const derived = useMemo(() => {
    const wanted = ['sales_total', 'leads_received', 'internet_cost_per_sale', 'stock_turnover', 'stock_over_90_rate', 'avg_margin']
    return wanted
      .map((key) => {
        const metric = metrics.catalog.find((item) => item.metric_key === key)
        const result = metrics.latestResults.get(key)
        return metric && result ? { metric, result } : null
      })
      .filter(Boolean)
  }, [metrics.catalog, metrics.latestResults])

  if (metrics.loading) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="p">Carregando fechamento mensal...</Typography>
      </Card>
    )
  }

  if (metrics.error) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="h3" tone="error">Fechamento indisponível</Typography>
        <Typography variant="p" tone="muted">{metrics.error}</Typography>
      </Card>
    )
  }

  return (
    <section className="space-y-mx-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-mx-sm">
        <div>
          <Typography variant="h3">FECHAMENTO MENSAL PMR</Typography>
          <Typography variant="caption" tone="muted">
            {formatMonth(latestMonth)}
          </Typography>
        </div>
        <Badge variant={latestMonth ? 'success' : 'outline'} className="rounded-mx-full px-4 py-1">
          {latestMonth ? 'DADOS CARREGADOS' : 'SEM DADOS'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-mx-md">
        <Card className="p-mx-lg border-none bg-white">
          <Megaphone className="w-mx-5 h-mx-5 text-emerald-600 mb-mx-sm" />
          <Typography variant="caption" tone="muted">Leads recebidos</Typography>
          <Typography variant="h2">{formatNumber(summary.leads)}</Typography>
        </Card>
        <Card className="p-mx-lg border-none bg-white">
          <ShoppingCart className="w-mx-5 h-mx-5 text-emerald-600 mb-mx-sm" />
          <Typography variant="caption" tone="muted">Vendas registradas</Typography>
          <Typography variant="h2">{formatNumber(summary.salesRows.length || summary.internetSales)}</Typography>
        </Card>
        <Card className="p-mx-lg border-none bg-white">
          <Car className="w-mx-5 h-mx-5 text-emerald-600 mb-mx-sm" />
          <Typography variant="caption" tone="muted">Estoque total</Typography>
          <Typography variant="h2">{formatNumber(summary.inventory?.total_stock || 0)}</Typography>
        </Card>
        <Card className="p-mx-lg border-none bg-white">
          <Database className="w-mx-5 h-mx-5 text-emerald-600 mb-mx-sm" />
          <Typography variant="caption" tone="muted">Investimento internet</Typography>
          <Typography variant="h2">{formatCurrency(summary.investment)}</Typography>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-mx-lg">
        <Card className="p-mx-lg border-none bg-white xl:col-span-2">
          <div className="flex items-center justify-between gap-mx-sm mb-mx-md">
            <Typography variant="h3">MARKETING POR CANAL</Typography>
            <Badge variant="outline" className="rounded-mx-full px-3 py-1">{summary.marketingRows.length} CANAIS</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">MÍDIA</Typography></th>
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">LEADS</Typography></th>
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">VENDAS</Typography></th>
                  <th className="py-mx-sm"><Typography variant="tiny" tone="muted">INVESTIMENTO</Typography></th>
                </tr>
              </thead>
              <tbody>
                {summary.marketingRows.map((row) => (
                  <tr key={`${row.reference_month}-${row.media}`} className="border-b border-border-subtle">
                    <td className="py-mx-sm pr-mx-md"><Typography variant="p" className="">{row.media}</Typography></td>
                    <td className="py-mx-sm pr-mx-md"><Typography variant="p">{formatNumber(row.leads_volume)}</Typography></td>
                    <td className="py-mx-sm pr-mx-md"><Typography variant="p">{formatNumber(row.sales_volume)}</Typography></td>
                    <td className="py-mx-sm"><Typography variant="p">{formatCurrency(row.investment)}</Typography></td>
                  </tr>
                ))}
                {summary.marketingRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-mx-md">
                      <Typography variant="p" tone="muted">Nenhum fechamento de marketing encontrado.</Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-mx-lg border-none bg-white">
          <Typography variant="h3" className="mb-mx-md">INDICADORES DERIVADOS</Typography>
          <div className="space-y-mx-sm">
            <div className="flex items-center justify-between gap-mx-sm p-mx-sm rounded-xl bg-gray-50">
              <div className="flex items-center gap-mx-xs">
                <Users className="w-mx-4 h-mx-4 text-emerald-600" />
                <Typography variant="p" className="font-bold">Vendedores ativos</Typography>
              </div>
              <Typography variant="p" className="">{summary.sellers}</Typography>
            </div>
            <div className="flex items-center justify-between gap-mx-sm p-mx-sm rounded-xl bg-gray-50">
              <div className="flex items-center gap-mx-xs">
                <BarChart3 className="w-mx-4 h-mx-4 text-emerald-600" />
                <Typography variant="p" className="font-bold">Ticket médio</Typography>
              </div>
              <Typography variant="p" className="">{formatCurrency(summary.avgTicket)}</Typography>
            </div>
            {derived.map((item) => item && (
              <div key={item.metric.metric_key} className="flex items-center justify-between gap-mx-sm p-mx-sm rounded-xl bg-gray-50">
                <Typography variant="p" className="font-bold">{item.metric.label}</Typography>
                <Typography variant="p" className="">
                  {item.metric.value_type === 'currency'
                    ? formatCurrency(item.result.result_value)
                    : item.metric.value_type === 'percent'
                      ? `${(item.result.result_value * 100).toFixed(1)}%`
                      : formatNumber(item.result.result_value)}
                </Typography>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  )
}
