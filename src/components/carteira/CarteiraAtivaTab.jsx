import React, { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Zap, FileText, Star, SlidersHorizontal, X, CircleHelp } from "lucide-react";
import moment from "moment";
import {
  calcularObjetivoEProximoPasso, calcularScore, calcularPrioridade,
  classificacaoScore, tempColor, prioridadeColor, explicacaoCliente,
  SITUACOES_ENCERRADAS_SEM_VENDA,
  isPosVenda30Dias, isRecompra1Ano, isAgendamentoHoje, isPrioridadeSistema,
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
  const s = c.situacao_atual || c.momento || "";
  if (SITUACOES_ENCERRADAS_SEM_VENDA.includes(s)) return false;

  // 1. Agendamento de visita para hoje (Prioridade Máxima)
  if (isAgendamentoHoje(c)) return true;

  // 2. Pós-venda 30 dias (Pedido de Indicação após 30 dias da venda)
  if (isPosVenda30Dias(c)) return true;

  // 3. Recompra 1 ano (365 dias da data da venda com bônus de troca)
  if (isRecompra1Ano(c)) return true;

  // 4. Prioridades reais do sistema (respostas pendentes, financiamento aprovado, ações com data hoje/vencida)
  if (isPrioridadeSistema(c)) return true;

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
    // 1. Agendamento hoje é prioridade topo absoluto
    const aAgend = isAgendamentoHoje(a) ? 0 : 1;
    const bAgend = isAgendamentoHoje(b) ? 0 : 1;
    if (aAgend !== bAgend) return aAgend - bAgend;

    // 2. Pós-venda 30d e Recompra 1 ano
    const aEspecial = (isPosVenda30Dias(a) || isRecompra1Ano(a)) ? 0 : 1;
    const bEspecial = (isPosVenda30Dias(b) || isRecompra1Ano(b)) ? 0 : 1;
    if (aEspecial !== bEspecial) return aEspecial - bEspecial;

    // 3. Vencidos e hoje
    const aVenc = isVencido(a.proxima_acao_data) ? 0 : isMesmodia(a.proxima_acao_data, 0) ? 1 : 2;
    const bVenc = isVencido(b.proxima_acao_data) ? 0 : isMesmodia(b.proxima_acao_data, 0) ? 1 : 2;
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
  const explicacoes = motivos.length > 0 ? motivos : ["Sem fatores adicionais para este score."];
  return (
    <details className="group relative w-fit">
      <summary
        className={`flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-full px-2 py-1 text-caption font-bold outline-none focus-visible:ring-2 focus-visible:ring-status-info/40 sm:min-h-8 ${cls.color}`}
        aria-label={`Score comercial ${score}, classificação ${cls.label}. Ative para ver os motivos.`}
      >
        <Star className="h-3 w-3" aria-hidden="true" />
        <span>{score} · {cls.label}</span>
        <CircleHelp className="h-3.5 w-3.5 opacity-70 group-open:hidden" aria-hidden="true" />
      </summary>
      <div className="mt-1 max-w-64 rounded-xl border border-border-subtle bg-white p-2 text-caption font-medium leading-relaxed text-muted-foreground shadow-sm" role="note">
        <span className="block font-bold text-foreground">Por que este score?</span>
        {explicacoes.slice(0, 2).map(motivo => <span key={motivo} className="mt-0.5 block">{motivo}</span>)}
      </div>
    </details>
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
  const encerradoSemVenda = SITUACOES_ENCERRADAS_SEM_VENDA.includes(situacao);

  const ehAgendamentoHoje = isAgendamentoHoje(cliente);
  const ehPosVenda30d = isPosVenda30Dias(cliente);
  const ehRecompra1a = isRecompra1Ano(cliente);

  // Calcular iniciais com proteção contra espaços em branco
  const nomeLimpo = (cliente.nome || "").trim();
  const iniciais = nomeLimpo
    ? nomeLimpo.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase()
    : "?";

  return (
    <div className={`bg-white border rounded-2xl hover:shadow-sm transition-shadow ${
      prioridade === "Máxima" ? "border-status-error/30" : prioridade === "Alta" ? "border-status-warning/20" : "border-border-subtle"
    }`}>
      {/* MOBILE */}
      <div className="flex flex-col gap-3 p-4 sm:hidden">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-status-info-surface flex items-center justify-center text-xs font-black text-status-info-text shrink-0">{iniciais}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-mx-navy truncate">{cliente.nome}</p>
              <p className="text-caption text-muted-foreground truncate">{canal} · {cliente.veiculo_interesse || cliente.veiculo_comprado || "Sem veículo"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
            {ehAgendamentoHoje && <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-status-info-surface text-status-info-text border border-status-info/30">📅 Visita Hoje</span>}
            {ehPosVenda30d && <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-status-warning-surface text-status-warning-text border border-status-warning/40">⭐ Indicação 30d</span>}
            {ehRecompra1a && <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-brand-primary-subtle text-brand-primary border border-brand-primary/30">🔁 Recompra 1 ano</span>}
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full border ${tempColor(cliente.temperatura)}`}>{cliente.temperatura}</span>
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full ${prioridadeColor(prioridade)}`}>{prioridade}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-alt rounded-xl px-2.5 py-2">
            <p className="text-caption text-muted-foreground font-bold uppercase tracking-wide">Situação</p>
            <p className="text-caption font-semibold text-foreground mt-0.5 leading-snug">{situacao}</p>
          </div>
          <div className="bg-status-info-surface rounded-xl px-2.5 py-2">
            <p className="text-caption text-status-info-text font-bold uppercase tracking-wide">Mentor recomenda</p>
            <p className="text-caption font-semibold text-mx-navy mt-0.5 leading-snug">{proximoPasso}</p>
          </div>
        </div>
        <p className="hidden text-caption text-muted-foreground leading-snug italic sm:block">{explicacao}</p>
        <ScoreBadge score={score} motivos={motivos} />
        <div className="flex gap-2">
          {!encerradoSemVenda && (
          <button onClick={() => onExecutar(cliente)}
            className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-white bg-status-info hover:bg-status-info px-3 py-2 rounded-xl transition-colors flex-1 justify-center">
            <Zap className="w-3.5 h-3.5" /> Executar
          </button>
          )}
          <button onClick={() => onFicha(cliente.id)}
            className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-muted-foreground border border-border hover:bg-surface-alt px-3 py-2 rounded-xl transition-colors flex-1 justify-center">
            <FileText className="w-3.5 h-3.5" /> Ficha
          </button>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:flex items-stretch divide-x divide-border-subtle">
        <div className="flex items-center gap-3 px-4 py-3.5 w-52 shrink-0">
          <div className="w-10 h-10 rounded-full bg-status-info-surface flex items-center justify-center text-sm font-black text-status-info-text shrink-0">{iniciais}</div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-mx-navy truncate">{cliente.nome}</p>
            <p className="text-caption text-muted-foreground truncate">{canal}</p>
            <p className="text-caption text-muted-foreground truncate">{cliente.veiculo_interesse || cliente.veiculo_comprado || "Sem veículo"}</p>
          </div>
        </div>
        <div className="px-4 py-3.5 w-52 shrink-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {ehAgendamentoHoje && <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-status-info-surface text-status-info-text border border-status-info/30">📅 Visita Hoje</span>}
            {ehPosVenda30d && <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-status-warning-surface text-status-warning-text border border-status-warning/40">⭐ Indicação 30d</span>}
            {ehRecompra1a && <span className="text-caption font-bold px-1.5 py-0.5 rounded-full bg-brand-primary-subtle text-brand-primary border border-brand-primary/30">🔁 Recompra 1 ano</span>}
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full border ${tempColor(cliente.temperatura)}`}>{cliente.temperatura}</span>
            <span className={`text-caption font-bold px-1.5 py-0.5 rounded-full ${prioridadeColor(prioridade)}`}>{prioridade}</span>
          </div>
          <div>
            <p className="text-caption text-muted-foreground font-bold uppercase tracking-wide">Situação</p>
            <p className="text-caption font-semibold text-foreground leading-snug mt-0.5">{situacao}</p>
          </div>
          <ScoreBadge score={score} motivos={motivos} />
        </div>
        <div className="min-w-0 flex-1 px-4 py-3.5 bg-status-info-surface/30 space-y-1.5">
          <div>
            <p className="text-caption text-muted-foreground font-bold uppercase tracking-wide">Objetivo</p>
            <p className="text-caption font-semibold text-muted-foreground leading-snug mt-0.5">{objetivo}</p>
          </div>
          <div>
            <p className="text-caption text-status-info-text font-bold uppercase tracking-wide">Mentor recomenda</p>
            <p className="text-caption font-bold text-mx-navy leading-snug mt-0.5">{proximoPasso}</p>
          </div>
          <p className="text-caption text-muted-foreground italic leading-snug">{explicacao}</p>
        </div>
        <div className="flex flex-col gap-1.5 px-4 py-3.5 shrink-0 w-40 justify-center">
          {!encerradoSemVenda && (
          <button onClick={() => onExecutar(cliente)}
            className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-white bg-status-info hover:bg-status-info px-3 py-2 rounded-xl transition-colors justify-center">
            <Zap className="w-3.5 h-3.5" /> Executar próximo passo
          </button>
          )}
          <button onClick={() => onFicha(cliente.id)}
            className="flex min-h-11 items-center gap-1.5 text-xs font-bold text-muted-foreground border border-border hover:bg-surface-alt px-3 py-2 rounded-xl transition-colors justify-center">
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
    return `min-h-11 text-caption font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
      ativo ? "bg-status-info text-white border-status-info" : "bg-white text-muted-foreground border-border hover:border-status-info/40"
    }`;
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onFechar(); }}>
      <SheetContent side="right" className="w-80 max-w-full gap-0 p-0 sm:max-w-xs">
        <SheetHeader className="border-b border-border-subtle px-5 py-4 pr-14 text-left">
          <SheetTitle className="font-black text-mx-navy">Filtros</SheetTitle>
          <SheetDescription>Refine a carteira por veículo, origem, situação, período e prioridade.</SheetDescription>
        </SheetHeader>

        <SheetBody className="mx-overlay-body min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">Veículo de interesse</p>
            <input
              aria-label="Veículo de interesse"
              value={local.veiculo || ""}
              onChange={e => set("veiculo", e.target.value)}
              placeholder="Ex: HR-V, Corolla..."
              className="w-full min-h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-status-info/40"
            />
          </div>

          <div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">Origem</p>
            <div className="flex flex-wrap gap-1.5">
              {ORIGENS_FILTRO.map(o => (
                <button key={o} onClick={() => toggle("origens", o)} className={chipClass((local.origens || []).includes(o))}>{o}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">Situação</p>
            <div className="flex flex-wrap gap-1.5">
              {SITUACOES_FILTRO.map(s => (
                <button key={s} onClick={() => toggle("situacoes", s)} className={chipClass((local.situacoes || []).includes(s))}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">Período</p>
            <div className="flex flex-wrap gap-1.5">
              {PERIODOS_FILTRO.map(p => (
                <button key={p} onClick={() => toggle("periodos", p)} className={chipClass((local.periodos || []).includes(p))}>{p}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">Prioridade</p>
            <div className="flex flex-wrap gap-1.5">
              {PRIORIDADES_FILTRO.map(p => (
                <button key={p} onClick={() => toggle("prioridades", p)} className={chipClass((local.prioridades || []).includes(p))}>{p}</button>
              ))}
            </div>
          </div>
        </SheetBody>

        <SheetFooter className="shrink-0 px-5 py-4 border-t border-border-subtle flex-row gap-2">
          <Button variant="outline" onClick={() => { setLocal({}); onAplicar({}); }} className="flex-1 rounded-xl text-sm">Limpar</Button>
          <Button onClick={() => onAplicar(local)} className="flex-1 rounded-xl bg-status-info hover:bg-status-info text-white text-sm">Aplicar filtros</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
        <span key={chip.key} className="flex items-center gap-1 text-caption font-semibold px-2.5 py-1 rounded-lg bg-status-info-surface text-status-info-text border border-status-info/30">
          {chip.label}
          <button type="button" onClick={() => onRemover(chip.key)} aria-label={`Remover filtro ${chip.label}`} className="grid min-h-8 min-w-8 place-items-center rounded-md sm:min-h-6 sm:min-w-6"><X className="w-3 h-3" /></button>
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

    const hojeClientes = safeClientes.filter(c => {
      if (!c) return false;
      const s = c.situacao_atual || c.momento || "";
      if (c.ativo === false || SITUACOES_ENCERRADAS_SEM_VENDA.includes(s)) return false;
      return (!isComprador(c) || isPosVenda30Dias(c) || isRecompra1Ano(c)) && filtrarHoje(c);
    });

    return {
      hoje: hojeClientes.length,
      amanha: activeN.filter(CARDS[1].filtro).length,
      d2: activeN.filter(CARDS[2].filtro).length,
      d3: activeN.filter(CARDS[3].filtro).length,
      compraram: safeClientes.filter(isComprador).length,
      todos: safeClientes.filter(c => c && c.ativo !== false && !SITUACOES_ENCERRADAS_SEM_VENDA.includes(c.situacao_atual || c.momento || "")).length,
    };
  }, [safeClientes, CARDS, isComprador]);

  const cardConfig = useMemo(() => CARDS.find(c => c.id === cardAtivo) || CARDS[0], [cardAtivo, CARDS]);

  const clientesFiltrados = useMemo(() => {
    let lista = safeClientes;
    if (cardAtivo === "compraram") {
      lista = lista.filter(isComprador);
    } else if (cardAtivo === "todos") {
      lista = lista.filter(c => c && c.ativo !== false && !SITUACOES_ENCERRADAS_SEM_VENDA.includes(c.situacao_atual || c.momento || ""));
    } else if (cardAtivo === "hoje") {
      lista = lista.filter(c => {
        if (!c) return false;
        const s = c.situacao_atual || c.momento || "";
        if (c.ativo === false || SITUACOES_ENCERRADAS_SEM_VENDA.includes(s)) return false;
        return (!isComprador(c) || isPosVenda30Dias(c) || isRecompra1Ano(c)) && filtrarHoje(c);
      });
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
    <div className="space-y-3 sm:space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-mx-navy">Mentor Comercial</h1>
          <p className="mt-1 hidden text-sm text-muted-foreground sm:block">Sua agenda comercial de hoje. Execute e registre resultados.</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:flex-wrap">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <label htmlFor="carteira-busca" className="sr-only">Buscar cliente por nome ou telefone</label>
            <input id="carteira-busca" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
              className="min-h-11 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-status-info/40 sm:w-52" />
          </div>
          <button
            onClick={() => setFiltrosPanelOpen(true)}
            className={`flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
              temFiltrosAtivos ? "bg-status-info text-white border-status-info" : "bg-white border-border text-muted-foreground hover:border-status-info/40"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </button>
        </div>
      </div>

      {/* Cards de agenda */}
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0 sm:pb-0" aria-label="Períodos da carteira">
        {CARDS.map(card => {
          const count = counts[card.id] ?? 0;
          const ativo = cardAtivo === card.id;
          return (
            <button key={card.id} onClick={() => setCardAtivo(card.id)}
              aria-pressed={ativo}
              className={`min-h-[88px] min-w-[132px] snap-start rounded-2xl border p-3 text-left transition-colors sm:min-w-0 sm:p-3.5 ${ativo ? "border-status-info bg-status-info-surface shadow-sm" : "border-border-subtle bg-white hover:border-status-info/20 hover:bg-status-info-surface/30"}`}>
              <p className={`text-2xl font-black mb-0.5 ${ativo ? "text-status-info-text" : "text-mx-navy"}`}>{count}</p>
              <p className={`text-xs font-bold leading-snug ${ativo ? "text-status-info-text" : "text-muted-foreground"}`}>{card.label}</p>
              <p className="text-caption text-muted-foreground mt-0.5">{card.sublabel}</p>
            </button>
          );
        })}
      </div>

      {/* Chips de filtros ativos */}
      {temFiltrosAtivos && <ChipsFiltrosAtivos filtros={filtrosAvancados} onRemover={removerFiltro} />}

      {/* Lista */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-muted-foreground">
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? "s" : ""} · {cardConfig.label}
          </p>
          {cardAtivo !== "hoje" && (
            <button onClick={() => setCardAtivo("hoje")} className="min-h-11 px-2 text-xs font-semibold text-status-info-text hover:underline">Prioridade hoje</button>
          )}
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="bg-white border border-border-subtle rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">{cardAtivo === "hoje" ? "✅" : "📋"}</p>
            <p className="text-sm font-semibold text-muted-foreground">{cardConfig.vazio}</p>
            {cardAtivo === "hoje" && (
              <button onClick={() => setCardAtivo("todos")} className="mx-auto mt-2 block min-h-11 px-3 text-xs font-semibold text-status-info-text hover:underline">Ver todos os clientes</button>
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
