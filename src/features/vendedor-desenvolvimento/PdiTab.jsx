import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Trophy, Target, Star, Plus, Calendar } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { canManagePDI } from "@/lib/auth/capabilities";
import { ScrollableRegion } from "@/design-system/page/ScrollableRegion";

const techCompetencies = [
  { key: "tech_planejamento", label: "Planejamento" },
  { key: "tech_atendimento", label: "Atendimento" },
  { key: "tech_agendamento", label: "Agendamento" },
  { key: "tech_fechamento", label: "Fechamento" },
  { key: "tech_carteira", label: "Carteira" },
  { key: "tech_midias", label: "Mídias Sociais" },
  { key: "tech_prospeccao", label: "Prospecção" },
  { key: "tech_avaliacao", label: "Avaliação de Carro" },
  { key: "tech_financiamentos", label: "Financiamentos" },
  { key: "tech_processos", label: "Processos" },
];

const behavCompetencies = [
  { key: "behav_pontualidade", label: "Pontualidade" },
  { key: "behav_urgencia", label: "Urgência" },
  { key: "behav_iniciativa", label: "Iniciativa" },
  { key: "behav_organizacao", label: "Organização" },
  { key: "behav_lideranca", label: "Liderança" },
  { key: "behav_relacionamento", label: "Relacionamento" },
  { key: "behav_persistencia", label: "Persistência" },
  { key: "behav_resiliencia", label: "Resiliência" },
];

