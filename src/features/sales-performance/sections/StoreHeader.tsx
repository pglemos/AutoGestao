import { Calendar, Download, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

type Props = {
  isRefetching: boolean
  onRefresh: () => void
  onExport: () => void
}

export function StoreHeader({ isRefetching, onRefresh, onExport }: Props) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-mx-lg border-b border-border pb-10 shrink-0">
      <div className="flex flex-col gap-mx-tiny">
        <div className="flex items-center gap-mx-sm">
          <div
            className="w-mx-xs h-mx-10 bg-brand-primary rounded-mx-full shadow-sm"
            aria-hidden="true"
          />
          <Typography variant="h1">
            Análise de <span className="text-mx-green-700">Performance</span>
          </Typography>
        </div>
        <Typography variant="caption" className="pl-mx-md">
          BUSINESS INTELLIGENCE • LIVE AUDIT MX
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
          <Download size={18} className="mr-2" /> EXPORTAR BI
        </Button>
      </div>
    </header>
  )
}

export default StoreHeader
