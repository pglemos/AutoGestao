import { ChevronDown, ChevronUp, Package } from 'lucide-react'
import type { ConsultingProduct } from './consultingProducts'
import { ProductActionsMenu } from './ProductActionsMenu'
import {
  evolutionGroupLabel,
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

export function ConsultingProductCard(props: {
  product: ConsultingProduct
  expanded: boolean
  requiresNewVersion: boolean
  onToggle: () => void
  onAction: (action: ProductCatalogAction, product: ConsultingProduct) => void
}) {
  const { product } = props
  const definition = officialProductDefinition(product.program_key)
  const legacy = isLegacyConsultingProductKey(product.program_key)
  const showExclusivity = product.program_key === 'pmr_online' || product.program_key === 'pmr_hibrido'

  return (
    <article className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-4 text-left"
          onClick={props.onToggle}
          aria-expanded={props.expanded}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{product.name || definition?.name || product.program_key}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[product.status]}`}>
                {productStatusLabel(product.status)}
              </span>
              <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-muted-foreground">v{product.versao}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {evolutionGroupLabel(product.evolution_group)}
              </span>
              {legacy ? (
                <span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-xs font-medium text-status-warning-text">Legado</span>
              ) : null}
              {product.clients > 0 ? (
                <span className="rounded-full bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">
                  {product.clients} contrato{product.clients === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {product.descricao || definition?.descricao || `${product.program_key}${product.modalidade ? ` · ${product.modalidade}` : ''}`}
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <Metric label="Encontros" value={product.total_visits ?? '—'} />
              <Metric label="Presenciais" value={formatPresenciaisRange(product)} />
              <Metric label="Contratos" value={product.clients} />
              <Metric label="Plano estratégico" value={product.usa_plano_estrategico ? 'Sim' : 'Não'} />
            </div>
          </div>
          <div className="pt-1 text-muted-foreground">
            {props.expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
          </div>
        </button>
        <ProductActionsMenu
          product={product}
          requiresNewVersion={props.requiresNewVersion}
          onAction={props.onAction}
        />
      </div>

      {props.expanded ? (
        <div className="space-y-4 border-t border-border px-5 py-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Chave" value={product.program_key} />
            <Detail label="Modalidade" value={product.modalidade || definition?.modalidade || '—'} />
            <Detail label="Grupo evolutivo" value={product.evolution_group} />
            <Detail label="Variante" value={product.modality_variant || definition?.modality_variant || '—'} />
          </div>
          {showExclusivity ? (
            <p className="rounded-lg bg-status-info-surface px-3 py-2 text-sm text-status-info-text">
              PMR Online e PMR Híbrido são variantes do PMR e não podem ficar publicados simultaneamente.
            </p>
          ) : null}
          {legacy && product.clients > 0 ? (
            <p className="rounded-lg bg-status-warning-surface px-3 py-2 text-sm text-status-warning-text">
              Programa legado com contratos ativos — permanece disponível para operação, fora do catálogo comercial Base44.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function Metric(props: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{props.label}</div>
      <div className="font-semibold text-foreground">{props.value}</div>
    </div>
  )
}

function Detail(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{props.label}</div>
      <div className="font-medium text-foreground">{props.value}</div>
    </div>
  )
}
