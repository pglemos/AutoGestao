import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Copy, Check, ChevronRight, SkipForward } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getScriptOficial, preencherScript, resultadoParaMomento, calcularProximaAcao, RESULTADOS, normalizarTelefoneWhatsApp } from "./carteiraUtils";

export default function ExecucaoMissao({ missao, clientes, onVoltar, onConcluida }) {
  const [indice, setIndice] = useState(missao?.indice_atual || 0);
  const [enviados, setEnviados] = useState(missao?.mensagens_enviadas || 0);
  const [pulados, setPulados] = useState(missao?.pulados || 0);
  const [concluidos, setConcluidos] = useState(missao?.concluidos || 0);
  const [visitasAgendadas, setVisitasAgendadas] = useState(missao?.visitas_agendadas || 0);
  const [propostasSolicitadas, setPropostasSolicitadas] = useState(missao?.propostas_solicitadas || 0);
  const [semInteresse, setSemInteresse] = useState(missao?.sem_interesse || 0);
  const [naoResponderam, setNaoResponderam] = useState(missao?.nao_responderam || 0);
  const [copiado, setCopiado] = useState(false);
  const [scriptEditado, setScriptEditado] = useState("");
  const [etapa, setEtapa] = useState("enviando"); // "enviando" | "resultado" | "resumo"
  const [resultado, setResultado] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [persistindo, setPersistindo] = useState(false);
  const [erro, setErro] = useState("");

  const total = clientes.length;
  const clienteAtual = clientes[indice];
  const progresso = total > 0 ? Math.round(((enviados + pulados) / total) * 100) : 0;

  // FONTE ÚNICA: script oficial do cliente da vez. O fallback antigo devolvia
  // "Enviar primeira abordagem" para qualquer missão sem script, disparando
  // abordagem inicial dentro de uma campanha de recuperação.
  const scriptOficial = clienteAtual ? getScriptOficial(clienteAtual) : null;
  const scriptPreenchido = scriptOficial?.scriptReady ? scriptOficial.texto : "";
  const script = scriptEditado || scriptPreenchido;
  const tel = normalizarTelefoneWhatsApp(clienteAtual?.whatsapp || "");
  const waUrl = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(script)}` : null;

  async function persistirMissao(patch) {
    if (!missao?.id) return false;
    setPersistindo(true);
    try {
      await base44.entities.CarteiraMissao.update(missao.id, patch);
      setErro("");
      return true;
    } catch (error) {
      setErro("Não foi possível salvar o progresso da missão. Tente novamente.");
      return false;
    } finally {
      setPersistindo(false);
    }
  }

  useEffect(() => {
    if (etapa !== "resumo") return;
    persistirMissao({
      status: "Aguardando respostas",
      indice_atual: Math.min(indice, Math.max(total - 1, 0)),
      mensagens_enviadas: enviados,
      pulados,
      concluidos,
      visitas_agendadas: visitasAgendadas,
      propostas_solicitadas: propostasSolicitadas,
      sem_interesse: semInteresse,
      nao_responderam: naoResponderam,
      aguardando_resposta: enviados,
    });
  }, [etapa]);

  function copiar() {
    navigator.clipboard.writeText(script);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function avancar() {
    setScriptEditado("");
    setResultado("");
    setEtapa("enviando");
    if (indice + 1 >= total) {
      setEtapa("resumo");
    } else {
      setIndice(i => i + 1);
    }
  }

  async function marcarEnviado() {
    const next = enviados + 1;
    const persisted = await persistirMissao({
      status: "Enviando mensagens",
      mensagens_enviadas: next,
      indice_atual: indice,
      item: {
        cliente_id: clienteAtual.id,
        status: "Mensagem enviada",
      },
    });
    if (!persisted) return;
    setEnviados(next);
    setEtapa("resultado");
  }

  async function pularCliente() {
    const next = pulados + 1;
    const nextIndex = Math.min(indice + 1, Math.max(total - 1, 0));
    const persisted = await persistirMissao({
      status: "Enviando mensagens",
      pulados: next,
      indice_atual: nextIndex,
      item: {
        cliente_id: clienteAtual.id,
        status: "Pulado",
      },
    });
    if (!persisted) return;
    setPulados(next);
    avancar();
    if (indice + 1 >= total) setEtapa("resumo");
  }

  async function registrarResultado() {
    if (!resultado || !clienteAtual) return;
    setSalvando(true);
    try {
      const { momento, temperatura } = resultadoParaMomento(resultado);
      const update = { ultimo_contato: new Date().toISOString() };
      if (momento) update.momento = momento;
      if (temperatura) update.temperatura = temperatura;
      update.proxima_acao = calcularProximaAcao({ ...clienteAtual, ...update });
      update.historico = {
        missao_id: missao.id,
        tipo: "Missão: " + missao.tipo_missao,
        descricao: `Resultado: ${resultado}`,
        resultado,
        momento_anterior: clienteAtual.momento,
        momento_novo: momento || clienteAtual.momento,
      };
      await base44.entities.CarteiraCliente.update(clienteAtual.id, update);

      const nextConcluidos = concluidos + 1;
      const nextVisitas = visitasAgendadas + (["Agendou visita", "Reagendou visita"].includes(resultado) ? 1 : 0);
      const nextPropostas = propostasSolicitadas + (resultado === "Pediu proposta" ? 1 : 0);
      const nextSemInteresse = semInteresse + (["Sem interesse", "Comprou em outra loja"].includes(resultado) ? 1 : 0);
      const nextNaoResponderam = naoResponderam + (resultado === "Cliente não respondeu" ? 1 : 0);
      const nextIndex = Math.min(indice + 1, Math.max(total - 1, 0));

      const itemStatus = resultado === "Cliente não respondeu"
        ? "Não respondeu"
        : ["Sem interesse", "Comprou em outra loja"].includes(resultado)
        ? "Sem interesse"
        : "Concluído";
      const persisted = await persistirMissao({
        status: indice + 1 >= total ? "Aguardando respostas" : "Enviando mensagens",
        indice_atual: nextIndex,
        mensagens_enviadas: enviados,
        pulados,
        concluidos: nextConcluidos,
        visitas_agendadas: nextVisitas,
        propostas_solicitadas: nextPropostas,
        sem_interesse: nextSemInteresse,
        nao_responderam: nextNaoResponderam,
        aguardando_resposta: Math.max(enviados - nextConcluidos, 0),
        item: {
          cliente_id: clienteAtual.id,
          status: itemStatus,
          resultado,
        },
      });
      if (!persisted) return;
      setConcluidos(nextConcluidos);
      setVisitasAgendadas(nextVisitas);
      setPropostasSolicitadas(nextPropostas);
      setSemInteresse(nextSemInteresse);
      setNaoResponderam(nextNaoResponderam);
      avancar();
    } catch (error) {
      setErro("Não foi possível registrar o resultado. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleVoltar() {
    if (etapa !== "resumo") {
      const persisted = await persistirMissao({
        status: "Pausada",
        indice_atual: indice,
        mensagens_enviadas: enviados,
        pulados,
        concluidos,
        visitas_agendadas: visitasAgendadas,
        propostas_solicitadas: propostasSolicitadas,
        sem_interesse: semInteresse,
        nao_responderam: naoResponderam,
      });
      if (!persisted) return;
    }
    onVoltar();
  }

  if (etapa === "resumo") {
    return (
      <div className="space-y-6">
        {erro && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}
        <button onClick={handleVoltar} className="flex items-center gap-1.5 text-sm text-[#005BFF] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Plano de Ataque
        </button>
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center space-y-4">
          <span className="text-5xl">🎯</span>
          <h2 className="text-xl font-black text-[#031B3D]">Envio concluído!</h2>
          <p className="text-sm text-muted-foreground">A missão <strong>{missao.tipo_missao}</strong> está aguardando respostas.</p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-black text-[#031B3D]">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-2xl font-black text-[#005BFF]">{enviados}</p>
              <p className="text-xs text-muted-foreground">Enviadas</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-2xl font-black text-muted-foreground">{pulados}</p>
              <p className="text-xs text-muted-foreground">Pulados</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-2">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Status da Missão</p>
            <p className="text-sm font-semibold text-amber-700 mt-0.5">Aguardando respostas</p>
          </div>
          <Button onClick={handleVoltar} className="w-full rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white mt-2">
            Voltar ao Plano de Ataque
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {erro && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <button onClick={handleVoltar} className="hover:text-[#005BFF] transition-colors">Carteira de Clientes</button>
        <ChevronRight className="w-3 h-3" />
        <span>Plano de Ataque</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-[#031B3D] font-semibold">{missao.tipo_missao}</span>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Missão</p>
            <p className="text-base font-black text-[#031B3D]">{missao.tipo_missao}</p>
          </div>
          <span className="text-xs bg-amber-50 text-amber-600 font-bold px-2.5 py-1 rounded-full border border-amber-100">Em execução</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-xl font-black text-[#031B3D]">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-[#005BFF]">{enviados}</p>
            <p className="text-xs text-muted-foreground">Enviadas</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-muted-foreground">{Math.max(total - enviados - pulados, 0)}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{progresso}%</span>
          </div>
          <div className="bg-slate-100 rounded-full h-2">
            <div className="bg-[#005BFF] rounded-full h-2 transition-all" style={{ width: `${progresso}%` }} />
          </div>
        </div>
      </div>

      {clienteAtual && etapa === "enviando" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Cliente {indice + 1} de {total}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-base font-black text-[#005BFF]">
              {(clienteAtual.nome || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase()}
            </div>
            <div>
              <p className="text-base font-black text-[#031B3D]">{clienteAtual.nome}</p>
              <p className="text-sm text-muted-foreground">{clienteAtual.whatsapp} · {clienteAtual.veiculo_interesse || "Sem veículo"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{clienteAtual.momento}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Script sugerido</p>
            <textarea value={scriptEditado || scriptPreenchido} onChange={e => setScriptEditado(e.target.value)} rows={6}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-[#005BFF]" />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copiar} className="flex-1 rounded-xl gap-1.5 text-sm">
              {copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado!" : "Copiar"}
            </Button>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white gap-1.5 text-sm">
                  <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
                </Button>
              </a>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={pularCliente} disabled={persistindo} className="rounded-xl gap-1.5 text-sm text-muted-foreground">
              <SkipForward className="w-4 h-4" /> Pular
            </Button>
            <Button onClick={marcarEnviado} disabled={persistindo} className="flex-1 rounded-xl bg-blue-50 text-[#005BFF] hover:bg-blue-100 font-bold gap-1.5 text-sm border border-blue-100">
              Mensagem enviada →
            </Button>
          </div>
        </div>
      )}

      {clienteAtual && etapa === "resultado" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wide">Registrar resultado</p>
            <p className="text-sm font-semibold text-[#031B3D] mt-0.5">{clienteAtual.nome}</p>
          </div>
          <p className="text-sm text-muted-foreground">O que aconteceu nesse contato?</p>
          <div className="grid grid-cols-1 gap-1.5">
            {RESULTADOS.map(r => (
              <button key={r} onClick={() => setResultado(r)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${resultado === r ? "border-[#005BFF] bg-blue-50 text-[#005BFF] font-semibold" : "border-slate-100 text-muted-foreground hover:bg-slate-50"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={avancar} disabled={salvando || persistindo} className="flex-1 rounded-xl text-sm">Pular resultado</Button>
            <Button onClick={registrarResultado} disabled={!resultado || salvando || persistindo}
              className="flex-1 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-sm">
              {salvando ? "Salvando..." : "Confirmar e avançar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
