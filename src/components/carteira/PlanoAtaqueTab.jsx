import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Plus, Users, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MISSOES, SITUACOES_TERMINAIS, prioridadeColor } from "@/components/carteira/carteiraUtils";
import VeiculosChegaram from "@/components/carteira/VeiculosChegaram";

const RESUMABLE_STATUSES = ["Preparando", "Enviando mensagens", "Respondendo clientes", "Pausada"];
const BLOCKING_STATUSES = [...RESUMABLE_STATUSES, "Aguardando respostas"];

function getMissionBlock(activeMission) {
  if (!activeMission || !BLOCKING_STATUSES.includes(activeMission.status)) return null;
  const sent = Number(activeMission.mensagens_enviadas || 0);
  const total = Number(activeMission.total_clientes || 0);
  // `aguardando_resposta` é o campo que ExecucaoMissao realmente grava (mensagens enviadas
  // ainda sem retorno). `aguardando_sua_resposta` existe na tabela mas nenhum fluxo escreve
  // nele hoje — usá-lo aqui deixava esse aviso sempre mudo.
  const awaiting = Number(activeMission.aguardando_resposta || 0);
  if (awaiting > 0) return `${awaiting} cliente(s) aguardando retorno de contato.`;
  if (sent < total) return "Finalize os contatos da missão atual antes de iniciar uma nova.";
  return "Conclua a missão atual antes de iniciar outra.";
}

