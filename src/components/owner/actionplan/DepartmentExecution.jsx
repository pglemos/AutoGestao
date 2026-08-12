// Execução por departamento — 6 cards compactos.
import { Store, Megaphone, Package, DollarSign, Settings, Users, AlertTriangle, Ban } from "lucide-react";
import { DEPARTMENTS, DEPT_STYLES } from "./actionPlanConstants";
import { getDepartmentStats } from "./actionPlanUtils";

const DEPT_ICONS = {
  commercial: Store,
  marketing: Megaphone,
  product_stock: Package,
  financial: DollarSign,
  operations: Settings,
  people_hr: Users,
};

export default function DepartmentExecution({ actions, onFilterByDepartment, activeDepartment }) {
  const deptCards = DEPARTMENTS.filter((d) => d.value !== "general");

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Execução por departamento</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {deptCards.map((dept) => {
          const stats = getDepartmentStats(actions, dept.value);
          const style = DEPT_STYLES[dept.value];
          const Icon = DEPT_ICONS[dept.value] || Store;
          const isActive = activeDepartment === dept.value;
          return (
            <button
              key={dept.value}
              onClick={() => onFilterByDepartment(dept.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                isActive ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{dept.label}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${style.sideBar}`} style={{ width: `${stats.progress}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground">{stats.progress}%</span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{stats.active} ativas</span>
                {stats.late > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-status-error-text">
                    <AlertTriangle className="h-3 w-3" /> {stats.late}
                  </span>
                )}
                {stats.blocked > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-status-error-text">
                    <Ban className="h-3 w-3" /> {stats.blocked}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{stats.attention}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}