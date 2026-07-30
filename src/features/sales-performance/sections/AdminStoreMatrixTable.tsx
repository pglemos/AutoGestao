import { Eye } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/molecules/Card'
import { formatNumber, formatPercent, shortDate } from '../data/formatters'
import type { NetworkMetrics } from '../data/types'

type Props = {
  metrics: NetworkMetrics
  onStoreClick: (storeId: string, storeName: string) => void
}

const HEADERS = [
  'Loja',
  'Sell-out',
  'Meta',
  'Ating.',
  'Leads',
  'Agend.',
  'Visitas',
  'Equipe',
  'Ultima atividade',
  'Status',
] as const

export function AdminStoreMatrixTable({ metrics, onStoreClick }: Props) {
  return (
    <Card className="border-none bg-white overflow-hidden mb-32">
      <CardHeader className="p-mx-lg flex flex-col md:flex-row md:items-center justify-between gap-mx-md">
        <div>
          <CardTitle className="text-lg flex items-center gap-mx-sm">
            <Eye size={18} className="text-brand-primary" /> Matriz completa de lojas
          </CardTitle>
          <CardDescription>
            Leitura executiva para auditoria visual e tomada de decisao
          </CardDescription>
        </div>
        <Badge variant="brand" className="text-mx-nano">
          {metrics.byStore.length} linhas
        </Badge>
      </CardHeader>
      <CardContent className="p-mx-0 overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 960 }}>
          <thead className="bg-surface-alt/60 border-y border-border-subtle">
            <tr>
              {HEADERS.map((head) => (
                <th
                  key={head}
                  className="px-mx-md py-mx-sm text-mx-nano font-black uppercase tracking-widest text-text-tertiary"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {metrics.byStore.map((store) => (
              <tr key={store.storeId} className="hover:bg-surface-alt/40 transition-colors">
                <td className="px-mx-md py-mx-sm">
                  <button
                    type="button"
                    onClick={() => onStoreClick(store.storeId, store.storeName)}
                    className="font-black uppercase text-text-primary hover:text-brand-primary text-xs"
                  >
                    {store.storeName}
                  </button>
                </td>
                <td className="px-mx-md py-mx-sm font-mono-numbers font-black">
                  {formatNumber(store.sales)}
                </td>
                <td className="px-mx-md py-mx-sm font-mono-numbers">{formatNumber(store.goal)}</td>
                <td className="px-mx-md py-mx-sm font-mono-numbers">
                  {formatPercent(store.reaching)}
                </td>
                <td className="px-mx-md py-mx-sm font-mono-numbers">{formatNumber(store.leads)}</td>
                <td className="px-mx-md py-mx-sm font-mono-numbers">{formatNumber(store.agd)}</td>
                <td className="px-mx-md py-mx-sm font-mono-numbers">{formatNumber(store.vis)}</td>
                <td className="px-mx-md py-mx-sm text-mx-nano font-black uppercase">
                  {store.sellers}V / {store.managers}G / {store.owners}D
                </td>
                <td className="px-mx-md py-mx-sm text-mx-nano font-black uppercase text-text-tertiary">
                  {shortDate(store.lastActivity)}
                </td>
                <td className="px-mx-md py-mx-sm">
                  <Badge
                    variant={
                      store.status === 'excellent'
                        ? 'success'
                        : store.status === 'on-track'
                          ? 'info'
                          : store.status === 'attention'
                            ? 'warning'
                            : 'outline'
                    }
                    className="text-mx-nano"
                  >
                    {store.status === 'excellent'
                      ? 'excelencia'
                      : store.status === 'on-track'
                        ? 'no ritmo'
                        : store.status === 'attention'
                          ? 'atencao'
                          : 'sem dados'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export default AdminStoreMatrixTable
