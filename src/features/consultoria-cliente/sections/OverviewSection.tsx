import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card } from '@/components/molecules/Card'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import type { ConsultingClientDetail } from '@/features/consultoria/types'

type Props = { client: ConsultingClientDetail }

export function OverviewSection({ client }: Props) {
  const lastFin = client.financials?.[0]
  const finishedVisits = client.visits?.filter((v) => v.status === 'concluida').length || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="p-mx-lg bg-white border">
        <Typography variant="h3" className="mb-mx-md">Dados do Contrato</Typography>
        <div className="space-y-mx-md">
          <div className="flex justify-between border-b border-border-subtle pb-mx-xs">
            <Typography variant="tiny" tone="muted" className="font-bold">Produto</Typography>
            <Typography variant="p" className="">{client.product_name || 'GESTAO PREDITIVA'}</Typography>
          </div>
          <div className="flex justify-between border-b border-border-subtle pb-mx-xs">
            <Typography variant="tiny" tone="muted" className="font-bold">Modalidade</Typography>
            <Badge variant="outline">{client.modality || 'Presencial'}</Badge>
          </div>
          <div className="flex justify-between">
            <Typography variant="tiny" tone="muted" className="font-bold">Início</Typography>
            <Typography variant="p" className="">
              {format(new Date(client.created_at), 'MMMM / yyyy', { locale: ptBR }).toUpperCase()}
            </Typography>
          </div>
        </div>
      </Card>

      <Card className="p-mx-lg bg-white border">
        <Typography variant="h3" className="mb-mx-md">Performance Atual</Typography>
        <div className="space-y-mx-md">
          <div className="flex justify-between border-b border-border-subtle pb-mx-xs">
            <Typography variant="p" className="font-bold">Vendas (Mês Ref)</Typography>
            <Typography variant="h3">{lastFin?.volume_vendas || 0} un</Typography>
          </div>
          <div className="flex justify-between border-b border-border-subtle pb-mx-xs">
            <Typography variant="p" className="font-bold">Conversão Geral</Typography>
            <Typography variant="h3" className="text-status-success-text">{lastFin?.conversion_rate || 0}%</Typography>
          </div>
          <div className="flex justify-between">
            <Typography variant="p" className="font-bold">Ciclo de Visitas</Typography>
            <Typography variant="h3" className="">{finishedVisits} / 7</Typography>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default OverviewSection
