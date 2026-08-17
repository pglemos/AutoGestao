import { Calendar, Download, RefreshCw, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { PageHeading } from '@/components/molecules/PageHeading'
import { cn } from '@/lib/utils'

type Props = {
  isRefetching: boolean
  onRefresh: () => void
  onExport: () => void
}

export function StoreHeader({ isRefetching, onRefresh, onExport }: Props) {
  return (
    <PageHeading
      icon={TrendingUp}
      title={<>Análise de <span className="text-status-success-text">Performance</span></>}
      subtitle="BUSINESS INTELLIGENCE • LIVE AUDIT MX"
      actions={
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
            variant="outline"
            onClick={onExport}
            className="h-mx-14 px-8 rounded-mx-full text-mx-tiny"
          >
            <Download size={18} className="mr-2" /> EXPORTAR BI
          </Button>
        </div>
      }
    />
  )
}

export default StoreHeader

