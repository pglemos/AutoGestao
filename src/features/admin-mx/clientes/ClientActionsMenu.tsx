import { Fragment, useMemo } from 'react'
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
import { clientActionsFor, type ClientAction, type ClientLifecycleRow } from './clientLifecycle'
export type { ClientAction }

export const CLIENT_ACTION_LABELS: Record<ClientAction, string> = {
  abrir_visao360: 'Abrir visão 360',
  acessar_workspace: 'Abrir área da loja',
  gerenciar_equipe: 'Gerenciar equipe de vendedores',
  editar_loja: 'Editar dados e metas da loja',
  copiar_link_cadastro: 'Copiar link de cadastro dos vendedores',
  continuar_onboarding: 'Continuar configuração inicial',
  gerar_link_autocadastro: 'Gerar link de autocadastro',
  adicionar_pessoa: 'Adicionar pessoa',
  abrir_jornada: 'Abrir jornada consultiva',
  validar_cadastros: 'Validar cadastros',
  programar_ativacao: 'Programar ativação',
  suspender: 'Suspender',
  abrir_auditoria: 'Abrir histórico e auditoria',
  arquivar_loja: 'Excluir / arquivar loja',
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
const Base44DropdownSeparator = DropdownMenuSeparator as unknown as ComponentType<{ className?: string }>

const ACTION_GROUPS: Array<{ label: string; actions: ClientAction[] }> = [
  {
    label: 'Operação',
    actions: ['abrir_visao360', 'acessar_workspace', 'gerenciar_equipe', 'abrir_jornada'],
  },
  {
    label: 'Configuração',
    actions: ['editar_loja', 'copiar_link_cadastro', 'continuar_onboarding', 'gerar_link_autocadastro', 'adicionar_pessoa', 'validar_cadastros', 'programar_ativacao'],
  },
  {
    label: 'Governança',
    actions: ['abrir_auditoria', 'suspender', 'arquivar_loja'],
  },
]

export function ClientActionsMenu(props: {
  client: ClientLifecycleRow & { name?: string }
  onAction: (action: ClientAction) => void
  compact?: boolean
}) {
  const actions = useMemo(() => clientActionsFor(props.client), [props.client])
  const actionLabel = `Ações de ${props.client.name ?? 'cliente'}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={props.compact ? 'xs' : 'icon'}
          className={props.compact ? 'h-8 w-8 p-0' : 'h-8 w-8'}
          aria-label={actionLabel}
          title={props.compact ? actionLabel : undefined}
        >
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <Base44DropdownContent align="end" className="w-64">
        {ACTION_GROUPS.map((group, groupIndex) => {
          const groupActions = group.actions.filter(action => actions.includes(action))
          if (groupActions.length === 0) return null

          return (
            <Fragment key={group.label}>
              {groupIndex > 0 ? <Base44DropdownSeparator /> : null}
              <Base44DropdownLabel className="px-2.5 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </Base44DropdownLabel>
              {groupActions.map(action => {
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
                        ? 'cursor-pointer gap-2.5 px-2.5 py-2 text-xs font-medium text-status-error-text focus:bg-status-error-surface focus:text-status-error-text'
                        : isWarning
                        ? 'cursor-pointer gap-2.5 px-2.5 py-2 text-xs text-status-warning-text focus:bg-status-warning-surface'
                        : 'cursor-pointer gap-2.5 px-2.5 py-2 text-xs text-foreground hover:bg-surface-alt'
                    }
                    data-action={action}
                  >
                    <Icon size={14} className="shrink-0 text-muted-foreground group-hover:text-foreground" />
                    <span className="truncate">{CLIENT_ACTION_LABELS[action]}</span>
                  </Base44DropdownItem>
                )
              })}
            </Fragment>
          )
        })}
      </Base44DropdownContent>
    </DropdownMenu>
  )
}
