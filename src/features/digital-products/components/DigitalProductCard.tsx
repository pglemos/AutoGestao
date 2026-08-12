import { Archive, Edit3, Package } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { getRoleLabel } from '../lib/digitalProductCatalog'
import type { ProductAudience, ProductRecord } from '../types'

function badgeVariant(status?: string | null): 'success' | 'warning' | 'ghost' {
  if (status === 'ativo') return 'success'
  if (status === 'rascunho') return 'warning'
  return 'ghost'
}

export function DigitalProductCard({ product, canManage, onEdit, onArchive }: { product: ProductRecord; canManage: boolean; onEdit: (product: ProductRecord) => void; onArchive: (product: ProductRecord) => void }) {
  return (
    <Card className="flex h-full flex-col border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Package size={20} aria-hidden="true" /></span>
          <div className="min-w-0">
            <Typography as="h3" variant="h3" className="line-clamp-2 text-base font-semibold text-foreground">{product.name}</Typography>
            <Typography variant="caption" className="mt-1 block text-xs text-muted-foreground">{product.category || 'Operacional'}</Typography>
          </div>
        </div>
        <Badge variant={badgeVariant(product.status)}>{product.status || 'ativo'}</Badge>
      </div>

      <Typography variant="p" className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-muted-foreground">{product.description}</Typography>

      {canManage ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {(product.target_roles || []).map((audience: ProductAudience) => <Badge key={audience} variant="outline">{getRoleLabel(audience)}</Badge>)}
        </div>
      ) : null}

      <div className="mt-5 border-t border-gray-100 pt-4">
        {canManage ? (
          <div className="grid grid-cols-2 gap-2">
            <Button data-mx-requires-manage="" variant="ghost" size="sm" onClick={() => onEdit(product)}><Edit3 size={14} className="mr-2" />Editar</Button>
            <Button data-mx-requires-manage="" variant="ghost" size="sm" onClick={() => onArchive(product)} className="text-red-600"><Archive size={14} className="mr-2" />Arquivar</Button>
          </div>
        ) : <Badge variant="success">Disponível para seu perfil</Badge>}
      </div>
    </Card>
  )
}
