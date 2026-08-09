// Popover "+ X mais" — lista todas as ações do dia.
import { Lock, AlertTriangle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STATUS_STYLES, DEPT_STYLES } from "../actionPlanConstants";
import { isLate } from "../actionPlanUtils";

export default function MoreActionsPopover({ actions, onSelectAction, onOpenAction }) {
  const remaining = actions.length - 2;
  if (remaining <= 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 w-full rounded bg-muted/50 px-1.5 py-0.5 text-left text-caption font-medium text-muted-foreground hover:bg-muted"
        >
          + {remaining} mais
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start">
        <p className="mb-2 px-1 text-xs font-semibold text-muted-foreground">
          {actions.length} ações neste dia
        </p>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {actions.map((action) => {
            const deptStyle = DEPT_STYLES[action.department] || {};
            const statusStyle = STATUS_STYLES[action.status] || {};
            const late = isLate(action);
            return (
              <button
                key={action.id}
                onClick={() => onOpenAction(action)}
                className={`w-full rounded border-l-2 bg-white px-2 py-1.5 text-left text-xs shadow-sm hover:shadow-md ${deptStyle.border || "border-slate-200"} ${late ? "border-l-red-500" : ""}`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{action.code}</span>
                  {action.status === "blocked" && <Lock className="h-3 w-3 text-red-500" />}
                  {late && <AlertTriangle className="h-3 w-3 text-red-500" />}
                </div>
                <p className="truncate text-muted-foreground">{action.title}</p>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-caption font-medium ${statusStyle.badge || ""}`}>
                    {statusStyle.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}