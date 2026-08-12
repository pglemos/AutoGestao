import { Users, Target, TrendingUp, DollarSign, ShoppingBag, Phone, BarChart3 } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { StatCard } from '@/components/molecules/StatCard'
import { Typography } from '@/components/atoms/Typography'
import { useClientes } from '@/features/crm/hooks/useClientes'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { useAtendimentos } from '@/features/crm/hooks/useAtendimentos'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import { useCadenciaAnalytics } from '@/features/crm/hooks/useCadenciaAnalytics'
import { CRM_ETAPA_LABEL, CRM_CANAL_LABEL } from '@/lib/schemas/crm.schema'
import { useAuth } from '@/hooks/useAuth'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { PageTemplate } from '@/components/templates/PageTemplate'

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const CADENCIA_ETAPA_LABEL: Record<string, string> = {
  lead: 'Lead',
  contato: 'Contato',
  agendamento: 'Agendamento',
  visita: 'Visita',
  negociacao: 'Negociação',
  venda: 'Venda',
  atendimento: 'Atendimento',
}
const TIPO_VEICULO_LABEL: Record<string, string> = {
  carro: 'Carro',
  moto: 'Moto',
  caminhao: 'Caminhão',
  nao_informado: 'Não informado',
}

function BarRow({ label, value, max, valueLabel }: { label: string; value: number; max: number; valueLabel?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-mx-md">
      <div className="w-40 shrink-0"><Typography variant="p" className="font-medium">{label}</Typography></div>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-gray-900" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <div className="min-w-0 text-right sm:w-24 sm:shrink-0"><Typography variant="p" className="break-words font-semibold">{valueLabel ?? value}</Typography></div>
    </div>
  )
}

