import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Calendar } from "lucide-react";

const OPTIONS = [
  { value: "mes_atual", label: "Este mês" },
  { value: "mes_anterior", label: "Mês anterior" },
  { value: "ultimos_30", label: "Últimos 30 dias" },
  { value: "personalizado", label: "Personalizado" },
];

export default function PeriodFilter({ value, onChange, customStart, customEnd, onCustomStart, onCustomEnd, dark }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = OPTIONS.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors shadow-sm ${dark ? "bg-white/5 border border-white/10 text-text-disabled hover:bg-white/10" : "bg-white border border-border text-foreground hover:bg-surface-alt"}`}
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        {selected?.label}
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-50 py-2 ${dark ? "bg-[#0B1D2E] border-white/10" : "bg-white border-border-subtle"}`}>
          {OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); if (opt.value !== "personalizado") setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${value === opt.value ? (dark ? "text-emerald-400 font-semibold bg-status-success/10" : "text-mx-blue font-semibold bg-mx-blue/5") : (dark ? "text-text-disabled hover:bg-white/5" : "text-foreground hover:bg-surface-alt")}`}
            >
              {opt.label}
            </button>
          ))}
          {value === "personalizado" && (
            <div className="px-4 py-3 border-t border-border-subtle space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">De</label>
                <input type="date" value={customStart || ""} onChange={e => onCustomStart(e.target.value)}
                  className="w-full mt-1 border border-border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Até</label>
                <input type="date" value={customEnd || ""} onChange={e => onCustomEnd(e.target.value)}
                  className="w-full mt-1 border border-border rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <button onClick={() => setOpen(false)} className="w-full bg-mx-blue text-white rounded-lg py-1.5 text-sm font-medium mt-1">
                Aplicar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}