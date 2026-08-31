import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { ConsultingProductFormModal } from './produtos/ConsultingProductFormModal'
import { ConsultingProductCard } from './produtos/ConsultingProductCard'
import {
  OFFICIAL_CONSULTING_PRODUCT_DEFINITIONS,
  filterConsultingCatalog,
  partitionConsultingCatalog,
  type CatalogSortKey,
  type ProductCatalogAction,
} from './produtos/officialConsultingCatalog'
import {
  allowedProductTransitions,
  canDeleteProduct,
  changeProductStatus,
  deleteDraftProduct,
  duplicateProduct,
  emptyProductDraft,
  fetchConsultingProducts,
  nextVersionKey,
  productRequiresNewVersion,
  saveProduct,
  type ConsultingProduct,
  type ProductDraft,
  type ProductStatus,
} from './produtos/consultingProducts'

const TRANSITION_BY_ACTION: Partial<Record<ProductCatalogAction, ProductStatus>> = {
  enviar_revisao: 'em_revisao',
  publicar: 'publicado',
  suspender: 'suspenso_novas_contratacoes',
  arquivar: 'arquivado',
  restaurar_rascunho: 'rascunho',
}

export function AdminProdutosConsultoriaPage() {
  const { supabaseUser } = useAuth()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [rows, setRows] = useState<ConsultingProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const [modalidade, setModalidade] = useState('todas')
  const [sort, setSort] = useState<CatalogSortKey>('nome')
  const [showLegacy, setShowLegacy] = useState(false)
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft())
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ConsultingProduct | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({})

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchConsultingProducts()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const filtered = useMemo(
    () => filterConsultingCatalog(rows, { search, status, modalidade, sort }),
    [rows, search, status, modalidade, sort],
  )

  const catalog = useMemo(() => partitionConsultingCatalog(filtered), [filtered])

  const officialRows = useMemo(() => {
    const byKey = new Map(catalog.official.map(product => [product.program_key, product]))
    return OFFICIAL_CONSULTING_PRODUCT_DEFINITIONS.map(definition => byKey.get(definition.program_key) ?? null)
  }, [catalog.official])

  const metrics = useMemo(() => ({
    produtos: rows.length,
    contratos: rows.reduce((sum, product) => sum + product.clients, 0),
    encontros: rows.reduce((sum, product) => sum + (product.total_visits ?? 0), 0),
    presenciais: rows.reduce((sum, product) => sum + (product.max_presenciais ?? product.min_presenciais ?? 0), 0),
  }), [rows])

  const openNew = () => {
    setDraft(emptyProductDraft())
    setEditing(false)
    setEditingProduct(null)
    setFormOpen(true)
  }

  const openEdit = (product: ConsultingProduct) => {
    if (productRequiresNewVersion(product)) {
      void duplicate(product, true)
      return
    }
    setDraft({
      program_key: product.program_key,
      name: product.name ?? '',
      descricao: product.descricao ?? '',
      modalidade: product.modalidade ?? '',
      total_visits: product.total_visits ?? 1,
      min_presenciais: product.min_presenciais,
      max_presenciais: product.max_presenciais,
      usa_plano_estrategico: product.usa_plano_estrategico,
      evolution_group: product.evolution_group,
      modality_variant: product.modality_variant ?? '',
    })
    setEditing(true)
    setEditingProduct(product)
    setFormOpen(true)
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await saveProduct(draft, editing, editingProduct ?? undefined)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? 'Produto atualizado.' : 'Produto criado como rascunho.')
      setFormOpen(false)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const transition = async (product: ConsultingProduct, next: ProductStatus) => {
    if (!supabaseUser) return
    if (!allowedProductTransitions(product.status).includes(next)) {
      toast.error('Transição de status não permitida para este produto.')
      return
    }
    const result = await changeProductStatus(product.program_key, next, supabaseUser.id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Status do produto atualizado.')
    await refetch()
  }

  const duplicate = async (product: ConsultingProduct, asNewVersion: boolean) => {
    const key = asNewVersion ? nextVersionKey(product.program_key, product.versao) : `${product.program_key}_copia`
    const name = asNewVersion ? `${product.name ?? product.program_key} v${product.versao + 1}` : `${product.name ?? product.program_key} (cópia)`
    const result = await duplicateProduct(product, key, name, asNewVersion ? product.versao + 1 : 1)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(asNewVersion ? 'Nova versão criada como rascunho.' : 'Produto duplicado como rascunho.')
    await refetch()
  }

  const remove = async (product: ConsultingProduct) => {
    const result = await deleteDraftProduct(product)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Rascunho excluído.')
    await refetch()
  }

  const handleAction = (action: ProductCatalogAction, product: ConsultingProduct) => {
    if (action === 'abrir') {
      toggleExpanded(product.program_key)
      return
    }
    if (action === 'editar') {
      openEdit(product)
      return
    }
    if (action === 'nova_versao') {
      void duplicate(product, true)
      return
    }
    if (action === 'duplicar') {
      void duplicate(product, false)
      return
    }
    if (action === 'excluir_rascunho') {
      if (!canDeleteProduct(product)) {
        toast.error('Só é possível excluir rascunho sem cliente vinculado.')
        return
      }
      void remove(product)
      return
    }
    const nextStatus = TRANSITION_BY_ACTION[action]
    if (nextStatus) void transition(product, nextStatus)
  }

  const toggleExpanded = (programKey: string) => {
    setExpandedKeys(current => ({ ...current, [programKey]: !current[programKey] }))
  }

  return (
    <MxModulePage id="admin-mx-produtos" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Package}
          eyebrow="Administração MX"
          title="Produtos de Consultoria"
          description="Catálogo oficial MX: PMR Online, PMR Híbrido, PMR Plus e PPA — ciclo de vida, módulos, tempos e plano estratégico por programa."
          actions={(
            <>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              <Button onClick={openNew}><Plus size={16} />Novo Produto</Button>
            </>
          )}
        />
        {loading ? <MxLoadingState label="Carregando produtos" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Produtos" value={metrics.produtos} detail="Catálogo completo incl. legado oculto" icon={Package} />
              <MxMetricCard title="Encontros previstos" value={metrics.encontros} detail="Somatório das jornadas" icon={Package} tone="violet" />
              <MxMetricCard title="Presenciais" value={metrics.presenciais} detail="Limite máximo das jornadas" icon={Package} tone="info" />
              <MxMetricCard title="Contratos ativos" value={metrics.contratos} detail="Clientes vinculados" icon={Package} tone="success" />
            </MxMetricGrid>
            <MxStatusBanner tone="info" className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} aria-hidden="true" />
                <span>Regras de exclusividade evolutiva</span>
              </div>
              <ul className="ml-6 list-disc space-y-1 font-normal">
                <li>Grupo CONSULTORIA_EVOLUTIVA_PRINCIPAL: apenas um programa ativo por empresa (PMR → PMR Plus → PPA).</li>
                <li>PMR Online e PMR Híbrido são variantes do PMR e não podem ficar simultaneamente ativos.</li>
                <li>Produto publicado com clientes vinculados não pode ser excluído.</li>
                <li>Para editar um produto publicado, uma nova versão em rascunho deve ser criada.</li>
              </ul>
            </MxStatusBanner>
            <MxToolbar>
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" />
              <MxSelect value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
                <option value="todos">Todos os status</option>
                <option value="rascunho">Rascunho</option>
                <option value="em_revisao">Em revisão</option>
                <option value="publicado">Publicado</option>
                <option value="suspenso_novas_contratacoes">Suspenso</option>
                <option value="arquivado">Arquivado</option>
              </MxSelect>
              <MxSelect value={modalidade} onChange={event => setModalidade(event.target.value)} aria-label="Filtrar por modalidade">
                <option value="todas">Todas as modalidades</option>
                <option value="online">Online</option>
                <option value="hibrido">Híbrido</option>
                <option value="presencial">Presencial</option>
              </MxSelect>
              <MxSelect value={sort} onChange={event => setSort(event.target.value as CatalogSortKey)} aria-label="Ordenar catálogo">
                <option value="nome">Ordenar: nome</option>
                <option value="contratos">Ordenar: contratos</option>
                <option value="encontros">Ordenar: encontros</option>
                <option value="status">Ordenar: status</option>
              </MxSelect>
            </MxToolbar>

            <MxSectionCard>
              <MxSectionHeader title="Catálogo oficial" description="Quatro programas comercializados conforme metodologia MX / Base44." />
              <div className="space-y-4 p-5">
                {officialRows.every(product => product == null) ? (
                  <MxEmptyState
                    variant="dataset"
                    title="Catálogo oficial não encontrado"
                    description="Os quatro programas oficiais ainda não estão publicados neste ambiente. Aplique a migration de alinhamento ou o seed de produtos."
                  />
                ) : (
                  officialRows.map((product, index) => {
                    const definition = OFFICIAL_CONSULTING_PRODUCT_DEFINITIONS[index]
                    if (!product) {
                      return (
                        <div key={definition.program_key} className="rounded-xl border border-dashed border-border bg-surface-alt/40 p-5">
                          <div className="font-semibold text-foreground">{definition.name}</div>
                          <p className="mt-1 text-sm text-muted-foreground">{definition.descricao}</p>
                          <p className="mt-2 text-xs text-muted-foreground">Programa ausente no banco — aguardando seed ou publicação.</p>
                        </div>
                      )
                    }
                    return (
                      <ConsultingProductCard
                        key={product.program_key}
                        product={product}
                        expanded={Boolean(expandedKeys[product.program_key])}
                        requiresNewVersion={productRequiresNewVersion(product)}
                        onToggle={() => toggleExpanded(product.program_key)}
                        onAction={handleAction}
                        onChanged={() => void refetch()}
                      />
                    )
                  })
                )}
              </div>
            </MxSectionCard>

            {catalog.versionDrafts.length ? (
              <MxSectionCard>
                <MxSectionHeader title="Versões em rascunho" description={`${catalog.versionDrafts.length} versão(ões) derivada(s) aguardando revisão ou publicação.`} />
                <div className="space-y-4 p-5">
                  {catalog.versionDrafts.map(product => (
                    <ConsultingProductCard
                      key={product.program_key}
                      product={product}
                      expanded={Boolean(expandedKeys[product.program_key])}
                      requiresNewVersion={productRequiresNewVersion(product)}
                      onToggle={() => toggleExpanded(product.program_key)}
                      onAction={handleAction}
                    />
                  ))}
                </div>
              </MxSectionCard>
            ) : null}

            {catalog.legacy.length ? (
              <MxSectionCard>
                <MxSectionHeader
                  title="Programas legados"
                  description={`${catalog.legacy.length} chave(s) histórica(s) fora do catálogo Base44 (pmr_7, pmr_9, mx_start).`}
                  actions={(
                    <Button variant="outline" size="sm" onClick={() => setShowLegacy(current => !current)}>
                      {showLegacy ? 'Ocultar legado' : 'Mostrar legado'}
                    </Button>
                  )}
                />
                {showLegacy ? (
                  <div className="space-y-4 p-5">
                    {catalog.legacy.map(product => (
                      <ConsultingProductCard
                        key={product.program_key}
                        product={product}
                        expanded={Boolean(expandedKeys[product.program_key])}
                        requiresNewVersion={productRequiresNewVersion(product)}
                        onToggle={() => toggleExpanded(product.program_key)}
                        onAction={handleAction}
                        onChanged={() => void refetch()}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="px-5 pb-5 text-sm text-muted-foreground">
                    Oculto por padrão. pmr_7 permanece operacional enquanto houver contratos — nunca é excluído automaticamente.
                  </div>
                )}
              </MxSectionCard>
            ) : null}
          </>
        )}
        <ConsultingProductFormModal
          open={formOpen}
          editing={editing}
          draft={draft}
          submitting={submitting}
          onDraft={setDraft}
          onSubmit={() => void submit()}
          onClose={() => setFormOpen(false)}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminProdutosConsultoriaPage
