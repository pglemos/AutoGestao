// Jornada de encontros com fases e indicadores compactos.

import { Lock, CheckCircle2, Play, ShieldCheck } from "lucide-react";
import { consultingRepository } from "./consultingRepository";

const TONE_DOT = {
  green: "bg-primary",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  slate: "bg-muted-foreground/40",
};

export default function MeetingJourney({ meetings, onSelectMeeting, selectedMeetingId, userRole, programName }) {
  const clientProgram = consultingRepository.getClientProgram();

  // Calcular fases
  const implementationMeetings = meetings.filter((m) => m.phase === "implementation");
  const followupMeetings = meetings.filter((m) => m.phase === "followup");
  const phases = [];
  if (implementationMeetings.length > 0) {
    phases.push({
      label: "Implementação",
      range: `${implementationMeetings[0].number}–${implementationMeetings[implementationMeetings.length - 1].number}`,
      count: implementationMeetings.length,
    });
  }
  if (followupMeetings.length > 0) {
    phases.push({
      label: "Acompanhamento",
      range: `${followupMeetings[0].number}–${followupMeetings[followupMeetings.length - 1].number}`,
      count: followupMeetings.length,
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">
        Jornada do Programa {programName || ""}
      </h3>

      {/* Barra de fases */}
      {phases.length > 0 && (
        <div className="mt-3 flex gap-2">
          {phases.map((phase, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5"
              style={{ flex: phase.count }}
            >
              <span className="text-xs font-semibold text-foreground">{phase.label}</span>
              <span className="text-xs text-muted-foreground">{phase.range}</span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="mt-4 flex flex-wrap gap-x-1 gap-y-5">
        {meetings.map((meeting, idx) => {
          const indicators = consultingRepository.getMeetingIndicators(meeting.id);
          const isLocked = meeting.status === "locked";
          const isCompleted = meeting.status === "completed";
          const isCurrent = meeting.id === clientProgram.currentMeetingId;
          const isSelected = meeting.id === selectedMeetingId;
          const isRestricted = meeting.programId === "ppa" && !["owner", "partner", "consultant", "admin_mx"].includes(userRole);

          return (
            <div key={meeting.id} className="flex items-center">
              <button
                onClick={() => !isLocked && onSelectMeeting(meeting.id)}
                disabled={isLocked}
                className={`group relative flex flex-col items-center transition-all ${
                  isLocked ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : isLocked
                      ? "border-border bg-muted text-muted-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  } ${isSelected ? "ring-2 ring-primary/30 ring-offset-2" : ""}`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isLocked ? (
                    <Lock className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-semibold">{meeting.number}</span>
                  )}
                </div>

                {isCurrent && !isCompleted && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                )}

                <div className="mt-1.5 w-24 text-center">
                  <p
                    className={`line-clamp-2 break-words text-caption font-medium leading-tight ${
                      isLocked ? "text-muted-foreground/60" : "text-foreground"
                    }`}
                  >
                    {meeting.title}
                  </p>
                  {meeting.pillar && (
                    <p className="mt-0.5 text-caption text-muted-foreground">{meeting.pillar}</p>
                  )}

                  <div className="mt-1.5 space-y-0.5">
                    {indicators.map((ind, i) => (
                      <div key={i} className="flex items-center justify-center gap-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[ind.tone] || TONE_DOT.slate}`} />
                        <span className="text-caption text-muted-foreground">{ind.label}</span>
                      </div>
                    ))}
                  </div>

                  {isRestricted && (
                    <div className="mt-1 flex items-center justify-center gap-0.5">
                      <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-caption text-muted-foreground">Restrito</span>
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}