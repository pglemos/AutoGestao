import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import type { ConsultingClient } from '@/lib/schemas/consulting-client.schema'

export function ConsultingClientTable({
  rows,
  onEdit,
  onArchive,
  onRestore,
}: {
  rows: ConsultingClient[]
  onEdit?: (client: ConsultingClient) => void
  onArchive?: (clientId: string) => void
  onRestore?: (clientId: string) => void
}) {
  if (!rows.length) return <MxEmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre um novo cliente." />
  return (
    <MxTableSurface>
      <table className="min-w-[780px] w-full text-sm">
        <thead><tr className="border-b border-border-subtle bg-gray-50 text-left text-muted-foreground"><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Produto</th><th className="px-4 py-3">Progresso</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
        <tbody>{rows.map(client => { const archived = client.status === 'arquivado'; return <tr key={client.id} className="border-b border-border-subtle last:border-0"><td className="px-4 py-4"><div className="font-semibold text-foreground">{client.name}</div><div className="text-xs text-muted-foreground">{client.legal_name || 'Sem razão social'}</div></td><td className="px-4 py-4">{client.product_name || 'Não definido'}</td><td className="px-4 py-4">{client.current_visit_step || 0} / 7</td><td className="px-4 py-4">{String(client.status || 'ativo').toUpperCase()}</td><td className="px-4 py-4 text-right"><div className="flex justify-end gap-2"><Button asChild variant="secondary" size="sm"><Link to={`/consultoria/clientes/${client.slug || client.id}`}>Abrir</Link></Button>{onEdit ? <Button variant="secondary" size="sm" onClick={() => onEdit(client)}>Editar</Button> : null}{archived ? onRestore ? <Button variant="secondary" size="sm" onClick={() => onRestore(client.id)}>Restaurar</Button> : null : onArchive ? <Button variant="secondary" size="sm" onClick={() => onArchive(client.id)}>Arquivar</Button> : null}</div></td></tr> })}</tbody>
      </table>
    </MxTableSurface>
  )
}
