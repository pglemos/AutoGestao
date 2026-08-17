import { useMemo } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'
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
  continuar_onboarding: 'Continuar onboarding',
  gerar_link_autocadastro: 'Gerar link de autocadastro',
  adicionar_pessoa: 'Adicionar pessoa',
  abrir_jornada: 'Abrir jornada',
  validar_cadastros: 'Validar cadastros',
  programar_ativacao: 'Programar ativação',
  suspender: 'Suspender',
  abrir_auditoria: 'Abrir auditoria',
}

const Base44DropdownContent = DropdownMenuContent as unknown as ComponentType<{ children: ReactNode; align?: 'end'; className?: string }>
const Base44DropdownItem = DropdownMenuItem as unknown as ComponentType<{ children: ReactNode; className?: string; role?: 'menuitem'; onSelect: () => void; 'data-action'?: string }>
const Base44DropdownLabel = DropdownMenuLabel as unknown as ComponentType<{ children: ReactNode }>
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
        <Button variant="ghost" size="icon" aria-label={`Ações de ${props.client.name ?? 'cliente'}`}>
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenuTrigger>
      <Base44DropdownContent align="end" className="w-56">
        <Base44DropdownLabel>Lifecycle: {CLIENT_LIFECYCLE_LABELS[lifecycle]}</Base44DropdownLabel>
        <Base44DropdownSeparator />
        {actions.map(action => (
          <Base44DropdownItem
            key={action}
            role="menuitem"
            onSelect={() => props.onAction(action)}
            className="gap-2 text-sm"
            data-action={action}
          >
            {CLIENT_ACTION_LABELS[action]}
          </Base44DropdownItem>
        ))}
      </Base44DropdownContent>
    </DropdownMenu>
  )
}