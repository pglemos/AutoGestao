import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { formatNumber, formatPercent, shortDate } from '../data/formatters'
import type { StoreRow } from '../data/types'

type Props = {
  topStores: StoreRow[]
  onStoreClick: (storeId: string, storeName: string) => void
}

export function AdminTopStoresList({ topStores, onStoreClick }: Props) {
  return (
    <Card className="xl:col-span-5 border-none bg-white overflow-hidden">
      <CardHeader className="p-mx-lg">
        <CardTitle className="text-lg flex items-center gap-mx-sm">
          <BarChart3 size={18} className="text-status-success-text" /> Top lojas por sell-out
        </CardTitle>
        <CardDescription>Ranking historico com meta, equipe e ultima atividade</CardDescription>
      </CardHeader>
      <CardContent className="p-mx-0">
        <div className="divide-y divide-border-subtle">
          {topStores.map((store, i) => (
            <button
              key={store.storeId}
              type="button"
              onClick={() => onStoreClick(store.storeId, store.storeName)}
              className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-mx-sm px-mx-lg py-mx-sm hover:bg-gray-50/60 transition-colors text-left"
            >
              <span
                className={cn(
                  'w-mx-8 h-mx-8 rounded-xl flex items-center justify-center text-mx-nano font-bold',
                  i === 0
                    ? 'bg-status-warning text-status-warning-foreground'
                    : i === 1
                      ? 'bg-brand-primary text-white'
                      : i === 2
                        ? 'bg-status-info text-white'
                        : 'bg-gray-50 text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <Typography variant="tiny" className="truncate">
                  {store.storeName}
                </Typography>
                <Typography
                  variant="tiny"
                  tone="muted"
                  className="text-mx-nano"
                >
                  {store.sellers} vend. | {store.managers} ger. | ult.{' '}
                  {shortDate(store.lastActivity)}
                </Typography>
              </span>
              <span className="text-right">
                <Typography variant="h3" className="text-base font-mono-numbers">
                  {formatNumber(store.sales)}
                </Typography>
                <Typography variant="tiny" tone="muted" className="text-mx-nano">
                  {formatPercent(store.reaching)}
                </Typography>
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default AdminTopStoresList
