import { useState } from "react";
import { Button } from "@/components/ui/button";
import DetailDrawer from "@/components/owner/DetailDrawer";
import { useOwner } from "@/components/owner/OwnerContext";
import { formatDate, formatTime } from "@/features/owner/lib/ownerFormatters";
import { CalendarClock, Clock, UserCircle, CheckSquare, Gavel, ListChecks } from "lucide-react";

export default function ConsultingMeetingBlock({ meeting }) {
  const { openConsultantModal } = useOwner();
  const [prepOpen, setPrepOpen] = useState(false);

  if (!meeting) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card p-5">
        <p className="text-sm font-medium text-foreground">Próximo encontro com a Consultoria</p>
        <p className="mt-1 text-xs text-muted-foreground">Nenhum encontro agendado no momento.</p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">Próximo encontro com a Consultoria</p>
            <h3 className="mt-1 text-base font-semibold text-foreground">{meeting.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                {formatDate(meeting.start_at)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(meeting.start_at)}
              </span>
              {meeting.consultant_name && (
                <span className="inline-flex items-center gap-1.5">
                  <UserCircle className="h-3.5 w-3.5" />
                  {meeting.consultant_name}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
              <span className="tabular-nums">{meeting.client_pending_count || 0}</span> pendências
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
              <Gavel className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="tabular-nums">{meeting.decision_count || 0}</span> decisões
            </div>
          </div>
        </div>

        {meeting.agenda?.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1.5 text-caption font-medium uppercase tracking-wide text-muted-foreground/80">Pauta</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {meeting.agenda.map((a, i) => (
                <li key={i} className="inline-flex items-center gap-1.5">
                  <ListChecks className="h-3 w-3 text-muted-foreground/80" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setPrepOpen(true)}>
            Ver preparação
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-primary hover:bg-primary/90"
            onClick={() =>
              openConsultantModal({
                title: meeting.title,
                contextType: "general",
                contextId: meeting.id,
                requestType: "schedule_meeting",
                snapshot: `Encontro: ${meeting.title} em ${formatDate(meeting.start_at)} às ${formatTime(meeting.start_at)}`,
              })
            }
          >
            Falar com Consultor
          </Button>
        </div>
      </section>

      <DetailDrawer
        open={prepOpen}
        onOpenChange={setPrepOpen}
        title={meeting.title}
        description={`Preparação para o encontro em ${formatDate(meeting.start_at)} às ${formatTime(meeting.start_at)}`}
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted-foreground/80">Pauta</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {meeting.agenda?.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-caption font-medium uppercase tracking-wide text-muted-foreground/80">Preparação necessária</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {meeting.preparation?.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs text-muted-foreground">
            A agenda completa da Consultoria será construída na próxima etapa.
          </div>
        </div>
      </DetailDrawer>
    </>
  );
}
