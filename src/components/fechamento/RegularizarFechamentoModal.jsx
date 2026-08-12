import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, AlertTriangle, CheckCircle2 } from "lucide-react";
import moment from "moment/min/moment-with-locales";

moment.locale("pt-br");

const FIELDS = [
  { key: "leads_carteira", label: "Leads Carteira" },
  { key: "leads_internet", label: "Leads Internet" },
  { key: "atendimentos_showroom", label: "Atendimentos Showroom" },
  { key: "atendimentos_carteira", label: "Atendimentos Carteira" },
  { key: "atendimentos_internet", label: "Atendimentos Internet" },
  { key: "agendamentos_carteira", label: "Agendamentos D+1 Carteira" },
  { key: "agendamentos_internet", label: "Agendamentos D+1 Internet" },
];

function Counter({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border-subtle last:border-0">
      <span className="text-body-sm font-semibold text-[#0F172A]">{label}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-lg border border-border bg-slate-50 hover:bg-slate-100 text-muted-foreground font-bold text-base flex items-center justify-center transition-colors"
        >−</button>
        <span className="w-8 text-center font-bold text-[14px] text-[#0F172A]">{value}</span>
        <button
          onClick={() => onChange(Math.min(999, value + 1))}
          className="w-7 h-7 rounded-lg border border-border bg-slate-50 hover:bg-slate-100 text-muted-foreground font-bold text-base flex items-center justify-center transition-colors"
        >+</button>
      </div>
    </div>
  );
}

