import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

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
  green:  { sel: "bg-green-50 border-green-400 text-green-700",    base: "bg-white border-border hover:bg-green-50 hover:border-green-300" },
  red:    { sel: "bg-status-error-surface border-status-error/50 text-status-error-text",          base: "bg-white border-border hover:bg-status-error-surface hover:border-status-error/40" },
  slate:  { sel: "bg-slate-100 border-slate-400 text-foreground",   base: "bg-white border-border hover:bg-slate-50" },
  blue:   { sel: "bg-status-info-surface border-status-info/50 text-status-info-text",       base: "bg-white border-border hover:bg-status-info-surface hover:border-status-info/40" },
  orange: { sel: "bg-status-warning-surface border-orange-400 text-status-warning-text", base: "bg-white border-border hover:bg-status-warning-surface hover:border-status-warning/40" },
  teal:   { sel: "bg-teal-50 border-teal-400 text-teal-700",       base: "bg-white border-border hover:bg-teal-50 hover:border-teal-300" },
  yellow: { sel: "bg-yellow-50 border-yellow-400 text-yellow-700", base: "bg-white border-border hover:bg-yellow-50 hover:border-yellow-300" },
};

export default function RetornoWhatsAppModal({ open, cliente, resultado, onResultado, onIgnorar }) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onIgnorar(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-status-success-text" />
            </div>
            <div>
              <DialogTitle className="text-sm font-black text-mx-navy">
                Como terminou esse contato?
              </DialogTitle>
              {cliente && (
                <p className="text-caption text-muted-foreground">{cliente.nome}</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 mt-1">
          {RESULTADOS_CARDS.map(r => {
            const selecionado = resultado === r.label;
            const cores = COR_MAP[r.cor] || COR_MAP.slate;
            return (
              <button
                key={r.label}
                onClick={() => onResultado(r.label)}
                className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border-2 transition-all ${
                  selecionado ? cores.sel : cores.base
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
          className="w-full rounded-xl text-muted-foreground text-xs mt-1"
        >
          Ignorar
        </Button>
      </DialogContent>
    </Dialog>
  );
}