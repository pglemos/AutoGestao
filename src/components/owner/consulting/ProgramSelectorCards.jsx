// Seletor de programas — apenas o programa ativo do cliente é selecionável.

import { Lock } from "lucide-react";

const PROGRAM_THEME = {
  pmr: { activeBorder: "border-primary", activeBg: "bg-primary/5", badge: "bg-primary text-primary-foreground" },
  pmr_plus: { activeBorder: "border-status-info", activeBg: "bg-status-info-surface", badge: "bg-status-info text-white" },
  ppa: { activeBorder: "border-status-info", activeBg: "bg-status-info-surface", badge: "bg-status-info text-white" },
};

export default function ProgramSelectorCards({ programs, selectedProgramId, onSelectProgram, activeProgramId }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {programs.map((p) => {
        const isActive = p.id === selectedProgramId;
        const isLocked = p.id !== activeProgramId;
        const theme = PROGRAM_THEME[p.id] || PROGRAM_THEME.pmr;

        return (
          <button
            key={p.id}
            onClick={() => !isLocked && onSelectProgram(p.id)}
            disabled={isLocked}
            className={`relative rounded-xl border p-4 text-left transition-all ${
              isActive
                ? `${theme.activeBorder} ${theme.activeBg} shadow-sm`
                : "border-border bg-card hover:border-primary/30"
            } ${isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  isActive ? theme.badge : "bg-muted text-muted-foreground"
                }`}
              >
                {isActive ? "Ativo" : "Bloqueado"}
              </span>
              {isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="mt-2 text-base font-bold text-foreground">{p.shortName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.focus}</p>
            <p className="mt-2 text-xs text-muted-foreground">{p.totalMeetings} encontros</p>
          </button>
        );
      })}
    </div>
  );
}