export function RelatoriosVendedor() {
  const { profile, storeId } = useAuth()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const { performance: officialPerformance, loading: perfLoading } = useOfficialSellerPerformance(`${today.slice(0, 7)}-01`, today, profile?.id, storeId)
  const { metrics: clienteMetrics, clientes, loading: clientesLoading } = useClientes()
  const { funil, oportunidades, loading: oportunidadesLoading } = useOportunidades()
  const { porCanal, loading: atendimentosLoading } = useAtendimentos()
  const { metrics: agenda, loading: agendamentosLoading } = useAgendamentos()
  const { analytics: cadenciaAnalytics, loading: cadenciaAnalyticsLoading, error: cadenciaAnalyticsError } = useCadenciaAnalytics(oportunidades)

  const isLoading = perfLoading || clientesLoading || oportunidadesLoading || atendimentosLoading || agendamentosLoading || cadenciaAnalyticsLoading

  const maxEtapa = Math.max(1, ...funil.porEtapa.map(e => e.quantidade))
  const maxCanal = Math.max(1, porCanal.showroom, porCanal.carteira, porCanal.internet, porCanal.porta)
  const maxGargalo = Math.max(1, ...cadenciaAnalytics.gargalos.map(item => item.total))
  const maxDemanda = Math.max(1, ...cadenciaAnalytics.demandaVeiculos.map(item => item.quantidade))

  if (isLoading) {
    return (
      <PageTemplate as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-mx-lg">
          <SellerPageHeader icon={BarChart3} title="Relatórios" subtitle="Visão consolidada da sua performance comercial, com dados reais." />
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-border border-t-blue-600 rounded-full animate-spin" />
          </div>
        </PageTemplate>
    )
  }

  return (
    <PageTemplate as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-mx-lg">
<SellerPageHeader icon={BarChart3} title="Relatórios" subtitle="Visão consolidada da sua performance comercial, com dados reais." />

        <section className="grid grid-cols-2 gap-mx-md md:grid-cols-3 xl:grid-cols-4" aria-label="KPIs">
          <StatCard tone="blue" icon={<Users size={22} />} label="Clientes" value={String(clienteMetrics.total)} />
          <StatCard tone="brand" icon={<Target size={22} />} label="Oportunidades" value={String(funil.totalOportunidades)} />
          <StatCard tone="green" icon={<TrendingUp size={22} />} label="Taxa Conversão" value={`${funil.taxaConversaoGeral}%`} />
          <StatCard tone="green" icon={<DollarSign size={22} />} label="Ticket Médio" value={BRL(funil.ticketMedio)} />
          <StatCard tone="green" icon={<ShoppingBag size={22} />} label="Vendas realizadas" value={String(officialPerformance?.vendas_realizadas ?? funil.ganhos.quantidade)} detail={BRL(officialPerformance?.faturamento_realizado ?? funil.ganhos.valor)} />
          <StatCard tone="blue" icon={<TrendingUp size={22} />} label="Vendas projetadas" value={officialPerformance ? String(Math.round(officialPerformance.vendas_projetadas)) : '—'} />
          <StatCard tone="orange" icon={<Phone size={22} />} label="Atendimentos hoje" value={String(porCanal.total)} />
        </section>

        <div className="grid grid-cols-1 gap-mx-lg xl:grid-cols-2">
          <Card className="border-none bg-white p-mx-lg">
            <Typography variant="h3" className="tracking-tight">Oportunidades por etapa</Typography>
            <div className="mt-mx-lg flex flex-col gap-mx-md">
              {funil.porEtapa.map(e => (
                <BarRow key={e.etapa} label={CRM_ETAPA_LABEL[e.etapa]} value={e.quantidade} max={maxEtapa} valueLabel={`${e.quantidade} · ${BRL(e.valor)}`} />
              ))}
            </div>
          </Card>

          <Card className="border-none bg-white p-mx-lg">
            <Typography variant="h3" className="tracking-tight">Atendimentos por canal (hoje)</Typography>
            <div className="mt-mx-lg flex flex-col gap-mx-md">
              <BarRow label={CRM_CANAL_LABEL.showroom} value={porCanal.showroom} max={maxCanal} />
              <BarRow label={CRM_CANAL_LABEL.carteira} value={porCanal.carteira} max={maxCanal} />
              <BarRow label={CRM_CANAL_LABEL.internet} value={porCanal.internet} max={maxCanal} />
              <BarRow label={CRM_CANAL_LABEL.porta} value={porCanal.porta} max={maxCanal} />
            </div>
            <div className="mt-mx-lg border-t border-border-subtle pt-mx-md">
              <Typography variant="caption" tone="muted" className="tracking-wide">Carteira por status</Typography>
              <div className="mt-mx-sm grid grid-cols-2 gap-mx-sm sm:grid-cols-3">
                <StatusPill label="Ativos" value={clienteMetrics.ativos} />
                <StatusPill label="Oportunidades" value={clienteMetrics.oportunidades} />
                <StatusPill label="Pós-venda" value={clienteMetrics.posVenda} />
                <StatusPill label="Aguardando" value={clienteMetrics.aguardando} />
                <StatusPill label="Inativos" value={clienteMetrics.inativos} />
                <StatusPill label="Agend. hoje" value={agenda.agendamentosHoje} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="border-none bg-white p-mx-lg">
          <div className="flex flex-col gap-mx-xs sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Typography variant="h3" className="tracking-tight">Analytics de cadência</Typography>
              <Typography variant="caption" tone="muted">
                Gargalos por etapa, demanda real e conversão por fluxo versionado.
              </Typography>
            </div>
            <div className="rounded-xl bg-surface-alt px-mx-md py-mx-sm text-right">
              <Typography variant="caption" tone="muted" className="tracking-wide">Clientes em cadência</Typography>
              <Typography variant="h2" className="mt-mx-xs text-2xl">{cadenciaAnalytics.totalEstados}</Typography>
            </div>
          </div>
          {cadenciaAnalyticsError && (
            <Typography variant="caption" tone="error" className="mt-mx-md block">
              Não foi possível carregar analytics de cadência: {cadenciaAnalyticsError}
            </Typography>
          )}
          {cadenciaAnalyticsLoading ? (
            <Typography variant="caption" tone="muted" className="mt-mx-lg block">Carregando analytics de cadência...</Typography>
          ) : cadenciaAnalytics.totalEstados === 0 ? (
            <Typography variant="caption" tone="muted" className="mt-mx-lg block">
              Os gargalos de cadência aparecem quando clientes entram no fluxo versionado.
            </Typography>
          ) : (
            <div className="mt-mx-lg grid grid-cols-1 gap-mx-lg xl:grid-cols-3">
              <div>
                <Typography variant="caption" tone="muted" className="tracking-wide">Gargalos por etapa</Typography>
                <div className="mt-mx-md flex flex-col gap-mx-sm">
                  {cadenciaAnalytics.gargalos.slice(0, 5).map(item => (
                    <BarRow
                      key={item.etapa}
                      label={CADENCIA_ETAPA_LABEL[item.etapa] || item.etapa}
                      value={item.total}
                      max={maxGargalo}
                      valueLabel={`${item.pendentes} pend. · ${item.semSucesso} sem sucesso · ${item.reagendamentosSemSucesso} reag.`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Typography variant="caption" tone="muted" className="tracking-wide">Demanda por veículo</Typography>
                <div className="mt-mx-md flex flex-col gap-mx-sm">
                  {cadenciaAnalytics.demandaVeiculos.slice(0, 5).map(item => (
                    <BarRow
                      key={item.tipo_veiculo}
                      label={TIPO_VEICULO_LABEL[item.tipo_veiculo] || item.tipo_veiculo}
                      value={item.quantidade}
                      max={maxDemanda}
                      valueLabel={`${item.quantidade} · ${BRL(item.valorTotal)}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <Typography variant="caption" tone="muted" className="tracking-wide">Conversão por fluxo</Typography>
                <div className="mt-mx-md flex flex-col gap-mx-sm">
                  {cadenciaAnalytics.conversaoPorFluxo.slice(0, 5).map(item => (
                    <BarRow
                      key={`${item.fluxo_id}:${item.fluxo_version}`}
                      label={`Fluxo ${item.fluxo_id.slice(0, 8)} v${item.fluxo_version}`}
                      value={item.taxaConversao}
                      max={100}
                      valueLabel={`${item.taxaConversao}% · ${item.ganhos}/${item.totalClientes}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        {clientes.length === 0 && (
          <Typography variant="caption" tone="muted">Os relatórios se preenchem conforme você cadastra clientes, oportunidades e atendimentos.</Typography>
        )}
      </PageTemplate>
  )
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-alt p-mx-sm text-center">
      <Typography variant="h3" className="text-lg">{value}</Typography>
      <Typography variant="caption" tone="muted">{label}</Typography>
    </div>
  )
}

export default RelatoriosVendedor
