import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  PauseCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import {
  activationBlockers,
  formatCnpj,
  formatCityName,
  isActive,
  isRenewalNear,
  type PortfolioClient,
} from './clientPortfolio'
import { ClientActionsMenu, type ClientAction } from './ClientActionsMenu'

export interface GovernancaBloqueiosTabProps {
  rows: PortfolioClient[]
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onReactivate: (client: PortfolioClient) => Promise<void>
}

type GovernanceFilter = 'todos' | 'sem_consultor' | 'bloqueios' | 'renovacoes' | 'suspensos'

export function GovernancaBloqueiosTab({ rows, onAction, onReactivate }: GovernancaBloqueiosTabProps) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<GovernanceFilter>('todos')

  // Categories
  const semConsultor = useMemo(() => rows.filter(c => isActive(c) && !c.implementation_owner_id), [rows])
  const comBloqueios = useMemo(() => rows.filter(c => !isActive(c) && activationBlockers(c).length > 0), [rows])
  const renovacoes = useMemo(() => rows.filter(c => isRenewalNear(c)), [rows])
  const suspensos = useMemo(() => rows.filter(c => Boolean(c.suspended_at)), [rows])

  const totalPendencias = semConsultor.length + comBloqueios.length + renovacoes.length + suspensos.length

  const filtered = useMemo(() => {
    switch (filter) {
      case 'sem_consultor':
        return semConsultor
      case 'bloqueios':
        return comBloqueios
      case 'renovacoes':
        return renovacoes
      case 'suspensos':
        return suspensos
      case 'todos':
      default:
        return rows.filter(
          c =>
            (isActive(c) && !c.implementation_owner_id) ||
            (!isActive(c) && activationBlockers(c).length > 0) ||
            isRenewalNear(c) ||
            Boolean(c.suspended_at)
        )
    }
  }, [filter, rows, semConsultor, comBloqueios, renovacoes, suspensos])

  return (
    <div className="space-y-4">
      {/* Cards de Governança */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter(filter === 'sem_consultor' ? 'todos' : 'sem_consultor')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filter === 'sem_consultor'
              ? 'border-status-warning/60 bg-status-warning-surface shadow-xs ring-1 ring-status-warning/40'
              : 'border-border bg-card hover:border-status-warning/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Sem Consultor MX</span>
            <UserX size={16} className="text-status-warning-text" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{semConsultor.length}</span>
          <span className="text-caption text-muted-foreground">Lojas ativas sem responsável</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'bloqueios' ? 'todos' : 'bloqueios')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filter === 'bloqueios'
              ? 'border-status-error/60 bg-status-error-surface shadow-xs ring-1 ring-status-error/40'
              : 'border-border bg-card hover:border-status-error/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Bloqueios de Ativação</span>
            <AlertTriangle size={16} className="text-status-error-text" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{comBloqueios.length}</span>
          <span className="text-caption text-muted-foreground">Falta item obrigatório</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'renovacoes' ? 'todos' : 'renovacoes')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filter === 'renovacoes'
              ? 'border-status-info/60 bg-status-info-surface shadow-xs ring-1 ring-status-info/40'
              : 'border-border bg-card hover:border-status-info/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Renovações Próximas</span>
            <CalendarClock size={16} className="text-status-info-text" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{renovacoes.length}</span>
          <span className="text-caption text-muted-foreground">Vencimento em até 60 dias</span>
        </button>

        <button
          type="button"
          onClick={() => setFilter(filter === 'suspensos' ? 'todos' : 'suspensos')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filter === 'suspensos'
              ? 'border-border-subtle bg-surface-alt shadow-xs ring-1 ring-border'
              : 'border-border bg-card hover:border-border-subtle hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Clientes Suspensos</span>
            <PauseCircle size={16} className="text-muted-foreground" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{suspensos.length}</span>
          <span className="text-caption text-muted-foreground">Aguardando reativação</span>
        </button>
      </div>

      {/* Main Section */}
      <MxSectionCard>
        <MxSectionHeader
          title="Auditoria e Governança Operacional"
          description={
            totalPendencias === 0
              ? 'Nenhuma pendência estrutural identificada na rede de clientes.'
              : `${filtered.length} unidade(s) requerem atenção para manter a integridade da operação.`
          }
          actions={
            filter !== 'todos' ? (
              <Button variant="ghost" size="sm" onClick={() => setFilter('todos')}>
                Ver todas as pendências
              </Button>
            ) : null
          }
        />

        <div className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <MxEmptyState
              title="Tudo em dia com a governança da rede!"
              description="Nenhum cliente com bloqueios, pendências de consultor ou renovações críticas no momento."
            />
          ) : (
            <MxTableSurface>
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Cliente / Loja</TableHead>
                    <TableHead className="w-[180px]">Status Operacional</TableHead>
                    <TableHead className="w-[260px]">Diagnóstico de Governança</TableHead>
                    <TableHead className="w-[180px] text-right">Ação Corretiva</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => {
                    const blockers = activationBlockers(client)
                    const isSuspended = Boolean(client.suspended_at)
                    const noConsultant = isActive(client) && !client.implementation_owner_id
                    const renewal = isRenewalNear(client)

                    return (
                      <TableRow key={client.id} className="transition-colors hover:bg-surface-alt/50">
                        {/* 1. Empresa */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-status-warning-surface text-status-warning-text font-bold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                                className="font-semibold text-foreground hover:text-brand-primary focus-visible:text-brand-primary text-left truncate block max-w-[220px] outline-none"
                              >
                                {client.name}
                              </button>
                              <div className="text-xs text-muted-foreground">
                                {client.primary_store_city ? formatCityName(client.primary_store_city) : 'Cidade não informada'}
                                {' · '}
                                {client.cnpj ? `CNPJ: ${formatCnpj(client.cnpj)}` : 'CNPJ não informado'}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Status */}
                        <TableCell>
                          {isSuspended ? (
                            <Badge variant="danger">Suspenso</Badge>
                          ) : isActive(client) ? (
                            <Badge variant="success">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </TableCell>

                        {/* 3. Diagnóstico */}
                        <TableCell>
                          <div className="space-y-1">
                            {noConsultant && (
                              <div className="flex items-center gap-1.5 text-xs text-status-warning-text font-medium">
                                <AlertTriangle size={14} />
                                <span>Sem consultor MX atribuído</span>
                              </div>
                            )}

                            {blockers.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {blockers.map(b => (
                                  <span
                                    key={b}
                                    className="inline-flex items-center gap-1 rounded bg-status-error-surface px-1.5 py-0.5 text-caption font-medium text-status-error-text"
                                  >
                                    <AlertCircle size={12} />
                                    {b}
                                  </span>
                                ))}
                              </div>
                            )}

                            {renewal && (
                              <div className="flex items-center gap-1.5 text-xs text-status-info-text">
                                <CalendarClock size={14} />
                                <span>Contrato vence em breve</span>
                              </div>
                            )}

                            {isSuspended && client.suspended_reason && (
                              <div className="text-xs text-muted-foreground italic">
                                Motivo: {client.suspended_reason}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. Ação */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isSuspended ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-medium text-status-success-text hover:bg-status-success-surface"
                                onClick={() => void onReactivate(client)}
                              >
                                Reativar
                              </Button>
                            ) : noConsultant ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-medium"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}?tab=pessoas`)}
                              >
                                Atribuir Consultor
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-medium"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                              >
                                Visão 360
                              </Button>
                            )}
                            <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          )}
        </div>
      </MxSectionCard>
    </div>
  )
}
