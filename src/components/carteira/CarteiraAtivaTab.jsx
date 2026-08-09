import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search, Zap, FileText, Star, SlidersHorizontal, X } from "lucide-react";
import moment from "moment";
import {
  calcularObjetivoEProximoPasso, calcularScore, calcularPrioridade,
  classificacaoScore, tempColor, prioridadeColor, explicacaoCliente,
  SITUACOES_ENCERRADAS_SEM_VENDA,
} from "./carteiraUtils";

// ─── DIAS DA SEMANA ────────────────────────────────────────────────────────────
const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function diaDaSemana(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return DIAS_SEMANA[d.getDay()];
}

function isMesmodia(dateStr, offset) {
  if (!dateStr) return false;
  const ref = new Date();
  ref.setDate(ref.getDate() + offset);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth() && d.getDate() === ref.getDate();
}

function isVencido(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return d < hoje;
}

// ─── LÓGICA DOS CARDS DE AGENDA ───────────────────────────────────────────────
function filtrarHoje(c) {
  if (!c) return false;
  const proxData = c.proxima_acao_data;
  const visitaData = c.visita_agendada_em;
  if (isVencido(proxData)) return true;
  if (isMesmodia(proxData, 0)) return true;
  if (isMesmodia(visitaData, 0)) return true;
  if (!proxData) return true;
  return false;
}

function filtrarAmanha(c) {
  if (!c) return false;
  const proxData = c.proxima_acao_data;
  const visitaData = c.visita_agendada_em;
  return isMesmodia(proxData, 1) || isMesmodia(visitaData, 1);
}

function filtrarDia(offset) {
  return (c) => {
    if (!c) return false;
    const proxData = c.proxima_acao_data;
    const visitaData = c.visita_agendada_em;
    return isMesmodia(proxData, offset) || isMesmodia(visitaData, offset);
  };
}

// ─── ORDENAÇÃO ────────────────────────────────────────────────────────────────
function ordenarHoje(lista) {
  const ordP = { "Máxima": 0, "Alta": 1, "Média": 2, "Baixa": 3 };
  return [...lista].sort((a, b) => {
    const aVenc = isVencido(a.proxima_acao_data) ? 0 : isMesmodia(a.proxima_acao_data, 0) ? 1 : isMesmodia(a.visita_agendada_em, 0) ? 2 : 3;
    const bVenc = isVencido(b.proxima_acao_data) ? 0 : isMesmodia(b.proxima_acao_data, 0) ? 1 : isMesmodia(b.visita_agendada_em, 0) ? 2 : 3;
    if (aVenc !== bVenc) return aVenc - bVenc;
    return (ordP[calcularPrioridade(a)] ?? 3) - (ordP[calcularPrioridade(b)] ?? 3);
  });
}

function ordenarGeral(lista) {
  const ordP = { "Máxima": 0, "Alta": 1, "Média": 2, "Baixa": 3 };
  return [...lista].sort((a, b) => (ordP[calcularPrioridade(a)] ?? 3) - (ordP[calcularPrioridade(b)] ?? 3));
}

// ─── SCORE BADGE ──────────────────────────────────────────────────────────────
function ScoreBadge({ score, motivos }) {
  const cls = classificacaoScore(score);
  return (
    <div className={`flex items-center gap-1 text-caption font-bold px-2 py-0.5 rounded-full ${cls.color}`} title={motivos.join("\n")}>
      <Star className="w-2.5 h-2.5" />
      {score} · {cls.label}
    </div>
  );
}

