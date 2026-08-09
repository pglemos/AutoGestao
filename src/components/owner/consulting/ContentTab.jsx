// Aba Aula — vídeo da aula + arquivos complementares + visão geral do encontro.

import { useState, useEffect, useRef } from "react";
import { Calendar, Clock, User, Users, MapPin, ShieldCheck, Lock, FileText, Upload, Trash2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import YouTubePlayer from "./YouTubePlayer";
import { consultingRepository } from "./consultingRepository";
import { useToast } from "@/components/ui/use-toast";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function ContentTab({ meeting, program, userRole, userId = "demo", onProgressSaved, initialLessonId }) {
  const { toast } = useToast();
  const lessons = consultingRepository.getLessons(meeting.id);
  const onboardingLessons = meeting.number === 1 ? consultingRepository.getOnboardingLessons(meeting.programId) : [];
  const allLessons = [...onboardingLessons, ...lessons];
  const [activeLessonId, setActiveLessonId] = useState(initialLessonId || allLessons[0]?.id || null);
  const [lessonFiles, setLessonFiles] = useState([]);
  const fileRef = useRef(null);

  const activeLesson = allLessons.find((l) => l.id === activeLessonId);
  const isRestricted = program?.restrictedContent && !program.restrictedRoles.includes(userRole);
  const prep = consultingRepository.getMeetingPreparation(meeting.id);
  const anticipation = consultingRepository.getAnticipationRequest(meeting.id);

  useEffect(() => {
    if (activeLessonId) {
      setLessonFiles(consultingRepository.getLessonFiles(activeLessonId));
    } else {
      setLessonFiles([]);
    }
  }, [activeLessonId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "A definir";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">Conteúdo restrito</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          O conteúdo completo deste encontro é exclusivo para Dono, Sócio autorizado, Consultor ou Administrador MX.
        </p>
      </div>
    );
  }

  const handleProgress = (payload) => {
    consultingRepository.saveLessonProgress(payload);
  };

  const handleComplete = () => {
    toast({ title: "Aula concluída", description: "A preparação do encontro foi atualizada." });
    onProgressSaved?.();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeLessonId) return;
    consultingRepository.addLessonFile(activeLessonId, {
      name: file.name,
      fileName: file.name,
      fileType: file.type,
    });
    setLessonFiles(consultingRepository.getLessonFiles(activeLessonId));
    toast({ title: "Arquivo adicionado" });
    e.target.value = "";
  };

  const handleRemoveFile = (fileId) => {
    if (!activeLessonId) return;
    consultingRepository.removeLessonFile(activeLessonId, fileId);
    setLessonFiles(consultingRepository.getLessonFiles(activeLessonId));
    toast({ title: "Arquivo removido" });
  };

  const initialProgress = activeLesson ? consultingRepository.getLessonProgress(activeLesson.id, userId) : null;

  return (
    <div className="space-y-4">
      {/* Seletor de aulas */}
      {allLessons.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {allLessons.map((lesson) => {
            const progress = consultingRepository.getLessonProgress(lesson.id, userId);
            const isActive = lesson.id === activeLessonId;
            const isCompleted = progress.status === "completed";
            return (
              <button
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : isCompleted
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                }`}
              >
                {isCompleted && "✓ "}
                {lesson.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Player de vídeo */}
      {activeLesson && (
        <YouTubePlayer
          key={activeLesson.id}
          videoId={activeLesson.videoId}
          lessonId={activeLesson.id}
          userId={userId}
          initialProgress={initialProgress}
          onProgress={handleProgress}
          onComplete={handleComplete}
        />
      )}

      {/* Arquivos complementares */}
      {activeLesson && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Arquivos</p>
            </div>
            <input ref={fileRef} type="file" onChange={handleFileSelect} className="hidden" />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Adicionar arquivo
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Materiais complementares incluídos pelo consultor.
          </p>
          {lessonFiles.length > 0 ? (
            <div className="mt-2 space-y-1">
              {lessonFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{file.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleRemoveFile(file.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Nenhum arquivo adicionado.</p>
          )}
        </div>
      )}

      {/* Detalhes da aula */}
      {activeLesson && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{activeLesson.title}</h3>
              {activeLesson.required ? (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-caption font-medium text-amber-700">Obrigatória</span>
              ) : (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">Opcional</span>
              )}
              {activeLesson.type === "onboarding" && (
                <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-caption font-medium text-blue-700">Onboarding</span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{activeLesson.code}</p>
          </div>
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Descrição</p>
            <p className="mt-0.5 text-sm text-foreground">{activeLesson.description}</p>
          </div>
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Objetivo</p>
            <p className="mt-0.5 text-sm text-foreground">{activeLesson.objective}</p>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Visão Geral do encontro */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Visão Geral do Encontro</h3>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <InfoRow icon={Calendar} label="Data atual" value={formatDate(meeting.scheduledDate)} />
          <InfoRow icon={Clock} label="Duração" value={`${meeting.duration} min`} />
          <InfoRow icon={MapPin} label="Modalidade" value={meeting.modality} />
          <InfoRow icon={User} label="Consultor" value={meeting.consultant} />
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Objetivo</p>
            <p className="mt-0.5 text-sm text-foreground">{meeting.objective}</p>
          </div>
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Por que este encontro existe</p>
            <p className="mt-0.5 text-sm text-foreground">{meeting.reason}</p>
          </div>
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Resultado esperado</p>
            <p className="mt-0.5 text-sm text-foreground">{meeting.expectedResult}</p>
          </div>
        </div>

        <div>
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Participantes</p>
          <div className="mt-1 space-y-1">
            {meeting.participants.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{p.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{p.role}</span>
                  {p.required ? (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-caption font-medium text-amber-700">Obrigatório</span>
                  ) : (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-caption font-medium text-muted-foreground">Opcional</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Preparação atual</p>
            <span className="text-xs text-muted-foreground">{prep.progressPercent}%</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${prep.progressPercent}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {prep.requiredItemsCompleted} de {prep.requiredItemsTotal} itens obrigatórios concluídos
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="text-xs font-medium text-foreground">Possibilidade de antecipação</p>
          </div>
          {meeting.canAnticipate ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {prep.readyForAnticipation
                ? "Preparação concluída. Este encontro está pronto para ser antecipado."
                : anticipation
                ? "Antecipação solicitada e em análise."
                : "Conclua a preparação obrigatória para solicitar a antecipação deste encontro."}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Este encontro não pode ser antecipado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
