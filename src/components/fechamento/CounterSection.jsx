import React, { useState } from "react";
import { Users, Globe, CalendarCheck, Store } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";

const CounterItem = ({ label, bgColor, textColor, icon: Icon, value, onDecrement, onIncrement, onSet, compact }) => {
  const [inputVal, setInputVal] = useState(null); // null = not editing

  const handleFocus = (e) => {
    setInputVal(String(value));
    e.target.select();
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    setInputVal(raw);
  };

  const commit = () => {
    const num = inputVal === "" || inputVal === null ? 0 : parseInt(inputVal, 10);
    onSet(Math.min(999, Math.max(0, isNaN(num) ? 0 : num)));
    setInputVal(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") commit();
  };

  return (
    <div className={`flex flex-col items-center gap-1.5 flex-1 min-w-0 ${compact ? "px-1" : "px-3"}`}>
      {/* Icon circle */}
      <div className={`${compact ? "w-[32px] h-[32px]" : "w-[52px] h-[52px]"} rounded-full flex items-center justify-center shadow-md ${bgColor}`}>
        <Icon className={`${compact ? "w-[12px] h-[12px]" : "w-[20px] h-[20px]"} text-white`} />
      </div>
      {/* Label */}
      <span className={`${compact ? "text-caption" : "text-caption"} font-semibold text-muted-foreground text-center leading-tight tracking-widest uppercase`}>{label}</span>
      {/* Big number */}
      <span className={`${compact ? "text-[30px]" : "text-display"} font-bold leading-none tracking-tight tabular-nums ${textColor}`}>{value}</span>
      {/* Stepper */}
      <div className={`flex items-center border border-slate-200 rounded-xl shadow-sm w-full focus-within:border-blue-400 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] transition-all ${compact ? "h-7" : "h-9"}`}>
        <button
          onClick={onDecrement}
          className={`flex-shrink-0 flex items-center justify-center bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-muted-foreground font-light border-r border-slate-200 rounded-l-xl h-full ${compact ? "w-7 text-body" : "w-9 text-[18px]"}`}
        >−</button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputVal !== null ? inputVal : String(value)}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onWheel={e => e.target.blur()}
          className={`flex-1 min-w-0 w-full text-center font-bold text-foreground tabular-nums bg-white border-none outline-none h-full ${compact ? "text-[12px]" : "text-[14px]"}`}
          style={{ boxShadow: "none" }}
        />
        <button
          onClick={onIncrement}
          className={`flex-shrink-0 flex items-center justify-center bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors text-muted-foreground font-light border-l border-slate-200 rounded-r-xl h-full ${compact ? "w-7 text-body" : "w-9 text-[18px]"}`}
        >+</button>
      </div>
    </div>
  );
};

const Divider = () => (
  <div className="flex flex-col items-center justify-center self-stretch py-8">
    <div className="w-px flex-1 bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
  </div>
);

const SectionCard = ({ number, title, accent, tooltip, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
    <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white`}>
      <span className={`w-5 h-5 rounded-full ${accent} text-white text-caption font-bold flex items-center justify-center flex-shrink-0`}>{number}</span>
      <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
      <div className="ml-auto"><InfoTooltip text={tooltip} /></div>
    </div>
    <div className="flex-1 flex items-center px-3 py-6 gap-0">{children}</div>
  </div>
);

export default function CounterSection({ dc, updateCounter, setCounter }) {
  return (
    <div className="grid grid-cols-3 gap-5">
      <SectionCard number="1" title="Leads Recebidos Hoje" accent="bg-[#22C55E]" tooltip="Informe quantos novos interessados chegaram hoje pelos canais Carteira e Internet. Não inclua clientes de showroom.">
        <CounterItem label="Canal Carteira" bgColor="bg-[#22C55E]" textColor="text-[#22C55E]" icon={Users}
          value={dc.leads_carteira || 0}
          onDecrement={() => updateCounter("leads_carteira", -1)}
          onIncrement={() => updateCounter("leads_carteira", 1)}
          onSet={v => setCounter("leads_carteira", v)} />
        <Divider />
        <CounterItem label="Canal Internet" bgColor="bg-[#005BFF]" textColor="text-[#005BFF]" icon={Globe}
          value={dc.leads_internet || 0}
          onDecrement={() => updateCounter("leads_internet", -1)}
          onIncrement={() => updateCounter("leads_internet", 1)}
          onSet={v => setCounter("leads_internet", v)} />
      </SectionCard>

      <SectionCard number="2" title="Atendimentos Hoje" accent="bg-[#F59E0B]" tooltip="Informe quantos clientes você atendeu hoje, separados por Showroom, Carteira e Internet.">
        <CounterItem label="Showroom" bgColor="bg-[#F59E0B]" textColor="text-[#F59E0B]" icon={Store} compact
          value={dc.atendimentos_showroom || 0}
          onDecrement={() => updateCounter("atendimentos_showroom", -1)}
          onIncrement={() => updateCounter("atendimentos_showroom", 1)}
          onSet={v => setCounter("atendimentos_showroom", v)} />
        <Divider />
        <CounterItem label="Carteira" bgColor="bg-[#22C55E]" textColor="text-[#22C55E]" icon={Users} compact
          value={dc.atendimentos_carteira || 0}
          onDecrement={() => updateCounter("atendimentos_carteira", -1)}
          onIncrement={() => updateCounter("atendimentos_carteira", 1)}
          onSet={v => setCounter("atendimentos_carteira", v)} />
        <Divider />
        <CounterItem label="Internet" bgColor="bg-[#005BFF]" textColor="text-[#005BFF]" icon={Globe} compact
          value={dc.atendimentos_internet || 0}
          onDecrement={() => updateCounter("atendimentos_internet", -1)}
          onIncrement={() => updateCounter("atendimentos_internet", 1)}
          onSet={v => setCounter("atendimentos_internet", v)} />
      </SectionCard>

      <SectionCard number="3" title="Agendamento D+1" accent="bg-[#005BFF]" tooltip="Informe quantos clientes ficaram com visitas/negociações agendadas para o dia seguinte, separados por Carteira e Internet.">
        <CounterItem label="Carteira" bgColor="bg-[#22C55E]" textColor="text-[#22C55E]" icon={CalendarCheck}
          value={dc.agendamentos_carteira || 0}
          onDecrement={() => updateCounter("agendamentos_carteira", -1)}
          onIncrement={() => updateCounter("agendamentos_carteira", 1)}
          onSet={v => setCounter("agendamentos_carteira", v)} />
        <Divider />
        <CounterItem label="Internet" bgColor="bg-[#005BFF]" textColor="text-[#005BFF]" icon={CalendarCheck}
          value={dc.agendamentos_internet || 0}
          onDecrement={() => updateCounter("agendamentos_internet", -1)}
          onIncrement={() => updateCounter("agendamentos_internet", 1)}
          onSet={v => setCounter("agendamentos_internet", v)} />
      </SectionCard>
    </div>
  );
}