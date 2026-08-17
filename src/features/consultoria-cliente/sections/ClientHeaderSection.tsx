import { Link } from 'react-router-dom'
import { ArrowLeft, Building2 } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { PageHeader } from '@/components/molecules/PageHeader'
import type { ConsultingClientDetail } from '@/features/consultoria/types'

type Props = { client: ConsultingClientDetail }

export function ClientHeaderSection({ client }: Props) {
  return (
    <PageHeader
      icon={Building2}
      breadcrumb={
        <div className="mb-2">
          <Link
            to="/consultoria/clientes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para clientes
          </Link>
        </div>
      }
      title={
        <div className="flex items-center gap-2">
          <span>{client.name}</span>
          <Badge
            variant={client.status === 'ativo' ? 'success' : 'outline'}
            className="h-5 text-xs font-medium"
          >
            {client.status}
          </Badge>
        </div>
      }
      description="Módulo de Gestão Preditiva MX"
    />
  )
}

export default ClientHeaderSection

