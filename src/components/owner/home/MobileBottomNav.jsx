import { Home, Calendar, Plus, Bell, Menu } from "lucide-react";

const NAV_ITEMS = [
  { icon: Home, label: "Início", active: true },
  { icon: Calendar, label: "Agenda" },
  { icon: Plus, label: "Ação", primary: true },
  { icon: Bell, label: "Alertas" },
  { icon: Menu, label: "Menu" },
];

export default function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--mx-z-drawer)] flex items-center justify-around border-t border-border bg-card px-2 py-2 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button key={item.label} className="flex flex-col items-center gap-0.5" aria-label={item.label}>
            {item.primary ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Icon className="h-5 w-5" />
              </span>
            ) : (
              <Icon className={`h-5 w-5 ${item.active ? "text-primary" : "text-muted-foreground"}`} />
            )}
            <span className={`text-caption ${item.active ? "font-medium text-primary" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}