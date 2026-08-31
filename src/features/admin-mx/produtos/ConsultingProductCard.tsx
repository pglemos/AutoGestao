import { ChevronDown, ChevronUp, Copy, Lock, Package, Pencil } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxMetricCard, MxMetricGrid } from '@/components/module/MxModuleVisualPrimitives'
import type { ConsultingProduct } from './consultingProducts'
import { ProductActionsMenu } from './ProductActionsMenu'
import { ProductDetailPanel } from './ProductDetailPanel'
import {
  formatPresenciaisRange,
  isLegacyConsultingProductKey,
  officialProductDefinition,
  productStatusLabel,
  type ProductCatalogAction,
} from './officialConsultingCatalog'

const STATUS_TONE: Record<ConsultingProduct['status'], string> = {
  rascunho: 'bg-muted text-muted-foreground',
  em_revisao: 'bg-status-warning-surface text-status-warning-text',
  publicado: 'bg-status-success-surface text-status-success-text',
  suspenso_novas_contratacoes: 'bg-status-warning-surface text-status-warning-text',
  arquivado: 'bg-muted text-muted-foreground',
}

const LADDER_BADGE: Record<string, string> = {
  pmr_online: 'PMR',
  pmr_hibrido: 'PMR',
  pmr_plus: 'PMR PLUS',
  ppa: 'PPA',
}

export function ConsultingProductCard(props: {
  product: ConsultingProduct
  expanded: boolean
  requiresNewVersion: boolean
  onToggle: () => void
  onAction: (action: ProductCatalogAction, product: ConsultingProduct) => void
  onChanged?: () => void
}) {
  const { product } = props
  const definition = officialProductDefinition(product.program_key)
  const legacy = isLegacyConsultingProductKey(product.program_key)
  const isPublished = product.status === 'publicado' || product.status === 'suspenso_novas_contratacoes'
  const ladder = LADDER_BADGE[product.program_key] ?? definition?.ladderLabel ?? product.program_key

  return (
    <article className="rounded-xl border border-border bg-card shadow-sm" data-testid="consulting-product-card">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          onClick={props.onToggle}
          aria-expanded={props.expanded}
          aria-label={`${props.expanded ? 'Recolher' : 'Expandir'} ${product.name ?? product.program_key}`}
        >
          {(product.name ?? product.program_key).charAt(0).toUpperCase()}
        </button>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={props.onToggle} aria-expanded={props.expanded}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{product.name || definition?.name || product.program_key}</h3>
            <span className="text-sm text-muted-foreground">v{product.versao}</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{ladder}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.total_visits ?? '—'} encontros · Presencial: {formatPresenciaisRange(product)}
          </p>
        </button>
        <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline ${STATUS_TONE[product.status]}`}>
          {productStatusLabel(product.status)}
        </span>
        <button type="button" className="shrink-0 p-1 text-muted-foreground hover:text-foreground" onClick={props.onToggle} aria-label={props.expanded ? 'Recolher detalhes' : 'Expandir detalhes'}>
          {props.expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
        {!isPublished ? (
          <ProductActionsMenu
            product={product}
            requiresNewVersion={props.requiresNewVersion}
            onAction={props.onAction}
          />
        ) : null}
      </div>

      {props.expanded ? (
        <div className="space-y-4 border-t border-border px-4 pb-5 pt-4">
          <MxMetricGrid>
            <MxMetricCard title="Total de encontros" value={product.total_visits ?? '—'} detail="Jornada do produto" icon={Package} />
            <MxMetricCard title="Mín. presenciais" value={product.min_presenciais ?? '—'} detail="Faixa contratada" icon={Package} tone="info" />
            <MxMetricCard title="Máx. presenciais" value={product.max_presenciais ?? '—'} detail="Faixa contratada" icon={Package} tone="info" />
            <MxMetricCard title="Contratos ativos" value={product.clients} detail="Clientes vinculados" icon={Package} tone="success" />
          </MxMetricGrid>

          {product.descricao || definition?.descricao ? (
            <p className="text-sm text-muted-foreground">{product.descricao || definition?.descricao}</p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => props.onAction('editar', product)}>
              <Pencil size={14} />Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => props.onAction('duplicar', product)}>
              <Copy size={14} />Duplicar
            </Button>
            <Button variant="outline" size="sm" onClick={() => props.onAction('nova_versao', product)}>
              <Lock size={14} />Nova versão
            </Button>
          </div>

          {legacy && product.clients > 0 ? (
            <p className="rounded-lg bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">
              Programa legado com contratos ativos — permanece operacional fora do catálogo comercial Base44.
            </p>
          ) : null}

          <ProductDetailPanel product={product} variant="inline" onChanged={props.onChanged} />
        </div>
      ) : null}
    </article>
  )
}
