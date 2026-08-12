import React from "react";

function ceilSafe(n) { return Math.ceil(n); }
function pct(a, b) { return b > 0 ? a / b : 0; }

function baseSufShowroom(f) { return f.venda >= 1 && f.atendimento >= 1; }
function baseSufInternet(f) { return f.venda >= 1; }
function baseSufCarteira(f) { return f.venda >= 1; }

// Escolhe canal principal: prefer Carteira > Internet > Showroom, desde que tenha venda
function escolherCanalPrincipal(show, inet, cart) {
  if (baseSufCarteira(cart)) return "Carteira";
  if (baseSufInternet(inet)) return "Internet";
  if (baseSufShowroom(show)) return "Showroom";
  return null;
}

function calcShowroom(show, faltam) {
  if (!baseSufShowroom(show)) return null;
  const taxa = pct(show.venda, show.atendimento);
  if (taxa <= 0) return null;
  return { atendimentos: ceilSafe(faltam / taxa) };
}

function calcInternet(inet, faltam) {
  if (!baseSufInternet(inet)) return null;
  const result = {};
  if (inet.venda > 0 && inet.atendimento > 0) {
    result.atendimentos = ceilSafe(faltam / pct(inet.venda, inet.atendimento));
  }
  if (inet.venda > 0 && inet.agendamento > 0) {
    result.agendamentos = ceilSafe(faltam / pct(inet.venda, inet.agendamento));
  }
  if (inet.venda > 0 && inet.qualificados > 0) {
    result.qualificados = ceilSafe(faltam / pct(inet.venda, inet.qualificados));
  }
  if (inet.venda > 0 && inet.oportunidades > 0) {
    result.oportunidades = ceilSafe(faltam / pct(inet.venda, inet.oportunidades));
  }
  if (Object.keys(result).length === 0) return null;
  return result;
}

function calcCarteira(cart, faltam) {
  if (!baseSufCarteira(cart)) return null;
  const result = {};
  if (cart.venda > 0 && cart.atendimento > 0) {
    result.atendimentos = ceilSafe(faltam / pct(cart.venda, cart.atendimento));
  }
  if (cart.venda > 0 && cart.agendamento > 0) {
    result.agendamentos = ceilSafe(faltam / pct(cart.venda, cart.agendamento));
  }
  if (cart.venda > 0 && cart.qualificados > 0) {
    result.qualificados = ceilSafe(faltam / pct(cart.venda, cart.qualificados));
  }
  if (Object.keys(result).length === 0) return null;
  return result;
}

function AlavancaItem({ label, valor }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="text-body-sm text-muted-foreground">{label}</span>
      <span className="text-[18px] font-bold text-[#0F172A] tabular-nums">{valor}</span>
    </div>
  );
}

function CanalSecundario({ titulo, semBase, children }) {
  return (
    <div className="border border-border-subtle rounded-xl p-3">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-2">{titulo}</p>
      {semBase
        ? <p className="text-[12px] text-text-disabled italic">Sem base suficiente para projeção.</p>
        : children
      }
    </div>
  );
}

