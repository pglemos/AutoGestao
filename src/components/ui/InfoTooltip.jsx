import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

export default function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setVisible(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [visible]);

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(v => !v)}
        className="text-text-disabled hover:text-status-info-text transition-colors focus:outline-none"
        aria-label="Mais informações"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div
          className="fixed z-[var(--mx-z-tooltip)] w-[280px] bg-white border border-border rounded-xl shadow-xl px-3.5 py-3"
          style={{
            fontFamily: "Inter, sans-serif",
            top: ref.current ? ref.current.getBoundingClientRect().bottom + 6 : 0,
            left: ref.current ? Math.min(ref.current.getBoundingClientRect().left, window.innerWidth - 296) : 0,
          }}
        >
          <p className="text-[12px] text-muted-foreground leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}
