// Aba Entrega — checklist de entregas com upload de arquivos.

import { useState, useRef } from "react";
import { CheckCircle2, Circle, Users, FileText, Play, ListChecks, Upload, Trash2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from '@/components/atoms/Textarea';
import { consultingRepository } from "./consultingRepository";
import ParticipantsModal from "./ParticipantsModal";
import { toast } from '@/lib/toast'

const TYPE_ICON = {
  lesson: Play,
  checklist: ListChecks,
  participant: Users,
  evidence: FileText,
  action: ListChecks,
  material: FileText,
};

const STATUS_LABEL = {
  not_started: "Não iniciado",
  in_progress: "Em andamento",
  completed: "Concluído",
  blocked: "Bloqueado",
};

const STATUS_TONE = {
  not_started: "text-muted-foreground",
  in_progress: "text-status-info-text",
  completed: "text-primary",
  blocked: "text-status-error-text",
};

export default function PreparationTab({ meeting, onChanged }) {
  const [items, setItems] = useState(consultingRepository.getPreparationItems(meeting.id));
  const [prep, setPrep] = useState(consultingRepository.getMeetingPreparation(meeting.id));
  const [showParticipants, setShowParticipants] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);
  const [itemNotes, setItemNotes] = useState({});
  const fileRefs = useRef({});

  const refresh = () => {
    setItems(consultingRepository.getPreparationItems(meeting.id));
    setPrep(consultingRepository.getMeetingPreparation(meeting.id));
    onChanged?.();
  };

  const toggleItem = (item) => {
    const newStatus = item.status === "completed" ? "not_started" : "completed";
    consultingRepository.updatePreparationItem(meeting.id, item.id, {
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date().toISOString() : null,
    });
    refresh();
    toast.info(newStatus === "completed" ? "Item concluído" : "Item reaberto", { description: item.title });
  };

  const handleSaveNote = (item) => {
    const note = itemNotes[item.id] || item.notes || "";
    consultingRepository.updatePreparationItem(meeting.id, item.id, { notes: note });
    refresh();
    toast.info("Observação salva");
  };

  const handleFileSelect = (e, item) => {
    const file = e.target.files?.[0];
    if (!file) return;
    consultingRepository.addPreparationItemFile(meeting.id, item.id, {
      name: file.name,
      fileName: file.name,
      fileType: file.type,
    });
    refresh();
    toast.info("Arquivo anexado", { description: file.name });
    e.target.value = "";
  };

  const handleRemoveFile = (item, fileId) => {
    consultingRepository.removePreparationItemFile(meeting.id, item.id, fileId);
    refresh();
    toast.info("Arquivo removido");
  };

  const handleParticipantsConfirmed = () => {
    refresh();
    setShowParticipants(false);
  };

  const pendingRequired = items.filter((i) => i.required && i.status !== "completed");

  return (
    <div className="space-y-4">
      {/* Progresso da entrega */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-foreground">Entregas do encontro</p>
          <span className="text-xs text-muted-foreground">
            {prep.requiredItemsCompleted} de {prep.requiredItemsTotal} itens obrigatórios
          </span>
        </div>
        <Progress value={prep.progressPercent} className="mt-1.5 h-2" />
        {prep.readyForAnticipation && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-status-success-text">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Entrega concluída — pronto para antecipar
          </div>
        )}
      </div>

      {/* Itens de entrega */}
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.type] || ListChecks;
          const isCompleted = item.status === "completed";
          const isExpanded = expandedItem === item.id;
          const attachedFiles = item.attachedFiles || [];

          return (
            <div key={item.id} className={`rounded-lg border bg-card transition-all ${isCompleted ? "border-primary/30 bg-primary/5" : "border-border"}`}>
              <div className="flex items-start gap-2 p-2.5">
                <button
                  onClick={() => toggleItem(item)}
                  className="mt-0.5 shrink-0"
                  aria-label={isCompleted ? "Desmarcar" : "Concluir"}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 hover:text-muted-foreground" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className={`text-sm font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {item.title}
                    </p>
                    {item.required && (
                      <span className="rounded-full bg-status-warning-surface px-1.5 py-0.5 text-caption font-medium text-status-warning-text">Obrigatório</span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-caption font-medium ${STATUS_TONE[item.status]}`}>
                      {STATUS_LABEL[item.status]}
                    </span>
                    {item.type === "participant" && (
                      <button
                        onClick={() => setShowParticipants(true)}
                        className="text-caption text-primary hover:underline"
                      >
                        Confirmar participantes
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                      className="text-caption text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? "Recolher" : "Observação"}
                    </button>
                  </div>

                  {/* Arquivos anexos */}
                  <div className="mt-2">
                    <input
                      ref={(el) => (fileRefs.current[item.id] = el)}
                      type="file"
                      onChange={(e) => handleFileSelect(e, item)}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => fileRefs.current[item.id]?.click()}
                      >
                        <Upload className="h-3 w-3" />
                        Anexar arquivo
                      </Button>
                      {attachedFiles.length > 0 && (
                        <span className="text-caption text-muted-foreground">
                          {attachedFiles.length} arquivo(s)
                        </span>
                      )}
                    </div>
                    {attachedFiles.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {attachedFiles.map((file) => (
                          <div key={file.id} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2 py-1">
                            <div className="flex items-center gap-1.5">
                              <Paperclip className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-foreground">{file.name}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleRemoveFile(item, file.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-2.5 pb-2.5 pt-2">
                  <Textarea
                    placeholder="Adicione uma observação..."
                    value={itemNotes[item.id] ?? item.notes ?? ""}
                    onChange={(e) => setItemNotes({ ...itemNotes, [item.id]: e.target.value })}
                    className="min-h-[60px] text-xs"
                  />
                  <div className="mt-1.5 flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => handleSaveNote(item)}>
                      Salvar observação
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pendências */}
      {pendingRequired.length > 0 && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning-surface p-3">
          <p className="text-xs font-medium text-status-warning-text">Itens obrigatórios pendentes:</p>
          <ul className="mt-1 space-y-0.5">
            {pendingRequired.map((item) => (
              <li key={item.id} className="text-xs text-status-warning-text">• {item.title}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Ação: confirmar participantes */}
      <Button variant="outline" className="w-full" onClick={() => setShowParticipants(true)}>
        <Users className="h-4 w-4" />
        Confirmar participantes
      </Button>

      {showParticipants && (
        <ParticipantsModal
          meeting={meeting}
          onClose={() => setShowParticipants(false)}
          onConfirmed={handleParticipantsConfirmed}
        />
      )}
    </div>
  );
}