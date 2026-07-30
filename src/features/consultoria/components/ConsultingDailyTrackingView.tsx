import React, { useMemo } from 'react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useCheckins } from '@/hooks/useCheckins'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'
import { Calendar, Phone, Users, CheckCircle2, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import type { CheckinWithTotals } from '@/types/database'

interface Props {
  clientId: string
  storeId?: string | null
}

export function ConsultingDailyTrackingView({ clientId, storeId }: Props) {
  const { checkins, loading } = useCheckins(storeId || undefined)

  const columns = useMemo<Column<CheckinWithTotals>[]>(() => [
    {
      key: 'reference_date',
      header: 'DATA',
      render: (row) => (
        <div className="flex items-center gap-mx-xs">
          <Calendar size={14} className="text-text-tertiary" />
          <Typography variant="p" className="font-bold">
            {new Date(row.reference_date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </Typography>
        </div>
      ),
    },
    {
      key: 'leads_prev_day',
      header: 'LEADS',
      render: (row) => (
        <div className="flex items-center gap-mx-xs">
          <Phone size={14} className="text-status-info" />
          <Typography variant="p">{row.leads_prev_day || 0}</Typography>
        </div>
      )
    },
    {
      key: 'agd_total',
      header: 'AGEND.',
      render: (row) => (
        <div className="flex flex-col">
          <Typography variant="p" className="font-bold">{(row.agd_cart_prev_day || 0) + (row.agd_net_prev_day || 0)}</Typography>
          <Typography variant="tiny" tone="muted">Prev: {(row.agd_cart_today || 0) + (row.agd_net_today || 0)}</Typography>
        </div>
      )
    },
    {
      key: 'visit_prev_day',
      header: 'VISITAS',
      render: (row) => (
        <div className="flex items-center gap-mx-xs">
          <Users size={14} className="text-status-success" />
          <Typography variant="p">{row.visit_prev_day || 0}</Typography>
        </div>
      )
    },
    {
      key: 'vnd_total',
      header: 'VENDAS',
      render: (row) => {
        const total = (row.vnd_porta_prev_day || 0) + (row.vnd_cart_prev_day || 0) + (row.vnd_net_prev_day || 0)
        return (
          <div className="flex items-center gap-mx-xs">
            <CheckCircle2 size={14} className="text-brand-primary" />
            <Typography variant="p" className="">{total}</Typography>
          </div>
        )
      }
    },
    {
        key: 'status',
        header: 'QUALIDADE',
        render: (row) => {
            const leads = row.leads_prev_day || 0
            const totalVnd = (row.vnd_porta_prev_day || 0) + (row.vnd_cart_prev_day || 0) + (row.vnd_net_prev_day || 0)
            const conv = leads > 0 ? (totalVnd / leads) * 100 : 0
            return (
                <Badge variant={conv >= 3 ? 'success' : conv >= 1 ? 'warning' : 'outline'}>
                    {conv.toFixed(1)}% Conv.
                </Badge>
            )
        }
    }
  ], [])

  if (!storeId) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="p" tone="muted">
          Este cliente não possui uma Loja MX vinculada para acompanhamento diário automático.
          Vincule uma loja nas configurações do cliente.
        </Typography>
      </Card>
    )
  }

  return (
    <section className="space-y-mx-lg">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="h3">ACOMPANHAMENTO DIÁRIO (REAL-TIME)</Typography>
          <Typography variant="caption" tone="muted">
            Dados extraídos diretamente do Fechamento Diário da equipe comercial.
          </Typography>
        </div>
        <Badge variant="brand" className="rounded-mx-full px-4 py-1">
          LOJA ATIVA
        </Badge>
      </div>

      <Card className="border-none bg-white overflow-hidden">
        <DataGrid
          columns={columns}
          data={checkins}
          loading={loading}
          emptyMessage="Nenhum Fechamento Diário realizado no período."
        />
      </Card>
    </section>
  )
}
