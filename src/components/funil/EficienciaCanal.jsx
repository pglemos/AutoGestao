import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Retorna null se pct > 100 (base não sequencial) ou se não houver base
function pctSeguro(a, b) {
  if (!b || b === 0) return null;
  const v = Math.round((a / b) * 100);
  if (v > 100) return null; // base não sequencial
  return v;
}

function pctLabel(a, b) {
  const v = pctSeguro(a, b);
  if (v === null) {
    if (!b || b === 0) return null;
    return "—"; // base não sequencial
  }
  return `${v}%`;
}

function EtapaLinha({ label, valor, conv }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
      <div className="flex flex-col">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        {conv !== null && conv !== undefined && (
          <span className="text-caption text-muted-foreground">→ {conv}</span>
        )}
      </div>
      <span className="text-[14px] font-bold tabular-nums text-[#0F172A]">{valor}</span>
    </div>
  );
}

function CanalCard({ titulo, cor, volumeLabel, volume, vendas, conversaoGeral, etapas }) {
  const [expandido, setExpandido] = useState(false);
  const COR = {
    orange: { header: "bg-status-warning-surface border-status-warning/30", badge: "bg-status-warning-surface text-status-warning-text", btn: "text-status-warning-text hover:text-orange-800" },
    blue:   { header: "bg-status-info-surface border-status-info/30",     badge: "bg-status-info-surface text-status-info-text",     btn: "text-status-info-text hover:text-status-info-text" },
    green:  { header: "bg-green-50 border-green-200",   badge: "bg-green-100 text-green-700",   btn: "text-status-success-text hover:text-green-800" },
  };
  const c = COR[cor] || COR.blue;
  const semDados = volume === 0 && vendas === 0;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${c.header}`}>
        <p className="text-[12px] font-bold text-[#0F172A] uppercase tracking-wide">{titulo}</p>
        {conversaoGeral !== null && !semDados ? (
          <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${c.badge}`}>{conversaoGeral}% conv.</span>
        ) : (
          <span className="text-caption text-text-disabled">Sem dados</span>
        )}
      </div>

      {/* Resumo compacto */}
      <div className="px-4 py-3">
        {semDados ? (
          <p className="text-[12px] text-text-disabled italic">Sem base suficiente para projeção.</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-caption text-muted-foreground">{volumeLabel}</p>
              <p className="text-[20px] font-bold tabular-nums text-[#0F172A]">{volume}</p>
            </div>
            <div className="text-center">
              <p className="text-caption text-muted-foreground">Vendas</p>
              <p className="text-[20px] font-bold tabular-nums text-status-success-text">{vendas}</p>
            </div>
            <div className="text-center">
              <p className="text-caption text-muted-foreground">Conversão</p>
              <p className="text-[20px] font-bold tabular-nums text-[#0F172A]">{conversaoGeral !== null ? `${conversaoGeral}%` : "—"}</p>
            </div>
          </div>
        )}

        {/* Botão ver etapas */}
        {!semDados && etapas.length > 0 && (
          <button
            onClick={() => setExpandido(v => !v)}
            className={`flex items-center gap-1 text-caption font-semibold mt-2.5 ${c.btn} transition-colors`}
          >
            {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expandido ? "Ocultar etapas" : "Ver etapas"}
          </button>
        )}
      </div>

      {/* Etapas expandidas */}
      {expandido && (
        <div className="px-4 pb-3 border-t border-border-subtle pt-2">
          {etapas.map((e, i) => (
            <EtapaLinha key={i} label={e.label} valor={e.valor} conv={e.conv} />
          ))}
        </div>
      )}
    </div>
  );
}

function calcLimitador(funis) {
  const totalVendas = funis.showroom.venda + funis.internet.venda + funis.carteira.venda;
  if (totalVendas === 0) return "Hoje ainda não há vendas suficientes para identificar o principal limitador.";

  // Melhor canal por conversão geral
  const convShow = funis.showroom.atendimento > 0 ? funis.showroom.venda / funis.showroom.atendimento : 0;
  const convInet = funis.internet.oportunidades > 0 ? funis.internet.venda / funis.internet.oportunidades : 0;
  const convCart = funis.carteira.qualificados > 0 ? funis.carteira.venda / funis.carteira.qualificados : 0;
  const melhor = Math.max(convShow, convInet, convCart);

  if (melhor === 0) return "Ainda não há base suficiente para identificar o principal limitador.";

  // Ordem preferencial em empate: Carteira > Internet > Showroom
  if (convCart >= melhor - 0.001) return "Carteira é o canal com melhor base para buscar a meta.";
  if (convInet >= melhor - 0.001) return "Internet é o canal com melhor base para buscar a meta.";
  return "Showroom é o canal com melhor base para buscar a meta.";
}

