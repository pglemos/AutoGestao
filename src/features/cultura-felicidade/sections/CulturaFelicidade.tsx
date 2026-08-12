import { Heart, Loader2, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import { useCulturaFelicidade, type CulturaTipo } from '../hooks/useCulturaFelicidade'

/**
 * Painel Cultura + Felicidade — Sprint 2 (S2-T5).
 *
 * Cultura de Resultado (N11): repescagem, campanha, reconhecimento, feed cultural.
 * Índice de Felicidade RH (N12): NPS de clima + liderança + carreira (agregado).
 */

const TIPO_LABEL: Record<CulturaTipo, string> = {
  repescagem: 'Repescagem',
  campanha: 'Campanha',
  reconhecimento: 'Reconhecimento',
  feed_cultural: 'Feed cultural',
}

const TIPO_TONE: Record<CulturaTipo, string> = {
  repescagem: 'border-status-warning/30 bg-status-warning-surface text-status-warning-text',
  campanha: 'border-brand-primary/30 bg-mx-indigo-50 text-status-success-text',
  reconhecimento: 'border-status-success/30 bg-status-success-surface text-status-success-text',
  feed_cultural: 'border-border bg-gray-50 text-muted-foreground',
}

type Props = {
  storeId: string | null | undefined
}

function clamp10(value: number | null): number | null {
  if (value == null) return null
  return Math.max(0, Math.min(10, value))
}

export function CulturaFelicidade({ storeId }: Props) {
  const {
    registros,
    ciclos,
    loading,
    error,
    refresh,
    cicloAtual,
    mediasUltimos3,
  } = useCulturaFelicidade(storeId)

  return (
    <section className="space-y-mx-lg" aria-label="Cultura e Felicidade">
      <header className="flex flex-col gap-mx-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-brand-primary p-mx-sm text-pure-white shadow-sm">
            <Heart size={22} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h2" className="tracking-tight">
              Cultura + Felicidade
            </Typography>
            <Typography variant="tiny" tone="muted" className="block font-bold normal-case tracking-normal">
              Cultura de Resultado (N11) • Índice de Felicidade RH (N12) — ata 2026-05-22.
            </Typography>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          <span className="ml-1">Atualizar</span>
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-status-error/40 bg-status-error-surface p-mx-sm">
          <Typography variant="tiny" className="text-status-error-text">
            {error}
          </Typography>
        </div>
      )}

      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-3">
        <Card className="border border-brand-primary/40 bg-mx-indigo-50 p-mx-md">
          <Typography variant="caption" className="">
            Ciclo atual
          </Typography>
          <Typography as="p" variant="h2" className="mt-mx-sm">
            {cicloAtual?.ciclo ?? '—'}
          </Typography>
          <Typography variant="tiny" className="block font-bold normal-case tracking-normal">
            {cicloAtual
              ? `${cicloAtual.total_respostas} resposta(s) anônima(s)`
              : 'Nenhum ciclo registrado.'}
          </Typography>
        </Card>
        <MediaCard
          label="Clima organizacional"
          value={clamp10(cicloAtual?.media_clima ?? null)}
        />
        <MediaCard
          label="Liderança"
          value={clamp10(cicloAtual?.media_lideranca ?? null)}
        />
      </div>

      <Card className="p-mx-md">
        <header className="mb-mx-sm flex items-center gap-mx-xs">
          <div className="rounded-2xl bg-mx-indigo-50 p-mx-xs text-status-success-text">
            <TrendingUp size={18} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Tendência últimos 3 ciclos
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              Média de clima por ciclo (ordem cronológica).
            </Typography>
          </div>
        </header>
        {mediasUltimos3.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Sem ciclos registrados ainda.
            </Typography>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-mx-sm">
            {mediasUltimos3.map((item) => (
              <li
                key={item.ciclo}
                className="rounded-2xl border border-border bg-white p-mx-sm text-center"
              >
                <Typography
                  variant="tiny"
                  tone="muted"
                  className=""
                >
                  {item.ciclo}
                </Typography>
                <Typography as="p" variant="h3" className="mt-mx-tiny">
                  {item.clima == null ? '—' : item.clima.toFixed(1)}
                </Typography>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-mx-md">
        <header className="mb-mx-sm flex items-center gap-mx-xs">
          <div className="rounded-2xl bg-mx-indigo-50 p-mx-xs text-status-success-text">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Cultura de Resultado — registros recentes
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              Repescagens, campanhas, reconhecimentos e feed cultural.
            </Typography>
          </div>
        </header>

        {registros.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Nenhum registro de cultura cadastrado.
            </Typography>
          </div>
        ) : (
          <ul className="space-y-mx-sm">
            {registros.map((reg) => (
              <li
                key={reg.id}
                className={cn('rounded-2xl border p-mx-sm', TIPO_TONE[reg.tipo])}
              >
                <div className="flex flex-wrap items-center gap-mx-xs">
                  <Badge variant="outline" className="">
                    {TIPO_LABEL[reg.tipo]}
                  </Badge>
                  {reg.alvo_role && (
                    <Badge variant="outline" className="">
                      {reg.alvo_role}
                    </Badge>
                  )}
                  <Typography
                    variant="tiny"
                    tone="muted"
                    className="ml-auto font-bold normal-case tracking-normal"
                  >
                    {new Date(`${reg.data_referencia}T12:00:00`).toLocaleDateString('pt-BR')}
                  </Typography>
                </div>
                <Typography variant="p" className="mt-mx-xs">
                  {reg.titulo}
                </Typography>
                {reg.mensagem && (
                  <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">
                    {reg.mensagem}
                  </Typography>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {ciclos.length > 0 && (
        <Card className="p-mx-md">
          <header className="mb-mx-sm">
            <Typography variant="h3" className="">
              Histórico de ciclos (anônimo)
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              Apenas agregados — respostas individuais ficam protegidas por RLS.
            </Typography>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left">
                <tr className="bg-gray-50">
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Ciclo</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Respostas</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Clima</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Liderança</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Carreira</th>
                </tr>
              </thead>
              <tbody>
                {ciclos.map((c) => (
                  <tr key={c.ciclo} className="border-t border-border/60">
                    <td className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">
                      {c.ciclo}
                    </td>
                    <td className="px-mx-sm py-mx-xs">{c.total_respostas}</td>
                    <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                      {c.media_clima == null ? '—' : c.media_clima.toFixed(1)}
                    </td>
                    <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                      {c.media_lideranca == null ? '—' : c.media_lideranca.toFixed(1)}
                    </td>
                    <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                      {c.media_carreira == null ? '—' : c.media_carreira.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  )
}

function MediaCard({ label, value }: { label: string; value: number | null }) {
  const tone =
    value == null
      ? 'border-border bg-gray-50 text-muted-foreground'
      : value >= 8
        ? 'border-status-success/30 bg-status-success-surface text-status-success-text'
        : value >= 6
          ? 'border-status-warning/30 bg-status-warning-surface text-status-warning-text'
          : 'border-status-error/30 bg-status-error-surface text-status-error-text'
  return (
    <Card className={cn('rounded-2xl border p-mx-md', tone)}>
      <Typography variant="caption" className="">
        {label}
      </Typography>
      <Typography as="p" variant="h2" className="mt-mx-sm">
        {value == null ? '—' : value.toFixed(1)}
      </Typography>
      <Typography variant="tiny" className="block font-bold normal-case tracking-normal">
        Escala 0–10
      </Typography>
    </Card>
  )
}
