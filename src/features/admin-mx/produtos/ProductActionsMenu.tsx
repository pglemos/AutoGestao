import { MoreHorizontal } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Button } from '@/components/atoms/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ConsultingProduct } from './consultingProducts'
import {
  visibleProductActions,
  type ProductCatalogAction,
} from './officialConsultingCatalog'

const MenuContent = DropdownMenuContent as unknown as ComponentType<{ children: ReactNode; align?: 'end' }>
const MenuItem = DropdownMenuItem as unknown as ComponentType<{
  children: ReactNode
  className?: string
  onSelect: () => void
}>

export function ProductActionsMenu(props: {
  product: ConsultingProduct
  requiresNewVersion: boolean
  onAction: (action: ProductCatalogAction, product: ConsultingProduct) => void
}) {
  const actions = visibleProductActions(props.product, { requiresNewVersion: props.requiresNewVersion })
  const overflow = actions.filter(item => item.action !== 'abrir')
  const primary = overflow.find(item => item.primary) ?? null
  const secondary = overflow.filter(item => item !== primary)

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <Button variant="outline" size="sm" onClick={() => props.onAction('abrir', props.product)}>Abrir</Button>
      {primary ? (
        <Button variant="primary" size="sm" onClick={() => props.onAction(primary.action, props.product)}>
          {primary.label}
        </Button>
      ) : null}
      {secondary.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" aria-label={`Mais ações para ${props.product.name ?? props.product.program_key}`}>
              <MoreHorizontal size={16} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <MenuContent align="end">
            {secondary.map((item, index) => {
              const destructive = item.action === 'excluir_rascunho' || item.action === 'arquivar'
              const needsSeparator = destructive && index > 0 && secondary[index - 1]?.action !== 'arquivar' && secondary[index - 1]?.action !== 'excluir_rascunho'
              return (
                <span key={item.action}>
                  {needsSeparator ? <DropdownMenuSeparator /> : null}
                  <MenuItem
                    className={destructive ? 'text-status-error-text' : undefined}
                    onSelect={() => props.onAction(item.action, props.product)}
                  >
                    {item.label}
                  </MenuItem>
                </span>
              )
            })}
          </MenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