// ─── CARD DO CLIENTE ──────────────────────────────────────────────────────────
function ClienteCard({ cliente, onExecutar, onFicha }) {
  // Proteção contra nulos
  if (!cliente) return null;

  const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(cliente);
  const { score, motivos } = calcularScore(cliente);
  const prioridade = calcularPrioridade(cliente);
  const explicacao = explicacaoCliente(cliente);
  const situacao = cliente.situacao_atual || cliente.momento || "—";
  const canal = cliente.canal_comercial || cliente.canal_origem || "—";
  // Oportunidade encerrada sem venda (perdida, cancelada, cadência encerrada)
  // não tem próximo passo a executar: o passo antigo morreu com ela.
  const encerradoSemVenda = SITUACOES_ENCERRADAS_SEM_VENDA.includes(situacao);

  // Calcular iniciais com proteção contra espaços em branco
  const nomeLimpo = (cliente.nome || "").trim();
  const iniciais = nomeLimpo
    ? nomeLimpo.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase()
    : "?";

  return (
    <div className={`bg-white border rounded-2xl hover:shadow-sm transition-all ${
      prioridade === "Máxima" ? "border-red-200" : prioridade === "Alta" ? "border-orange-100" : "border-slate-100"
    }`}>
      {/* MOBILE */}
      <div className="flex flex-col gap-3 p-4 sm:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-[#005BFF] shrink-0">{iniciais}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#031B3D] truncate">{cliente.nome}</p>
              <p className="text-caption text-slate-400 truncate">{canal} · {cliente.veiculo_interesse || "Sem veículo"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full border ${tempColor(cliente.temperatura)}`}>{cliente.temperatura}</span>
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full ${prioridadeColor(prioridade)}`}>{prioridade}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-xl px-2.5 py-2">
            <p className="text-caption text-slate-400 font-bold uppercase tracking-wide">Situação</p>
            <p className="text-caption font-semibold text-slate-700 mt-0.5 leading-snug">{situacao}</p>
          </div>
          <div className="bg-blue-50 rounded-xl px-2.5 py-2">
            <p className="text-caption text-[#005BFF] font-bold uppercase tracking-wide">Mentor recomenda</p>
            <p className="text-caption font-semibold text-[#031B3D] mt-0.5 leading-snug">{proximoPasso}</p>
          </div>
        </div>
        <p className="text-caption text-slate-400 leading-snug italic">{explicacao}</p>
        <ScoreBadge score={score} motivos={motivos} />
        <div className="flex gap-2">
          {!encerradoSemVenda && (
          <button onClick={() => onExecutar(cliente)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#005BFF] hover:bg-blue-700 px-3 py-2 rounded-xl transition-colors flex-1 justify-center">
            <Zap className="w-3.5 h-3.5" /> Executar
          </button>
          )}
          <button onClick={() => onFicha(cliente.id)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors flex-1 justify-center">
            <FileText className="w-3.5 h-3.5" /> Ficha
          </button>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:flex items-stretch divide-x divide-slate-100">
        <div className="flex items-center gap-3 px-4 py-3.5 w-52 shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-sm font-black text-[#005BFF] shrink-0">{iniciais}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#031B3D] truncate">{cliente.nome}</p>
            <p className="text-caption text-slate-400 truncate">{canal}</p>
            <p className="text-caption text-slate-400 truncate">{cliente.veiculo_interesse || "Sem veículo"}</p>
          </div>
        </div>
        <div className="px-4 py-3.5 w-52 shrink-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full border ${tempColor(cliente.temperatura)}`}>{cliente.temperatura}</span>
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full ${prioridadeColor(prioridade)}`}>{prioridade}</span>
          </div>
          <div>
            <p className="text-caption text-slate-400 font-bold uppercase tracking-wide">Situação</p>
            <p className="text-caption font-semibold text-slate-700 leading-snug mt-0.5">{situacao}</p>
          </div>
          <ScoreBadge score={score} motivos={motivos} />
        </div>
        <div className="min-w-0 flex-1 px-4 py-3.5 bg-blue-50/30 space-y-1.5">
          <div>
            <p className="text-caption text-slate-400 font-bold uppercase tracking-wide">Objetivo</p>
            <p className="text-caption font-semibold text-slate-600 leading-snug mt-0.5">{objetivo}</p>
          </div>
          <div>
            <p className="text-caption text-[#005BFF] font-bold uppercase tracking-wide">Mentor recomenda</p>
            <p className="text-caption font-bold text-[#031B3D] leading-snug mt-0.5">{proximoPasso}</p>
          </div>
          <p className="text-caption text-slate-400 italic leading-snug">{explicacao}</p>
        </div>
        <div className="flex flex-col gap-1.5 px-4 py-3.5 shrink-0 w-40 justify-center">
          {!encerradoSemVenda && (
          <button onClick={() => onExecutar(cliente)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#005BFF] hover:bg-blue-700 px-3 py-2 rounded-xl transition-colors justify-center">
            <Zap className="w-3.5 h-3.5" /> Executar próximo passo
          </button>
          )}
          <button onClick={() => onFicha(cliente.id)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors justify-center">
            <FileText className="w-3.5 h-3.5" /> Abrir ficha
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PAINEL DE FILTROS ────────────────────────────────────────────────────────
const SITUACOES_FILTRO = [
  "Sem visita", "Visita agendada", "Proposta enviada",
  "Recuperação", "Sem próximo passo", "Próximo passo vencido",
];
const ORIGENS_FILTRO = ["Internet", "Porta", "Carteira", "Indicação", "Outros"];
const PERIODOS_FILTRO = ["Hoje", "Amanhã", "Próximos 7 dias", "Vencidos", "Sem data"];
const PRIORIDADES_FILTRO = ["Alta", "Média", "Baixa"];

function PainelFiltros({ onAplicar, onFechar, filtrosAtivos }) {
  const [local, setLocal] = useState({ ...filtrosAtivos });

  function toggle(campo, valor) {
    setLocal(prev => {
      const arr = prev[campo] || [];
      return { ...prev, [campo]: arr.includes(valor) ? arr.filter(v => v !== valor) : [...arr, valor] };
    });
  }

  function set(campo, valor) {
    setLocal(prev => ({ ...prev, [campo]: valor }));
  }

  function chipClass(ativo) {
    return `text-caption font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
      ativo ? "bg-[#005BFF] text-white border-[#005BFF]" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
    }`;
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onFechar} />
      <div className="w-80 bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-black text-[#031B3D]">Filtros</p>
          <button onClick={onFechar}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-2">Veículo de interesse</p>
            <input
              value={local.veiculo || ""}
              onChange={e => set("veiculo", e.target.value)}
              placeholder="Ex: HR-V, Corolla..."
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
            />
          </div>

          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-2">Origem</p>
            <div className="flex flex-wrap gap-1.5">
              {ORIGENS_FILTRO.map(o => (
                <button key={o} onClick={() => toggle("origens", o)} className={chipClass((local.origens || []).includes(o))}>{o}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-2">Situação</p>
            <div className="flex flex-wrap gap-1.5">
              {SITUACOES_FILTRO.map(s => (
                <button key={s} onClick={() => toggle("situacoes", s)} className={chipClass((local.situacoes || []).includes(s))}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-2">Período</p>
            <div className="flex flex-wrap gap-1.5">
              {PERIODOS_FILTRO.map(p => (
                <button key={p} onClick={() => toggle("periodos", p)} className={chipClass((local.periodos || []).includes(p))}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-2">Prioridade</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORIDADES_FILTRO.map(p => (
                <button key={p} onClick={() => toggle("prioridades", p)} className={chipClass((local.prioridades || []).includes(p))}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <Button variant="outline" onClick={() => { setLocal({}); onAplicar({}); }} className="flex-1 rounded-xl text-sm">Limpar</Button>
          <Button onClick={() => onAplicar(local)} className="flex-1 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-sm">Aplicar filtros</Button>
        </div>
      </div>
    </div>
  );
}

// ─── APLICAR FILTROS AVANÇADOS ────────────────────────────────────────────────
function aplicarFiltrosAvancados(lista, filtros) {
  let r = lista;
  if (filtros.veiculo) r = r.filter(c => (c.veiculo_interesse || "").toLowerCase().includes(filtros.veiculo.toLowerCase()));
  if (filtros.origens?.length) r = r.filter(c => {
    const canal = c.canal_comercial || c.canal_origem || "";
    return filtros.origens.some(o => canal.toLowerCase().includes(o.toLowerCase()));
  });
  if (filtros.prioridades?.length) r = r.filter(c => filtros.prioridades.includes(calcularPrioridade(c)));
  if (filtros.situacoes?.length) {
    r = r.filter(c => {
      const s = c.situacao_atual || c.momento || "";
      return filtros.situacoes.some(sit => {
        if (sit === "Sem visita") return !["Visita agendada", "Visita hoje", "Visita realizada", "Não compareceu"].includes(s);
        if (sit === "Visita agendada") return s === "Visita agendada" || s === "Visita hoje";
        if (sit === "Proposta enviada") return s === "Proposta enviada";
        if (sit === "Recuperação") return s === "Não compareceu" || s === "Visita realizada";
        if (sit === "Sem próximo passo") return !c.proxima_acao_data;
        if (sit === "Próximo passo vencido") return isVencido(c.proxima_acao_data);
        return false;
      });
    });
  }
  if (filtros.periodos?.length) {
    r = r.filter(c => {
      const d = c.proxima_acao_data;
      return filtros.periodos.some(p => {
        if (p === "Hoje") return isMesmodia(d, 0);
        if (p === "Amanhã") return isMesmodia(d, 1);
        if (p === "Próximos 7 dias") { if (!d) return false; const diff = (new Date(d) - new Date()) / 86400000; return diff >= 0 && diff <= 7; }
        if (p === "Vencidos") return isVencido(d);
        if (p === "Sem data") return !d;
        return false;
      });
    });
  }
  return r;
}

// ─── CHIPS DE FILTROS ATIVOS ─────────────────────────────────────────────────
function ChipsFiltrosAtivos({ filtros, onRemover }) {
  const chips = [];
  if (filtros.veiculo) chips.push({ key: "veiculo", label: `Veículo: ${filtros.veiculo}` });
  (filtros.origens || []).forEach(o => chips.push({ key: `origens:${o}`, label: o }));
  (filtros.situacoes || []).forEach(s => chips.push({ key: `situacoes:${s}`, label: s }));
  (filtros.periodos || []).forEach(p => chips.push({ key: `periodos:${p}`, label: p }));
  (filtros.prioridades || []).forEach(p => chips.push({ key: `prioridades:${p}`, label: `Prioridade: ${p}` }));
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(chip => (
        <span key={chip.key} className="flex items-center gap-1 text-caption font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-[#005BFF] border border-blue-200">
          {chip.label}
          <button onClick={() => onRemover(chip.key)}><X className="w-3 h-3" /></button>
        </span>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// `onNovoCliente` continua na assinatura porque a página Base44 ainda a passa,
// mas a carteira não abre mais o cadastro: a entrada de cliente novo é
// exclusiva do fechamento diário.
export default function CarteiraAtivaTab({ clientes = [], onNovoCliente: _onNovoCliente, onWhatsApp, onFicha }) {
  const safeClientes = useMemo(() => Array.isArray(clientes) ? clientes : [], [clientes]);

  const CARDS = useMemo(() => [
    { id: "hoje",  label: "Prioridade Hoje",              sublabel: "pendentes agora",     filtro: filtrarHoje,    vazio: "Você concluiu as prioridades de hoje." },
    { id: "amanha",label: "Prioridade Amanhã",            sublabel: "próximas ações",       filtro: filtrarAmanha,  vazio: "Nenhuma prioridade programada para amanhã." },
    { id: "d2",    label: `Prioridade ${diaDaSemana(2)}`, sublabel: "ações programadas",   filtro: filtrarDia(2),  vazio: "Nenhuma prioridade programada para este dia." },
    { id: "d3",    label: `Prioridade ${diaDaSemana(3)}`, sublabel: "ações programadas",   filtro: filtrarDia(3),  vazio: "Nenhuma prioridade programada para este dia." },
    { id: "compraram", label: "Compraram",                sublabel: "vendas realizadas",    filtro: c => c && (c.situacao_atual === "Venda realizada" || c.status_comercial === "Vendido" || c.sale_status === "Sim" || c.momento === "Venda realizada"), vazio: "Nenhum cliente com venda realizada." },
    { id: "todos", label: "Ver Todos",                    sublabel: "lista por prioridade", filtro: () => true,     vazio: "Nenhum cliente ativo no momento." },
  ], []);

  const [cardAtivo, setCardAtivo] = useState("hoje");
  const [busca, setBusca] = useState("");
  const [filtrosPanelOpen, setFiltrosPanelOpen] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({});

  const isComprador = useCallback(c => {
    if (!c) return false;
    const s = c.situacao_atual || c.momento || "";
    return s === "Venda realizada" || c.status_comercial === "Vendido" || c.sale_status === "Sim" || s === "Comprou" || s === "ganho";
  }, []);

  const counts = useMemo(() => {
    const activeN = safeClientes.filter(c => {
      if (!c) return false;
      const s = c.situacao_atual || c.momento || "";
      return c.ativo !== false && !isComprador(c) && !SITUACOES_ENCERRADAS_SEM_VENDA.includes(s);
    });
    return {
      hoje: activeN.filter(CARDS[0].filtro).length,
      amanha: activeN.filter(CARDS[1].filtro).length,
      d2: activeN.filter(CARDS[2].filtro).length,
      d3: activeN.filter(CARDS[3].filtro).length,
      compraram: safeClientes.filter(isComprador).length,
      todos: safeClientes.filter(c => c && c.ativo !== false).length,
    };
  }, [safeClientes, CARDS, isComprador]);

  const cardConfig = useMemo(() => CARDS.find(c => c.id === cardAtivo) || CARDS[0], [cardAtivo, CARDS]);

  const clientesFiltrados = useMemo(() => {
    let lista = safeClientes;
    if (cardAtivo === "compraram") {
      lista = lista.filter(isComprador);
    } else if (cardAtivo === "todos") {
      lista = lista.filter(c => c && c.ativo !== false);
    } else {
      lista = lista.filter(c => {
        if (!c) return false;
        const s = c.situacao_atual || c.momento || "";
        return c.ativo !== false && !isComprador(c) && !SITUACOES_ENCERRADAS_SEM_VENDA.includes(s);
      }).filter(cardConfig.filtro);
    }

    if (busca) lista = lista.filter(c =>
      c?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c?.whatsapp?.includes(busca) || c?.telefone?.includes(busca)
    );
    lista = aplicarFiltrosAvancados(lista, filtrosAvancados);
    return cardAtivo === "hoje" ? ordenarHoje(lista) : ordenarGeral(lista);
  }, [safeClientes, cardConfig, busca, filtrosAvancados, cardAtivo, isComprador]);

  function removerFiltro(key) {
    const [campo, valor] = key.split(":");
    if (!valor) {
      setFiltrosAvancados(prev => { const n = { ...prev }; delete n[campo]; return n; });
    } else {
      setFiltrosAvancados(prev => ({ ...prev, [campo]: (prev[campo] || []).filter(v => v !== valor) }));
    }
  }

  const temFiltrosAtivos = Object.keys(filtrosAvancados).some(k => {
    const v = filtrosAvancados[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-[#031B3D]">Mentor Comercial</h1>
          <p className="text-sm text-slate-400 mt-1">Sua agenda comercial de hoje. Execute e registre resultados.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
              className="pl-9 pr-3 h-9 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF] w-44" />
          </div>
          <button
            onClick={() => setFiltrosPanelOpen(true)}
            className={`flex items-center gap-1.5 h-9 px-3.5 rounded-xl border text-sm font-semibold transition-all ${
              temFiltrosAtivos ? "bg-[#005BFF] text-white border-[#005BFF]" : "bg-white border-slate-200 text-slate-600 hover:border-blue-300"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>

      {/* Cards de agenda */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {CARDS.map(card => {
          const count = counts[card.id] ?? 0;
          const ativo = cardAtivo === card.id;
          return (
            <button key={card.id} onClick={() => setCardAtivo(card.id)}
              className={`text-left p-3.5 rounded-2xl border transition-all ${ativo ? "border-[#005BFF] bg-blue-50 shadow-sm" : "border-slate-100 bg-white hover:border-blue-100 hover:bg-blue-50/30"}`}>
              <p className={`text-2xl font-black mb-0.5 ${ativo ? "text-[#005BFF]" : "text-[#031B3D]"}`}>{count}</p>
              <p className={`text-xs font-bold leading-snug ${ativo ? "text-[#005BFF]" : "text-slate-600"}`}>{card.label}</p>
              <p className="text-caption text-slate-400 mt-0.5">{card.sublabel}</p>
            </button>
          );
        })}
      </div>

      {/* Chips de filtros ativos */}
      {temFiltrosAtivos && <ChipsFiltrosAtivos filtros={filtrosAvancados} onRemover={removerFiltro} />}

      {/* Lista */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-600">
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""} · {cardConfig.label}
          </p>
          {cardAtivo !== "hoje" && (
            <button onClick={() => setCardAtivo("hoje")} className="text-xs text-[#005BFF] hover:underline">Prioridade hoje</button>
          )}
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">{cardAtivo === "hoje" ? "✅" : "📋"}</p>
            <p className="text-sm font-semibold text-slate-500">{cardConfig.vazio}</p>
            {cardAtivo === "hoje" && (
              <button onClick={() => setCardAtivo("todos")} className="text-xs text-[#005BFF] hover:underline mt-2 block mx-auto">Ver todos os clientes</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clientesFiltrados.map(c => (
              <ClienteCard key={c.id} cliente={c}
                onExecutar={(cliente) => onWhatsApp(cliente, null)}
                onFicha={onFicha}
              />
            ))}
          </div>
        )}
      </div>

      {/* Painel de filtros */}
      {filtrosPanelOpen && (
        <PainelFiltros
          filtrosAtivos={filtrosAvancados}
          onAplicar={(f) => { setFiltrosAvancados(f); setFiltrosPanelOpen(false); }}
          onFechar={() => setFiltrosPanelOpen(false)}
        />
      )}
    </div>
  );
}