import { Archive, MoreHorizontal, Power, PowerOff, RefreshCw } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Button } from '@/components/atoms/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ActionPlanTemplate } from './actionPlanTemplates'

const MenuContent = DropdownMenuContent as unknown as ComponentType<{ children: ReactNode; align?: 'end' }>
const MenuItem = DropdownMenuItem as unknown as ComponentType<{
  children: ReactNode
  className?: string
  onSelect: () => void
}>

export type TemplateLifecycleAction = 'nova-versao' | 'desativar' | 'reativar' | 'arquivar'

export function availableTemplateLifecycleActions(template: ActionPlanTemplate): TemplateLifecycleAction[] {
  const hasPublished = template.versions.some(version => version.status === 'publicada')
  const hasDraft = template.versions.some(version => version.status === 'rascunho')
  const allArchived = template.versions.length > 0 && template.versions.every(version => version.status === 'arquivada')
  if (allArchived) return []

  const actions: TemplateLifecycleAction[] = []
  if (template.active && hasPublished && !hasDraft) actions.push('nova-versao')
  actions.push(template.active ? 'desativar' : 'reativar')
  actions.push('arquivar')
  return actions
}

export function TemplateActionsMenu(props: {
  template: ActionPlanTemplate
  disabled?: boolean
  onAction: (action: TemplateLifecycleAction) => void
}) {
  const actions = availableTemplateLifecycleActions(props.template)
  if (!actions.length) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={props.disabled} aria-label={`Mais ações para ${props.template.nome}`}>
          <MoreHorizontal size={16} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <MenuContent align="end">
        {actions.includes('nova-versao') ? (
          <MenuItem onSelect={() => props.onAction('nova-versao')}>
            <RefreshCw size={16} aria-hidden="true" />Nova versão
          </MenuItem>
        ) : null}
        {actions.includes('desativar') ? (
          <MenuItem onSelect={() => props.onAction('desativar')}>
            <PowerOff size={16} aria-hidden="true" />Desativar
          </MenuItem>
        ) : null}
        {actions.includes('reativar') ? (
          <MenuItem onSelect={() => props.onAction('reativar')}>
            <Power size={16} aria-hidden="true" />Reativar
          </MenuItem>
        ) : null}
        {actions.includes('arquivar') ? <DropdownMenuSeparator /> : null}
        {actions.includes('arquivar') ? (
          <MenuItem className="text-status-error-text" onSelect={() => props.onAction('arquivar')}>
            <Archive size={16} aria-hidden="true" />Arquivar
          </MenuItem>
        ) : null}
      </MenuContent>
    </DropdownMenu>
  )
}
