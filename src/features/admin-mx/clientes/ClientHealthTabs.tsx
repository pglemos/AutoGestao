import { Activity, Database, History } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { dataIntegritySummary, type DataSourceHealth, type ProgressBar, type TimelineEvent } from './clientProgress'

const STATUS_LABEL: Record<DataSourceHealth['status'], string> = {
  ok: 'Em dia',
  vazio: 'Sem dado',
  desatualizado: 'Desatualizado',
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR')
}

/** Aba "Implantação e Aderência": os três progressos lado a lado. */
export function ClientImplantacaoTab(props: { bars: ProgressBar[]; blockers: string[] }) {
  return (
    <div className="space-y-5">
      <MxSectionCard>
        <MxSectionHeader
          title="Progresso da implantação"
          description="Onboarding, liberação de módulos e jornada avançam em ritmos diferentes — por isso aparecem separados."
        />
        <div className="space-y-4 p-5">
          {props.bars.map(bar => (
            <div key={bar.kind} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{bar.label}</span>
                <span className="text-muted-foreground">{bar.done} / {bar.total} · {bar.percent}%</span>
              </div>
              <MxProgress value={bar.percent} label={`${bar.label}: ${bar.percent}%`} />
              <p className="text-xs text-muted-foreground">{bar.detail}</p>
            </div>
          ))}
        </div>
      </MxSectionCard>

      <MxSectionCard>
        <MxSectionHeader title="Aderência" description="Pendências que seguram a operação do cliente." />
        <div className="p-5">
          {props.blockers.length ? (
            <ul className="space-y-2">
              {props.blockers.map(blocker => (
                <li key={blocker} className="rounded-lg border border-border p-3 text-sm text-foreground">{blocker}</li>
              ))}
            </ul>
          ) : (
            <MxEmptyState title="Sem pendências" description="Nenhum item obrigatório em aberto para este cliente." icon={Activity} />
          )}
        </div>
      </MxSectionCard>
    </div>
  )
}

/** Aba "Dados e Integridade": o que cada fonte tem e há quanto tempo. */
export function ClientDadosTab(props: { sources: DataSourceHealth[]; loading: boolean; error: string | null; onRetry: () => void }) {
  if (props.loading) return <MxLoadingState label="Verificando integridade dos dados" />
  if (props.error) return <MxErrorState description={props.error} retry={props.onRetry} />
  const summary = dataIntegritySummary(props.sources)

  return (
    <div className="space-y-5">
      <MxMetricGrid>
        <MxMetricCard title="Fontes em dia" value={summary.ok} detail="Com dado recente" icon={Database} tone="success" />
        <MxMetricCard title="Desatualizadas" value={summary.desatualizados} detail="Último registro há mais de 45 dias" icon={Database} tone="warning" />
        <MxMetricCard title="Sem dado" value={summary.vazios} detail="Nenhum registro do cliente" icon={Database} tone="danger" />
        <MxMetricCard title="Fontes avaliadas" value={summary.total} detail="Cobertura da checagem" icon={Database} />
      </MxMetricGrid>

      <MxSectionCard>
        <MxSectionHeader title="Fontes de dados do cliente" description="Base do que o Módulo Dono consegue mostrar." />
        <div className="p-5">
          <MxTableSurface>
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.sources.map(source => (
                  <TableRow key={source.key}>
                    <TableCell className="font-medium text-foreground">{source.label}</TableCell>
                    <TableCell>{source.rows}</TableCell>
                    <TableCell>{STATUS_LABEL[source.status]}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{source.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MxTableSurface>
        </div>
      </MxSectionCard>
    </div>
  )
}

/** Aba "Histórico e Auditoria": linha do tempo com autor, data e origem. */
export function ClientHistoricoTab(props: { events: TimelineEvent[]; loading: boolean; error: string | null; onRetry: () => void }) {
  if (props.loading) return <MxLoadingState label="Carregando histórico" />
  if (props.error) return <MxErrorState description={props.error} retry={props.onRetry} />

  return (
    <MxSectionCard>
      <MxSectionHeader title="Histórico e auditoria" description={`${props.events.length} evento(s) reunidos de auditoria, planos de ação e encontros.`} />
      <div className="p-5">
        {props.events.length ? (
          <MxTableSurface>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {props.events.map(event => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(event.at)}</TableCell>
                    <TableCell>{event.actor ?? 'Sistema'}</TableCell>
                    <TableCell>{event.action}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{event.entity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{event.detail ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MxTableSurface>
        ) : (
          <MxEmptyState title="Sem histórico registrado" description="Nenhum evento de auditoria para este cliente ainda." icon={History} />
        )}
      </div>
    </MxSectionCard>
  )
}
