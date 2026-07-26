import { useState } from "react";
import { Outlet } from "react-router-dom";
import { X } from "lucide-react";
import { OwnerProvider } from "@/components/owner/OwnerContext";
import OwnerSidebar from "@/components/owner/OwnerSidebar";
import OwnerTopbar from "@/components/owner/OwnerTopbar";
import ConsultantRequestModal from "@/components/owner/ConsultantRequestModal";

export default function OwnerLayout() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <OwnerProvider>
      <div className="flex h-full min-h-0 overflow-hidden bg-background">
        <aside
          className="hidden w-64 shrink-0 border-r border-sidebar-border xl:block"
          aria-label="Menu principal do Dono"
        >
          <OwnerSidebar />
        </aside>

        {sidebarOpen ? (
          <div className="fixed inset-0 z-40 xl:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              role="presentation"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex h-full w-64 max-w-[80vw] flex-col bg-sidebar shadow-xl">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Fechar menu principal"
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </button>
              <OwnerSidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <OwnerTopbar lastUpdated={lastUpdated} onOpenSidebar={() => setSidebarOpen(true)} />
          <div
            id="owner-main-content"
            role="region"
            aria-label="Conteúdo do módulo Dono"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8 lg:py-8">
              <Outlet context={{ setLastUpdated }} />
            </div>
          </div>
        </div>

        <ConsultantRequestModal />
      </div>
    </OwnerProvider>
  );
}
