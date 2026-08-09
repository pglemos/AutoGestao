import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Users, Zap } from "lucide-react";

// Determina o diagnóstico baseado nos dados do funil
function calcDiagnostico(funis, indicadores) {
  const totalQual = funis.internet.qualificados + funis.carteira.qualificados;
  const totalAgend = funis.internet.agendamento + funis.carteira.agendamento;
  const totalAtend = funis.showroom.atendimento + funis.internet.atendimento + funis.carteira.atendimento;
  const totalVenda = funis.showroom.venda + funis.internet.venda + funis.carteira.venda;
  const meta = indicadores.meta || 0;

  // Caso recuperação: tem atendimentos ou agendamentos sem venda
  const temAtendSemVenda = totalAtend > 0 && totalVenda < totalAtend;
  const temAgendSemAtend = totalAgend > 0 && totalAtend < totalAgend;
  if (temAtendSemVenda || temAgendSemAtend) {
    return {
      tipo: "recuperacao",
      titulo: "Existem oportunidades que já avançaram e podem virar venda.",
      subtexto: "Priorize clientes com Atendimento Comercial ou Agendamento sem venda.",
      botao: "Recuperar agora",
      href: "/carteira",
      cor: "amber",
    };
  }

  // Caso conversão: tem qualificados mas poucos agendamentos
  if (totalQual > 0 && totalAgend < totalQual * 0.5) {
    return {
      tipo: "conversao",
      titulo: "Você tem oportunidades, mas elas não estão avançando.",
      subtexto: "O maior vazamento está entre Qualificados e Agendamento.",
      botao: "Abrir Carteira",
      href: "/carteira",
      cor: "blue",
    };
  }

  // Caso volume: entrada baixa em relação à meta
  return {
    tipo: "volume",
    titulo: "Você precisa gerar mais oportunidades para bater a meta.",
    subtexto: "No ritmo atual, o volume de entrada está abaixo do necessário.",
    botao: "Abrir Plano de Ataque",
    href: "/carteira",
    cor: "purple",
  };
}

const COR_MAP = {
  amber: {
    bg: "bg-amber-50 border-amber-200",
    icon: "bg-amber-100 text-amber-600",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
    titulo: "text-amber-900",
    sub: "text-amber-700",
    label: "text-amber-600 bg-amber-100",
    labelText: "Recuperar",
  },
  blue: {
    bg: "bg-blue-50 border-blue-200",
    icon: "bg-blue-100 text-blue-600",
    btn: "bg-[#005BFF] hover:bg-blue-700 text-white",
    titulo: "text-blue-900",
    sub: "text-blue-700",
    label: "text-blue-600 bg-blue-100",
    labelText: "Converter",
  },
  purple: {
    bg: "bg-purple-50 border-purple-200",
    icon: "bg-purple-100 text-purple-600",
    btn: "bg-purple-600 hover:bg-purple-700 text-white",
    titulo: "text-purple-900",
    sub: "text-purple-700",
    label: "text-purple-600 bg-purple-100",
    labelText: "Volume",
  },
};

const ICONES = {
  volume: TrendingUp,
  conversao: Zap,
  recuperacao: Users,
};

export default function DiagnosticoPrincipal({ funis, indicadores }) {
  const diag = calcDiagnostico(funis, indicadores);
  const c = COR_MAP[diag.cor];
  const Icone = ICONES[diag.tipo];

  return (
    <div className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${c.bg}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        <Icone className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-caption font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.label}`}>{c.labelText}</span>
          <p className="text-caption font-bold text-slate-400 uppercase tracking-wide">Diagnóstico do mês</p>
        </div>
        <p className={`text-[14px] font-bold leading-snug ${c.titulo}`}>{diag.titulo}</p>
        <p className={`text-[12px] mt-0.5 ${c.sub}`}>{diag.subtexto}</p>
      </div>
      <Link
        to={diag.href}
        className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-body-sm font-bold transition-colors ${c.btn}`}
      >
        {diag.botao}
      </Link>
    </div>
  );
}