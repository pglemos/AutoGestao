import React from "react";
import { BookOpen, MessageSquare, Target, TrendingUp, UserCircle } from "lucide-react";

const ICONS = {
  "Meu Perfil": UserCircle,
  Treinamentos: BookOpen,
  Feedback: MessageSquare,
  PDI: Target,
};

export default function PageHeader({ title, subtitle, children }) {
  const Icon = ICONS[title] || TrendingUp;

  return (
    <header className="mb-8 flex min-h-16 w-full flex-col justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="truncate text-[18px] font-bold uppercase leading-tight tracking-tight text-slate-900 sm:text-[22px]">
            {title}
          </h1>
        </div>
      </div>
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">{children}</div>}
    </header>
  );
}

