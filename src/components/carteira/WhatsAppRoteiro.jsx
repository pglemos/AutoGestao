import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  calcularObjetivoEProximoPasso, getScriptOficial, getScriptParaMissao,
  preencherScript,
} from "./carteiraUtils";
import {
  getResultados, aplicarTransicao, detectarCodigo, PASSOS, resultadoExigeAgendamento,
} from "@/features/carteira-clientes/lib/proximoPassoMx";
import ScriptIA from "./ScriptIA";
import { toast } from "@/lib/toast";
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/currency-mask";
import moment from "moment";

const COR_MAP = {
  green:  { sel: "bg-brand-primary-subtle border-brand-primary/40 text-brand-primary-hover", base: "bg-white border-border hover:bg-brand-primary-subtle hover:border-brand-primary/30" },
  red:    { sel: "bg-status-error-surface border-status-error/50 text-status-error-text",          base: "bg-white border-border hover:bg-status-error-surface hover:border-status-error/40" },
  slate:  { sel: "bg-slate-100 border-slate-400 text-foreground",   base: "bg-white border-border hover:bg-slate-50" },
  blue:   { sel: "bg-status-info-surface border-status-info/50 text-status-info-text",       base: "bg-white border-border hover:bg-status-info-surface hover:border-status-info/40" },
  orange: { sel: "bg-status-warning-surface border-orange-400 text-status-warning-text", base: "bg-white border-border hover:bg-status-warning-surface hover:border-status-warning/40" },
  teal:   { sel: "bg-brand-primary-subtle border-brand-primary/40 text-brand-primary", base: "bg-white border-border hover:bg-brand-primary-subtle hover:border-brand-primary/30" },
  yellow: { sel: "bg-status-warning-surface border-status-warning/50 text-status-warning-text", base: "bg-white border-border hover:bg-status-warning-surface hover:border-status-warning/40" },
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

  // Campos específicos de venda
  const [veiculoComprado, setVeiculoComprado] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [dataVenda, setDataVenda] = useState("");
  const [placaVeiculo, setPlacaVeiculo] = useState("");
  const [financiamento, setFinanciamento] = useState("Não se aplica");
  const [dataEntregaPrevista, setDataEntregaPrevista] = useState("");

  const { objetivo, proximoPasso } = cliente ? calcularObjetivoEProximoPasso(cliente) : { objetivo: "", proximoPasso: "" };
  const situacao = cliente?.situacao_atual || cliente?.momento || "—";

  // Próximo passo salvo no banco tem prioridade sobre o calculado
  const passoAtual = cliente?.proximo_passo || proximoPasso;
  const codigoPasso = detectarCodigo(passoAtual);
  const passoInfo = codigoPasso ? PASSOS[codigoPasso] : null;
  const objetivoAtual = cliente?.objetivo_atual || passoInfo?.objetivo || objetivo;

  // FONTE ÚNICA: se houver missão/campanha ativa usa o script da missão; senão o script oficial
  const scriptMissao = (cliente && missaoId) ? getScriptParaMissao(missaoId, cliente) : null;
  const scriptOficial = cliente ? getScriptOficial(cliente) : null;
  const scriptPreenchido = scriptMissao || (scriptOficial?.scriptReady ? scriptOficial.texto : "");

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

      // Inicializa dados da venda com base no cliente existente
      const valorBase = cliente?.valor_venda || cliente?.valor_negociado || "";
      setValorVenda(valorBase ? formatCurrencyInput(String(valorBase)) : "");
      setVeiculoComprado(cliente?.veiculo_comprado || cliente?.veiculo_interesse || "");
      setDataVenda(moment().format("YYYY-MM-DD"));
      setPlacaVeiculo(cliente?.placa_veiculo || "");
      setFinanciamento(cliente?.financiamento || "Não se aplica");
      setDataEntregaPrevista(cliente?.data_entrega_prevista ? String(cliente.data_entrega_prevista).slice(0, 16) : "");

      if (cliente?.id) {
        base44.entities.CarteiraHistorico.filter({ cliente_id: cliente.id }, "-created_date", 5)
          .then(h => setHistorico(h || []))
          .catch(() => {});
      }
    }
  }, [open, cliente, autoExpandirRegistro]);

  const precisaMotivo = resultado === "Perdeu interesse" || resultado === "Definitivamente perdido";
  const precisaDataVisita = resultadoExigeAgendamento(resultado);
  const isVenda = resultado === "Venda realizada" || resultado === "Comprou" || resultado === "Venda concluída";
  const vendaInvalida = isVenda && (!veiculoComprado?.trim() || !valorVenda || parseCurrencyInput(valorVenda) <= 0 || !dataVenda);

  function registrarSaidaWhatsApp() {
    if (!cliente) return;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(WA_KEY, JSON.stringify({
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        proximoPasso: passoAtual,
        ts: Date.now(),
        origem: "script_ia_whatsapp",
      }));
    }
  }

  async function registrar() {
    if (!resultado || !cliente) return;
    if (precisaDataVisita && !novaDataVisita) return;
    if (vendaInvalida) return;
    setSalvando(true);
    const { patch, novoPassoLabel, criarAgendamento } = aplicarTransicao(passoAtual, resultado);

    if (motivoPerda) patch.motivo_perda = motivoPerda;
    // A RPC transacional já cria ou atualiza o agendamento. Criar também uma
    // AtividadeExecucao gerava um segundo registro em agendamentos.
    if (novaDataVisita && criarAgendamento) patch.visita_agendada_em = novaDataVisita;

    if (isVenda) {
      const parsedValor = parseCurrencyInput(valorVenda);
      patch.veiculo_comprado = veiculoComprado?.trim() || cliente.veiculo_interesse;
      patch.veiculo_interesse = veiculoComprado?.trim() || cliente.veiculo_interesse;
      patch.valor_venda = parsedValor;
      patch.valor_negociado = parsedValor;
      patch.data_venda = dataVenda || moment().format("YYYY-MM-DD");
      if (placaVeiculo?.trim()) patch.placa_veiculo = placaVeiculo.trim().toUpperCase();
      if (financiamento) patch.financiamento = financiamento;
      if (dataEntregaPrevista) patch.data_entrega_prevista = dataEntregaPrevista;
      patch.situacao_atual = "Venda realizada";
      patch.status_comercial = "Vendido";
      patch.status_oportunidade = "Vendida";
      patch.vendido = true;
      patch.etapa = "ganho";
      patch.ativo = false;
      patch.proximo_passo = null;
      patch.proxima_acao = null;
      patch.proxima_acao_data = null;
    }

    patch.historico = {
      tipo: isVenda ? "Venda realizada" : "Resultado registrado",
      descricao: isVenda
        ? `Venda concluída: ${veiculoComprado || cliente.veiculo_interesse || "Veículo"} por ${valorVenda || "R$ 0,00"}.${placaVeiculo ? ` Placa: ${placaVeiculo}.` : ""}${observacao ? " " + observacao : ""}`
        : `Passo executado: ${passoAtual}. Resultado: ${resultado}.${observacao ? " " + observacao : ""}${novoPassoLabel ? ` → Próximo: ${novoPassoLabel}` : ""}`,
      resultado,
      momento_anterior: situacao,
      momento_novo: patch.situacao_atual || situacao,
    };

    let persistido;
    try {
      persistido = await base44.entities.CarteiraCliente.update(cliente.id, patch);
    } catch (error) {
      toast.error("Não foi possível registrar o resultado.", { description: "Seus dados foram preservados. Tente novamente." });
      return;
    } finally {
      setSalvando(false);
    }

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(WA_KEY);
    }
    onResultadoRegistrado(persistido);
    onClose();
  }

  const tel = (cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, "");

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-mx-navy font-black flex items-center gap-2">
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
                  <p className="text-xs font-bold text-mx-navy">
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
              missaoId={missaoId}
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
                ? "bg-status-info text-status-info-foreground border-status-info"
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

              {/* Dados da Venda Concluída */}
              {isVenda && (
                <div className="space-y-3 p-3.5 bg-brand-primary-subtle border border-brand-primary/30 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-xs font-black text-brand-primary-hover uppercase tracking-wide">
                    <span>🏆</span> Dados da Venda Concluída
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Veículo Vendido *</label>
                      <input
                        value={veiculoComprado}
                        onChange={e => setVeiculoComprado(e.target.value.toUpperCase())}
                        placeholder="Ex: T-CROSS HIGHLINE 2024"
                        className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Valor da Venda *</label>
                      <input
                        value={valorVenda}
                        onChange={e => setValorVenda(formatCurrencyInput(e.target.value))}
                        placeholder="R$ 68.900,00"
                        className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Data da Venda *</label>
                      <input
                        type="date"
                        value={dataVenda}
                        onChange={e => setDataVenda(e.target.value)}
                        className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Placa do Veículo</label>
                      <input
                        value={placaVeiculo}
                        onChange={e => setPlacaVeiculo(e.target.value.toUpperCase())}
                        placeholder="Ex: ABC-1234"
                        maxLength={8}
                        className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Financiamento</label>
                      <select
                        value={financiamento}
                        onChange={e => setFinanciamento(e.target.value)}
                        className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm"
                      >
                        <option value="Não se aplica">Não se aplica</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Em análise">Em análise</option>
                        <option value="Recusado">Recusado</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Previsão de Entrega</label>
                      <input
                        type="datetime-local"
                        value={dataEntregaPrevista}
                        onChange={e => setDataEntregaPrevista(e.target.value)}
                        className="w-full h-9 rounded-xl border border-input bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40"
                      />
                    </div>
                  </div>
                </div>
              )}

              {precisaMotivo && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Motivo da perda</p>
                  <input
                    value={motivoPerda}
                    onChange={e => setMotivoPerda(e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40"
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
                    className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info/40"
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
                  className="w-full rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-status-info/40"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
                <Button
                  onClick={registrar}
                  disabled={!resultado || salvando || (precisaMotivo && !motivoPerda) || (precisaDataVisita && !novaDataVisita) || (isVenda && vendaInvalida)}
                  className={`flex-1 rounded-xl ${isVenda ? "bg-status-success hover:bg-status-success text-white" : "bg-status-info text-status-info-foreground"}`}
                >
                  {salvando ? "Salvando..." : isVenda ? "Confirmar venda" : "Registrar resultado"}
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
