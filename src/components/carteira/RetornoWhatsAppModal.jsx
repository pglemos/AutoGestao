import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle, CalendarCheck, ArrowLeft } from "lucide-react";
import moment from "moment";

const RESULTADOS_CARDS = [
  { label: "Executado",        emoji: "✅", cor: "green" },
  { label: "Não atendeu",      emoji: "🚫", cor: "red" },
  { label: "Não respondeu",    emoji: "🔕", cor: "slate" },
  { label: "Visita agendada",  emoji: "📅", cor: "blue" },
  { label: "Proposta enviada", emoji: "📋", cor: "orange" },
  { label: "Remarcar",         emoji: "🔄", cor: "teal" },
  { label: "Perdeu interesse", emoji: "❌", cor: "red" },
  { label: "Venda realizada",  emoji: "🏆", cor: "yellow" },
  { label: "Outro",            emoji: "💬", cor: "slate" },
];

const COR_MAP = {
  green:  { sel: "bg-brand-primary-subtle border-brand-primary/40 text-brand-primary-hover", base: "bg-white border-border hover:bg-brand-primary-subtle hover:border-brand-primary/30" },
  red:    { sel: "bg-status-error-surface border-status-error/50 text-status-error-text",          base: "bg-white border-border hover:bg-status-error-surface hover:border-status-error/40" },
  slate:  { sel: "bg-slate-100 border-slate-400 text-foreground",   base: "bg-white border-border hover:bg-slate-50" },
  blue:   { sel: "bg-status-info-surface border-status-info/50 text-status-info-text",       base: "bg-white border-border hover:bg-status-info-surface hover:border-status-info/40" },
  orange: { sel: "bg-status-warning-surface border-orange-400 text-status-warning-text", base: "bg-white border-border hover:bg-status-warning-surface hover:border-status-warning/40" },
  teal:   { sel: "bg-brand-primary-subtle border-brand-primary/40 text-brand-primary", base: "bg-white border-border hover:bg-brand-primary-subtle hover:border-brand-primary/30" },
  yellow: { sel: "bg-status-warning-surface border-status-warning/50 text-status-warning-text", base: "bg-white border-border hover:bg-status-warning-surface hover:border-status-warning/40" },
};

const MODALIDADES = ["Visita na loja", "Atendimento externo", "Videochamada"];

export default function RetornoWhatsAppModal({ open, cliente, resultado, saving = false, onResultado, onIgnorar }) {
  const [selecionado, setSelecionado] = useState("");
  const [emAgendamento, setEmAgendamento] = useState(false);
  const [dataHora, setDataHora] = useState("");
  const [modalidade, setModalidade] = useState("Visita na loja");
  const [veiculo, setVeiculo] = useState("");

  useEffect(() => {
    if (open) {
      setSelecionado(resultado || "");
      setEmAgendamento(false);
      const defaultData = moment().add(1, "day").set({ hour: 10, minute: 0 }).format("YYYY-MM-DDTHH:mm");
      setDataHora(cliente?.visita_agendada_em ? String(cliente.visita_agendada_em).slice(0, 16) : defaultData);
      setModalidade(cliente?.preferencia_modalidade || cliente?.modalidade || "Visita na loja");
      setVeiculo(cliente?.veiculo_interesse || "");
    }
  }, [open, resultado, cliente]);

  function handleCardClick(label) {
    if (label === "Visita agendada" || label === "Remarcar") {
      setSelecionado(label);
      setEmAgendamento(true);
    } else {
      if (!saving) onResultado(label);
    }
  }

  function handleConfirmarAgendamento() {
    if (!dataHora || saving) return;
    onResultado({
      resultado: selecionado,
      dataVisita: dataHora,
      modalidade,
      veiculo: veiculo.trim() || cliente?.veiculo_interesse || "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !saving) onIgnorar(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-brand-primary-subtle flex items-center justify-center">
              {emAgendamento ? <CalendarCheck className="w-4 h-4 text-status-info-text" /> : <MessageCircle className="w-4 h-4 text-status-success-text" />}
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-mx-navy">
                {emAgendamento ? "Data e horário do agendamento" : "Como terminou esse contato?"}
              </DialogTitle>
              {cliente && (
                <p className="text-caption text-muted-foreground">{cliente.nome}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        {!emAgendamento ? (
          <>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {RESULTADOS_CARDS.map(r => {
                const isSel = selecionado === r.label;
                const cores = COR_MAP[r.cor] || COR_MAP.slate;
                return (
                  <button
                    key={r.label}
                    onClick={() => handleCardClick(r.label)}
                    disabled={saving}
                    className={`flex min-h-11 flex-col items-center gap-1 px-2 py-3 rounded-2xl border-2 transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      isSel ? cores.sel : cores.base
                    }`}
                  >
                    <span className="text-2xl leading-none">{r.emoji}</span>
                    <span className="text-caption font-semibold text-center leading-tight">{r.label}</span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              onClick={onIgnorar}
              disabled={saving}
              className="min-h-11 w-full rounded-xl text-muted-foreground text-xs mt-1"
            >
              Ignorar
            </Button>
          </>
        ) : (
          <div className="space-y-3.5 mt-1">
            <div>
              <label htmlFor="retorno-data-agendamento" className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Data e Hora do Agendamento *
              </label>
              <input
                id="retorno-data-agendamento"
                type="datetime-local"
                value={dataHora}
                onChange={e => setDataHora(e.target.value)}
                disabled={saving}
                className="w-full min-h-11 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-status-info/40 font-medium"
              />
            </div>

            <div>
              <label htmlFor="retorno-modalidade" className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Modalidade *
              </label>
              <select
                id="retorno-modalidade"
                value={modalidade}
                onChange={e => setModalidade(e.target.value)}
                disabled={saving}
                className="w-full min-h-11 rounded-xl border border-input bg-white px-3 text-sm"
              >
                {MODALIDADES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="retorno-veiculo" className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Veículo de Interesse
              </label>
              <input
                id="retorno-veiculo"
                type="text"
                value={veiculo}
                onChange={e => setVeiculo(e.target.value.toUpperCase())}
                placeholder="Ex: HB20 1.0 COMFORT"
                disabled={saving}
                className="w-full min-h-11 rounded-xl border border-input bg-white px-3 text-sm font-medium"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setEmAgendamento(false)}
                disabled={saving}
                className="min-h-11 flex-1 rounded-xl text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Voltar
              </Button>
              <Button
                onClick={handleConfirmarAgendamento}
                disabled={!dataHora || saving}
                className="min-h-11 flex-1 rounded-xl bg-status-info hover:bg-status-info text-white text-xs font-bold"
              >
                {saving ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
