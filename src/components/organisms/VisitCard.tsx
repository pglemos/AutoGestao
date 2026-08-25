import { Link } from 'react-router-dom'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { Building2, Clock, MapPin, Play, X, Trash2, ChevronRight, User, Pencil, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { getPmrVisitDisplayLabel } from '@/lib/consultoria/pmr-visit-rules'

export interface VisitCardData {
  id: string
  client_id: string
  client_name: string
  visit_number: number
  scheduled_at: string
  duration_hours: number
  modality?: string
  objective?: string | null
  visit_reason?: string | null
  target_audience?: string | null
  product_name?: string | null
  fora_do_contrato?: boolean
  google_meet_link?: string | null
  status: string
  consultant?: { name: string } | null
}

export interface VisitCardProps {
  visit: VisitCardData
  onStart?: (id: string) => void
  onCancel?: (id: string) => void
  onDelete?: (id: string) => void
  onEdit?: (id: string) => void
  linkTo: string
  className?: string
}

function getVisitStatusBadge(status: string) {
  switch (status) {
    case 'agendada': return <Badge variant="outline" className="border-brand-primary/30">AGENDADA</Badge>
    case 'em_andamento': return <Badge variant="info">EM ANDAMENTO</Badge>
    case 'concluida': return <Badge variant="success">CONCLUÍDA</Badge>
    case 'cancelada': return <Badge variant="danger">CANCELADA</Badge>
    default: return <Badge variant="ghost">{status.toUpperCase()}</Badge>
  }
}

export function VisitCard({
  visit,
  onStart,
  onCancel,
  onDelete,
  onEdit,
  linkTo,
  className,
}: VisitCardProps) {
  const scheduledDate = parseISO(visit.scheduled_at)
  const isExpired = isPast(scheduledDate) && visit.status === 'agendada'

  return (
    <Card className={cn(
      'p-mx-md border shadow-sm bg-white hover:shadow-sm transition-all group overflow-hidden',
      isExpired ? 'border-status-warning/40 bg-status-warning-surface/30' : visit.status === 'em_andamento' ? 'border-status-info/40 bg-status-info-surface/30' : 'border-border',
      className,
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-mx-md min-w-0">
        <Link
          to={linkTo}
          className="flex items-center gap-mx-md min-w-0 flex-1 cursor-pointer"
        >
          <div className={cn(
            'w-mx-10 h-mx-10 rounded-xl border flex items-center justify-center shrink-0',
            isToday(scheduledDate) ? 'bg-brand-primary/10 border-brand-primary/20 text-status-success-text' : 'bg-surface-alt border-border text-muted-foreground'
          )}>
            <Typography variant="h3" className="text-lg">
              {format(scheduledDate, 'dd')}
            </Typography>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-mx-xs mb-1 min-w-0">
              <Building2 size={14} className="text-status-success-text shrink-0" />
              <Typography variant="h3" className="text-sm leading-tight break-words sm:truncate">{visit.client_name}</Typography>
            </div>
            <div className="flex flex-wrap items-center gap-x-mx-sm gap-y-mx-xs text-muted-foreground">
              <div className="flex items-center gap-mx-xs min-w-0">
                <Clock size={12} className="shrink-0" />
                <Typography variant="tiny">
                  {format(scheduledDate, 'HH:mm')} - {visit.duration_hours}h
                </Typography>
              </div>
              {visit.modality && (
                <div className="flex items-center gap-mx-xs min-w-0">
                  <MapPin size={12} className="shrink-0" />
                  <Typography variant="tiny" className="truncate">{visit.modality}</Typography>
                </div>
              )}
            </div>
            {(visit.visit_reason || visit.target_audience || visit.product_name || visit.fora_do_contrato) && (
              <div className="mt-mx-xs flex flex-wrap gap-mx-xs">
                {visit.visit_reason && (
                  <Badge variant="outline" className="max-w-full overflow-hidden text-mx-nano">
                    <span className="block max-w-full truncate">{visit.visit_reason}</span>
                  </Badge>
                )}
                {visit.target_audience && (
                  <Badge variant="ghost" className="max-w-full overflow-hidden text-mx-nano">
                    <span className="block max-w-full truncate">{visit.target_audience}</span>
                  </Badge>
                )}
                {visit.product_name && (
                  <Badge variant="brand" className="max-w-full overflow-hidden text-mx-nano">
                    <span className="block max-w-full truncate">{visit.product_name}</span>
                  </Badge>
                )}
                {visit.fora_do_contrato && (
                  <Badge variant="secondary" className="max-w-full overflow-hidden text-mx-nano">
                    <span className="block max-w-full truncate">Adicional</span>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </Link>

        <div className="flex w-full flex-wrap items-center justify-between gap-mx-sm sm:w-auto sm:justify-start sm:gap-mx-md min-w-0">
          {visit.objective && (
            <Typography variant="tiny" tone="muted" className="hidden lg:block max-w-48 truncate">
              {visit.objective}
            </Typography>
          )}

          <div className="flex flex-col items-end gap-mx-xs shrink-0">
            {getVisitStatusBadge(visit.status)}
            <div className="flex items-center gap-mx-xs">
              <Typography variant="tiny" tone="muted">
                {getPmrVisitDisplayLabel(visit.visit_number)}
              </Typography>
            </div>
          </div>

          {visit.consultant && (
            <div className="hidden md:flex items-center gap-mx-xs">
              <User size={14} className="text-muted-foreground" />
              <Typography variant="tiny" tone="muted">{visit.consultant.name}</Typography>
            </div>
          )}

          <div className="flex items-center gap-mx-xs shrink-0">
            {onEdit && visit.status !== 'concluida' && (
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => onEdit(visit.id)} aria-label={`Editar visita de ${visit.client_name}`}>
                <Pencil size={14} />
              </Button>
            )}
            {visit.status === 'agendada' && onStart && (
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer text-status-info-text" onClick={() => onStart(visit.id)} aria-label={`Iniciar visita de ${visit.client_name}`}>
                <Play size={14} />
              </Button>
            )}
            {visit.status === 'agendada' && onCancel && (
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer text-status-error-text" onClick={() => onCancel(visit.id)} aria-label={`Cancelar visita de ${visit.client_name}`}>
                <X size={14} />
              </Button>
            )}
            {visit.google_meet_link && (
              <a
                href={visit.google_meet_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-mx-9 items-center justify-center gap-mx-xs rounded-lg px-3 text-status-success-text hover:bg-surface-alt transition-all"
                aria-label={`Abrir Google Meet da visita de ${visit.client_name}`}
                onClick={(event) => event.stopPropagation()}
              >
                <Video size={14} aria-hidden="true" />
                <span className="text-caption font-bold">Meet</span>
              </a>
            )}
            {visit.status === 'cancelada' && onDelete && (
              <Button type="button" variant="ghost" size="sm" className="cursor-pointer text-status-error-text" onClick={() => onDelete(visit.id)} aria-label={`Excluir visita de ${visit.client_name}`}>
                <Trash2 size={14} />
              </Button>
            )}
            <Link to={linkTo} aria-label={`Abrir visita de ${visit.client_name}`} className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-mx-full">
              <ChevronRight size={18} className="text-muted-foreground group-hover:text-status-success-text transition-colors shrink-0" />
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
