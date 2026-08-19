import React from 'react';
import { Button } from '@/components/atoms/Button';
import { Typography } from '@/components/atoms/Typography';
import { Calendar, RefreshCw, ExternalLink, Clock, MapPin } from 'lucide-react';
import { useConsultingAgenda, type ConsultingAgendaEvent } from '@/hooks/useConsultingAgenda'

interface GoogleCalendarViewProps {
  clientId: string;
}

export const GoogleCalendarView: React.FC<GoogleCalendarViewProps> = ({ clientId }) => {
  const {
    isConnected,
    isLoading,
    isRefreshing,
    events,
    error,
    context,
    connectGoogleCalendar,
    refreshEvents,
  } = useConsultingAgenda(clientId)

  const formatEventTime = (start: ConsultingAgendaEvent['start']) => {
    if (start.dateTime) {
      return new Date(start.dateTime).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (start.date) {
      return new Date(start.date + 'T12:00:00').toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    }
    return '';
  };

  if (isLoading) return <div className="p-mx-md text-center text-muted-foreground">Verificando contexto da agenda...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-mx-lg">
      <div className="flex items-center justify-between mb-mx-lg">
        <div className="flex items-center gap-mx-sm">
          <div className="p-mx-xs bg-brand-primary-subtle text-status-success-text rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <Typography variant="h3" className="font-bold">
              Gestão de Agendas
            </Typography>
            <Typography variant="caption" className="">
              Sincronizacao com Google Calendar API
            </Typography>
            <Typography variant="caption" className="block mt-mx-xs">
              {context.title}
            </Typography>
          </div>
        </div>

        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-mx-xs"
            onClick={refreshEvents}
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        )}
      </div>

      {!isConnected ? (
        <div className="text-center py-mx-xl border-2 border-dashed border-border rounded-2xl">
          <Typography variant="p" className="mb-mx-lg">
            {context.description}
          </Typography>
          <Typography variant="caption" className="block mb-mx-md">
            Conecte sua conta Google para liberar a leitura dos eventos futuros.
          </Typography>
          <Button
            onClick={connectGoogleCalendar}
            className="hover:bg-brand-primary-hover text-white flex items-center gap-mx-xs mx-auto"
          >
            <ExternalLink size={18} />
            Conectar Google Calendar
          </Button>
        </div>
      ) : (
        <div className="space-y-mx-sm">
          {!context.linkedToClient && (
            <div className="p-mx-md bg-surface-alt text-muted-foreground rounded-xl border border-border">
              <Typography variant="caption">{context.description}</Typography>
            </div>
          )}

          <div className="p-mx-md bg-status-success-surface text-status-success-text rounded-xl border border-status-success/20 flex items-center gap-mx-xs">
            <Typography variant="caption" className="font-medium">
              Agenda Conectada! {events.length > 0 ? `${events.length} evento(s) futuro(s).` : ''}
            </Typography>
          </div>

          {error && (
            <div className="p-mx-md bg-status-error-surface text-status-error-text rounded-xl border border-status-error/20">
              <Typography variant="caption">{error}</Typography>
            </div>
          )}

          {isRefreshing && events.length === 0 && (
            <div className="p-mx-lg text-center text-muted-foreground">
              <RefreshCw size={20} className="animate-spin mx-auto mb-mx-xs" />
              <Typography variant="caption">Buscando eventos...</Typography>
            </div>
          )}

          {!isRefreshing && events.length === 0 && !error && (
            <div className="p-mx-lg text-center text-muted-foreground opacity-60">
              <Typography variant="caption">
                Nenhum evento futuro encontrado para este cliente nos proximos 30 dias.
              </Typography>
            </div>
          )}

          {events.length > 0 && (
            <div className="space-y-mx-xs">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-mx-sm p-mx-md rounded-xl border border-border hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-colors"
                >
                  <div className="p-mx-xs bg-brand-primary/10 rounded-xl mt-0.5">
                    <Clock size={14} className="text-status-success-text" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Typography variant="caption" className="font-bold block truncate">
                      {event.summary || '(Sem titulo)'}
                    </Typography>
                    <Typography variant="caption" className="block">
                      {formatEventTime(event.start)}
                    </Typography>
                    {event.location && (
                      <div className="flex items-center gap-mx-xs mt-mx-xs">
                        <MapPin size={12} className="text-muted-foreground shrink-0" />
                        <Typography variant="caption" className="truncate">
                          {event.location}
                        </Typography>
                      </div>
                    )}
                  </div>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-status-success-text hover:text-brand-primary-hover shrink-0"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
