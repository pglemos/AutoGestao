import type { ComponentType, ReactNode } from "react";
import {
  CheckCircle2,
  ClipboardList,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/atoms/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MenuContent = DropdownMenuContent as unknown as ComponentType<{
  children: ReactNode;
  align?: "end";
  className?: string;
}>;
const MenuItem = DropdownMenuItem as unknown as ComponentType<{
  children: ReactNode;
  className?: string;
  onSelect: () => void;
}>;
const MenuLabel = DropdownMenuLabel as unknown as ComponentType<{
  children: ReactNode;
  className?: string;
}>;

function menuItemClass() {
  return "cursor-pointer gap-2.5 px-2.5 py-2 text-sm text-foreground focus:bg-surface-alt";
}

export function ClientDetailHeaderActions(props: {
  clientName: string;
  refreshing: boolean;
  onRefresh: () => void;
  onEditIdentity: () => void;
  onContinueOnboarding?: () => void;
  onValidateActivation?: () => void;
  onOpenStrategicPlan: () => void;
  onOpenActionPlan: () => void;
  onOpenConsulting: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Mais ações para ${props.clientName}`}
          className="focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus-ring focus-visible:ring-offset-2"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
          Mais ações
        </Button>
      </DropdownMenuTrigger>
      <MenuContent align="end" className="w-72">
        <MenuLabel className="px-2.5 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
          Ficha do cliente
        </MenuLabel>
        <MenuItem onSelect={props.onRefresh} className={menuItemClass()}>
          <RefreshCw
            size={16}
            className={
              props.refreshing
                ? "animate-spin motion-reduce:animate-none"
                : undefined
            }
            aria-hidden="true"
          />
          {props.refreshing ? "Atualizando ficha..." : "Atualizar ficha"}
        </MenuItem>
        {props.onContinueOnboarding ? (
          <MenuItem
            onSelect={props.onContinueOnboarding}
            className={menuItemClass()}
          >
            <Rocket size={16} aria-hidden="true" />
            Continuar configuração inicial
          </MenuItem>
        ) : null}
        {props.onValidateActivation ? (
          <MenuItem
            onSelect={props.onValidateActivation}
            className="cursor-pointer gap-2.5 px-2.5 py-2 text-sm font-semibold text-brand-primary focus:bg-status-success-surface"
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            Abrir validação e ativação
          </MenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <MenuLabel className="px-2.5 pb-1 pt-2 text-xs font-semibold text-muted-foreground">
          Navegar
        </MenuLabel>
        <MenuItem onSelect={props.onEditIdentity} className={menuItemClass()}>
          <Pencil size={16} aria-hidden="true" />
          Editar identificação
        </MenuItem>
        <MenuItem
          onSelect={props.onOpenStrategicPlan}
          className={menuItemClass()}
        >
          <Target size={16} aria-hidden="true" />
          Abrir Plano Estratégico
        </MenuItem>
        <MenuItem onSelect={props.onOpenActionPlan} className={menuItemClass()}>
          <ClipboardList size={16} aria-hidden="true" />
          Abrir Plano de Ação
        </MenuItem>
        <MenuItem onSelect={props.onOpenConsulting} className={menuItemClass()}>
          <Sparkles size={16} aria-hidden="true" />
          Abrir Consultoria
        </MenuItem>
      </MenuContent>
    </DropdownMenu>
  );
}
