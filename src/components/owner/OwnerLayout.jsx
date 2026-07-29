import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { X } from "lucide-react";
import { OwnerProvider } from "@/components/owner/OwnerContext";
import OwnerSidebar from "@/components/owner/OwnerSidebar";
import OwnerTopbar from "@/components/owner/OwnerTopbar";
import ConsultantRequestModal from "@/components/owner/ConsultantRequestModal";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/lib/utils";
import { SIDEBAR } from "@/design-system/sidebar/tokens";

export default function OwnerLayout() {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const drawerRef = useRef(null);

  useFocusTrap(drawerRef, sidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <OwnerProvider>
      <div className="flex h-full min-h-0 overflow-hidden bg-background">
        <aside
          className={cn(
            SIDEBAR.aside,
            sidebarCollapsed ? SIDEBAR.asideWidthCollapsed : SIDEBAR.asideWidth,
          )}
          aria-label="Menu principal do Dono"
        >
          <OwnerSidebar
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </aside>

        {sidebarOpen ? (
          <div className={SIDEBAR.drawerOverlay}>
            <div
              className={SIDEBAR.drawerScrim}
              role="presentation"
              onClick={() => setSidebarOpen(false)}
            />
            <div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu principal do Dono"
              className={cn(SIDEBAR.drawerPanel, "pb-[72px] lg:pb-0")}
            >
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Fechar menu principal"
                className={SIDEBAR.drawerClose}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
              <OwnerSidebar onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        ) : null}

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <OwnerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
          <div
            id="owner-main-content"
            role="region"
            aria-label="Conteúdo do módulo Dono"
            className="min-h-0 flex-1 overflow-y-auto"
          >
            <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-24 pt-6 lg:px-8 lg:pb-8 lg:pt-8">
              <Outlet context={{ setLastUpdated, lastUpdated }} />
            </div>
          </div>
        </div>

        <ConsultantRequestModal />
      </div>
    </OwnerProvider>
  );
}
