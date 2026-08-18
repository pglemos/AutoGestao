import { useMemo } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  CalendarClock,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  History,
  Link2,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Rocket,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CLIENT_LIFECYCLE_LABELS, clientActionsFor, resolveClientLifecycle, type ClientAction, type ClientLifecycleRow } from './clientLifecycle'
export type { ClientAction }

export const CLIENT_ACTION_LABELS: Record<ClientAction, string> = {
  abrir_visao360: 'Abrir Visão 360',
  acessar_workspace: 'Acessar Workspace da Loja',
  gerenciar_equipe: 'Gerenciar Equipe de Vendedores',
  editar_loja: 'Editar Dados & Metas da Loja',
  copiar_link_cadastro: 'Copiar link pré-cadastro (Vendedores)',
  continuar_onboarding: 'Continuar onboarding',
  gerar_link_autocadastro: 'Gerar link de autocadastro',
  adicionar_pessoa: 'Adicionar pessoa',
  abrir_jornada: 'Abrir jornada consultiva',
  validar_cadastros: 'Validar cadastros',
  programar_ativacao: 'Programar ativação',
  suspender: 'Suspender',
  abrir_auditoria: 'Abrir auditoria',
  arquivar_loja: 'Excluir / Arquivar loja',
}

const ACTION_ICONS: Record<ClientAction, typeof Compass> = {
  abrir_visao360: Compass,
  acessar_workspace: ExternalLink,
  gerenciar_equipe: Users,
  editar_loja: Pencil,
  copiar_link_cadastro: Copy,
  continuar_onboarding: Rocket,
  gerar_link_autocadastro: Link2,
  adicionar_pessoa: UserPlus,
  abrir_jornada: CalendarClock,
  validar_cadastros: ShieldCheck,
  programar_ativacao: Clock,
  suspender: PauseCircle,
  abrir_auditoria: History,
  arquivar_loja: Trash2,
}

const Base44DropdownContent = DropdownMenuContent as unknown as ComponentType<{ children: ReactNode; align?: 'end'; className?: string }>
const Base44DropdownItem = DropdownMenuItem as unknown as ComponentType<{ children: ReactNode; className?: string; role?: 'menuitem'; onSelect: () => void; 'data-action'?: string }>
const Base44DropdownLabel = DropdownMenuLabel as unknown as ComponentType<{ children: ReactNode; className?: string }>
const Base44DropdownSeparator = DropdownMenuSeparator as unknown as ComponentType<Record<string, never>>

export function ClientActionsMenu(props: {
  client: ClientLifecycleRow & { name?: string }
  onAction: (action: ClientAction) => void
}) {
  const lifecycle = resolveClientLifecycle(props.client)
  const actions = useMemo(() => clientActionsFor(props.client), [props.client])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Ações de ${props.client.name ?? 'cliente'}`}>
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <Base44DropdownContent align="end" className="w-64">
        <Base44DropdownLabel className="text-caption font-medium text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Status: {CLIENT_LIFECYCLE_LABELS[lifecycle]}
        </Base44DropdownLabel>
        <Base44DropdownSeparator />
        {actions.map(action => {
          const Icon = ACTION_ICONS[action] ?? Compass
          const isDestructive = action === 'arquivar_loja'
          const isWarning = action === 'suspender'

          return (
            <Base44DropdownItem
              key={action}
              role="menuitem"
              onSelect={() => props.onAction(action)}
              className={
                isDestructive
                  ? 'cursor-pointer gap-2.5 text-xs font-medium text-status-error-text focus:bg-status-error-surface focus:text-status-error-text py-2 px-2.5'
                  : isWarning
                  ? 'cursor-pointer gap-2.5 text-xs text-status-warning-text focus:bg-status-warning-surface py-2 px-2.5'
                  : 'cursor-pointer gap-2.5 text-xs py-2 px-2.5 text-foreground hover:bg-surface-alt'
              }
              data-action={action}
            >
              <Icon size={14} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
              <span className="truncate">{CLIENT_ACTION_LABELS[action]}</span>
            </Base44DropdownItem>
          )
        })}
      </Base44DropdownContent>
    </DropdownMenu>
  )
}
