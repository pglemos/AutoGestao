import React, { useState } from "react";
import { Calculator } from "lucide-react";
import { formatBRL } from "@/components/vendedor/formatBRL";
import { simularGanho } from "@/components/vendedor/remuneracaoEngine";

export default function QuickSimulationCard({ calcResult, faixas = [], premiacoes = [] }) {
  const [vendasAdicionais, setVendasAdicionais] = useState(1);
  const [valorMedio, setValorMedio] = useState("");
  const [resultado, setResultado] = useState(null);

  if (!calcResult || !calcResult.politica) return null;
  const { politica, qtdVendas, valorTotalVendido, ticketMedio } = calcResult;

  function simular() {
    const vm = parseFloat(valorMedio) || ticketMedio;
    const va = parseInt(vendasAdicionais) || 1;
    const sim = simularGanho(politica, faixas, premiacoes, qtdVendas, valorTotalVendido, ticketMedio, va, vm);
    if (!sim) return;
    setResultado({
      va,
      novaComissao: sim.comissao,
      premiacoes: sim.premiacoes,
      salario: sim.salario,
      ganhoAdicional: sim.salario - calcResult.salarioPrevisto,
    });
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-border-subtle shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-4 h-4 text-mx-blue" />
        <h3 className="text-base font-bold text-mx-navy">Simule seu Ganho</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vendas adicionais</label>
          <input
            type="number" min={1} max={30} value={vendasAdicionais}
            onChange={e => setVendasAdicionais(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mx-blue/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Valor médio por veículo
            {ticketMedio > 0 && <span className="text-muted-foreground ml-1">(padrão: {formatBRL(ticketMedio)})</span>}
          </label>
          <input
            type="number" min={0} value={valorMedio}
            placeholder={ticketMedio > 0 ? String(Math.round(ticketMedio)) : "0"}
            onChange={e => setValorMedio(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-mx-blue/30"
          />
        </div>
      </div>

      <button
        onClick={simular}
        className="w-full bg-mx-blue hover:bg-mx-blue/90 text-white rounded-xl py-2.5 font-semibold text-sm transition-colors"
      >
        Simular
      </button>

      {resultado && (
        <div className="mt-5 bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-muted-foreground text-sm">
            Com mais <span className="font-bold text-mx-navy">{resultado.va} venda{resultado.va !== 1 ? "s" : ""}</span>, seu salário previsto iria para:
          </p>
          <p className="text-4xl font-bold text-mx-navy">{formatBRL(resultado.salario)}</p>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
            <SimLine label="Comissão estimada" value={resultado.novaComissao} />
            <SimLine label="Prêmios estimados" value={resultado.premiacoes} />
            <SimLine label="Ganho adicional" value={resultado.ganhoAdicional} highlight />
          </div>
        </div>
      )}
    </div>
  );
}

function SimLine({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${highlight ? "text-status-success-text" : "text-mx-navy"}`}>
        {highlight && value > 0 ? "+" : ""}{formatBRL(value)}
      </p>
    </div>
  );
}