export default function EsforcoNecessario({ funis, faltam, funisBase90, usou90 }) {
  if (faltam <= 0) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
        <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">O que preciso produzir para bater a meta?</p>
        <p className="text-[14px] font-bold text-status-success-text">Meta batida. Continue mantendo o ritmo! 🎯</p>
      </div>
    );
  }

  const fs = usou90 ? funisBase90 : funis;
  const show = fs?.showroom || funis.showroom;
  const inet = fs?.internet || funis.internet;
  const cart = fs?.carteira || funis.carteira;

  const canalPrincipal = escolherCanalPrincipal(show, inet, cart);

  const showCalc = calcShowroom(show, faltam);
  const inetCalc = calcInternet(inet, faltam);
  const cartCalc = calcCarteira(cart, faltam);

  const calcPrincipal = canalPrincipal === "Carteira" ? cartCalc
    : canalPrincipal === "Internet" ? inetCalc
    : showCalc;

  const COR_CANAL = { Carteira: "bg-green-50 border-green-200", Internet: "bg-status-info-surface border-status-info/30", Showroom: "bg-status-warning-surface border-status-warning/30" };
  const corPrincipal = canalPrincipal ? COR_CANAL[canalPrincipal] : "";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-1">O que preciso produzir para bater a meta?</p>
      <p className="text-[12px] text-muted-foreground mb-4">
        Com base na sua conversão registrada, esta é a produção estimada para buscar as {faltam} venda{faltam !== 1 ? "s" : ""} que faltam.
      </p>

      {!canalPrincipal ? (
        <div className="rounded-xl border border-border bg-slate-50 p-4 text-center">
          <p className="text-body-sm text-muted-foreground">Sem base suficiente para projeção confiável.</p>
          <p className="text-[12px] text-muted-foreground mt-1">Registre atendimentos e vendas para habilitar esta análise.</p>
        </div>
      ) : (
        <>
          {/* Canal principal — destaque */}
          <div className={`rounded-xl border p-4 mb-4 ${corPrincipal}`}>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1">
              Sua melhor base hoje é <span className="font-bold text-[#0F172A]">{canalPrincipal}</span>
            </p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Esses números mostram o esforço estimado em cada ponto do funil. Você pode acompanhar sua evolução por qualquer uma dessas alavancas.
            </p>

            {canalPrincipal === "Showroom" && calcPrincipal && (
              <AlavancaItem label="Atendimentos Comerciais" valor={calcPrincipal.atendimentos} />
            )}

            {canalPrincipal === "Internet" && calcPrincipal && (
              <>
                {calcPrincipal.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={calcPrincipal.atendimentos} />}
                {calcPrincipal.agendamentos  && <AlavancaItem label="Agendamentos" valor={calcPrincipal.agendamentos} />}
                {calcPrincipal.qualificados  && <AlavancaItem label="Qualificados" valor={calcPrincipal.qualificados} />}
                {calcPrincipal.oportunidades && <AlavancaItem label="Oportunidades" valor={calcPrincipal.oportunidades} />}
              </>
            )}

            {canalPrincipal === "Carteira" && calcPrincipal && (
              <>
                {calcPrincipal.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={calcPrincipal.atendimentos} />}
                {calcPrincipal.agendamentos  && <AlavancaItem label="Agendamentos" valor={calcPrincipal.agendamentos} />}
                {calcPrincipal.qualificados  && <AlavancaItem label="Qualificados" valor={calcPrincipal.qualificados} />}
              </>
            )}
          </div>

          {/* Outros canais — compactos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {canalPrincipal !== "Showroom" && (
              <CanalSecundario titulo="Showroom" semBase={!showCalc}>
                {showCalc && <AlavancaItem label="Atendimentos Comerciais" valor={showCalc.atendimentos} />}
              </CanalSecundario>
            )}
            {canalPrincipal !== "Internet" && (
              <CanalSecundario titulo="Internet" semBase={!inetCalc}>
                {inetCalc && (
                  <>
                    {inetCalc.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={inetCalc.atendimentos} />}
                    {inetCalc.agendamentos  && <AlavancaItem label="Agendamentos" valor={inetCalc.agendamentos} />}
                    {inetCalc.qualificados  && <AlavancaItem label="Qualificados" valor={inetCalc.qualificados} />}
                  </>
                )}
              </CanalSecundario>
            )}
            {canalPrincipal !== "Carteira" && (
              <CanalSecundario titulo="Carteira" semBase={!cartCalc}>
                {cartCalc && (
                  <>
                    {cartCalc.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={cartCalc.atendimentos} />}
                    {cartCalc.agendamentos  && <AlavancaItem label="Agendamentos" valor={cartCalc.agendamentos} />}
                    {cartCalc.qualificados  && <AlavancaItem label="Qualificados" valor={cartCalc.qualificados} />}
                  </>
                )}
              </CanalSecundario>
            )}
          </div>
        </>
      )}
    </div>
  );
}