export default function EficienciaCanal({ funis }) {
  const limitador = calcLimitador(funis);

  // Showroom
  const showConv = pctLabel(funis.showroom.venda, funis.showroom.atendimento);
  const showConvNum = pctSeguro(funis.showroom.venda, funis.showroom.atendimento);
  const showEtapas = [
    { label: "Atendimento Comercial", valor: funis.showroom.atendimento, conv: pctLabel(funis.showroom.venda, funis.showroom.atendimento) !== null ? `${pctLabel(funis.showroom.venda, funis.showroom.atendimento)} → Venda` : null },
    { label: "Venda", valor: funis.showroom.venda },
  ];

  // Internet
  const inetConvNum = pctSeguro(funis.internet.venda, funis.internet.oportunidades);
  const inetEtapas = [
    { label: "Oportunidades", valor: funis.internet.oportunidades, conv: pctLabel(funis.internet.qualificados, funis.internet.oportunidades) ? `${pctLabel(funis.internet.qualificados, funis.internet.oportunidades)} → Qualificados` : null },
    { label: "Qualificados",  valor: funis.internet.qualificados,  conv: pctLabel(funis.internet.agendamento, funis.internet.qualificados) ? `${pctLabel(funis.internet.agendamento, funis.internet.qualificados)} → Agendamentos` : null },
    { label: "Agendamentos",  valor: funis.internet.agendamento,   conv: pctLabel(funis.internet.atendimento, funis.internet.agendamento) ? `${pctLabel(funis.internet.atendimento, funis.internet.agendamento)} → Atendimento` : null },
    { label: "Atendimento Comercial", valor: funis.internet.atendimento, conv: pctLabel(funis.internet.venda, funis.internet.atendimento) ? `${pctLabel(funis.internet.venda, funis.internet.atendimento)} → Venda` : null },
    { label: "Venda", valor: funis.internet.venda },
  ];

  // Carteira
  const cartConvNum = pctSeguro(funis.carteira.venda, funis.carteira.qualificados);
  const cartEtapas = [
    { label: "Qualificados", valor: funis.carteira.qualificados, conv: pctLabel(funis.carteira.agendamento, funis.carteira.qualificados) ? `${pctLabel(funis.carteira.agendamento, funis.carteira.qualificados)} → Agendamentos` : null },
    { label: "Agendamentos", valor: funis.carteira.agendamento,  conv: pctLabel(funis.carteira.atendimento, funis.carteira.agendamento) ? `${pctLabel(funis.carteira.atendimento, funis.carteira.agendamento)} → Atendimento` : null },
    { label: "Atendimento Comercial", valor: funis.carteira.atendimento, conv: pctLabel(funis.carteira.venda, funis.carteira.atendimento) ? `${pctLabel(funis.carteira.venda, funis.carteira.atendimento)} → Venda` : null },
    { label: "Venda", valor: funis.carteira.venda },
  ];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-1">Eficiência por canal</p>
      {limitador && (
        <p className="text-[12px] text-muted-foreground mb-4">
          <span className="font-semibold">Principal limitador:</span> {limitador}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CanalCard
          titulo="Showroom"
          cor="orange"
          volumeLabel="Atendimentos"
          volume={funis.showroom.atendimento}
          vendas={funis.showroom.venda}
          conversaoGeral={showConvNum}
          etapas={showEtapas}
        />
        <CanalCard
          titulo="Carteira"
          cor="green"
          volumeLabel="Qualificados"
          volume={funis.carteira.qualificados}
          vendas={funis.carteira.venda}
          conversaoGeral={cartConvNum}
          etapas={cartEtapas}
        />
        <CanalCard
          titulo="Internet"
          cor="blue"
          volumeLabel="Oportunidades"
          volume={funis.internet.oportunidades}
          vendas={funis.internet.venda}
          conversaoGeral={inetConvNum}
          etapas={inetEtapas}
        />
      </div>
    </div>
  );
}