/**
 * CoerenciaVendaModal
 *
 * Modais de validação de coerência entre vendas e atendimentos do dia.
 * Exibidos ANTES de salvar definitivamente quando a situação é "Venda realizada".
 *
 * Casos cobertos:
 *   CASO 2 – Venda sem canal informado
 *   CASO 3 – Venda com canal, mas sem atendimento no canal hoje
 *   CASO 5 – Mais vendas que atendimentos no mesmo canal (aviso leve no fechamento)
 */

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Info, Check } from "lucide-react";

// ── Botão reutilizável ────────────────────────────────────────────────────────

function Btn({ onClick, variant = "ghost", disabled, children }) {
  const base = "px-4 py-2.5 text-body-sm font-semibold rounded-xl transition-colors disabled:opacity-50";
  const styles = {
    ghost:    "text-[#64748B] border border-[#E5E7EB] hover:bg-slate-50",
    primary:  "text-white bg-[#6D28D9] hover:bg-purple-700 shadow-sm",
    green:    "text-white bg-[#22C55E] hover:bg-green-600 shadow-sm",
    blue:     "text-white bg-[#005BFF] hover:bg-blue-700 shadow-sm",
    amber:    "text-white bg-[#F59E0B] hover:bg-amber-600 shadow-sm",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]}`}>
      {children}
    </button>
  );
}

// ── CASO 2: Venda sem canal ───────────────────────────────────────────────────

export function ModalSemCanal({ open, canalSugerido, onConfirmarSugestao, onEscolherOutro, onSalvarSemCanal }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [canalEscolhido, setCanalEscolhido] = useState("");
  const CANAIS = ["Showroom", "Carteira", "Internet"];

  if (escolhendo) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold">Escolha o canal da venda</DialogTitle>
          </DialogHeader>
          <p className="text-body-sm text-[#64748B] mt-1">Selecione o canal de origem desta negociação:</p>
          <div className="flex flex-col gap-2 mt-3">
            {CANAIS.map(c => (
              <button
                key={c}
                onClick={() => setCanalEscolhido(c)}
                className={`text-left px-4 py-2.5 rounded-xl border text-body-sm font-semibold transition-colors ${
                  canalEscolhido === c
                    ? "bg-purple-50 border-purple-400 text-[#6D28D9]"
                    : "border-border hover:bg-slate-50 text-[#0F172A]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
            <Btn onClick={() => setEscolhendo(false)}>Voltar</Btn>
            <Btn variant="primary" onClick={() => { if (canalEscolhido) onEscolherOutro(canalEscolhido); }} disabled={!canalEscolhido}>
              Confirmar canal
            </Btn>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-[#005BFF]" />
            Informe o canal da venda
          </DialogTitle>
        </DialogHeader>
        <p className="text-body-sm text-[#64748B] mt-1 leading-relaxed">
          Para manter o fechamento correto, informe de qual canal esta venda se originou.
        </p>
        {canalSugerido && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-body-sm text-[#1e3a5f]">
            Você informou atendimento apenas no <strong>{canalSugerido}</strong>. Deseja classificar esta venda como <strong>{canalSugerido}</strong>?
          </div>
        )}
        <div className="flex flex-col gap-2 mt-4">
          {canalSugerido && (
            <Btn variant="green" onClick={() => onConfirmarSugestao(canalSugerido)}>
              Sim, classificar como {canalSugerido}
            </Btn>
          )}
          <Btn variant="blue" onClick={() => setEscolhendo(true)}>
            Escolher outro canal
          </Btn>
          <Btn onClick={onSalvarSemCanal}>
            Salvar sem canal
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── CASO 3: Venda com canal, sem atendimento no dia ───────────────────────────

export function ModalSemAtendimento({ open, canal, onAtendimentoAnterior, onVincularCarteira, onCorrigir, onSalvarMesmoAssim }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            Venda sem atendimento registrado hoje
          </DialogTitle>
        </DialogHeader>
        <p className="text-body-sm text-[#64748B] mt-1 leading-relaxed">
          Não encontramos atendimento hoje para o canal <strong className="text-[#0F172A]">{canal}</strong>. Esta venda veio de um atendimento anterior?
        </p>
        <p className="text-[12px] text-muted-foreground mt-1">
          No mercado automotivo, é comum o cliente atender em um dia e confirmar a compra em outro — isso é totalmente válido.
        </p>
        <div className="flex flex-col gap-2 mt-4">
          <Btn variant="green" onClick={onAtendimentoAnterior}>
            ✓ Sim, atendimento anterior
          </Btn>
          <Btn variant="blue" onClick={onVincularCarteira}>
            Vincular a cliente existente na Carteira
          </Btn>
          <Btn variant="amber" onClick={onCorrigir}>
            Corrigir canal ou atendimento
          </Btn>
          <Btn onClick={onSalvarMesmoAssim}>
            Salvar mesmo assim
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── CASO 4: Cliente já existe na Carteira (info discreta, não é modal bloqueante) ─

export function AvisoClienteExistente({ nome }) {
  if (!nome) return null;
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[12px] text-[#1e3a5f] mt-2">
      <Info className="w-4 h-4 text-[#005BFF] flex-shrink-0 mt-0.5" />
      <span>
        <strong>{nome}</strong> já existe na Carteira. A venda será vinculada ao histórico anterior.
      </span>
    </div>
  );
}

// ── CASO 5: Mais vendas que atendimentos (aviso ao finalizar) ─────────────────

export function ModalMaisVendasQueAtendimentos({ open, divergencias, onRevisar, onConfirmar }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] font-bold flex items-center gap-2">
            <Info className="w-5 h-5 text-[#005BFF]" />
            Atenção antes de finalizar
          </DialogTitle>
        </DialogHeader>
        <p className="text-body-sm text-[#64748B] mt-1 leading-relaxed">
          Encontramos vendas que não possuem atendimento registrado no mesmo canal hoje. Isso pode acontecer quando a venda veio de um atendimento anterior.
        </p>
        {divergencias?.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {divergencias.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-body-sm text-[#0F172A] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] flex-shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
          <Btn onClick={onRevisar}>Revisar agora</Btn>
          <Btn variant="green" onClick={onConfirmar}>
            <Check className="w-4 h-4 inline mr-1" />
            Confirmar e continuar
          </Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Utilitário: detecta divergências ─────────────────────────────────────────

/**
 * Retorna array de strings descrevendo divergências canal×atendimento.
 * clients: formato compat (sale_status="Sim", channel="Showroom"|"Carteira"|"Internet")
 * dc: DailyClose { atendimentos_showroom, atendimentos_carteira, atendimentos_internet }
 */
export function detectarDivergencias(clients, dc) {
  if (!clients || !dc) return [];
  const atend = {
    Showroom: dc.atendimentos_showroom || 0,
    Carteira: dc.atendimentos_carteira || 0,
    Internet: dc.atendimentos_internet || 0,
  };
  const vendas = { Showroom: 0, Carteira: 0, Internet: 0 };
  clients.filter(c => c.sale_status === "Sim").forEach(c => {
    if (vendas[c.channel] !== undefined) vendas[c.channel]++;
  });

  const msgs = [];
  Object.keys(vendas).forEach(canal => {
    if (vendas[canal] > 0 && atend[canal] === 0) {
      msgs.push(`Venda ${canal} sem atendimento ${canal} registrado hoje.`);
    } else if (vendas[canal] > atend[canal] && atend[canal] > 0) {
      msgs.push(`Você possui mais vendas (${vendas[canal]}) do que atendimentos (${atend[canal]}) no canal ${canal}.`);
    }
  });
  return msgs;
}