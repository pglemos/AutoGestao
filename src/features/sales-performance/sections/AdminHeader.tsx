import { Calendar, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { shortDate } from '../data/formatters'
import type { NetworkMetrics } from '../data/types'

type Props = {
  metrics: NetworkMetrics
  isRefetching: boolean
  onRefresh: () => void
  onExport: () => void
}

export function AdminHeader({ metrics, isRefetching, onRefresh, onExport }: Props) {
  return (
    <header
      data-mx-module-header=""
      className="flex shrink-0 flex-col justify-between gap-mx-lg rounded-2xl border border-border-subtle bg-white p-5 shadow-sm xl:flex-row xl:items-end"
    >
      <div className="flex flex-col gap-mx-tiny">
        <div className="flex items-center gap-mx-sm">
          <Typography variant="h1">
            BI Executivo <span className="text-status-success-text">da Rede</span>
          </Typography>
        </div>
        <Typography
          variant="caption"
          className="leading-relaxed"
        >
          {metrics.storeCount} lojas | {metrics.totalUsers} usuarios | {metrics.consultingClients}{' '}
          clientes consultoria | historico {shortDate(metrics.period.historyStart)} ate{' '}
          {shortDate(metrics.period.today)}
        </Typography>
      </div>
      <div className="flex flex-wrap items-center gap-mx-sm shrink-0">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          aria-label="Atualizar"
          className="w-mx-14 h-mx-14"
        >
          <RefreshCw size={20} className={cn(isRefetching && 'animate-spin')} />
        </Button>
        <div className="flex items-center gap-mx-xs px-6 h-mx-14 rounded-mx-full border border-border bg-white shadow-sm">
          <Calendar size={18} className="text-status-success-text" />
          <Typography variant="caption" className="">
            Ciclo {format(new Date(), 'yyyy')}
          </Typography>
        </div>
        <Button
          variant="secondary"
          onClick={onExport}
          className="h-mx-14 px-8 rounded-mx-full text-mx-tiny"
        >
          <Download size={18} className="mr-2" /> EXPORTAR MATRIZ
        </Button>
      </div>
    </header>
  )
}

export default AdminHeader
