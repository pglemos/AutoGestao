import { Calendar, CalendarDays } from 'lucide-react'
import { format, isToday } from 'date-fns'
import { Card } from '@/components/molecules/Card'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Typography } from '@/components/atoms/Typography'
import { EmptyState } from '@/components/atoms/EmptyState'
import { VisitCard } from '@/components/organisms/VisitCard'
import { cn } from '@/lib/utils'
import type { AgendaScheduleEvent, AgendaVisit } from '@/hooks/agenda'
import { ScheduleEventCard } from './ScheduleEventCard'
import { GoogleMeetArtifactsPanel } from '../components/GoogleMeetArtifactsPanel'

type GroupedItem = {
  date: Date
  label: string
  visits: AgendaVisit[]
  events: AgendaScheduleEvent[]
}

interface AgendaListViewProps {
  loading: boolean
  groupedVisits: GroupedItem[]
  onStartVisit: (id: string) => void
  onCancelVisit: (id: string) => void
  onDeleteVisit: (id: string) => void
  onEditVisit: (id: string) => void
  onEditEvent: (event: AgendaScheduleEvent) => void
  onDeleteEvent: (id: string) => void
}

export function AgendaListView({
  loading, groupedVisits,
  onStartVisit, onCancelVisit, onDeleteVisit, onEditVisit,
  onEditEvent, onDeleteEvent,
}: AgendaListViewProps) {
  if (loading) {
    return (
      <div className="space-y-mx-md">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="p-mx-lg border-none bg-white">
            <Skeleton className="h-mx-10 w-mx-sidebar-expanded mb-mx-md" />
            <div className="space-y-mx-md">
              <Skeleton className="h-mx-2xl w-full" />
              <Skeleton className="h-mx-2xl w-full" />
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (groupedVisits.length === 0) {
    return (
      <Card className="border-none bg-white">
        <EmptyState
          size="lg"
          icon={<CalendarDays />}
          title="Nenhuma visita encontrada"
          description="Não há agendamentos para o período selecionado."
          nextStep="Altere o período, limpe os filtros ou cadastre um novo agendamento."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-mx-lg">
      {groupedVisits.map((group) => (
        <div key={format(group.date, 'yyyy-MM-dd')}>
          <div className={cn(
            'flex items-center gap-mx-sm mb-mx-sm px-mx-xs',
            isToday(group.date) && 'text-brand-primary'
          )}>
            <Calendar size={16} />
            <Typography variant="caption" className="">
              {group.label}
            </Typography>
            <div className="flex-1 h-px bg-border-default" />
            <Typography variant="tiny" tone="muted">
              {group.visits.length + group.events.length} itens
            </Typography>
          </div>

          <div className="space-y-mx-xs">
            {group.visits.map((visit) => (
              <div key={visit.id} className="space-y-mx-xs">
                <VisitCard
                  visit={visit}
                  onStart={onStartVisit}
                  onCancel={onCancelVisit}
                  onDelete={onDeleteVisit}
                  onEdit={onEditVisit}
                  linkTo={`/consultoria/clientes/${visit.client_slug}/visitas/${visit.visit_number}`}
                />
                <GoogleMeetArtifactsPanel artifact={visit.meet_artifact} hasMeetLink={Boolean(visit.google_meet_link)} />
              </div>
            ))}
            {group.events.map((event) => (
              <ScheduleEventCard
                key={event.id}
                event={event}
                onEdit={onEditEvent}
                onDelete={onDeleteEvent}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