export default function PDIPage({ hideHeader = false }) {
  const { toast } = useToast();
  const { role } = useAuth();
  const canEdit = canManagePDI(role);
  const [pdi, setPdi] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState({ action: "", competency: "", description: "", deadline: "", status: "Pendente", progress: 0 });

  useEffect(() => {
    Promise.all([
      base44.entities.PDI.list().catch(() => []),
      base44.entities.ActionPlan.list('-created_date', 50).catch(() => []),
    ]).then(([pdis, acts]) => {
      setPdi(pdis[0] || null);
      setActions(acts);
      setLoading(false);
    });
  }, []);

  const savePDI = async (data) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      if (pdi?.id) {
        const updated = await base44.entities.PDI.update(pdi.id, data);
        setPdi(updated);
      } else {
        const created = await base44.entities.PDI.create(data);
        setPdi(created);
      }
      toast({ title: "PDI salvo!" });
    } catch (error) {
      toast({ title: "Erro ao salvar PDI", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createAction = async () => {
    if (!canEdit) return;
    try {
      const created = await base44.entities.ActionPlan.create(newAction);
      setActions(prev => [created, ...prev]);
      setNewAction({ action: "", competency: "", description: "", deadline: "", status: "Pendente", progress: 0 });
      setDialogOpen(false);
      toast({ title: "Ação criada!" });
    } catch (error) {
      toast({ title: "Erro ao criar ação", variant: "destructive" });
    }
  };

  const updateActionStatus = async (id, status, progress) => {
    if (!canEdit) return;
    try {
      await base44.entities.ActionPlan.update(id, { status, progress });
      setActions(prev => prev.map(a => a.id === id ? { ...a, status, progress } : a));
    } catch (error) {
      toast({ title: "Erro ao atualizar ação", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-border border-t-mx-blue rounded-full animate-spin" /></div>;
  }

  const currentPDI = pdi || {};
  const techData = techCompetencies.map(c => ({ subject: c.label, value: currentPDI[c.key] || 5, target: 10 }));
  const behavData = behavCompetencies.map(c => ({ subject: c.label, value: currentPDI[c.key] || 5, target: 10 }));

  const CompetencySlider = ({ comp, value, onChange, onCommit, disabled = false }) => (
    <div className="flex items-center gap-4">
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{comp.label}</span>
      <Slider
        value={[value]}
        onValueChange={v => onChange(v[0])}
        onValueCommit={v => onCommit?.(v[0])}
        max={10}
        min={1}
        step={1}
        disabled={disabled}
        className="flex-1"
      />
      <div className="flex items-center gap-2 w-20">
        <span className="text-sm font-bold text-mx-navy w-6 text-right">{value}</span>
        <span className="text-xs text-muted-foreground">/10</span>
      </div>
    </div>
  );

  const statusColors = {
    "Pendente": "bg-surface-muted text-muted-foreground",
    "Em Andamento": "bg-mx-blue-light text-mx-blue",
    "Concluído": "bg-brand-primary-subtle text-brand-primary",
  };

  return (
    <div className="space-y-8">
      {!hideHeader && <PageHeader title="PDI" subtitle="Plano de Desenvolvimento Individual" />}

      {/* Goals */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-status-warning-text" />
          <h3 className="text-base font-semibold text-mx-navy">Conquistas</h3>
          {!canEdit && <span className="ml-auto text-xs font-medium text-muted-foreground">Somente gerente, dono ou Admin MX podem editar</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Curto Prazo", sublabel: "1 Ano", key: "short_term_goal", color: "border-brand-primary" },
            { label: "Médio Prazo", sublabel: "2 Anos", key: "medium_term_goal", color: "border-mx-blue" },
            { label: "Longo Prazo", sublabel: "3 Anos", key: "long_term_goal", color: "border-mx-amber" },
          ].map(goal => (
            <div key={goal.key} className={`border-l-4 ${goal.color} pl-4`}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{goal.label}</p>
              <p className="text-xs text-muted-foreground">{goal.sublabel}</p>
              <Textarea
                value={currentPDI[goal.key] || ""}
                onChange={e => {
                  const data = { ...currentPDI, [goal.key]: e.target.value };
                  setPdi(data);
                }}
                onBlur={() => savePDI({ [goal.key]: currentPDI[goal.key] || "" })}
                disabled={!canEdit}
                readOnly={!canEdit}
                placeholder="Descreva sua meta..."
                className="mt-2 rounded-xl resize-none border-border"
                rows={3}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Competencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="text-base font-semibold text-mx-navy mb-6">Competências Técnicas</h3>
          <div className="h-64 mb-6 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256} initialDimension={{ width: 320, height: 256 }}>
              <RadarChart data={techData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Radar name="Atual" dataKey="value" stroke="#005BFF" fill="#005BFF" fillOpacity={0.2} />
                <Radar name="Alvo" dataKey="target" stroke="#22C55E" fill="#22C55E" fillOpacity={0.05} strokeDasharray="5 5" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {techCompetencies.map(c => (
              <CompetencySlider
                key={c.key}
                comp={c}
                value={currentPDI[c.key] || 5}
                onChange={v => {
                  setPdi(prev => ({ ...prev, [c.key]: v }));
                }}
                onCommit={v => {
                  savePDI({ [c.key]: v });
                }}
                disabled={!canEdit}
              />
            ))}
          </div>
        </div>

        {/* Behavioral */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border">
          <h3 className="text-base font-semibold text-mx-navy mb-6">Competências Comportamentais</h3>
          <div className="h-64 mb-6 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={256} initialDimension={{ width: 320, height: 256 }}>
              <RadarChart data={behavData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Radar name="Atual" dataKey="value" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                <Radar name="Alvo" dataKey="target" stroke="#22C55E" fill="#22C55E" fillOpacity={0.05} strokeDasharray="5 5" />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {behavCompetencies.map(c => (
              <CompetencySlider
                key={c.key}
                comp={c}
                value={currentPDI[c.key] || 5}
                onChange={v => {
                  setPdi(prev => ({ ...prev, [c.key]: v }));
                }}
                onCommit={v => {
                  savePDI({ [c.key]: v });
                }}
                disabled={!canEdit}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Action Plan */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-semibold text-mx-navy">Plano de Ação</h3>
          {canEdit && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-mx-blue hover:bg-status-info rounded-xl gap-1"><Plus className="w-4 h-4" />Nova Ação</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Ação</DialogTitle></DialogHeader>
              <div className="grid gap-4 mt-4">
                <div><Label>Ação</Label><Input value={newAction.action} onChange={e => setNewAction({ ...newAction, action: e.target.value })} /></div>
                <div><Label>Competência</Label><Input value={newAction.competency} onChange={e => setNewAction({ ...newAction, competency: e.target.value })} /></div>
                <div><Label>Descrição</Label><Textarea value={newAction.description} onChange={e => setNewAction({ ...newAction, description: e.target.value })} className="resize-none" rows={2} /></div>
                <div><Label>Prazo</Label><Input type="date" value={newAction.deadline} onChange={e => setNewAction({ ...newAction, deadline: e.target.value })} /></div>
                <Button onClick={createAction} disabled={!newAction.action || !newAction.competency || !newAction.deadline} className="bg-mx-blue hover:bg-status-info rounded-xl">Criar Ação</Button>
              </div>
            </DialogContent>
          </Dialog>}
        </div>
        {actions.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-10 h-10 text-text-disabled mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma ação cadastrada.</p>
          </div>
        ) : (
          <ScrollableRegion label="Ações do plano de desenvolvimento">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-alt">
                  {["Ação", "Competência", "Prazo", "Status", "Progresso"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {actions.map(a => (
                  <tr key={a.id} className="hover:bg-surface-alt/50">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-mx-navy">{a.action}</p>
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.competency}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground" />{a.deadline}</td>
                    <td className="px-5 py-3.5">
                      <Select disabled={!canEdit} value={a.status} onValueChange={v => updateActionStatus(a.id, v, v === "Concluído" ? 100 : a.progress)}>
                        <SelectTrigger className="h-8 w-[140px] border-0 shadow-none">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[a.status]}`}>{a.status}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                          <SelectItem value="Concluído">Concluído</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5 w-32">
                      <Progress value={a.progress || 0} className="h-2" />
                      <p className="text-mx-micro text-muted-foreground mt-1">{a.progress || 0}%</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableRegion>
        )}
      </div>
    </div>
  );
}
