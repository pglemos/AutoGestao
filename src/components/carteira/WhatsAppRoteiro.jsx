import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  calcularObjetivoEProximoPasso, getScriptOficial,
  preencherScript,
} from "./carteiraUtils";
import {
  getResultados, aplicarTransicao, detectarCodigo, PASSOS,
} from "@/features/carteira-clientes/lib/proximoPassoMx";
import ScriptIA from "./ScriptIA";
import { toast } from "@/components/ui/use-toast";

const COR_MAP = {
  green:  { sel: "bg-green-50 border-green-400 text-green-700",    base: "bg-white border-border hover:bg-green-50 hover:border-green-300" },
  red:    { sel: "bg-status-error-surface border-status-error/50 text-status-error-text",          base: "bg-white border-border hover:bg-status-error-surface hover:border-status-error/40" },
  slate:  { sel: "bg-slate-100 border-slate-400 text-foreground",   base: "bg-white border-border hover:bg-slate-50" },
  blue:   { sel: "bg-status-info-surface border-status-info/50 text-status-info-text",       base: "bg-white border-border hover:bg-status-info-surface hover:border-status-info/40" },
  orange: { sel: "bg-status-warning-surface border-orange-400 text-status-warning-text", base: "bg-white border-border hover:bg-status-warning-surface hover:border-status-warning/40" },
  teal:   { sel: "bg-teal-50 border-teal-400 text-teal-700",       base: "bg-white border-border hover:bg-teal-50 hover:border-teal-300" },
  yellow: { sel: "bg-yellow-50 border-yellow-400 text-yellow-700", base: "bg-white border-border hover:bg-yellow-50 hover:border-yellow-300" },
};

// Chave no sessionStorage para detecção de retorno do WhatsApp
const WA_KEY = "mx_wa_saida";

