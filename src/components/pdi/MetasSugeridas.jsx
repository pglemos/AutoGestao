import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, TrendingUp, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import moment from "moment";

function calcMetrics(dailyCloses, clients) {
  if (!dailyCloses.length) return null;

  // Últimos 30 registros de fechamento
  const closes = dailyCloses.slice(0, 30);
  const n = closes.length;

  const totalLeads = closes.reduce((s, d) => s + (d.leads_carteira || 0) + (d.leads_internet || 0), 0);
  const totalAtend = closes.reduce((s, d) => s + (d.atendimentos_showroom || 0) + (d.atendimentos_carteira || 0) + (d.atendimentos_internet || 0), 0);
  const totalAgend = closes.reduce((s, d) => s + (d.agendamentos_carteira || 0) + (d.agendamentos_internet || 0), 0);

  const avgLeadsDia = Math.round(totalLeads / n);
  const avgAtendDia = Math.round(totalAtend / n);
  const avgAgendDia = Math.round((totalAgend / n) * 10) / 10;

  // Vendas dos clientes cadastrados no período
  const vendasClients = clients.filter(c => c.sale_status === "Sim" || c.sale_completed === true);
  const diasPeriodo = Math.max(1, moment().diff(moment(closes[closes.length - 1]?.date), "days") + 1);
  const avgVendasMes = Math.round((vendasClients.length / diasPeriodo) * 22); // dias úteis estimados

  // Taxa de conversão: vendas / atendimentos
  const taxaConversao = totalAtend > 0 ? Math.round((vendasClients.length / totalAtend) * 100) : 0;

  // Taxa de agendamento: agendamentos / leads
  const taxaAgend = totalLeads > 0 ? Math.round((totalAgend / totalLeads) * 100) : 0;

  return { avgLeadsDia, avgAtendDia, avgAgendDia, avgVendasMes, taxaConversao, taxaAgend, diasAnalisados: n };
}

function MetaCard({ label, valor, sugestao, cor, detalhe }) {
  return (
    <div className={`rounded-xl border p-4 ${cor}`}>
      <p className="text-caption font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-h2 font-bold tabular-nums text-slate-800 leading-none">{sugestao}</span>
        <span className="text-caption text-slate-400 mb-1">sugerido</span>
      </div>
      {detalhe && <p className="text-caption text-slate-400 mt-1">{detalhe}</p>}
      <p className="text-caption text-slate-300 mt-0.5">Média atual: {valor}</p>
    </div>
  );
}

export default function MetasSugeridas() {
  const [dailyCloses, setDailyCloses] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.DailyClose.list("-date", 30).catch(() => []),
      base44.entities.Client.list("-created_date", 200).catch(() => []),
    ]).then(([closes, cls]) => {
      setDailyCloses(closes);
      setClients(cls);
      setLoading(false);
    });
  }, []);

  const metrics = useMemo(() => calcMetrics(dailyCloses, clients), [dailyCloses, clients]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Analisando histórico...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-mx-amber" />
          <h3 className="text-base font-semibold text-mx-navy">Metas Sugeridas</h3>
        </div>
        <p className="text-sm text-slate-400">Nenhum dado histórico disponível. Preencha o Fechamento Diário para começar a receber sugestões personalizadas.</p>
      </div>
    );
  }

  // Sugestões: +15% sobre a média atual (arredondado)
  const bump = (v, pct = 15) => Math.max(1, Math.round(v * (1 + pct / 100)));

  const metas = [
    {
      label: "Leads / dia",
      valor: `${metrics.avgLeadsDia}/dia`,
      sugestao: bump(metrics.avgLeadsDia),
      cor: "border-blue-100 bg-blue-50/40",
      detalhe: `+15% sobre sua média dos últimos ${metrics.diasAnalisados} dias`,
    },
    {
      label: "Atendimentos / dia",
      valor: `${metrics.avgAtendDia}/dia`,
      sugestao: bump(metrics.avgAtendDia),
      cor: "border-purple-100 bg-purple-50/40",
      detalhe: `+15% sobre sua média dos últimos ${metrics.diasAnalisados} dias`,
    },
    {
      label: "Agendamentos D+1 / dia",
      valor: `${metrics.avgAgendDia}/dia`,
      sugestao: bump(metrics.avgAgendDia),
      cor: "border-amber-100 bg-amber-50/40",
      detalhe: `+15% sobre sua média dos últimos ${metrics.diasAnalisados} dias`,
    },
    {
      label: "Vendas / mês",
      valor: `${metrics.avgVendasMes}/mês`,
      sugestao: bump(metrics.avgVendasMes),
      cor: "border-green-100 bg-green-50/40",
      detalhe: `Projeção baseada no ritmo atual (22 dias úteis)`,
    },
    {
      label: "Taxa de Conversão",
      valor: `${metrics.taxaConversao}%`,
      sugestao: `${Math.min(100, bump(metrics.taxaConversao))}%`,
      cor: "border-indigo-100 bg-indigo-50/40",
      detalhe: "Vendas / atendimentos totais",
    },
    {
      label: "Taxa de Agendamento",
      valor: `${metrics.taxaAgend}%`,
      sugestao: `${Math.min(100, bump(metrics.taxaAgend))}%`,
      cor: "border-teal-100 bg-teal-50/40",
      detalhe: "Agendamentos / leads recebidos",
    },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-mx-amber" />
          <div className="text-left">
            <h3 className="text-base font-semibold text-mx-navy">Metas Sugeridas pelo Histórico</h3>
            <p className="text-xs text-slate-400 mt-0.5">Baseado nos últimos {metrics.diasAnalisados} fechamentos — use como referência para o Funil de Vendas</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {metas.map(m => (
              <MetaCard key={m.label} {...m} />
            ))}
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <TrendingUp className="w-4 h-4 text-mx-amber flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-relaxed">
              As sugestões são calculadas com <strong>+15% de incremento</strong> sobre sua média histórica. Ajuste suas metas no Funil de Vendas e no seu Perfil para refletir esses objetivos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}