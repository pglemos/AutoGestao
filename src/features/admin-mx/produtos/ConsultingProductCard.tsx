import { ChevronDown, ChevronUp, Package } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import type { ConsultingProduct } from './consultingProducts'
import {
  formatPresenciaisRange,
  officialProductDefinition,
  productStatusLabel,
  visibleProductActions,
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
  const actions = visibleProductActions(product, { requiresNewVersion: props.requiresNewVersion })
  const showExclusivity = product.program_key === 'pmr_online' || product.program_key === 'pmr_hibrido'

  return (
    <article className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        className="flex w-full items-start gap-4 p-5 text-left"
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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{definition?.descricao || product.descricao || 'Programa de consultoria MX.'}</p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
            <Metric label="Encontros" value={product.total_visits ?? '—'} />
            <Metric label="Presenciais" value={formatPresenciaisRange(product)} />
            <Metric label="Contratos" value={product.clients} />
            <Metric label="Programas habilitados" value={product.usa_plano_estrategico ? 'Plano estratégico' : 'Consultoria'} />
          </div>
        </div>
        <div className="pt-1 text-muted-foreground">
          {props.expanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </div>
      </button>

      {props.expanded ? (
        <div className="space-y-4 border-t border-border px-5 py-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
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
          <div className="flex flex-wrap gap-2">
            {actions.map(item => (
              <Button
                key={item.action}
                variant={item.primary ? 'primary' : 'outline'}
                size="sm"
                onClick={() => props.onAction(item.action, product)}
              >
                {item.label}
              </Button>
            ))}
          </div>
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
