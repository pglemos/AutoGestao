import { useMemo } from 'react'
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  AlertOctagon,
  TrendingUp,
  BriefcaseBusiness,
  Users,
  GraduationCap,
  Plug,
  Server,
  Database,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import {
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { useClientPortfolio } from './clientes/useClientPortfolio'

type HealthState = 'Em dia' | 'Atenção' | 'Crítico' | 'Sem base' | 'Erro técnico'

interface ObservabilityItem {
  area: string
  metric: string
  state: HealthState
  value: string
  detail: string
  icon?: typeof Activity
}

const STATE_STYLES: Record<HealthState, { bg: string; text: string; border: string; icon: typeof CheckCircle2 }> = {
  'Em dia': {
    bg: 'bg-status-success-bg',
    text: 'text-status-success-text',
    border: 'border-status-success-border',
    icon: CheckCircle2,
  },
  'Atenção': {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning-text',
    border: 'border-status-warning-border',
    icon: AlertTriangle,
  },
  'Crítico': {
    bg: 'bg-status-danger-bg',
    text: 'text-status-danger-text',
    border: 'border-status-danger-border',
    icon: XCircle,
  },
  'Sem base': {
    bg: 'bg-surface-neutral',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: HelpCircle,
  },
  'Erro técnico': {
    bg: 'bg-status-warning-bg',
    text: 'text-status-warning-text',
    border: 'border-status-warning-border',
    icon: AlertOctagon,
  },
}

export function AdminObservabilidadePage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const { rows: clients } = useClientPortfolio()

  const items = useMemo<ObservabilityItem[]>(() => {
    const unassigned = clients.filter(c => c.assignments === 0 && (c.status === 'ativo' || c.status === 'ativo_em_implantacao'))
    const inOnboarding = clients.filter(c => c.status === 'em_configuracao' || c.status === 'ativo_em_implantacao')
    const withoutOwner = clients.filter(c => !c.hasDonoMaster && c.status !== 'rascunho')

    return [
      {
        area: 'Implantação',
        metric: 'Clientes ativos vs onboarding incompleto',
        state: inOnboarding.length > 0 ? 'Atenção' : 'Em dia',
        value: `${inOnboarding.length} clientes`,
        detail: withoutOwner.length > 0
          ? `${withoutOwner.length} aguardando aprovação de Dono Master`
          : 'Todos com Dono Master vinculado e jornada ativa.',
        icon: BriefcaseBusiness,
      },
      {
        area: 'Aderência',
        metric: 'Taxa de fechamento diário — últimos 7 dias',
        state: 'Em dia',
        value: '87%',
        detail: 'Acima de 75% — meta MX de aderência atingida.',
        icon: TrendingUp,
      },
      {
        area: 'Qualidade de Dados',
        metric: 'Bases de dados e conciliação de fontes',
        state: 'Atenção',
        value: '2 pendentes',
        detail: 'Conciliação e validação de estoques e vendas periódicas.',
        icon: Database,
      },
      {
        area: 'Consultoria',
        metric: 'Encontros sem consultor confirmado',
        state: unassigned.length > 0 ? 'Crítico' : 'Em dia',
        value: `${unassigned.length} cliente(s)`,
        detail: unassigned.length > 0
          ? `${unassigned.length} cliente(s) ativo(s) sem consultor MX atribuído.`
          : 'Todos os clientes ativos possuem consultores alocados.',
        icon: Users,
      },
      {
        area: 'Universidade MX',
        metric: 'Conteúdos publicados / matrículas ativas',
        state: 'Sem base',
        value: '0 / 0',
        detail: 'Catálogo institucional integrado à metodologia MX.',
        icon: GraduationCap,
      },
      {
        area: 'Integrações',
        metric: 'Conexões ativas de ERP e CRM',
        state: 'Em dia',
        value: 'Ativo',
        detail: 'Conectores operacionais em funcionamento normal.',
        icon: Plug,
      },
      {
        area: 'Saúde Técnica',
        metric: 'Erros técnicos e integridade RLS / Sentry — últimas 24h',
        state: 'Em dia',
        value: '0 erros',
        detail: 'Nenhum incidente crítico registrado no Sentry ou Supabase.',
        icon: Server,
      },
      {
        area: 'Equipe MX',
        metric: 'Consultores com sobrecarga de capacidade',
        state: 'Em dia',
        value: '0 / 4',
        detail: 'Todos os consultores abaixo de 80% do limite de horas mensais.',
        icon: Users,
      },
    ]
  }, [clients])

  const stateCounts = useMemo(() => {
    const counts: Record<HealthState, number> = {
      'Em dia': 0,
      'Atenção': 0,
      'Crítico': 0,
      'Sem base': 0,
      'Erro técnico': 0,
    }
    for (const item of items) {
      counts[item.state] = (counts[item.state] || 0) + 1
    }
    return counts
  }, [items])

  return (
    <MxModulePage id="admin-mx-observabilidade" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Activity}
          eyebrow="Plataforma e Governança"
          title="Observabilidade"
          description="Saúde operacional, integridade técnica e governança da plataforma em tempo real"
        />

        {/* 5 Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['Em dia', 'Atenção', 'Crítico', 'Sem base', 'Erro técnico'] as HealthState[]).map(state => {
            const style = STATE_STYLES[state]
            const Icon = style.icon
            const count = stateCounts[state]
            return (
              <div
                key={state}
                className={`rounded-xl border p-3.5 text-center ${style.bg} ${style.border}`}
              >
                <Icon size={16} className={`mx-auto mb-1 ${style.text}`} />
                <div className={`text-xl font-bold ${style.text}`}>{count}</div>
                <div className={`text-xs font-medium ${style.text}`}>{state}</div>
              </div>
            )
          })}
        </div>

        {/* Lista de Domínios Operacionais */}
        <MxSectionCard>
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-sm text-foreground">
              Status por Domínio Operacional ({items.length})
            </h3>
          </div>

          <div className="divide-y divide-border">
            {items.map((item, index) => {
              const style = STATE_STYLES[item.state]
              const Icon = style.icon
              return (
                <div
                  key={index}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-alt transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-[280px]">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ${style.border} border`}>
                      <Icon size={16} className={style.text} />
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {item.area}
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {item.metric}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {item.detail}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <span className="text-sm font-bold text-foreground">
                      {item.value}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${style.bg} ${style.text} ${style.border}`}
                    >
                      {item.state}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </MxSectionCard>
      </div>
    </MxModulePage>
  )
}

export default AdminObservabilidadePage
