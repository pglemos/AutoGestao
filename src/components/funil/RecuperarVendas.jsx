import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";

/**
 * Calcula os maiores vazamentos do funil e gera recomendações.
 * Recebe os dados de eventos por canal.
 */
export function calcularRecomendacoes(funis) {
  const vazamentos = [];

  // Internet
  const inet = funis.internet;
  if (inet) {
    if (inet.oportunidades > 0)
      vazamentos.push({ canal: "Internet", de: "Oportunidades", para: "Qualificados", perda: inet.oportunidades - inet.qualificados, deVal: inet.oportunidades, paraVal: inet.qualificados, key: "inet_opp_qual" });
    if (inet.qualificados > 0)
      vazamentos.push({ canal: "Internet", de: "Qualificados", para: "Agendamento", perda: inet.qualificados - inet.agendamento, deVal: inet.qualificados, paraVal: inet.agendamento, key: "inet_qual_agend" });
    if (inet.agendamento > 0)
      vazamentos.push({ canal: "Internet", de: "Agendamento", para: "Atendimento Comercial", perda: inet.agendamento - inet.atendimento, deVal: inet.agendamento, paraVal: inet.atendimento, key: "inet_agend_atend" });
    if (inet.atendimento > 0)
      vazamentos.push({ canal: "Internet", de: "Atendimento Comercial", para: "Venda", perda: inet.atendimento - inet.venda, deVal: inet.atendimento, paraVal: inet.venda, key: "inet_atend_venda" });
  }

  // Carteira
  const cart = funis.carteira;
  if (cart) {
    if (cart.qualificados > 0)
      vazamentos.push({ canal: "Carteira", de: "Qualificados", para: "Agendamento", perda: cart.qualificados - cart.agendamento, deVal: cart.qualificados, paraVal: cart.agendamento, key: "cart_qual_agend" });
    if (cart.agendamento > 0)
      vazamentos.push({ canal: "Carteira", de: "Agendamento", para: "Atendimento Comercial", perda: cart.agendamento - cart.atendimento, deVal: cart.agendamento, paraVal: cart.atendimento, key: "cart_agend_atend" });
    if (cart.atendimento > 0)
      vazamentos.push({ canal: "Carteira", de: "Atendimento Comercial", para: "Venda", perda: cart.atendimento - cart.venda, deVal: cart.atendimento, paraVal: cart.venda, key: "cart_atend_venda" });
  }

  // Showroom
  const show = funis.showroom;
  if (show && show.atendimento > 0)
    vazamentos.push({ canal: "Showroom", de: "Atendimento Comercial", para: "Venda", perda: show.atendimento - show.venda, deVal: show.atendimento, paraVal: show.venda, key: "show_atend_venda" });

  // Filtrar apenas com perda > 0 e etapa anterior > 0
  const relevantes = vazamentos
    .filter(v => v.perda > 0 && v.deVal > 0)
    .sort((a, b) => {
      if (b.perda !== a.perda) return b.perda - a.perda;
      const convA = a.paraVal / a.deVal;
      const convB = b.paraVal / b.deVal;
      return convA - convB;
    })
    .slice(0, 3);

  return relevantes;
}

const MENSAGENS = {
  inet_opp_qual: {
    titulo: "Internet precisa de mais qualificação",
    texto: "Existem oportunidades que ainda não viraram clientes qualificados.",
    botao: "Abrir Fechamento Diário",
    link: "/fechamento",
  },
  inet_qual_agend: {
    titulo: "Falta gerar compromisso",
    texto: "Clientes qualificados não estão avançando para agendamento.",
    botao: "Abrir Carteira",
    link: "/carteira",
  },
  inet_agend_atend: {
    titulo: "Agendamentos não estão virando atendimento",
    texto: "Existem compromissos que não chegaram ao atendimento comercial.",
    botao: "Abrir Carteira",
    link: "/carteira",
  },
  inet_atend_venda: {
    titulo: "Atendimentos sem fechamento",
    texto: "Atendimentos comerciais estão acontecendo, mas não estão virando venda.",
    botao: "Abrir Carteira",
    link: "/carteira",
  },
  cart_qual_agend: {
    titulo: "Falta gerar compromisso na Carteira",
    texto: "Clientes qualificados da Carteira não estão avançando para agendamento.",
    botao: "Abrir Carteira",
    link: "/carteira",
  },
  cart_agend_atend: {
    titulo: "Agendamentos não estão virando atendimento",
    texto: "Existem compromissos da Carteira que não chegaram ao atendimento comercial.",
    botao: "Ver agendamentos",
    link: "/carteira",
  },
  cart_atend_venda: {
    titulo: "Atendimentos sem fechamento",
    texto: "Atendimentos comerciais da Carteira não estão convertendo em venda.",
    botao: "Abrir Carteira",
    link: "/carteira",
  },
  show_atend_venda: {
    titulo: "Showroom precisa converter melhor",
    texto: "Os atendimentos comerciais do Showroom estão gerando poucas vendas.",
    botao: "Ver atendimentos",
    link: "/fechamento",
  },
};

const CORES = [
  { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", badge: "bg-red-100 text-red-700" },
  { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700" },
  { bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-500", badge: "bg-orange-100 text-orange-700" },
];

export default function RecuperarVendas({ funis }) {
  const recomendacoes = calcularRecomendacoes(funis);

  if (recomendacoes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-[16px] font-bold text-[#0F172A] mb-1">Onde recuperar vendas?</h2>
        <p className="text-body-sm text-slate-400">
          {Object.values(funis).every(f => !f || Object.values(f).every(v => v === 0))
            ? "Registre atendimentos no Fechamento Diário para ver onde há oportunidades de melhoria."
            : "Funil equilibrado. Sem grandes vazamentos identificados no período."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-[16px] font-bold text-[#0F172A] mb-1">Onde recuperar vendas?</h2>
      <p className="text-[12px] text-slate-400 mb-5">Os maiores pontos de perda no seu funil.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {recomendacoes.map((rec, idx) => {
          const msg = MENSAGENS[rec.key] || { titulo: `${rec.de} → ${rec.para}`, texto: `Perda de ${rec.perda} no canal ${rec.canal}.`, botao: "Abrir Carteira", link: "/carteira" };
          const c = CORES[idx] || CORES[0];
          const conv = rec.deVal > 0 ? Math.round((rec.paraVal / rec.deVal) * 100) : 0;
          return (
            <div key={rec.key} className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3`}>
              <div className="flex items-start gap-2">
                <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.icon}`} />
                <div className="flex-1">
                  <p className="text-body-sm font-bold text-[#0F172A] leading-snug">{msg.titulo}</p>
                  <span className={`inline-block text-caption font-bold px-2 py-0.5 rounded-full mt-1 ${c.badge}`}>{rec.canal}</span>
                </div>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">{msg.texto}</p>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                <div className="text-caption text-slate-400">
                  <span className="font-bold text-[#0F172A]">{rec.de}</span> → <span className="font-bold text-[#0F172A]">{rec.para}</span>
                  <span className="ml-1">({conv}% conversão)</span>
                </div>
              </div>
              <Link to={msg.link} className="flex items-center gap-1 text-[12px] font-bold text-[#005BFF] hover:underline mt-auto">
                {msg.botao} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}