import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import type { ConsultingClientDetail } from '@/features/consultoria/types'

type Props = { client: ConsultingClientDetail }

export function ClientHeaderSection({ client }: Props) {
  return (
    <header className="flex justify-between items-center mb-mx-md">
      <div className="flex items-center gap-mx-md">
        <Link
          to="/consultoria/clientes"
          className="p-mx-xs bg-white rounded-mx-lg border border-border-default hover:bg-surface-alt transition-colors shadow-sm"
        >
          <ArrowLeft className="w-mx-5 h-mx-5" />
        </Link>
        <div>
          <div className="flex items-center gap-mx-xs">
            <Typography variant="h1" className="text-2xl text-black">{client.name}</Typography>
            <Badge
              variant={client.status === 'ativo' ? 'success' : 'outline'}
              className="h-mx-5 text-mx-micro"
            >
              {client.status}
            </Badge>
          </div>
          <Typography variant="tiny" tone="muted" className="">
            Módulo de Gestão Preditiva MX
          </Typography>
        </div>
      </div>
    </header>
  )
}

export default ClientHeaderSection
