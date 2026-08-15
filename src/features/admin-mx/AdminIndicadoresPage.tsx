import { useMemo, useState } from 'react'
import { Gauge, Plus, RefreshCw } from 'lucide-react'
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
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { IndicatorFormModal } from './components/IndicatorFormModal'
import { saveIndicator, useAdminIndicators, type AdminIndicator, type IndicatorInput } from './hooks/useAdminMxLists'

const DIRECTION_LABEL: Record<string, string> = { increase: 'Maior é melhor', decrease: 'Menor é melhor' }

const EMPTY_INDICATOR: IndicatorInput = { metric_key: '', label: '', area: '', value_type: 'number', direction: 'increase', source_scope: 'manual', active: true }

export function AdminIndicadoresPage() {
  const { rows, loading, error, refetch } = useAdminIndicators()
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('todas')
  const [draft, setDraft] = useState<IndicatorInput>(EMPTY_INDICATOR)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const openNew = () => {
    setDraft(EMPTY_INDICATOR)
    setEditing(false)
    setOpen(true)
  }

  const openEdit = (indicator: AdminIndicator) => {
    setDraft({
      metric_key: indicator.metric_key,
      label: indicator.label ?? '',
      area: indicator.area ?? '',
      value_type: indicator.value_type ?? '',
      direction: indicator.direction ?? '',
      source_scope: indicator.source_scope ?? '',
      active: indicator.active !== false,
    })
    setEditing(true)
    setOpen(true)
  }

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await saveIndicator(draft)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? 'Indicador atualizado.' : 'Indicador criado.')
      setOpen(false)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const areas = useMemo(() => [...new Set(rows.map(item => item.area).filter((value): value is string => Boolean(value)))].sort(), [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(item => {
      if (area !== 'todas' && item.area !== area) return false
      if (!term) return true
      return [item.label, item.metric_key, item.area].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, area])

  const metrics = useMemo(() => ({
    total: rows.length,
    ativos: rows.filter(item => item.active !== false).length,
    areas: areas.length,
    comMeta: rows.filter(item => item.targets > 0).length,
  }), [rows, areas])

  return (
    <MxModulePage id="admin-mx-indicadores" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          eyebrow="Administração MX"
          title="Indicadores"
          description="Catálogo de métricas da consultoria, direção de leitura e cobertura de metas."
          actions={<><Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button><Button onClick={openNew}><Plus size={16} />Novo indicador</Button></>}
        />
        {loading ? <MxLoadingState label="Carregando indicadores" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Indicadores" value={metrics.total} detail="No catálogo" icon={Gauge} />
              <MxMetricCard title="Ativos" value={metrics.ativos} detail="Disponíveis para uso" icon={Gauge} tone="success" />
              <MxMetricCard title="Áreas" value={metrics.areas} detail="Agrupamentos do catálogo" icon={Gauge} tone="info" />
              <MxMetricCard title="Com meta" value={metrics.comMeta} detail="Já têm meta em algum cliente" icon={Gauge} tone="violet" />
            </MxMetricGrid>
            <MxToolbar>
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar indicador" aria-label="Buscar indicador" />
              <MxSelect value={area} onChange={event => setArea(event.target.value)} aria-label="Filtrar por área">
                <option value="todas">Todas as áreas</option>
                {areas.map(item => <option key={item} value={item}>{item}</option>)}
              </MxSelect>
            </MxToolbar>
            <MxSectionCard>
              <MxSectionHeader title="Catálogo de indicadores" description={`${filtered.length} indicador(es) visível(is).`} />
              <div className="p-5">
                {filtered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[820px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Área</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Leitura</TableHead>
                          <TableHead>Escopo</TableHead>
                          <TableHead>Metas</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(item => (
                          <TableRow key={item.metric_key}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{item.label || item.metric_key}</div>
                              <div className="text-xs text-muted-foreground">{item.metric_key}</div>
                            </TableCell>
                            <TableCell>{item.area || '—'}</TableCell>
                            <TableCell>{item.value_type || '—'}</TableCell>
                            <TableCell>{DIRECTION_LABEL[item.direction ?? ''] ?? item.direction ?? '—'}</TableCell>
                            <TableCell>{item.source_scope || '—'}</TableCell>
                            <TableCell>{item.targets}</TableCell>
                            <TableCell>{item.active === false ? 'Inativo' : 'Ativo'}</TableCell>
                            <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState variant="filter" title="Nenhum indicador encontrado" description="Ajuste a busca ou o filtro de área." />}
              </div>
            </MxSectionCard>
          </>
        )}
        <IndicatorFormModal
          open={open}
          editing={editing}
          draft={draft}
          submitting={submitting}
          areas={areas}
          onDraft={setDraft}
          onSubmit={() => void submit()}
          onClose={() => setOpen(false)}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminIndicadoresPage
