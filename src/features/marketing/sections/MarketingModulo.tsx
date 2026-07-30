import { Briefcase, Calendar, Loader2, Megaphone, RefreshCw, Star, Users } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import { useMarketingModulo, type CarteiraFluxoEstado } from '../hooks/useMarketingModulo'

/**
 * Módulo Marketing — Sprint 2 (S2-T3).
 *
 * Reúne Carteira da Empresa (N5), Posicionamento (N15) e Agenda Estratégica
 * Mensal (N14) em uma única tela. Permite o consultor/dono ver "saúde de
 * relacionamento" + "mensagem da marca" + "plano de execução do mês".
 */

const FLUXO_LABEL: Record<CarteiraFluxoEstado, string> = {
  novo: 'Novo',
  contato_inicial: 'Contato inicial',
  aquecimento: 'Aquecimento',
  negociacao: 'Negociação',
  convertido: 'Convertido',
  perdido: 'Perdido',
}

const FLUXO_TONE: Record<CarteiraFluxoEstado, string> = {
  novo: 'border-gray-200 bg-gray-50 text-gray-500',
  contato_inicial: 'border-brand-primary/30 bg-mx-indigo-50 text-emerald-600',
  aquecimento: 'border-status-warning/30 bg-status-warning-surface text-status-warning',
  negociacao: 'border-status-warning/40 bg-status-warning-surface text-status-warning',
  convertido: 'border-status-success/30 bg-status-success-surface text-status-success',
  perdido: 'border-status-error/30 bg-status-error-surface text-status-error',
}

type Props = {
  storeId: string | null | undefined
}

