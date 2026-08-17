import { useMemo } from 'react'
import {
  Activity,
  AlertOctagon,
  BookOpen,
  CheckSquare,
  ListChecks,
  Loader2,
  RefreshCw,
  Target,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card, CardContent } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import { cn } from '@/lib/utils'
import {
  useDepartamentoDashboard,
  type DepartamentoCode,
  type DepartamentoKpi,
} from '../hooks/useDepartamentoDashboard'

/**
 * Dashboard de departamento (Sprint 2 — S2-T2).
 *
 * Reutilizável para os 6 departamentos do `.docx §270` e da ata 2026-05-22
 * (delta N4 — "departamento como perspectiva principal"). Renderiza:
 *   • 4 KPIs chave (do snapshot do período)
 *   • Score / índice de eficiência (soma ponderada simples)
 *   • Fluxograma com passos
 *   • Checklist com obrigatoriedade
 *   • Biblioteca de regras e boas práticas
 */

type Props = {
  storeId: string | null | undefined
  code: DepartamentoCode
  periodLabel: string
  period?: string
}

const DEPARTAMENTO_LABEL: Record<DepartamentoCode, { name: string; icon: LucideIcon }> = {
  comercial: { name: 'Comercial', icon: Target },
  marketing: { name: 'Marketing', icon: Activity },
  produto: { name: 'Produto', icon: ListChecks },
  financeiro: { name: 'Financeiro', icon: AlertOctagon },
  rh: { name: 'RH', icon: Users },
  operacional: { name: 'Operações', icon: Workflow },
}

function achievementPct(kpi: DepartamentoKpi): number | null {
  if (kpi.meta == null || kpi.realizado == null || kpi.meta === 0) return null
  return (Number(kpi.realizado) / Number(kpi.meta)) * 100
}

