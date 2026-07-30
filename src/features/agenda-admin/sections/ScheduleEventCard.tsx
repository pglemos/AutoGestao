import { CalendarDays, Clock, MapPin, Pencil, Trash2, User, Video } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import type { AgendaScheduleEvent } from '@/hooks/agenda'
import { getEventTypeLabel } from '../data/agendaHelpers'
import { GoogleMeetArtifactsPanel } from '../components/GoogleMeetArtifactsPanel'

interface ScheduleEventCardProps {
  event: AgendaScheduleEvent
  onEdit: (event: AgendaScheduleEvent) => void
  onDelete: (id: string) => void
}

export function ScheduleEventCard({ event, onEdit, onDelete }: ScheduleEventCardProps) {
  const date = parseISO(event.starts_at)
  return (
    <Card className="p-mx-md border-none bg-white hover:shadow-sm transition-all group">
      <div className="flex flex-col sm:flex-row sm:items-center gap-mx-md">
        <div className="flex items-center gap-mx-md min-w-0 flex-1">
          <div className={cn(
            'w-mx-10 h-mx-10 rounded-xl border flex items-center justify-center shrink-0',
            event.event_type === 'aula' ? 'bg-status-info/10 border-status-info/20 text-status-info' : 'bg-emerald-600/10 border-brand-primary/20 text-emerald-600'
          )}>
            <CalendarDays size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-mx-xs mb-1">
              <Badge variant="outline" className="text-mx-micro">{getEventTypeLabel(event.event_type)}</Badge>
              <Typography variant="h3" className="text-sm truncate">{event.title}</Typography>
            </div>
            <div className="flex flex-wrap items-center gap-mx-sm text-gray-500">
              <div className="flex items-center gap-mx-xs">
                <Clock size={12} />
                <Typography variant="tiny">{format(date, 'HH:mm')} - {event.duration_hours}h</Typography>
              </div>
              {event.location && (
                <div className="flex items-center gap-mx-xs">
                  <MapPin size={12} />
                  <Typography variant="tiny">{event.location}</Typography>
                </div>
              )}
              {event.responsible_name && (
                <div className="flex items-center gap-mx-xs">
                  <User size={12} />
                  <Typography variant="tiny">{event.responsible_name}</Typography>
                </div>
              )}
              {event.google_meet_link && (
                <a
                  href={event.google_meet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-mx-xs text-emerald-600 hover:text-brand-secondary"
                  aria-label={`Abrir Google Meet de ${event.title}`}
                  onClick={(clickEvent) => clickEvent.stopPropagation()}
                >
                  <Video size={12} />
                  <Typography variant="tiny">Google Meet</Typography>
                </a>
              )}
            </div>
            {event.topic && (
              <Typography variant="tiny" tone="muted" className="block mt-1 truncate">{event.topic}</Typography>
            )}
            {(event.visit_reason || event.target_audience || event.product_name) && (
              <div className="mt-mx-xs flex flex-wrap gap-mx-xs">
                {event.visit_reason && (
                  <Badge variant="outline" className="max-w-full text-mx-nano">
                    <span className="truncate">{event.visit_reason}</span>
                  </Badge>
                )}
                {event.target_audience && (
                  <Badge variant="ghost" className="text-mx-nano">{event.target_audience}</Badge>
                )}
                {event.product_name && (
                  <Badge variant="brand" className="text-mx-nano">{event.product_name}</Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-mx-xs">
          <Button variant="ghost" size="sm" className="" onClick={() => onEdit(event)} aria-label={`Editar ${event.title}`}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="text-status-error" onClick={() => onDelete(event.id)} aria-label={`Excluir ${event.title}`}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
      <GoogleMeetArtifactsPanel artifact={event.meet_artifact} hasMeetLink={Boolean(event.google_meet_link)} />
    </Card>
  )
}
