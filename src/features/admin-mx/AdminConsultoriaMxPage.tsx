import { useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
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
import { useAdminConsultingVisits } from './hooks/useAdminMxLists'

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

export function AdminConsultoriaMxPage() {
  const { rows, loading, error, refetch } = useAdminConsultingVisits()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('todos')
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const statuses = useMemo(() => [...new Set(rows.map(visit => visit.status).filter((value): value is string => Boolean(value)))].sort(), [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(visit => {
      if (status !== 'todos' && visit.status !== status) return false
      if (!term) return true
      return [visit.client_name, visit.product_name, visit.modality].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, status])

  const metrics = useMemo(() => ({
    encontros: rows.length,
    clientes: new Set(rows.map(visit => visit.client_id).filter(Boolean)).size,
    entregas: rows.reduce((sum, visit) => sum + visit.deliverables, 0),
    concluidas: rows.reduce((sum, visit) => sum + visit.deliverables_done, 0),
  }), [rows])

  return (
    <MxModulePage id="admin-mx-consultoria" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          eyebrow="Administração MX"
          title="Consultoria MX"
          description="Jornada de encontros da consultoria: agenda, execução e entregas por cliente."
          actions={<><Button asChild variant="outline"><Link to="/agenda"><CalendarDays size={16} />Agenda MX</Link></Button><Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button></>}
        />
        {loading ? <MxLoadingState label="Carregando jornada de consultoria" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Encontros" value={metrics.encontros} detail="Últimos 300 registros" icon={CalendarDays} />
              <MxMetricCard title="Clientes" value={metrics.clientes} detail="Com jornada em andamento" icon={CalendarDays} tone="info" />
              <MxMetricCard title="Entregas" value={metrics.entregas} detail="Itens previstos nos encontros" icon={CalendarDays} tone="violet" />
              <MxMetricCard title="Entregas concluídas" value={metrics.concluidas} detail="Itens com evidência fechada" icon={CalendarDays} tone="success" />
            </MxMetricGrid>
            <MxToolbar>
              <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por cliente, produto ou modalidade" aria-label="Buscar encontro de consultoria" />
              <MxSelect value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
                <option value="todos">Todos os status</option>
                {statuses.map(item => <option key={item} value={item}>{item}</option>)}
              </MxSelect>
            </MxToolbar>
            <MxSectionCard>
              <MxSectionHeader title="Encontros da jornada" description={`${filtered.length} encontro(s) visível(is).`} />
              <div className="p-5">
                {filtered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[880px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Encontro</TableHead>
                          <TableHead>Produto</TableHead>
                          <TableHead>Modalidade</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Entregas</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(visit => (
                          <TableRow key={visit.id}>
                            <TableCell className="font-semibold text-foreground">{visit.client_name || 'Cliente não identificado'}</TableCell>
                            <TableCell>{visit.visit_number ? `Visita ${visit.visit_number}` : '—'}</TableCell>
                            <TableCell>{visit.product_name || '—'}</TableCell>
                            <TableCell>{visit.modality || '—'}</TableCell>
                            <TableCell>{formatDate(visit.effective_visit_date ?? visit.scheduled_at)}</TableCell>
                            <TableCell>{visit.deliverables_done} / {visit.deliverables}</TableCell>
                            <TableCell>{visit.status || '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState variant="filter" title="Nenhum encontro encontrado" description="Ajuste a busca ou o filtro de status." />}
              </div>
            </MxSectionCard>
          </>
        )}
      </div>
    </MxModulePage>
  )
}

export default AdminConsultoriaMxPage
