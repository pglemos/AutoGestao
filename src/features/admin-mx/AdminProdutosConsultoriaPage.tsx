import { useMemo, useState } from 'react'
import { Package, Plus, RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { ConsultingProductFormModal } from './components/ConsultingProductFormModal'
import { saveConsultingProduct, useAdminConsultingProducts, type ConsultingProductInput } from './hooks/useAdminMxLists'

const EMPTY_PRODUCT: ConsultingProductInput = { program_key: '', name: '', total_visits: 7, active: true }

export function AdminProdutosConsultoriaPage() {
  const { rows, loading, error, refetch } = useAdminConsultingProducts()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [draft, setDraft] = useState<ConsultingProductInput>(EMPTY_PRODUCT)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const openNew = () => {
    setDraft(EMPTY_PRODUCT)
    setEditing(false)
    setOpen(true)
  }

  const openEdit = (product: { program_key: string; name: string | null; total_visits: number | null; active: boolean | null }) => {
    setDraft({ program_key: product.program_key, name: product.name ?? '', total_visits: product.total_visits ?? 1, active: product.active !== false })
    setEditing(true)
    setOpen(true)
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await saveConsultingProduct(draft)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? 'Produto atualizado.' : 'Produto criado.')
      setOpen(false)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const metrics = useMemo(() => ({
    produtos: rows.length,
    ativos: rows.filter(product => product.active !== false).length,
    clientes: rows.reduce((sum, product) => sum + product.clients, 0),
    encontros: rows.reduce((sum, product) => sum + (product.total_visits ?? 0), 0),
  }), [rows])

  return (
    <MxModulePage id="admin-mx-produtos" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          eyebrow="Administração MX"
          title="Produtos de consultoria"
          description="Programas de visita comercializados, carga de encontros e clientes vinculados."
          actions={<><Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button><Button onClick={openNew}><Plus size={16} />Novo produto</Button></>}
        />
        {loading ? <MxLoadingState label="Carregando produtos" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Produtos" value={metrics.produtos} detail="Programas cadastrados" icon={Package} />
              <MxMetricCard title="Ativos" value={metrics.ativos} detail="Disponíveis para venda" icon={Package} tone="success" />
              <MxMetricCard title="Clientes vinculados" value={metrics.clientes} detail="Contratos não arquivados" icon={Package} tone="info" />
              <MxMetricCard title="Encontros previstos" value={metrics.encontros} detail="Somatório das jornadas" icon={Package} tone="violet" />
            </MxMetricGrid>
            <MxSectionCard>
              <MxSectionHeader title="Catálogo de produtos" description={`${rows.length} produto(s) cadastrado(s).`} />
              <div className="p-5">
                {rows.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[680px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Chave</TableHead>
                          <TableHead>Encontros</TableHead>
                          <TableHead>Clientes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(product => (
                          <TableRow key={product.program_key}>
                            <TableCell className="font-semibold text-foreground">{product.name || product.program_key}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{product.program_key}</TableCell>
                            <TableCell>{product.total_visits ?? '—'}</TableCell>
                            <TableCell>{product.clients}</TableCell>
                            <TableCell>{product.active === false ? 'Inativo' : 'Ativo'}</TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => openEdit(product)}>Editar</Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState title="Nenhum produto cadastrado" description="Cadastre programas de visita para liberar a jornada de consultoria." action={<Button onClick={openNew}><Plus size={16} />Novo produto</Button>} />}
              </div>
            </MxSectionCard>
          </>
        )}
        <ConsultingProductFormModal
          open={open}
          editing={editing}
          draft={draft}
          submitting={submitting}
          onDraft={setDraft}
          onSubmit={() => void submit()}
          onClose={() => setOpen(false)}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminProdutosConsultoriaPage
