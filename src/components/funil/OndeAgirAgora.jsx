import React from "react";
import { Link } from "react-router-dom";

function calcAcoes(funis) {
  const acoes = [];

  // Atendimento Comercial Internet sem venda
  if (funis.internet.atendimento > 0 && funis.internet.venda < funis.internet.atendimento) {
    acoes.push({
      canal: "Internet",
      titulo: "Converter atendimentos em venda",
      texto: `Você teve ${funis.internet.atendimento} atendimento${funis.internet.atendimento > 1 ? "s" : ""} comercial${funis.internet.atendimento > 1 ? "is" : ""} pela Internet e ${funis.internet.venda === 0 ? "nenhuma venda" : `apenas ${funis.internet.venda} venda${funis.internet.venda > 1 ? "s" : ""}`}.`,
      botao: "Abrir Carteira",
      href: "/carteira",
      cor: "blue",
    });
  }

  // Qualificados Internet sem agendamento
  if (funis.internet.qualificados > 0 && funis.internet.agendamento < funis.internet.qualificados) {
    acoes.push({
      canal: "Internet",
      titulo: "Gerar mais agendamentos",
      texto: `Você tem ${funis.internet.qualificados} qualificado${funis.internet.qualificados > 1 ? "s" : ""}, mas apenas ${funis.internet.agendamento} agendamento${funis.internet.agendamento !== 1 ? "s" : ""}.`,
      botao: "Trabalhar qualificados",
      href: "/carteira",
      cor: "blue",
    });
  }

  // Atendimento Carteira sem venda
  if (funis.carteira.atendimento > 0 && funis.carteira.venda < funis.carteira.atendimento) {
    acoes.push({
      canal: "Carteira",
      titulo: "Recuperar oportunidades da Carteira",
      texto: `Existem ${funis.carteira.atendimento} atendimento${funis.carteira.atendimento > 1 ? "s" : ""} da Carteira que ainda não viraram venda.`,
      botao: "Recuperar oportunidades",
      href: "/carteira",
      cor: "green",
    });
  }

  // Agendamento Carteira sem atendimento
  if (funis.carteira.agendamento > 0 && funis.carteira.atendimento < funis.carteira.agendamento) {
    acoes.push({
      canal: "Carteira",
      titulo: "Confirmar agendamentos da Carteira",
      texto: `Você tem ${funis.carteira.agendamento} agendamento${funis.carteira.agendamento > 1 ? "s" : ""} sem atendimento registrado.`,
      botao: "Abrir Carteira",
      href: "/carteira",
      cor: "green",
    });
  }

  // Showroom — atendimento sem venda
  if (funis.showroom.atendimento > 0 && funis.showroom.venda < funis.showroom.atendimento) {
    acoes.push({
      canal: "Showroom",
      titulo: "Fechar atendimentos do Showroom",
      texto: `Você atendeu ${funis.showroom.atendimento} cliente${funis.showroom.atendimento > 1 ? "s" : ""} no Showroom e fechou apenas ${funis.showroom.venda} venda${funis.showroom.venda !== 1 ? "s" : ""}.`,
      botao: "Abrir Carteira",
      href: "/carteira",
      cor: "orange",
    });
  }

  // Retorna no máximo 3
  return acoes.slice(0, 3);
}

const COR_BADGE = {
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-700",
  amber:  "bg-amber-100 text-amber-700",
};
const COR_BTN = {
  blue:   "bg-[#005BFF] hover:bg-blue-700 text-white",
  green:  "bg-green-600 hover:bg-green-700 text-white",
  orange: "bg-orange-500 hover:bg-orange-600 text-white",
  amber:  "bg-amber-500 hover:bg-amber-600 text-white",
};
const PRIORIDADE_COR = ["text-red-500", "text-amber-500", "text-muted-foreground"];

export default function OndeAgirAgora({ funis }) {
  const acoes = calcAcoes(funis);

  if (acoes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
        <h2 className="text-body-sm font-bold text-[#0F172A] uppercase tracking-wide mb-1">Onde agir agora</h2>
        <p className="text-body-sm text-muted-foreground">Nenhuma ação prioritária identificada. Continue no ritmo atual.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <h2 className="text-body-sm font-bold text-[#0F172A] uppercase tracking-wide mb-4">Onde agir agora</h2>
      <div className="space-y-3">
        {acoes.map((acao, idx) => (
          <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-slate-50 border border-border-subtle">
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className={`text-body-sm font-bold tabular-nums ${PRIORIDADE_COR[idx] || "text-muted-foreground"}`}>{idx + 1}</span>
              <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${COR_BADGE[acao.cor] || "bg-slate-100 text-muted-foreground"}`}>{acao.canal}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-bold text-[#0F172A]">{acao.titulo}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{acao.texto}</p>
            </div>
            <Link
              to={acao.href}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[12px] font-bold transition-colors ${COR_BTN[acao.cor] || COR_BTN.blue}`}
            >
              {acao.botao}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}