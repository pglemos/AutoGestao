// Aba Evidências do drawer — adicionar e remover evidências.
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye, FileText, Link as LinkIcon, Image, Type } from "lucide-react";
import { actionPlanLiveRepository } from "../actionPlanLiveRepository";

const EVIDENCE_TYPES = [
  { value: "image", label: "Imagem", icon: Image },
  { value: "file", label: "Arquivo", icon: FileText },
  { value: "link", label: "Link", icon: LinkIcon },
  { value: "text", label: "Texto", icon: Type },
];

export default function EvidenceTab({ action, onReload, user }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ type: "file", name: "", url: "", note: "", valueBefore: "", valueAfter: "" });
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleAdd = async () => {
    if (!form.name.trim() || (form.type === "link" && !form.url.trim())) return;
    try {
      await actionPlanLiveRepository.addEvidence(action.id, {
        type: form.type,
        name: form.name.trim(),
        url: form.url.trim() || null,
        note: form.note.trim(),
        valueBefore: form.valueBefore || null,
        valueAfter: form.valueAfter || null,
      });
      setForm({ type: "file", name: "", url: "", note: "", valueBefore: "", valueAfter: "" });
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível adicionar a evidência.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  const handleRemove = async (evidenceId) => {
    try {
      await actionPlanLiveRepository.removeEvidence(action.id, evidenceId);
      await onReload();
    } catch (error) {
      toast({ title: "Não foi possível remover a evidência.", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-sm font-medium text-foreground">Adicionar evidência</p>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 block text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVIDENCE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div />
          </div>
          <div>
            <Label className="mb-1 block text-xs">Nome *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Nome da evidência" className="h-8 text-xs" />
          </div>
          {form.type === "link" && (
            <div>
              <Label className="mb-1 block text-xs">URL *</Label>
              <Input value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://..." className="h-8 text-xs" />
            </div>
          )}
          <div>
            <Label className="mb-1 block text-xs">Observação</Label>
            <Textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} className="text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="mb-1 block text-xs">Valor antes</Label>
              <Input value={form.valueBefore} onChange={(e) => set("valueBefore", e.target.value)} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="mb-1 block text-xs">Valor depois</Label>
              <Input value={form.valueAfter} onChange={(e) => set("valueAfter", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!form.name.trim() || (form.type === "link" && !form.url.trim())} className="bg-primary hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Evidências ({(action.evidences || []).length})</p>
        {(action.evidences || []).map((e) => {
          const typeInfo = EVIDENCE_TYPES.find((t) => t.value === e.type) || EVIDENCE_TYPES[1];
          const Icon = typeInfo.icon;
          return (
            <div key={e.id} className="flex items-start gap-2 rounded-lg border border-border p-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{e.name}</p>
                <p className="text-xs text-muted-foreground">{e.responsible} · {e.date}</p>
                {e.note && <p className="mt-0.5 text-xs text-muted-foreground">{e.note}</p>}
                {(e.valueBefore || e.valueAfter) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.valueBefore || "—"} → {e.valueAfter || "—"}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  aria-label={`Visualizar evidência ${e.name}`}
                  disabled={!e.url}
                  onClick={() => e.url && window.open(e.url, "_blank", "noopener,noreferrer")}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleRemove(e.id)} className="h-7 w-7 p-0 text-red-500 hover:text-red-700">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
        {(action.evidences || []).length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma evidência adicionada.</p>
        )}
      </div>
    </div>
  );
}
