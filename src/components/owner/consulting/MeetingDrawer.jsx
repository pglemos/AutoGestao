// Modal central do encontro com abas: Aula, Entrega e Evidências.

import { useState, useEffect } from "react";
import { Play, ListChecks, FileText, Lock, ShieldCheck, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { consultingRepository } from "./consultingRepository";
import ContentTab from "./ContentTab";
import PreparationTab from "./PreparationTab";
import EvidenceTab from "./EvidenceTab";
import AnticipationModal from "./AnticipationModal";
import { useToast } from "@/components/ui/use-toast";

const TABS = [
  { id: "content", label: "Aula", icon: Play },
  { id: "delivery", label: "Entrega", icon: ListChecks },
  { id: "evidence", label: "Evidências", icon: FileText },
];

export default function MeetingDrawer({ meetingId, onClose, user, onDataChange, initialLessonId, initialTab }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");
  const [showAnticipation, setShowAnticipation] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const meeting = consultingRepository.getMeeting(meetingId);
  const program = meeting ? consultingRepository.getProgram(meeting.programId) : null;

  useEffect(() => {
    if (meetingId) {
      setActiveTab(initialTab || "content");
      setRefreshKey((k) => k + 1);
    }
  }, [meetingId, initialTab]);

  if (!meeting) return null;

  const isLocked = meeting.status === "locked";
  const isRestricted = program?.restrictedContent && !program.restrictedRoles.includes(user?.role);
  const prep = consultingRepository.getMeetingPreparation(meeting.id);
  const anticipation = consultingRepository.getAnticipationRequest(meeting.id);

  const handleDataChanged = () => {
    setRefreshKey((k) => k + 1);
    onDataChange?.();
  };

  const handleCancelAnticipation = () => {
    if (!anticipation) return;
    if (window.confirm("Deseja cancelar a solicitação de antecipação?")) {
      consultingRepository.cancelAnticipationRequest(anticipation.id);
      toast({ title: "Solicitação cancelada" });
      handleDataChanged();
    }
  };

  return (
    <Dialog open={!!meetingId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-0 overflow-hidden p-0">
        {/* Header fixo */}
        <div className="border-b border-border bg-card px-5 py-3 pr-10">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Encontro {meeting.number}
            </span>
            {meeting.pillar && (
              <span className="inline-flex items-center rounded-full bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">
                {meeting.pillar}
              </span>
            )}
            {isRestricted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Lock className="h-3 w-3" />
                Restrito
              </span>
            )}
          </div>
          <h2 className="mt-1 text-left text-base font-semibold text-foreground">
            {meeting.title}
          </h2>
          <p className="text-xs text-muted-foreground">{program?.shortName} • {meeting.modality}</p>
        </div>

        {/* Abas */}
        <div className="border-b border-border bg-card px-5">
          <div className="flex gap-1 overflow-x-auto py-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo - scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLocked && activeTab !== "content" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Conteúdo bloqueado</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Este conteúdo será liberado conforme a evolução da jornada.
              </p>
            </div>
          ) : (
            <>
              {activeTab === "content" && (
                <ContentTab
                  meeting={meeting}
                  program={program}
                  userRole={user?.role}
                  userId={user?.id}
                  onProgressSaved={handleDataChanged}
                  initialLessonId={initialLessonId}
                />
              )}
              {activeTab === "delivery" && (
                <PreparationTab meeting={meeting} onChanged={handleDataChanged} />
              )}
              {activeTab === "evidence" && <EvidenceTab meeting={meeting} user={user} />}
            </>
          )}
        </div>

        {/* Rodapé fixo com ações */}
        <div className="border-t border-border bg-card px-5 py-3">
          {anticipation && anticipation.status === "in_analysis" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-status-warning/30 bg-status-warning-surface px-3 py-2">
                <Clock className="h-4 w-4 shrink-0 text-status-warning-text" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-status-warning-text">Antecipação em análise</p>
                  <p className="text-caption text-status-warning-text">
                    Solicitada em {new Date(anticipation.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={handleCancelAnticipation}>
                <Ban className="h-3.5 w-3.5" />
                Cancelar solicitação
              </Button>
            </div>
          ) : prep.readyForAnticipation && meeting.canAnticipate && !isLocked ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                <p className="text-xs font-medium text-primary">Preparação concluída — pronto para antecipar</p>
              </div>
              <Button className="w-full" onClick={() => setShowAnticipation(true)}>
                Solicitar antecipação
              </Button>
            </div>
          ) : (
            !isLocked && !isRestricted && pendingItemsInfo(meeting.id)
          )}
        </div>

        {/* Modal de antecipação */}
        {showAnticipation && (
          <AnticipationModal
            meeting={meeting}
            program={program}
            onClose={() => setShowAnticipation(false)}
            onSubmitted={() => {
              setShowAnticipation(false);
              handleDataChanged();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function pendingItemsInfo(meetingId) {
  const pending = consultingRepository.getPendingRequiredItems(meetingId);
  if (pending.length === 0) return null;
  return (
    <div className="flex-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
      {pending.length} item(ns) obrigatório(s) pendente(s)
    </div>
  );
}