import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import type { ConsultingClient } from '@/lib/schemas/consulting-client.schema'

export function ConsultingClientTable({
  rows,
  onEdit,
  onArchive,
  onRestore,
  detailBasePath = '/consultoria/clientes',
}: {
  rows: ConsultingClient[]
  onEdit?: (client: ConsultingClient) => void
  onArchive?: (clientId: string) => void
  onRestore?: (clientId: string) => void
  /**
   * Base do link "Abrir". A carteira consultiva (`/consultoria/clientes`) abre a
   * ficha de acompanhamento; o módulo Administrador (`/clientes`) abre a Visão
   * 360 administrativa. A mesma tabela serve as duas rotas.
   */
  detailBasePath?: string
}) {
  if (!rows.length) return <MxEmptyState variant="filter" title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre um novo cliente." />
  return (
    <MxTableSurface>
      <Table className="min-w-[780px]">
        <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Produto</TableHead><TableHead>Progresso</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
        <TableBody>{rows.map(client => { const archived = client.status === 'arquivado'; return <TableRow key={client.id}><TableCell><div className="font-semibold text-foreground">{client.name}</div><div className="text-xs text-muted-foreground">{client.legal_name || 'Sem razão social'}</div></TableCell><TableCell>{client.product_name || 'Não definido'}</TableCell><TableCell>{client.current_visit_step || 0} / 7</TableCell><TableCell>{String(client.status || 'ativo').toUpperCase()}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button asChild variant="outline" size="sm"><Link to={`${detailBasePath}/${client.slug || client.id}`}>Abrir</Link></Button>{onEdit ? <Button variant="outline" size="sm" onClick={() => onEdit(client)}>Editar</Button> : null}{archived ? onRestore ? <Button variant="outline" size="sm" onClick={() => onRestore(client.id)}>Restaurar</Button> : null : onArchive ? <Button variant="outline" size="sm" onClick={() => onArchive(client.id)}>Arquivar</Button> : null}</div></TableCell></TableRow> })}</TableBody>
      </Table>
    </MxTableSurface>
  )
}