export default function RegularizarFechamentoModal({ open, onClose, date, currentUser, onRegularizado }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "success"
  const [form, setForm] = useState({
    leads_carteira: 0, leads_internet: 0,
    atendimentos_showroom: 0, atendimentos_carteira: 0, atendimentos_internet: 0,
    agendamentos_carteira: 0, agendamentos_internet: 0,
  });
  const [salvando, setSalvando] = useState(false);
  const [regularizacaoExistente, setRegularizacaoExistente] = useState(null);

  useEffect(() => {
    if (!open || !date) return;
    setStep("form");
    setSalvando(false);

    // Verificar se já existe regularização para essa data
    Promise.all([
      base44.entities.DailyClose.filter({ date }).catch(() => []),
      base44.entities.RegularizacaoFechamento.filter({ data_competencia: date }).catch(() => []),
    ]).then(([closes, regs]) => {
      const reg = regs[0] || null;
      setRegularizacaoExistente(reg);
      // Pré-popular com dados existentes se houver
      const source = reg || closes[0];
      if (source) {
        setForm({
          leads_carteira: source.leads_carteira || 0,
          leads_internet: source.leads_internet || 0,
          atendimentos_showroom: source.atendimentos_showroom || 0,
          atendimentos_carteira: source.atendimentos_carteira || 0,
          atendimentos_internet: source.atendimentos_internet || 0,
          agendamentos_carteira: source.agendamentos_carteira || 0,
          agendamentos_internet: source.agendamentos_internet || 0,
        });
      } else {
        setForm({ leads_carteira: 0, leads_internet: 0, atendimentos_showroom: 0, atendimentos_carteira: 0, atendimentos_internet: 0, agendamentos_carteira: 0, agendamentos_internet: 0 });
      }
    });
  }, [open, date]);

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleEnviar = async () => {
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const payload = {
        ...form,
        data_competencia: date,
        vendedor_id: currentUser?.id || "",
        vendedor_nome: currentUser?.full_name || "",
        data_hora_envio: agora,
        status_solicitacao: "Pendente",
        tipo_solicitacao: "Regularização de Fechamento",
        contabilizar_no_sistema: false,
        regularizado_fora_do_prazo: true,
        enviado_para_aprovacao: true,
      };

      let reg;
      if (regularizacaoExistente?.id) {
        reg = await base44.entities.RegularizacaoFechamento.update(regularizacaoExistente.id, payload);
      } else {
        reg = await base44.entities.RegularizacaoFechamento.create(payload);
      }

      // Criar/atualizar DailyClose como rascunho (não contabilizado)
      const closes = await base44.entities.DailyClose.filter({ date }).catch(() => []);
      if (closes[0]?.id) {
        await base44.entities.DailyClose.update(closes[0].id, {
          ...form,
          status_regularizacao: "Aguardando Aprovação",
        });
      } else {
        await base44.entities.DailyClose.create({
          date,
          ...form,
          finalizado: false,
          status_regularizacao: "Aguardando Aprovação",
        });
      }

      setStep("success");
      if (onRegularizado) onRegularizado(date, "Aguardando Aprovação");
    } catch (e) {
      console.error(e);
    }
    setSalvando(false);
  };

  if (!open) return null;

  // Status de regularização existente
  const statusReg = regularizacaoExistente?.status_solicitacao;
  const jaEnviado = statusReg === "Pendente";
  const aprovado = statusReg === "Aprovada";
  const recusado = statusReg === "Recusada";

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#005BFF]" />
            Regularizar Fechamento
          </DialogTitle>
        </DialogHeader>

        <div className="mt-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-body-sm font-semibold text-[#0F172A]">
              {moment(date).format("DD/MM/YYYY")}
            </span>
            <span className="text-[12px] text-muted-foreground capitalize">{moment(date).format("dddd")}</span>
            <span className="ml-auto text-caption font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full">
              Fechamento atrasado
            </span>
          </div>

          {/* Se já foi enviado e aguardando */}
          {jaEnviado && step !== "success" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-body-sm font-bold text-amber-800">Aguardando Aprovação</p>
                <p className="text-[12px] text-amber-700 mt-0.5">
                  Você já enviou a regularização deste dia. Ela está aguardando aprovação do responsável.
                </p>
              </div>
            </div>
          )}

          {aprovado && step !== "success" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-body-sm font-bold text-green-800">Regularização já aprovada.</p>
            </div>
          )}

          {recusado && step !== "success" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-body-sm font-bold text-red-700">Regularização recusada.</p>
              {regularizacaoExistente?.motivo_recusa && (
                <p className="text-[12px] text-red-600 mt-1">Motivo: {regularizacaoExistente.motivo_recusa}</p>
              )}
              <p className="text-[12px] text-red-600 mt-1">Você pode enviar uma nova regularização abaixo.</p>
            </div>
          )}

          {/* STEP: form */}
          {step === "form" && !aprovado && (
            <>
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                {FIELDS.map(f => (
                  <Counter
                    key={f.key}
                    label={f.label}
                    value={form[f.key]}
                    onChange={v => setField(f.key, v)}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-body-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="flex-1 py-2.5 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-body-sm font-bold transition-colors"
                >
                  Enviar Regularização
                </button>
              </div>
            </>
          )}

          {/* STEP: confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[14px] font-bold text-amber-900 mb-1">Enviar regularização para aprovação?</p>
                <p className="text-body-sm text-amber-800">
                  Este fechamento foi realizado fora do prazo. Ele será salvo, mas só contará nos indicadores após aprovação do responsável.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-2.5 rounded-xl border border-border text-body-sm font-bold text-muted-foreground hover:bg-slate-50 transition-colors"
                  disabled={salvando}
                >
                  Não, voltar
                </button>
                <button
                  onClick={handleEnviar}
                  className="flex-1 py-2.5 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-body-sm font-bold transition-colors"
                  disabled={salvando}
                >
                  {salvando ? "Enviando..." : "Sim, enviar"}
                </button>
              </div>
            </div>
          )}

          {/* STEP: success */}
          {step === "success" && (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-amber-500" />
              </div>
              <p className="text-body font-bold text-[#0F172A]">Regularização enviada!</p>
              <p className="text-body-sm text-muted-foreground max-w-xs mx-auto">
                O fechamento foi salvo e está aguardando aprovação do responsável. Ele só contará nos indicadores após a aprovação.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-body-sm font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}