export function DepartamentoDashboard({ storeId, code, periodLabel, period }: Props) {
  const { data, loading, error, refresh } = useDepartamentoDashboard(storeId, code, period)
  const def = DEPARTAMENTO_LABEL[code]

  const score = useMemo(() => {
    const kpis = data?.kpis ?? []
    if (!kpis.length) return null
    const values = kpis
      .map((kpi) => achievementPct(kpi))
      .filter((value): value is number => value != null)
    if (!values.length) return null
    const avg = values.reduce((sum, v) => sum + Math.min(150, v), 0) / values.length
    return Math.round(Math.min(100, avg))
  }, [data])

  const tone = score == null ? 'muted' : score >= 90 ? 'success' : score >= 70 ? 'brand' : score >= 60 ? 'warning' : 'danger'
  const scoreLabel = score == null ? '—' : `${score}`

  const top4 = useMemo(() => (data?.kpis ?? []).slice(0, 4), [data])

  return (
    <section className="space-y-mx-md" aria-label={`Dashboard ${def.name}`}>
      <PageHeading
        icon={def.icon}
        title={`Departamento ${def.name}`}
        subtitle={`Visão ${periodLabel} · KPIs do catálogo`}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            <span className="ml-1">Atualizar</span>
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error-text">
            {error}
          </Typography>
        </div>
      )}

      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-2 xl:grid-cols-5">
        <ScoreCard tone={tone} value={scoreLabel} />
        {top4.map((kpi) => (
          <KpiCard key={kpi.indicador_code} kpi={kpi} />
        ))}
        {top4.length < 4 &&
          Array.from({ length: 4 - top4.length }).map((_, idx) => (
            <Card key={`empty-${idx}`} className="border border-dashed">
              <CardContent>
              <Typography variant="tiny" tone="muted" className="font-bold">
                Sem KPI registrado
              </Typography>
              <Typography variant="p" tone="muted" className="mt-mx-sm font-bold normal-case">
                Catálogo de departamento ainda sem snapshot deste indicador.
              </Typography>
              </CardContent>
            </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-3">
        <SectionBlock
          title="Fluxograma do processo"
          icon={Workflow}
          empty={!data?.fluxograma?.length}
          emptyLabel="Fluxograma ainda não cadastrado."
        >
          <ol className="space-y-mx-sm">
            {data?.fluxograma?.map((step) => (
              <li
                key={step.passo}
                className="rounded-2xl border border-border bg-white p-mx-sm"
              >
                <div className="flex items-center gap-mx-xs">
                  <span className="rounded-xl bg-brand-primary px-mx-xs py-mx-tiny text-mx-tiny font-bold uppercase tracking-widest text-pure-white">
                    {step.passo}
                  </span>
                  <Typography variant="caption" className="">
                    {step.titulo}
                  </Typography>
                </div>
                {step.descricao && (
                  <Typography variant="tiny" tone="muted" className="block">
                    {step.descricao}
                  </Typography>
                )}
                {step.responsavel_papel && (
                  <Typography variant="tiny" className="block">
                    Responsável: {step.responsavel_papel}
                  </Typography>
                )}
              </li>
            ))}
          </ol>
        </SectionBlock>

        <SectionBlock
          title="Checklist de execução"
          icon={CheckSquare}
          empty={!data?.checklist?.length}
          emptyLabel="Checklist ainda sem itens."
        >
          <ul className="space-y-mx-xs">
            {data?.checklist?.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'rounded-2xl border p-mx-sm flex items-start gap-mx-xs',
                  item.obrigatorio
                    ? 'border-status-warning/30 bg-status-warning-surface'
                    : 'border-border bg-white',
                )}
              >
                <CheckSquare
                  size={16}
                  className={cn(
                    'mt-mx-tiny',
                    item.obrigatorio ? 'text-status-warning-text' : 'text-muted-foreground',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <Typography variant="caption" className="">
                    {item.titulo}
                  </Typography>
                  {item.descricao && (
                    <Typography variant="tiny" tone="muted" className="block">
                      {item.descricao}
                    </Typography>
                  )}
                  <Badge variant="outline" className="mt-mx-tiny">
                    {item.obrigatorio ? 'Obrigatório' : 'Opcional'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </SectionBlock>

        <SectionBlock
          title="Biblioteca de regras"
          icon={BookOpen}
          empty={!data?.biblioteca?.length}
          emptyLabel="Biblioteca ainda sem conteúdo."
        >
          <ul className="space-y-mx-xs">
            {data?.biblioteca?.map((entry) => (
              <li key={entry.id} className="rounded-2xl border border-border bg-white p-mx-sm">
                <div className="flex items-center gap-mx-xs">
                  <Badge variant="outline" className="">
                    {entry.categoria}
                  </Badge>
                  <Typography variant="caption" className="">
                    {entry.titulo}
                  </Typography>
                </div>
                {entry.url_externo && (
                  <a
                    href={entry.url_externo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-mx-tiny inline-block text-mx-tiny font-bold uppercase tracking-widest text-status-success-text underline"
                  >
                    Abrir material
                  </a>
                )}
              </li>
            ))}
          </ul>
        </SectionBlock>
      </div>
    </section>
  )
}

function ScoreCard({ tone, value }: { tone: string; value: string }) {
  const toneClass: Record<string, string> = {
    success: 'border-status-success/30 bg-status-success-surface text-status-success-text',
    brand: 'border-brand-primary/30 bg-brand-primary-subtle text-status-success-text',
    warning: 'border-status-warning/30 bg-status-warning-surface text-status-warning-text',
    danger: 'border-status-error/30 bg-status-error-surface text-status-error-text',
    muted: 'border-border bg-surface-alt text-muted-foreground',
  }
  return (
    <Card className={cn('border', toneClass[tone])}>
      <CardContent>
      <Typography variant="caption" className="">
        Índice de eficiência
      </Typography>
      <Typography as="p" variant="h2" className="mt-mx-sm">
        {value}
      </Typography>
      <Typography variant="tiny" className="block font-bold normal-case tracking-normal">
        Média ponderada dos atingimentos KPI (cap 150% por indicador).
      </Typography>
      </CardContent>
    </Card>
  )
}

function KpiCard({ kpi }: { kpi: DepartamentoKpi }) {
  const achievement = achievementPct(kpi)
  const tone =
    achievement == null
      ? 'muted'
      : achievement >= 100
        ? 'success'
        : achievement >= 80
          ? 'brand'
          : achievement >= 60
            ? 'warning'
            : 'danger'
  const toneClass: Record<string, string> = {
    success: 'border-status-success/30 bg-status-success-surface text-status-success-text',
    brand: 'border-brand-primary/30 bg-brand-primary-subtle text-status-success-text',
    warning: 'border-status-warning/30 bg-status-warning-surface text-status-warning-text',
    danger: 'border-status-error/30 bg-status-error-surface text-status-error-text',
    muted: 'border-border bg-surface-alt text-muted-foreground',
  }
  return (
    <Card className={cn('border', toneClass[tone])}>
      <CardContent>
      <Typography variant="caption" className="">
        {kpi.indicador_code}
      </Typography>
      <Typography as="p" variant="h2" className="mt-mx-sm">
        {kpi.realizado == null ? '—' : Number(kpi.realizado).toLocaleString('pt-BR')}
      </Typography>
      <Typography variant="tiny" className="block font-bold normal-case tracking-normal">
        Meta {kpi.meta == null ? '—' : Number(kpi.meta).toLocaleString('pt-BR')} •{' '}
        {achievement == null ? 'sem dado' : `${Math.round(achievement)}%`}
      </Typography>
      </CardContent>
    </Card>
  )
}

function SectionBlock({
  title,
  icon: Icon,
  empty,
  emptyLabel,
  children,
}: {
  title: string
  icon: LucideIcon
  empty: boolean
  emptyLabel: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent>
      <header className="mb-mx-sm flex items-center gap-mx-xs">
        <div className="rounded-2xl bg-brand-primary-subtle p-mx-xs text-status-success-text">
          <Icon size={18} aria-hidden="true" />
        </div>
        <Typography variant="h3" className="">
          {title}
        </Typography>
      </header>
      {empty ? (
        <div className="rounded-xl border border-dashed border-border p-mx-sm text-center">
          <Typography variant="tiny" tone="muted" className="font-bold">
            {emptyLabel}
          </Typography>
        </div>
      ) : (
        children
      )}
      </CardContent>
    </Card>
  )
}
