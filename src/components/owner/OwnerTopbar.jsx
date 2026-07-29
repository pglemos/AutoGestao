import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBellButton } from "@/components/NotificationBellButton";
import MxLogo from "@/assets/mx-logo.png";
import { Menu } from "lucide-react";

// Mesmo padrao de header dos demais modulos (MxSidebarShell): no desktop nao
// existe topbar — a navegacao fica na sidebar e cada pagina traz seu proprio
// cabecalho. No mobile, um header com marca, titulo da tela, sino e avatar.
const TITLES = [
  { path: "/plano-estrategico", label: "Plano Estratégico" },
  { path: "/plano-acao", label: "Plano de Ação" },
  { path: "/consultoria", label: "Consultoria" },
  { path: "/rotina", label: "Rotina do Dia" },
  { path: "/decisoes", label: "Central de Decisões" },
  { path: "/departamentos", label: "Departamentos" },
  { path: "/mercado", label: "Mercado" },
  { path: "/universidade-mx", label: "Universidade MX" },
  { path: "/home", label: "Início" },
];

export default function OwnerTopbar({ onOpenSidebar }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = profile?.name?.trim() || "Dono MX";
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "MX";
  const title =
    TITLES.find(
      (entry) => location.pathname === entry.path || location.pathname.startsWith(`${entry.path}/`),
    )?.label || "MX Performance";

  return (
    <header className="relative flex h-[72px] shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm xl:hidden">
      <button
        type="button"
        aria-label="Abrir menu principal"
        onClick={onOpenSidebar}
        className="flex min-w-0 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
      >
        <Menu className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
        <img src={MxLogo} alt="MX" className="h-9 w-9 shrink-0 object-contain" />
        <span className="hidden min-w-0 leading-tight min-[430px]:block">
          <span className="block text-[15px] font-black tracking-tight text-gray-900">
            MX PERFORMANCE
          </span>
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            Módulo Executivo
          </span>
        </span>
      </button>
      <div className="pointer-events-none absolute left-1/2 top-1/2 max-w-[42vw] -translate-x-1/2 -translate-y-1/2 truncate text-center text-sm font-bold text-gray-800">
        {title}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBellButton variant="light" />
        <button
          type="button"
          aria-label={`Abrir perfil de ${displayName}`}
          onClick={() => navigate("/perfil")}
          className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-[11px] font-black uppercase text-emerald-700 outline-none ring-1 ring-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