export default function PlanoAtaqueTab({ clientes = [], missaoAtiva, onIniciarMissao, onWhatsApp, onFicha }) {
  const [missaoRecuperada, setMissaoRecuperada] = useState(null);
  const [missaoSelecionada, setMissaoSelecionada] = useState(null);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState("");
  const [campanhas, setCampanhas] = useState([]);
  const [campanhaForm, setCampanhaForm] = useState({ tipo: "campanha", titulo: "", descricao: "", valor_desconto: "", bonus_troca: "", fim_em: "" });
  const [campanhaSaving, setCampanhaSaving] = useState(false);
  const [campanhaError, setCampanhaError] = useState("");
  const recuperacaoExecutadaRef = useRef(false);

  useEffect(() => {
    if (missaoAtiva || recuperacaoExecutadaRef.current) return;
    recuperacaoExecutadaRef.current = true;
    let cancelled = false;

    base44.entities.CarteiraMissao
      .filter({ status: { $in: BLOCKING_STATUSES } }, "-updated_at", 1)
      .then((missions) => {
        if (cancelled) return;
        setMissaoRecuperada(missions?.[0] || null);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Não foi possível carregar a missão em andamento.");
      });

    return () => { cancelled = true; };
  }, [missaoAtiva]);

  function retomarMissaoRecuperada() {
    if (!missaoRecuperada) return;
    const ids = new Set(missaoRecuperada.clientes_ids || []);
    const queue = clientes.filter((client) => ids.has(client.id));
    if (queue.length > 0) {
      onIniciarMissao(missaoRecuperada, queue);
    } else {
      setError("Não foi possível localizar os clientes desta missão.");
      setMissaoRecuperada(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    base44.entities.CarteiraCampanha
      .list()
      .then((rows) => { if (!cancelled) setCampanhas(rows || []); })
      .catch((cause) => { if (!cancelled) setCampanhaError(cause instanceof Error ? cause.message : "Não foi possível carregar as campanhas da loja."); });
    return () => { cancelled = true; };
  }, []);

  const activeMission = missaoAtiva || missaoRecuperada;
  const missionBlock = getMissionBlock(activeMission);
  const missions = useMemo(
    () => MISSOES
      .map((mission) => ({ ...mission, clientes: clientes.filter(mission.filtro) }))
      .sort((left, right) => right.clientes.length - left.clientes.length),
    [clientes],
  );

  async function startMission(mission) {
    if (mission.clientes.length === 0 || missionBlock) return;
    setIniciando(true);
    setError("");
    try {
      const user = await base44.auth.me();
      const persisted = await base44.entities.CarteiraMissao.create({
        vendedor_id: user.id,
        tipo_missao: mission.nome,
        status: "Preparando",
        total_clientes: mission.clientes.length,
        clientes_ids: mission.clientes.map((client) => client.id),
        mensagens_enviadas: 0,
        iniciada_em: new Date().toISOString(),
      });
      setMissaoSelecionada(null);
      onIniciarMissao(persisted, mission.clientes);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a missão.");
    } finally {
      setIniciando(false);
    }
  }

  async function salvarCampanha(event) {
    event.preventDefault();
    if (!campanhaForm.titulo.trim()) return;
    setCampanhaSaving(true);
    setCampanhaError("");
    try {
      const created = await base44.entities.CarteiraCampanha.create({
        ...campanhaForm,
        titulo: campanhaForm.titulo.trim(),
        valor_desconto: campanhaForm.valor_desconto || null,
        bonus_troca: campanhaForm.bonus_troca || null,
        fim_em: campanhaForm.fim_em || null,
      });
      setCampanhas(prev => [created, ...prev.filter(campaign => campaign.id !== created.id)]);
      setCampanhaForm({ tipo: "campanha", titulo: "", descricao: "", valor_desconto: "", bonus_troca: "", fim_em: "" });
    } catch (cause) {
      setCampanhaError(cause instanceof Error ? cause.message : "Não foi possível salvar a campanha.");
    } finally {
      setCampanhaSaving(false);
    }
  }

  async function iniciarCampanha(campanha) {
    const elegiveis = clientes.filter(client => client.ativo !== false && !SITUACOES_TERMINAIS.includes(client.situacao_atual || client.momento));
    if (elegiveis.length === 0 || missionBlock) return;
    setIniciando(true);
    setError("");
    try {
      const user = await base44.auth.me();
      const mission = await base44.entities.CarteiraMissao.create({
        vendedor_id: user.id,
        tipo_missao: campanha.titulo,
        status: "Preparando",
        total_clientes: elegiveis.length,
        clientes_ids: elegiveis.map(client => client.id),
        iniciada_em: new Date().toISOString(),
        metadata: { campanha_id: campanha.id, campanha_tipo: campanha.tipo, campanha_titulo: campanha.titulo },
      });
      onIniciarMissao(mission, elegiveis);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a campanha para a carteira.");
    } finally {
      setIniciando(false);
    }
  }

  if (missaoSelecionada) {
    return (
      <div className="space-y-6">
        <button type="button" onClick={() => setMissaoSelecionada(null)} className="flex items-center gap-2 text-sm font-semibold text-[#005BFF]">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Plano de Ataque
        </button>
        <section className="rounded-2xl border border-slate-100 bg-white p-6">
          <div className="flex items-start gap-4">
            <span className="text-3xl" aria-hidden="true">{missaoSelecionada.icone}</span>
            <div>
              <h2 className="text-xl font-black text-[#031B3D]">{missaoSelecionada.nome}</h2>
              <p className="mt-1 text-sm text-slate-500">{missaoSelecionada.objetivo}</p>
              <p className="mt-2 text-sm font-semibold text-[#005BFF]">{missaoSelecionada.clientes.length} cliente(s) identificado(s) pelos dados atuais.</p>
            </div>
          </div>
        </section>
        {missionBlock && <Warning message={missionBlock} />}
        {error && <Warning message={error} />}
        <div className="space-y-2">
          {missaoSelecionada.clientes.map((client) => (
            <button key={client.id} type="button" onClick={() => onFicha?.(client.id)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-left">
              <span><strong className="block text-sm text-[#031B3D]">{client.nome || "Cliente sem nome"}</strong><span className="text-xs text-slate-400">{client.situacao_atual || client.momento || "Situação não informada"}</span></span>
              <Users className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
        <Button type="button" onClick={() => startMission(missaoSelecionada)} disabled={iniciando || Boolean(missionBlock)} className="h-12 w-full rounded-xl bg-[#005BFF] text-white">
          <Zap className="mr-2 h-5 w-5" /> {iniciando ? "Salvando missão..." : "Iniciar missão"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-black text-[#031B3D]">Plano de Ataque</h1><p className="mt-1 text-sm text-slate-400">Missões calculadas a partir das situações reais da sua carteira.</p></div>
      <section className="rounded-2xl border border-slate-100 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-black text-[#031B3D]">Campanhas e condições</h2><p className="mt-1 text-sm text-slate-400">Cadastre um feirão, desconto ou bônus de troca e inicie uma missão para os clientes ativos elegíveis.</p></div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#005BFF]">{campanhas.length} ativa(s)</span>
        </div>
        <form onSubmit={salvarCampanha} className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
          <select aria-label="Tipo da campanha" value={campanhaForm.tipo} onChange={event => setCampanhaForm(prev => ({ ...prev, tipo: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="campanha">Campanha</option><option value="feirao">Feirão</option><option value="desconto">Desconto</option><option value="bonus_troca">Bônus na troca</option>
          </select>
          <input aria-label="Título da campanha" value={campanhaForm.titulo} onChange={event => setCampanhaForm(prev => ({ ...prev, titulo: event.target.value }))} placeholder="Ex.: Feirão de julho" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" required />
          <textarea aria-label="Descrição da campanha" value={campanhaForm.descricao} onChange={event => setCampanhaForm(prev => ({ ...prev, descricao: event.target.value }))} placeholder="Condição que pode ser comunicada ao cliente" rows={2} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2" />
          <input aria-label="Valor do desconto" type="number" min="0" value={campanhaForm.valor_desconto} onChange={event => setCampanhaForm(prev => ({ ...prev, valor_desconto: event.target.value }))} placeholder="Desconto em R$ (se aplicável)" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
          <input aria-label="Valor do bônus na troca" type="number" min="0" value={campanhaForm.bonus_troca} onChange={event => setCampanhaForm(prev => ({ ...prev, bonus_troca: event.target.value }))} placeholder="Bônus na troca em R$ (se aplicável)" className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
          <input aria-label="Fim da campanha" type="date" value={campanhaForm.fim_em} onChange={event => setCampanhaForm(prev => ({ ...prev, fim_em: event.target.value }))} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" />
          <button type="submit" disabled={campanhaSaving} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#005BFF] px-4 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{campanhaSaving ? "Salvando..." : "Cadastrar campanha"}</button>
        </form>
        {campanhaError && <Warning message={campanhaError} />}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {campanhas.map(campanha => {
            const elegiveis = clientes.filter(client => client.ativo !== false && !SITUACOES_TERMINAIS.includes(client.situacao_atual || client.momento)).length;
            return <div key={campanha.id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#031B3D]">{campanha.titulo}</p><p className="mt-1 text-xs text-slate-400">{campanha.descricao || "Condição comercial cadastrada para a carteira."}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-caption font-bold text-slate-500">{campanha.tipo}</span></div><button type="button" disabled={!elegiveis || Boolean(missionBlock) || iniciando} onClick={() => iniciarCampanha(campanha)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#005BFF] px-3 py-2 text-xs font-bold text-[#005BFF] disabled:cursor-not-allowed disabled:opacity-40"><Zap className="h-3.5 w-3.5" /> Iniciar para {elegiveis} cliente(s)</button></div>;
          })}
        </div>
        {campanhas.length === 0 && <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">Nenhuma campanha ativa cadastrada para esta loja.</p>}
      </section>
      <div className="rounded-2xl border border-slate-100 bg-white p-5"><VeiculosChegaram clientes={clientes} onExecutar={(client, missaoId) => onWhatsApp?.(client, missaoId || null)} onFicha={onFicha} /></div>
      {activeMission && (
        <section className="rounded-2xl bg-[#005BFF] p-5 text-white">
          <p className="text-xs font-semibold uppercase text-blue-100">Missão em andamento</p>
          <p className="font-bold">{activeMission.tipo_missao}</p>
          <p className="mt-1 text-sm text-blue-100">{activeMission.mensagens_enviadas || 0}/{activeMission.total_clientes || 0} contatos registrados</p>
          {RESUMABLE_STATUSES.includes(activeMission.status) && missaoRecuperada && (
            <button type="button" onClick={retomarMissaoRecuperada} className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#005BFF] hover:bg-blue-50">
              Continuar missão
            </button>
          )}
        </section>
      )}
      {missionBlock && <Warning message={missionBlock} />}
      {error && <Warning message={error} />}
      {missions.every((mission) => mission.clientes.length === 0) ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center"><p className="font-bold text-slate-600">Nenhuma missão disponível com os dados atuais.</p><p className="mt-1 text-sm text-slate-400">Atualize a situação dos clientes para gerar a próxima fila real.</p></section>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {missions.filter((mission) => mission.clientes.length > 0).map((mission) => (
            <button key={mission.id} type="button" onClick={() => setMissaoSelecionada(mission)} className="rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-[#005BFF]">
              <div className="mb-3 flex items-start justify-between"><span className="text-2xl" aria-hidden="true">{mission.icone}</span><span className={`rounded-full px-2 py-0.5 text-caption font-bold ${prioridadeColor(mission.prioridade)}`}>{mission.prioridade}</span></div>
              <p className="text-sm font-bold text-[#031B3D]">{mission.nome}</p><p className="mt-1 text-xs text-slate-400">{mission.objetivo}</p><p className="mt-3 border-t border-slate-50 pt-2 text-xs font-bold text-[#005BFF]">{mission.clientes.length} cliente(s)</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Warning({ message }) {
  return <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><p className="text-sm text-amber-800">{message}</p></div>;
}