export function MarketingModulo({ storeId }: Props) {
  const {
    carteira,
    posicionamento,
    agendaMensal,
    loading,
    error,
    refresh,
    carteiraCounts,
  } = useMarketingModulo(storeId)

  return (
    <section className="space-y-mx-lg" aria-label="Módulo Marketing">
      <header className="flex flex-col gap-mx-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-mx-sm">
          <div className="rounded-2xl bg-emerald-600 p-mx-sm text-pure-white shadow-sm">
            <Megaphone size={22} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h2" className="tracking-tight">
              Marketing
            </Typography>
            <Typography variant="tiny" tone="muted" className="block font-bold normal-case tracking-normal">
              Carteira da Empresa (N5) • Posicionamento (N15) • Agenda Estratégica Mensal (N14).
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
          <Typography variant="tiny" className="text-status-error">
            {error}
          </Typography>
        </div>
      )}

      <Card className="p-mx-md">
        <header className="mb-mx-sm flex items-center gap-mx-xs">
          <div className="rounded-2xl bg-mx-indigo-50 p-mx-xs text-emerald-600">
            <Briefcase size={18} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Posicionamento empresarial
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              Última atualização:{' '}
              {posicionamento?.updated_at
                ? new Date(posicionamento.updated_at).toLocaleDateString('pt-BR')
                : '—'}
            </Typography>
          </div>
        </header>

        {!posicionamento ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Loja ainda sem posicionamento cadastrado.
            </Typography>
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-mx-sm md:grid-cols-2">
            {(
              [
                ['Missão', posicionamento.missao],
                ['Visão', posicionamento.visao],
                ['Valores', posicionamento.valores],
                ['Posicionamento', posicionamento.posicionamento],
                ['Público-alvo', posicionamento.publico_alvo],
                ['Diferenciais', posicionamento.diferenciais],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-gray-200 bg-white p-mx-sm"
              >
                <dt>
                  <Typography
                    variant="caption"
                    className=""
                  >
                    {label}
                  </Typography>
                </dt>
                <dd>
                  <Typography variant="p" className="mt-mx-xs font-bold normal-case tracking-normal">
                    {value || '—'}
                  </Typography>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <Card className="p-mx-md">
        <header className="mb-mx-sm flex flex-col gap-mx-xs md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-mx-xs">
            <div className="rounded-2xl bg-mx-indigo-50 p-mx-xs text-emerald-600">
              <Users size={18} aria-hidden="true" />
            </div>
            <div>
              <Typography variant="h3" className="">
                Carteira da Empresa
              </Typography>
              <Typography variant="tiny" tone="muted" className="block">
                Top {carteira.length} clientes/leads em acompanhamento.
              </Typography>
            </div>
          </div>
          <div className="flex flex-wrap gap-mx-xs">
            {(Object.keys(carteiraCounts) as CarteiraFluxoEstado[]).map((estado) => (
              <Badge
                key={estado}
                variant="outline"
                className={cn('font-bold uppercase tracking-widest', FLUXO_TONE[estado])}
              >
                {FLUXO_LABEL[estado]} {carteiraCounts[estado]}
              </Badge>
            ))}
          </div>
        </header>

        {carteira.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Nenhum cliente em carteira para esta loja.
            </Typography>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left">
                <tr className="bg-gray-50">
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Cliente</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Canal</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Score</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Estado</th>
                  <th className="px-mx-sm py-mx-xs font-bold uppercase tracking-widest">Próx. contato</th>
                </tr>
              </thead>
              <tbody>
                {carteira.map((cliente) => (
                  <tr key={cliente.id} className="border-t border-gray-200/60">
                    <td className="px-mx-sm py-mx-xs font-bold">
                      {cliente.nome_cliente}
                      <Typography
                        variant="tiny"
                        tone="muted"
                        className="block font-normal normal-case"
                      >
                        {cliente.contato ?? '—'}
                      </Typography>
                    </td>
                    <td className="px-mx-sm py-mx-xs uppercase">{cliente.canal ?? '—'}</td>
                    <td className="px-mx-sm py-mx-xs font-mono-numbers font-bold">
                      {cliente.score == null ? '—' : cliente.score}
                    </td>
                    <td className="px-mx-sm py-mx-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-bold uppercase tracking-widest',
                          FLUXO_TONE[cliente.fluxo_estado],
                        )}
                      >
                        {FLUXO_LABEL[cliente.fluxo_estado]}
                      </Badge>
                    </td>
                    <td className="px-mx-sm py-mx-xs">
                      {cliente.proximo_contato
                        ? new Date(`${cliente.proximo_contato}T12:00:00`).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-mx-md">
        <header className="mb-mx-sm flex items-center gap-mx-xs">
          <div className="rounded-2xl bg-mx-indigo-50 p-mx-xs text-emerald-600">
            <Calendar size={18} aria-hidden="true" />
          </div>
          <div>
            <Typography variant="h3" className="">
              Agenda Estratégica de Marketing
            </Typography>
            <Typography variant="tiny" tone="muted" className="block">
              Mês corrente + próximos 2 — última dezena define ação (ata 2026-05-22 §01:01).
            </Typography>
          </div>
        </header>

        {agendaMensal.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-mx-md text-center">
            <Typography variant="tiny" tone="muted" className="font-bold">
              Sem agenda estratégica registrada para o trimestre.
            </Typography>
          </div>
        ) : (
          <ul className="space-y-mx-sm">
            {agendaMensal.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-gray-200 bg-white p-mx-sm"
              >
                <div className="flex flex-wrap items-center gap-mx-xs">
                  <Badge variant="outline" className="">
                    {new Date(`${item.mes_referencia}T12:00:00`).toLocaleDateString('pt-BR', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Badge>
                  <Badge variant="outline" className="">
                    {item.status.replaceAll('_', ' ')}
                  </Badge>
                  {item.canais.map((canal) => (
                    <Badge key={canal} variant="outline" className="">
                      <Star size={10} className="mr-1" />
                      {canal}
                    </Badge>
                  ))}
                </div>
                <Typography variant="p" className="mt-mx-xs">
                  {item.acao}
                </Typography>
                {item.observacoes && (
                  <Typography variant="tiny" tone="muted" className="block normal-case tracking-normal">
                    {item.observacoes}
                  </Typography>
                )}
                {item.data_alvo && (
                  <Typography variant="tiny" tone="muted" className="block">
                    Alvo: {new Date(`${item.data_alvo}T12:00:00`).toLocaleDateString('pt-BR')}
                  </Typography>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
