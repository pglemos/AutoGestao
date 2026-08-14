import { Link } from 'react-router-dom'
import { Ban, Building2, CalendarDays, ChevronRight, Plus, User, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { getPmrVisitDisplayLabel } from '@/lib/consultoria/pmr-visit-rules'
import type { AgendaScheduleEvent, AgendaVisit } from '@/hooks/agenda'
import { getEventTypeLabel, getVisitDotColor } from '../data/agendaHelpers'

interface VisitaDetailPanelProps {
  selectedDate: Date | null
  selectedDayVisits: AgendaVisit[]
  selectedDayEvents: AgendaScheduleEvent[]
  onClearSelection: () => void
  onScheduleVisit: (date: Date) => void
  onBlockDate: (date: Date) => void
  onEditEvent: (event: AgendaScheduleEvent) => void
}

export function VisitaDetailPanel({
  selectedDate, selectedDayVisits, selectedDayEvents,
  onClearSelection, onScheduleVisit, onBlockDate, onEditEvent,
}: VisitaDetailPanelProps) {
  return (
    <Card className="border-none bg-white overflow-hidden">
      <div className="p-mx-md border-b border-border flex items-center justify-between">
        <Typography variant="caption" className="">
          {selectedDate
            ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR })
            : 'Selecione um dia'}
        </Typography>
        {selectedDate && (
          <button
            type="button"
            onClick={onClearSelection}
            className="w-mx-lg h-mx-lg rounded-xl hover:bg-surface-alt flex items-center justify-center text-muted-foreground transition-all"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="p-mx-md max-h-mx-6xl overflow-y-auto no-scrollbar">
        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center py-mx-2xl text-center gap-mx-sm">
            <CalendarDays size={32} className="text-muted-foreground" />
            <Typography variant="tiny" tone="muted">Clique em um dia no calendário para ver os detalhes</Typography>
          </div>
        ) : selectedDayVisits.length === 0 && selectedDayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-mx-2xl text-center gap-mx-sm">
            <CalendarDays size={32} className="text-muted-foreground" />
            <Typography variant="tiny" tone="muted">Nenhum item neste dia</Typography>
            <div className="mt-mx-sm flex flex-wrap justify-center gap-mx-xs">
              <Button variant="outline" size="sm" onClick={() => onScheduleVisit(selectedDate)}>
                <Plus size={14} className="mr-2" /> AGENDAR
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBlockDate(selectedDate)}>
                <Ban size={14} className="mr-2" /> BLOQUEAR
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-mx-sm">
            <div className="flex flex-wrap gap-mx-xs">
              <Button variant="outline" size="sm" onClick={() => onScheduleVisit(selectedDate)}>
                <Plus size={14} className="mr-2" /> AGENDAR
              </Button>
              <Button variant="outline" size="sm" onClick={() => onBlockDate(selectedDate)}>
                <Ban size={14} className="mr-2" /> BLOQUEAR
              </Button>
            </div>
            {selectedDayVisits.map((visit) => {
              const scheduledDate = parseISO(visit.scheduled_at)
              return (
                <Link
                  key={visit.id}
                  to={`/consultoria/clientes/${visit.client_slug}/visitas/${visit.visit_number}`}
                  className="block"
                >
                  <div className="p-mx-sm rounded-xl border border-border hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all group overflow-hidden">
                    <div className="flex items-center gap-mx-xs mb-1">
                      <div className={cn('w-2 h-2 rounded-mx-full', getVisitDotColor(visit.status))} />
                      <Typography variant="tiny" className="">
                        {format(scheduledDate, 'HH:mm')}
                      </Typography>
                      <Typography variant="tiny" tone="muted">• {visit.duration_hours}h</Typography>
                    </div>
                    <div className="flex items-center gap-mx-xs mb-1 min-w-0">
                      <Building2 size={12} className="text-status-success-text shrink-0" />
                      <Typography variant="tiny" className="font-bold truncate">{visit.client_name}</Typography>
                    </div>
                    {visit.consultant && (
                      <div className="flex items-center gap-mx-xs min-w-0">
                        <User size={10} className="text-muted-foreground shrink-0" />
                        <Typography variant="tiny" tone="muted" className="truncate">{visit.consultant.name}</Typography>
                      </div>
                    )}
                    {(visit.visit_reason || visit.target_audience || visit.product_name) && (
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
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <Typography variant="tiny" tone="muted">{getPmrVisitDisplayLabel(visit.visit_number)}</Typography>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:text-status-success-text transition-colors" />
                    </div>
                  </div>
                </Link>
              )
            })}
            {selectedDayEvents.map((event) => {
              const startsAt = parseISO(event.starts_at)
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEditEvent(event)}
                  className="w-full text-left p-mx-sm rounded-xl border border-border hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all group overflow-hidden"
                >
                  <div className="flex items-center gap-mx-xs mb-1">
                    <CalendarDays size={12} className="text-status-success-text shrink-0" />
                    <Typography variant="tiny" className="">{format(startsAt, 'HH:mm')}</Typography>
                    <Badge variant="outline" className="text-mx-nano">{getEventTypeLabel(event.event_type)}</Badge>
                  </div>
                  <Typography variant="tiny" className="font-bold truncate block">{event.title}</Typography>
                  {event.responsible_name && (
                    <Typography variant="tiny" tone="muted" className="truncate block mt-1">{event.responsible_name}</Typography>
                  )}
                  {(event.visit_reason || event.target_audience || event.product_name) && (
                    <div className="mt-mx-xs flex flex-wrap gap-mx-xs">
                      {event.visit_reason && (
                        <Badge variant="outline" className="max-w-full overflow-hidden text-mx-nano">
                          <span className="block max-w-full truncate">{event.visit_reason}</span>
                        </Badge>
                      )}
                      {event.target_audience && (
                        <Badge variant="ghost" className="max-w-full overflow-hidden text-mx-nano">
                          <span className="block max-w-full truncate">{event.target_audience}</span>
                        </Badge>
                      )}
                      {event.product_name && (
                        <Badge variant="brand" className="max-w-full overflow-hidden text-mx-nano">
                          <span className="block max-w-full truncate">{event.product_name}</span>
                        </Badge>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}
