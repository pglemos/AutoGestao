import { useEffect, useRef, useState } from "react";
import { CheckCircle, ChevronDown } from "lucide-react";
import {
  CONFIRMATION_OUTCOMES,
  type ConfirmationOutcome,
} from "./agenda-d1";

type AgendaConfirmationMenuProps = {
  onSelect: (outcome: ConfirmationOutcome) => void;
  disabled?: boolean;
};

export function AgendaConfirmationMenu({
  onSelect,
  disabled = false,
}: AgendaConfirmationMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnPointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnPointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-status-success-text transition-colors hover:bg-status-success-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <CheckCircle size={14} />
        Confirmar
        <ChevronDown size={13} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Resultado da confirmação"
          className="absolute right-0 top-full z-[var(--mx-z-popover)] mt-1 min-w-[208px] overflow-hidden rounded-xl border border-border-subtle bg-white py-1 shadow-xl"
        >
          {CONFIRMATION_OUTCOMES.map((outcome) => (
            <button
              key={outcome}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(outcome);
                setOpen(false);
              }}
              className="block w-full px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none"
            >
              {outcome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
