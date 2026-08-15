// Aba Evidências — checklist com upload de arquivos.

import { useState, useRef } from "react";
import { CheckCircle2, Circle, FileText, Upload, Trash2, Paperclip, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/atoms/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { consultingRepository } from "./consultingRepository";
import { toast } from '@/lib/toast'

const EVIDENCE_STATUS = {
  pending: { label: "Pendente", tone: "text-muted-foreground bg-muted" },
  sent: { label: "Enviada", tone: "text-status-info-text bg-status-info-surface" },
  in_analysis: { label: "Em análise", tone: "text-status-warning-text bg-status-warning-surface" },
  approved: { label: "Aprovada", tone: "text-status-success-text bg-primary/10" },
  returned: { label: "Devolvida", tone: "text-status-error-text bg-status-error-surface" },
};

export default function EvidenceTab({ meeting, user }) {
  const [templates] = useState(consultingRepository.getEvidenceTemplates(meeting.id));
  const [evidences, setEvidences] = useState(consultingRepository.getEvidences(meeting.id));
  const [viewing, setViewing] = useState(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customNote, setCustomNote] = useState("");
  const fileRefs = useRef({});

  const refresh = () => setEvidences(consultingRepository.getEvidences(meeting.id));

  const getEvidenceForTemplate = (templateId) => {
    return evidences.find((e) => e.evidenceTemplateId === templateId);
  };

  const handleFileSelect = (e, template) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const existing = getEvidenceForTemplate(template.id);
    if (existing) {
      consultingRepository.updateEvidence(meeting.id, existing.id, {
        status: "sent",
        fileName: file.name,
        fileType: file.type,
      });
    } else {
      consultingRepository.addEvidence(meeting.id, {
        type: "file",
        name: template.title,
        responsible: user?.full_name || user?.email || "Nome não informado",
        responsibleName: user?.full_name || "Nome não informado",
        evidenceTemplateId: template.id,
        fileName: file.name,
        fileType: file.type,
      });
    }
    refresh();
    toast.info("Evidência enviada", { description: file.name });
    e.target.value = "";
  };

  const handleRemoveEvidence = (evidenceId) => {
    consultingRepository.removeEvidence(meeting.id, evidenceId);
    refresh();
    toast.info("Evidência removida");
  };

  const handleResend = (evidenceId) => {
    consultingRepository.updateEvidence(meeting.id, evidenceId, { status: "sent" });
    refresh();
    toast.info("Evidência reenviada");
  };

  const handleAddCustom = () => {
    if (!customName.trim()) {
      toast.error("Informe um nome para a evidência");
      return;
    }
    consultingRepository.addEvidence(meeting.id, {
      type: "file",
      name: customName,
      responsible: user?.full_name || user?.email || "Nome não informado",
      responsibleName: user?.full_name || "Nome não informado",
      note: customNote,
    });
    refresh();
    setShowAddCustom(false);
    setCustomName("");
    setCustomNote("");
    toast.info("Evidência adicionada");
  };

  const customEvidences = evidences.filter((e) => !e.evidenceTemplateId);

  return (
    <div className="space-y-4">
      {/* Checklist de evidências esperadas */}
      {templates.length > 0 && (
        <div>
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Evidências esperadas</p>
          <div className="mt-2 space-y-2">
            {templates.map((t) => {
              const evidence = getEvidenceForTemplate(t.id);
              const isSent = !!evidence;
              const status = evidence ? EVIDENCE_STATUS[evidence.status] || EVIDENCE_STATUS.pending : null;
              return (
                <div key={t.id} className={`rounded-lg border p-2.5 ${isSent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-start gap-2">
                    {isSent ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/40" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">{t.title}</p>
                        {t.required && (
                          <span className="rounded-full bg-status-warning-surface px-1.5 py-0.5 text-caption font-medium text-status-warning-text">Obrigatória</span>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                      )}
                      {status && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${status.tone}`}>
                            {status.label}
                          </span>
                          {evidence.consultantNote && (
                            <span className="text-caption text-muted-foreground">Com devolutiva do consultor</span>
                          )}
                        </div>
                      )}
                      {/* Arquivo anexo / upload */}
                      <div className="mt-2">
                        <input
                          ref={(el) => (fileRefs.current[t.id] = el)}
                          type="file"
                          onChange={(e) => handleFileSelect(e, t)}
                          className="hidden"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          {evidence && evidence.fileName ? (
                            <>
                              <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1">
                                <Paperclip className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-foreground">{evidence.fileName}</span>
                              </div>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setViewing(evidence)}>
                                <Eye className="h-3 w-3" />
                                Ver
                              </Button>
                              {evidence.status === "returned" && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleResend(evidence.id)}>
                                  <RefreshCw className="h-3 w-3" />
                                  Reenviar
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleRemoveEvidence(evidence.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => fileRefs.current[t.id]?.click()}>
                              <Upload className="h-3 w-3" />
                              Enviar arquivo
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidências extras (sem template) */}
      {customEvidences.length > 0 && (
        <div>
          <p className="text-caption font-medium uppercase tracking-wide text-muted-foreground">Evidências adicionais</p>
          <div className="mt-2 space-y-2">
            {customEvidences.map((ev) => {
              const status = EVIDENCE_STATUS[ev.status] || EVIDENCE_STATUS.pending;
              return (
                <div key={ev.id} className="rounded-lg border border-border bg-card p-2.5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{ev.name}</p>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-caption font-medium ${status.tone}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ev.responsible} • {new Date(ev.date).toLocaleDateString("pt-BR")}
                      </p>
                      {ev.fileName && (
                        <div className="mt-1.5 flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1">
                          <Paperclip className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-foreground">{ev.fileName}</span>
                        </div>
                      )}
                      <div className="mt-1.5 flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setViewing(ev)}>
                          <Eye className="h-3 w-3" />
                          Ver
                        </Button>
                        {ev.status === "returned" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleResend(ev.id)}>
                            <RefreshCw className="h-3 w-3" />
                            Reenviar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => handleRemoveEvidence(ev.id)}>
                          <Trash2 className="h-3 w-3" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Botão adicionar evidência extra */}
      <Button variant="outline" className="w-full" onClick={() => setShowAddCustom(true)}>
        <Upload className="h-3.5 w-3.5" />
        Adicionar evidência
      </Button>

      {/* Modal adicionar evidência extra */}
      {showAddCustom && (
        <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>Adicionar evidência</DialogTitle>
              <DialogDescription>Registre uma evidência adicional para o encontro {meeting.number} — {meeting.title}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: Relatório adicional"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Observação</label>
                <Textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustom(false)}>Cancelar</Button>
              <Button onClick={handleAddCustom}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal visualizar evidência */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
          <DialogContent size="sm">
            <DialogHeader>
              <DialogTitle>{viewing.name}</DialogTitle>
              <DialogDescription>
                {viewing.responsible} • {new Date(viewing.date).toLocaleDateString("pt-BR")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${(EVIDENCE_STATUS[viewing.status] || EVIDENCE_STATUS.pending).tone}`}>
                  {(EVIDENCE_STATUS[viewing.status] || EVIDENCE_STATUS.pending).label}
                </span>
              </div>
              {viewing.note && <p className="text-sm text-foreground">{viewing.note}</p>}
              {viewing.fileName && (
                <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2 py-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">{viewing.fileName}</span>
                </div>
              )}
              {viewing.consultantNote && (
                <div className="rounded-md bg-status-warning-surface p-2.5">
                  <p className="text-xs font-medium text-status-warning-text">Devolutiva do consultor:</p>
                  <p className="mt-0.5 text-sm text-status-warning-text">{viewing.consultantNote}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