export default function WhatsAppRoteiro({ open, onClose, cliente, missaoId, onResultadoRegistrado, autoExpandirRegistro }) {
  const [resultado, setResultado] = useState("");
  const [motivoPerda, setMotivoPerda] = useState("");
  const [novaDataVisita, setNovaDataVisita] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState([]);
  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  const { objetivo, proximoPasso } = cliente ? calcularObjetivoEProximoPasso(cliente) : { objetivo: "", proximoPasso: "" };
  const situacao = cliente?.situacao_atual || cliente?.momento || "—";

  // Próximo passo salvo no banco tem prioridade sobre o calculado
  const passoAtual = cliente?.proximo_passo || proximoPasso;
  const codigoPasso = detectarCodigo(passoAtual);
  const passoInfo = codigoPasso ? PASSOS[codigoPasso] : null;
  const objetivoAtual = cliente?.objetivo_atual || passoInfo?.objetivo || objetivo;

  // FONTE ÚNICA: os 77 scripts oficiais. Os getters legados devolvem null desde a
  // remoção da biblioteca paralela; quando o oficial não está pronto, não existe
  // texto substituto — o ScriptIA exibe o motivo e o envio fica bloqueado.
  const scriptOficial = cliente ? getScriptOficial(cliente) : null;
  const scriptPreenchido = scriptOficial?.scriptReady ? scriptOficial.texto : "";

  // Resultados contextuais baseados no passo atual
  const resultadosDisponiveis = getResultados(passoAtual);

  useEffect(() => {
    if (open) {
      setResultado("");
      setMotivoPerda("");
      setNovaDataVisita("");
      setObservacao("");
      setMostrarRegistro(!!autoExpandirRegistro);
      setHistorico([]);
      if (cliente?.id) {
        base44.entities.CarteiraHistorico.filter({ cliente_id: cliente.id }, "-created_date", 5)
          .then(h => setHistorico(h || []))
          .catch(() => {});
      }
    }
  }, [open, cliente?.id, autoExpandirRegistro]);

  const precisaMotivo = resultado === "Perdeu interesse" || resultado === "Definitivamente perdido";
  const precisaDataVisita = resultado === "Agendou visita" || resultado === "Prefere videochamada" || resultado === "Pediu para remarcar";

  function registrarSaidaWhatsApp() {
    if (!cliente) return;
    sessionStorage.setItem(WA_KEY, JSON.stringify({
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      proximoPasso: passoAtual,
      ts: Date.now(),
      origem: "script_ia_whatsapp",
    }));
  }

  async function registrar() {
    if (!resultado || !cliente) return;
    if (precisaDataVisita && !novaDataVisita) return;
    setSalvando(true);
    const { patch, novoPassoLabel, criarAgendamento } = aplicarTransicao(passoAtual, resultado);

    if (motivoPerda) patch.motivo_perda = motivoPerda;
    // A RPC transacional já cria ou atualiza o agendamento. Criar também uma
    // AtividadeExecucao gerava um segundo registro em agendamentos.
    if (novaDataVisita && criarAgendamento) patch.visita_agendada_em = novaDataVisita;

    patch.historico = {
      tipo: "Resultado registrado",
      descricao: `Passo executado: ${passoAtual}. Resultado: ${resultado}.${observacao ? " " + observacao : ""}${novoPassoLabel ? ` → Próximo: ${novoPassoLabel}` : ""}`,
      resultado,
      momento_anterior: situacao,
      momento_novo: patch.situacao_atual || situacao,
    };

    let persistido;
    try {
      persistido = await base44.entities.CarteiraCliente.update(cliente.id, patch);
    } catch (error) {
      toast({
        title: "Não foi possível registrar o resultado.",
        description: "Seus dados foram preservados. Tente novamente.",
        variant: "destructive",
      });
      return;
    } finally {
      setSalvando(false);
    }

    sessionStorage.removeItem(WA_KEY);
    onResultadoRegistrado(persistido);
    onClose();
  }

  const tel = (cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, "");

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#031B3D] font-black flex items-center gap-2">
            <Zap className="w-4 h-4 text-status-info-text" />
            Executar próximo passo
          </DialogTitle>
          {cliente && (
            <div className="space-y-1 pt-1">
              <p className="text-sm font-bold text-foreground">{cliente.nome}</p>
              {cliente.veiculo_interesse && (
                <p className="text-xs text-muted-foreground">{cliente.veiculo_interesse}</p>
              )}
              <div className="flex gap-4 pt-1">
                <div>
                  <p className="text-caption text-muted-foreground font-bold uppercase tracking-wide">Objetivo</p>
                  <p className="text-xs font-semibold text-foreground">{objetivoAtual}</p>
                </div>
                <div>
                  <p className="text-caption text-status-info-text font-bold uppercase tracking-wide">Mentor recomenda</p>
                  <p className="text-xs font-bold text-[#031B3D]">
                    {codigoPasso ? `${codigoPasso} · ` : ""}{passoAtual}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Script IA — recolhe ao abrir registro */}
          {!mostrarRegistro && (
            <ScriptIA
              cliente={cliente}
              objetivo={objetivoAtual}
              proximoPasso={passoAtual}
              scriptPadrao={scriptPreenchido}
              historico={historico}
              onWhatsAppClick={registrarSaidaWhatsApp}
            />
          )}

          {/* Toggle Registrar Resultado */}
          <button
            onClick={() => setMostrarRegistro(v => !v)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
              mostrarRegistro
                ? "bg-[#005BFF] text-white border-[#005BFF]"
                : "bg-white text-muted-foreground border-border hover:bg-status-info-surface hover:border-status-info/40"
            }`}
          >
            <span className="text-sm font-semibold">
              {resultado ? `Resultado: ${resultado}` : "Registrar resultado do contato"}
            </span>
            {mostrarRegistro
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />
            }
          </button>

          {/* Painel de Registro */}
          {mostrarRegistro && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">
                  Registrar resultado — {codigoPasso ? `${codigoPasso}: ${passoAtual}` : passoAtual}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {resultadosDisponiveis.map(r => {
                    const selecionado = resultado === r.label;
                    const cores = COR_MAP[r.cor] || COR_MAP.slate;
                    return (
                      <button
                        key={r.label}
                        onClick={() => setResultado(selecionado ? "" : r.label)}
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
              </div>

              {precisaMotivo && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Motivo da perda</p>
                  <input
                    value={motivoPerda}
                    onChange={e => setMotivoPerda(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
                  />
                </div>
              )}

              {precisaDataVisita && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Data e hora da visita / videochamada</p>
                  <input
                    type="datetime-local"
                    value={novaDataVisita}
                    onChange={e => setNovaDataVisita(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
                  />
                </div>
              )}

              <div>
                <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1">Observação (opcional)</p>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Detalhes do contato..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
                <Button
                  onClick={registrar}
                  disabled={!resultado || salvando || (precisaMotivo && !motivoPerda) || (precisaDataVisita && !novaDataVisita)}
                  className="flex-1 rounded-xl bg-[#005BFF] hover:bg-status-info text-white"
                >
                  {salvando ? "Salvando..." : "Registrar resultado"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { WA_KEY };
