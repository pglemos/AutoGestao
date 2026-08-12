import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import moment from "moment";
import { TODOS_PASSOS, detectarCodigo } from "@/features/carteira-clientes/lib/proximoPassoMx";
import { toast } from "@/components/ui/use-toast";

// Monta mapa de objetivo a partir da biblioteca
const OBJETIVO_MAP = Object.fromEntries(TODOS_PASSOS.map(p => [p.label, p.objetivo]));

// ─── MAPEAMENTO PENDÊNCIA → SUGESTÃO ─────────────────────────────────────────
const PENDENCIA_PARA_SUGESTAO = {
  "Definir forma de pagamento":   "Simular financiamento",
  "Confirmar orçamento":          "Simular financiamento",
  "Entender se possui troca":     "Avaliar usado",
  "Agendar visita":               "Agendar visita ou videochamada",
  "Confirmar visita":             "Confirmar agendamento",
  "Retomar proposta":             "Fazer follow-up de decisão",
  "Resolver objeção de preço":    "Trabalhar objeção",
  "Resolver avaliação do usado":  "Avaliar usado",
  "Recuperar contato":            "Retomar contato",
  "Registrar próximo passo":      null,
  "Revisar condição de financiamento": "Trabalhar objeção",
};

export default function AlterarProximoPasso({ open, onClose, cliente, pendencias = [], onSalvo }) {
  const hoje = moment().format("YYYY-MM-DD");

  const [passo, setPasso] = useState("");
  const [dataStr, setDataStr] = useState(hoje);
  const [horario, setHorario] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Reset ao abrir, com prefill se vier da pendência
  useEffect(() => {
    if (open) {
      const prefill = cliente?._prefill || null;
      const passoInicial = prefill ? (PENDENCIA_PARA_SUGESTAO[prefill] || "") : "";
      setPasso(passoInicial);
      setDataStr(hoje);
      setHorario("");
      setObjetivo(passoInicial ? (OBJETIVO_MAP[passoInicial] || "") : "");
      setObservacao("");
    }
  }, [open]);

  // Preenche objetivo automaticamente
  useEffect(() => {
    if (passo && passo !== "Outro") {
      setObjetivo(OBJETIVO_MAP[passo] || "");
    } else if (passo === "Outro") {
      setObjetivo("");
    }
  }, [passo]);

  // Sugestões baseadas em pendências (até 3)
  const sugestoes = pendencias
    .map(p => PENDENCIA_PARA_SUGESTAO[p])
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 3);

  // Parser de data — aceita "30" como dia do mês atual
  function parsearData(raw) {
    if (!raw) return null;
    const numerico = raw.trim();
    if (/^\d{1,2}$/.test(numerico)) {
      const dia = parseInt(numerico, 10);
      const ref = moment().date(dia);
      if (ref.isValid() && dia >= 1 && dia <= 31) return ref.format("YYYY-MM-DD");
    }
    const m = moment(numerico, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
    return m.isValid() ? m.format("YYYY-MM-DD") : null;
  }

  const dataSalvar = parsearData(dataStr);

  const precisaData = passo !== "Aguardar retorno";
  const podeSalvar = !!passo && (precisaData ? !!dataSalvar : true);

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true);
    const passoAnterior = cliente.proximo_passo || "—";
    const dataFinal = dataSalvar;
    const dataHoraFinal = dataFinal && horario
      ? `${dataFinal}T${horario}:00`
      : dataFinal
      ? `${dataFinal}T00:00:00`
      : null;

    const update = {
      proximo_passo: passo === "Outro" ? (observacao || passo) : passo,
      objetivo_atual: objetivo || OBJETIVO_MAP[passo] || "",
      proxima_acao_data: dataHoraFinal,
    };

    if (passo === "Confirmar visita" && !cliente.visita_agendada_em && dataHoraFinal) {
      update.visita_agendada_em = dataHoraFinal;
    }

    const descHistorico = [
      `Próximo passo alterado.`,
      `De: ${passoAnterior}`,
      `Para: ${update.proximo_passo}`,
      dataFinal ? `Data: ${moment(dataFinal).format("DD/MM/YYYY")}${horario ? " às " + horario : ""}` : "Sem data definida",
      observacao ? `Obs: ${observacao}` : "",
    ].filter(Boolean).join(" | ");

    update.historico = {
      tipo: "Próximo passo alterado",
      descricao: descHistorico,
      resultado: update.proximo_passo,
    };

    let persistido;
    try {
      persistido = await base44.entities.CarteiraCliente.update(cliente.id, update);
    } catch (error) {
      toast({
        title: "Não foi possível alterar o próximo passo.",
        description: "Os campos foram preservados. Tente novamente.",
        variant: "destructive",
      });
      return;
    } finally {
      setSalvando(false);
    }

    onSalvo(persistido);
  }

  if (!cliente) return null;
  const situacao = cliente.situacao_atual || cliente.momento || "—";

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#031B3D] font-black">Alterar próximo passo</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Defina o que precisa acontecer para esta oportunidade evoluir.</p>
        </DialogHeader>

        {/* Info do cliente */}
        <div className="bg-slate-50 rounded-xl px-3 py-2.5 space-y-0.5">
          <p className="text-sm font-bold text-[#031B3D]">{cliente.nome}</p>
          {cliente.veiculo_interesse && <p className="text-xs text-muted-foreground">{cliente.veiculo_interesse}</p>}
          <p className="text-xs text-muted-foreground">{situacao}</p>
          {cliente.proximo_passo && (
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-semibold">Mentor recomenda:</span>{" "}
              {detectarCodigo(cliente.proximo_passo) ? `${detectarCodigo(cliente.proximo_passo)} · ` : ""}{cliente.proximo_passo}
            </p>
          )}
        </div>

        {/* Sugestões do MX */}
        {sugestoes.length > 0 && (
          <div>
            <p className="text-caption font-black text-status-info-text uppercase tracking-wide mb-2">Sugestões do MX</p>
            <div className="flex flex-wrap gap-1.5">
              {sugestoes.map(s => (
                <button
                  key={s}
                  onClick={() => setPasso(s)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    passo === s
                      ? "bg-[#005BFF] text-white border-[#005BFF]"
                      : "bg-status-info-surface text-status-info-text border-status-info/30 hover:bg-status-info-surface"
                  }`}
                >
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Seleção de próximo passo — Biblioteca v1 */}
        <div>
          <label className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Mentor recomenda — escolha o próximo passo *</label>
          <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
            {TODOS_PASSOS.map(p => (
              <button
                key={p.codigo}
                onClick={() => setPasso(p.label)}
                className={`text-left text-xs font-semibold px-3 py-2.5 rounded-xl border transition-all flex items-start gap-2 ${
                  passo === p.label
                    ? "bg-[#005BFF] text-white border-[#005BFF]"
                    : "bg-white text-muted-foreground border-border hover:border-status-info/40 hover:bg-status-info-surface/50"
                }`}
              >
                <span className={`text-caption font-black shrink-0 mt-0.5 ${passo === p.label ? "text-blue-200" : "text-muted-foreground"}`}>{p.codigo}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Data */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Data do próximo passo {precisaData ? "*" : "(opcional)"}
            </label>
            <input
              type="date"
              value={dataStr}
              onChange={e => setDataStr(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
            />
            <p className="text-caption text-muted-foreground mt-1">Ou digite só o dia: ex. 30</p>
          </div>
          <div>
            <label className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Horário (opcional)</label>
            <input
              type="time"
              value={horario}
              onChange={e => setHorario(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
            />
          </div>
        </div>

        {/* Objetivo */}
        <div>
          <label className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">Objetivo</label>
          <input
            value={objetivo}
            onChange={e => setObjetivo(e.target.value)}
            placeholder="Preenchido automaticamente..."
            className="w-full h-9 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
          />
        </div>

        {/* Observação */}
        <div>
          <label className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            {passo === "Pedir sinal de negócio" ? "Valor ou condição combinada (opcional)" : "Observação (opcional)"}
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
            placeholder={passo === "Pedir sinal de negócio" ? "Ex: sinal de R$ 2.000..." : "Detalhes adicionais..."}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
          />
        </div>

        {/* Botões */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl" disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={salvar}
            disabled={!podeSalvar || salvando}
            className="flex-1 rounded-xl bg-[#005BFF] hover:bg-status-info text-white"
          >
            {salvando ? "Salvando..." : "Salvar próximo passo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
