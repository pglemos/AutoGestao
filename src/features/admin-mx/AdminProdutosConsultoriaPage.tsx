import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
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
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { ConsultingProductFormModal } from './produtos/ConsultingProductFormModal'
import { ProductDetailDrawer } from './produtos/ProductDetailDrawer'
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

const STATUS_LABEL: Record<ProductStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  publicado: 'Publicado',
  suspenso_novas_contratacoes: 'Suspenso para novas contratações',
  arquivado: 'Arquivado',
}
const TRANSITION_LABEL: Record<ProductStatus, string> = {
  rascunho: 'Voltar a rascunho',
  em_revisao: 'Enviar para revisão',
  publicado: 'Publicar',
  suspenso_novas_contratacoes: 'Suspender novas contratações',
  arquivado: 'Arquivar',
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
  const [draft, setDraft] = useState<ProductDraft>(emptyProductDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ConsultingProduct | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState<ConsultingProduct | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchConsultingProducts()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(product => {
      if (status !== 'todos' && product.status !== status) return false
      if (!term) return true
      return [product.name, product.program_key, product.modalidade].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, status])

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
    const result = await changeProductStatus(product.program_key, next, supabaseUser.id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Produto ${STATUS_LABEL[next].toLowerCase()}.`)
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

  return (
    <MxModulePage id="admin-mx-produtos" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Package}
          eyebrow="Administração MX"
          title="Produtos de Consultoria"
          description="Programas comercializados: ciclo de vida, módulos herdados pelos clientes e capacidade por encontro."
          actions={<><Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button><Button onClick={openNew}><Plus size={16} />Novo Produto</Button></>}
        />
        {loading ? <MxLoadingState label="Carregando produtos" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Produtos" value={metrics.produtos} detail="No catálogo" icon={Package} />
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
            </MxToolbar>
            <MxSectionCard>
              <MxSectionHeader title="Catálogo de produtos" description={`${filtered.length} produto(s) visível(is).`} />
              <div className="p-5">
                {filtered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[980px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Encontros</TableHead>
                          <TableHead>Presenciais</TableHead>
                          <TableHead>Contratos</TableHead>
                          <TableHead>Versão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(product => (
                          <TableRow key={product.program_key}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{product.name || product.program_key}</div>
                              <div className="text-xs text-muted-foreground">{product.program_key}{product.modalidade ? ` · ${product.modalidade}` : ''}</div>
                            </TableCell>
                            <TableCell>{product.total_visits ?? '—'}</TableCell>
                            <TableCell>{product.min_presenciais ?? '—'} a {product.max_presenciais ?? '—'}</TableCell>
                            <TableCell>{product.clients}</TableCell>
                            <TableCell>v{product.versao}</TableCell>
                            <TableCell>{STATUS_LABEL[product.status]}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setDetail(product)}>Abrir</Button>
                                <Button variant="outline" size="sm" onClick={() => openEdit(product)}>{productRequiresNewVersion(product) ? 'Editar / nova versão' : 'Editar'}</Button>
                                {allowedProductTransitions(product.status).map(next => (
                                  <Button key={next} variant="outline" size="sm" onClick={() => void transition(product, next)}>{TRANSITION_LABEL[next]}</Button>
                                ))}
                                <Button variant="outline" size="sm" onClick={() => void duplicate(product, true)}>Nova versão</Button>
                                <Button variant="outline" size="sm" onClick={() => void duplicate(product, false)}>Duplicar</Button>
                                {canDeleteProduct(product) ? <Button variant="outline" size="sm" onClick={() => void remove(product)}>Excluir rascunho</Button> : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState variant={rows.length ? 'filter' : 'dataset'} title={rows.length ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'} description={rows.length ? 'Ajuste a busca ou o filtro de status.' : 'Cadastre programas de visita para liberar a jornada de consultoria.'} action={rows.length ? undefined : <Button onClick={openNew}><Plus size={16} />Novo Produto</Button>} />}
              </div>
            </MxSectionCard>
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
        <ProductDetailDrawer product={detail} onClose={() => setDetail(null)} onChanged={() => void refetch()} />
      </div>
    </MxModulePage>
  )
}

export default AdminProdutosConsultoriaPage
