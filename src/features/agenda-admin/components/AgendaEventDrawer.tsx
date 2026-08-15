import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Ban, Building2, CalendarDays, ChevronRight, ExternalLink,
  MapPin, Play, CheckCircle2, XCircle, Trash2, Pencil, Plus, User, Video, X
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'
import { getPmrVisitDisplayLabel } from '@/lib/consultoria/pmr-visit-rules'
import type { AgendaScheduleEvent, AgendaVisit } from '@/hooks/agenda'
import { getEventTypeLabel, getVisitDotColor } from '../data/agendaHelpers'

interface AgendaEventDrawerProps {
  selectedDate: Date | null
  selectedDayVisits: AgendaVisit[]
  selectedDayEvents: AgendaScheduleEvent[]
  onClose: () => void
  onScheduleVisit: (date: Date) => void
  onBlockDate: (date: Date) => void
  onEditVisit: (visitId: string) => void
  onEditEvent: (event: AgendaScheduleEvent) => void
  onStartVisit: (visitId: string) => void
  onCancelVisit: (visitId: string) => void
  onDeleteVisit: (visitId: string) => void
  onDeleteEvent: (eventId: string) => void
}

export function AgendaEventDrawer({
  selectedDate,
  selectedDayVisits,
  selectedDayEvents,
  onClose,
  onScheduleVisit,
  onBlockDate,
  onEditVisit,
  onEditEvent,
  onStartVisit,
  onCancelVisit,
  onDeleteVisit,
  onDeleteEvent,
}: AgendaEventDrawerProps) {
  if (!selectedDate) return null

  const totalItems = selectedDayVisits.length + selectedDayEvents.length

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[var(--mx-z-drawer)] flex w-full max-w-md flex-col border-l border-border bg-white shadow-2xl transition-transform duration-300 animate-in slide-in-from-right"
      aria-label="Painel de detalhes do dia"
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-surface-alt/40">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Agendamentos do Dia
          </span>
          <h2 className="text-lg font-extrabold text-foreground capitalize">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[var(--mx-touch-target-min)] min-w-[var(--mx-touch-target-min)] flex h-8 w-8 items-center justify-center rounded-mx-full text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors"
          aria-label="Fechar painel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Drawer Quick Action Bar */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-3 bg-white">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onScheduleVisit(selectedDate)}
          className="flex-1 rounded-xl font-semibold"
        >
          <Plus size={15} className="mr-1.5" /> Agendar Visita
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onBlockDate(selectedDate)}
          className="rounded-xl font-semibold text-status-error-text hover:bg-status-error-surface hover:border-status-error/30"
        >
          <Ban size={15} className="mr-1.5" /> Bloquear
        </Button>
      </div>

      {/* Drawer Body Items List */}
      <div data-mx-scroll-region="vertical" className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-mx-full bg-surface-alt text-muted-foreground mb-3">
              <CalendarDays size={28} />
            </div>
            <Typography variant="p" className="font-semibold">Nenhum compromisso agendado</Typography>
            <Typography variant="tiny" tone="muted" className="mt-1 max-w-[240px]">
              Este dia está livre na agenda. Clique acima para criar um agendamento ou bloqueio.
            </Typography>
          </div>
        ) : (
          <>
            {/* VISITS LIST */}
            {selectedDayVisits.map((visit) => {
              const scheduledDate = parseISO(visit.scheduled_at)
              const isOnline = visit.modality?.toLowerCase().includes('online') || visit.modality?.toLowerCase().includes('híbrido') || visit.modality?.toLowerCase().includes('hibrido')

              return (
                <div
                  key={visit.id}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm transition-all hover:border-brand-primary/40 hover:shadow-md group"
                >
                  {/* Top Bar: Time, Status, Actions */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2.5 w-2.5 rounded-full', getVisitDotColor(visit.status))} />
                      <span className="font-mono font-bold text-sm text-foreground">
                        {format(scheduledDate, 'HH:mm')}
                      </span>
                      <span className="text-xs text-muted-foreground">({visit.duration_hours}h)</span>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEditVisit(visit.id)}
                        className="p-1 rounded-xl text-muted-foreground hover:bg-surface-alt hover:text-status-success-text transition-colors"
                        title="Editar Visita"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteVisit(visit.id)}
                        className="p-1 rounded-xl text-muted-foreground hover:bg-status-error-surface hover:text-status-error-text transition-colors"
                        title="Excluir Visita"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="mb-2">
                    <Link
                      to={`/consultoria/clientes/${visit.client_slug}/visitas/${visit.visit_number}`}
                      className="group/link inline-flex items-center gap-1.5 font-bold text-base text-foreground hover:text-status-success-text transition-colors"
                    >
                      <Building2 size={16} className="text-status-success-text shrink-0" />
                      <span className="truncate">{visit.client_name}</span>
                      <ExternalLink size={13} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{getPmrVisitDisplayLabel(visit.visit_number)}</span>
                      {visit.consultant && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-muted-foreground" />
                            {visit.consultant.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Objective & Details */}
                  {visit.objective && (
                    <p className="text-xs text-muted-foreground line-clamp-2 bg-surface-alt/50 p-2 rounded-xl mb-2">
                      {visit.objective}
                    </p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {visit.modality && (
                      <Badge variant="outline" className="text-caption font-semibold">
                        {isOnline ? <Video size={10} className="mr-1 text-status-success-text" /> : <MapPin size={10} className="mr-1 text-muted-foreground" />}
                        {visit.modality}
                      </Badge>
                    )}
                    {visit.visit_reason && (
                      <Badge variant="secondary" className="text-caption">
                        {visit.visit_reason}
                      </Badge>
                    )}
                    {visit.product_name && (
                      <Badge variant="brand" className="text-caption">
                        {visit.product_name}
                      </Badge>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    {visit.status === 'agendada' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStartVisit(visit.id)}
                        className="w-full text-xs font-semibold"
                      >
                        <Play size={13} className="mr-1.5 fill-current" /> Iniciar Visita
                      </Button>
                    )}
                    {visit.status === 'em_andamento' && (
                      <Link
                        to={`/consultoria/clientes/${visit.client_slug}/visitas/${visit.visit_number}`}
                        className="w-full"
                      >
                        <Button variant="primary" size="sm" className="w-full text-xs font-semibold">
                          <CheckCircle2 size={13} className="mr-1.5" /> Concluir Ficha
                        </Button>
                      </Link>
                    )}
                    {visit.status !== 'cancelada' && visit.status !== 'concluida' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancelVisit(visit.id)}
                        className="text-xs text-status-error-text hover:bg-status-error-surface"
                      >
                        <XCircle size={13} className="mr-1" /> Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* EVENTS LIST */}
            {selectedDayEvents.map((event) => {
              const startsAt = parseISO(event.starts_at)

              return (
                <div
                  key={event.id}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm transition-all hover:border-brand-primary/40 hover:shadow-md group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-status-success-text" />
                      <span className="font-mono font-bold text-sm text-foreground">
                        {format(startsAt, 'HH:mm')}
                      </span>
                      <Badge variant="outline" className="text-caption">
                        {getEventTypeLabel(event.event_type)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEditEvent(event)}
                        className="p-1 rounded-xl text-muted-foreground hover:bg-surface-alt hover:text-status-success-text transition-colors"
                        title="Editar Evento"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-1 rounded-xl text-muted-foreground hover:bg-status-error-surface hover:text-status-error-text transition-colors"
                        title="Excluir Evento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-foreground mb-1">{event.title}</h3>

                  {event.responsible_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <User size={12} className="text-muted-foreground" />
                      {event.responsible_name}
                    </p>
                  )}

                  {event.topic && (
                    <p className="text-xs text-muted-foreground bg-surface-alt/50 p-2 rounded-xl mb-2">
                      {event.topic}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {event.product_name && (
                      <Badge variant="brand" className="text-caption">
                        {event.product_name}
                      </Badge>
                    )}
                    {event.target_audience && (
                      <Badge variant="ghost" className="text-caption">
                        {event.target_audience}
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </aside>
  )
}
