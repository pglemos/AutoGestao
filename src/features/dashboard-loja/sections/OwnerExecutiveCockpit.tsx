import React, { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Home,
  LineChart as LineChartIcon,
  Package,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import OwnerPageHeading from '@/components/owner/OwnerPageHeading'
import { greeting } from './owner-cockpit/format'
import type { useDashboardLojaData } from '../hooks/useDashboardLojaData'
import { useCentralMxPlanosAcao } from '../hooks/useCentralMxPlanosAcao'
import type { OwnerPerformanceAlert } from './PerformanceAlerts'
import {
  CentralMxPersistedAgendaPanel,
  CentralMxPersistedAlertsPanel,
} from './CentralMxPersistedPanels'
import { CentralMxBenchmarkInteractive } from './CentralMxBenchmarkInteractive'
import { CentralMxPlanoSegmentadoPanel } from './CentralMxPlanoSegmentadoPanel'
import { ConsultorIaStoreSection } from '@/features/central-mx/sections/ConsultorIaStoreSection'
import { UniversidadeMx } from '@/features/universidade/sections/UniversidadeMx'

import { OwnerHome } from './owner-cockpit/OwnerHome'
import { StrategicPlanningView } from './owner-cockpit/StrategicPlanningView'
import { ResultsView } from './owner-cockpit/ResultsView'
import { AlertsView } from './owner-cockpit/AlertsView'
import { BenchmarkingView } from './owner-cockpit/BenchmarkingView'
import { AgendaView } from './owner-cockpit/AgendaView'
import { OwnerModuleGrid } from './owner-cockpit/OwnerModuleGrid'
import {
  OwnerConsultingView,
  OwnerDecisionCenter,
  OwnerRoutineView,
} from './owner-cockpit/OwnerBase44Views'
import { DepartmentsView } from './owner-cockpit/DepartmentsView'
import {
  alertFromEngine,
  buildCentralMx,
  buildPanoramaData,
  currentPeriodLabel,
  departmentFromEngine,
  getOwnerDepartmentCode,
  getOwnerSection,
} from './owner-cockpit/format'

type DashboardData = ReturnType<typeof useDashboardLojaData>

type OwnerExecutiveCockpitProps = {
  data: DashboardData
  alerts: OwnerPerformanceAlert[]
}

function alertIdentity(alert: OwnerPerformanceAlert) {
  return [alert.title, alert.description, alert.variant, alert.recommendation].join('::')
}

export function OwnerExecutiveCockpit({ data, alerts }: OwnerExecutiveCockpitProps) {
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const periodLabel = data.periodLabel || currentPeriodLabel(data.referenceDate)
  const panoramaData = useMemo(() => buildPanoramaData(data), [data])
  const marginPercent = data.latestDRE && data.latestDRE.gross_margin > 0
    ? (data.latestDRE.gross_profit / data.latestDRE.gross_margin) * 100
    : null
  const centralMx = useMemo(() => buildCentralMx(data, marginPercent), [data, marginPercent])
  const departments = useMemo(() => centralMx.departments.map(departmentFromEngine), [centralMx.departments])
  const ownerAlerts = useMemo(() => {
    const generated = centralMx.alerts.map(alertFromEngine)
    return [...generated, ...alerts].filter(
      (alert, index, list) => list.findIndex(candidate => alertIdentity(candidate) === alertIdentity(alert)) === index,
    )
  }, [alerts, centralMx.alerts])
  const persistedPlans = useCentralMxPlanosAcao(data.operationalStore?.id || null)
  const actions = useMemo(() => persistedPlans.planos.map((plano) => ({
    id: plano.id,
    priority: plano.prioridade === 'critica' ? 'Crítica' as const : plano.prioridade === 'alta' ? 'Atenção' as const : 'Positiva' as const,
    department: plano.departamento,
    indicator: plano.indicador,
    problem: plano.problema,
    recommendation: plano.como || 'Executar a ação registrada e acompanhar a evidência.',
    action: plano.acao,
    how: plano.como || '',
    owner: plano.responsavel_id || 'Responsável da unidade',
    origin: plano.origem,
    due: plano.prazo ? new Date(`${plano.prazo}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem prazo',
    dueDate: plano.prazo ?? null,
    statusCode: plano.status,
    status: plano.status === 'concluido' ? 'Concluída' : plano.status === 'em_andamento' ? 'Em andamento' : plano.status === 'atrasado' ? 'Atrasada' : plano.status === 'validando_eficacia' ? 'Validando eficácia' : 'Pendente',
    efficacy: plano.eficacia_score == null ? 'Pendente' : `${plano.eficacia_score}%`,
    evidence: plano.eficacia_nota || 'Sem evidência registrada',
    tone: plano.status === 'atrasado' || plano.prioridade === 'critica' ? 'danger' as const : plano.prioridade === 'alta' ? 'warning' as const : 'info' as const,
  })), [persistedPlans.planos])
  const mxScore = centralMx.scores.store.value
  const section = getOwnerSection(location.pathname, location.search)
  const selectedDepartmentCode = getOwnerDepartmentCode(location.pathname, location.search)

  if (section === 'rotina') return <OwnerRoutineView data={data} alerts={ownerAlerts} actions={actions} />
  if (section === 'decisoes') return <OwnerDecisionCenter alerts={ownerAlerts} actions={actions} storeId={data.operationalStore?.id} />
  if (section === 'departamentos') {
    return <DepartmentsView departments={departments} selectedDepartmentCode={selectedDepartmentCode} />
  }
  if (section === 'mercado') return <BenchmarkingView data={data} mxScore={mxScore} marginPercent={marginPercent} />

  const universityContent = (
    <>
      <UniversidadeMx userId={profile?.id ?? null} embedded />
      <OwnerModuleGrid
        title="Universidade MX"
        subtitle="Conteúdos, playbooks e trilhas aplicados à execução estratégica."
        items={[
          { title: 'Playbooks comerciais', detail: 'Abordagem, follow-up e fechamento.', icon: <Target size={20} />, tone: 'brand' },
          { title: 'Trilhas da liderança', detail: 'Conteúdo para gerente, Dono e responsáveis.', icon: <Users size={20} />, tone: 'info' },
          { title: 'Materiais da consultoria', detail: 'Modelos, documentos e preparação.', icon: <ShieldCheck size={20} />, tone: 'success' },
          { title: 'Biblioteca executiva', detail: 'Conteúdo organizado por problema e departamento.', icon: <BookOpen size={20} />, tone: 'warning' },
          { title: 'Indicadores aplicados', detail: 'Como interpretar os números antes de agir.', icon: <LineChartIcon size={20} />, tone: 'info' },
          { title: 'Evidências e modelos', detail: 'Checklists, anexos e padrões de execução.', icon: <Package size={20} />, tone: 'muted' },
        ]}
      />
    </>
  )

  const firstName = profile?.name?.trim() ? profile.name.trim().split(' ')[0] : ''
  const greetingTitle = firstName ? `${greeting()}, ${firstName}!` : `${greeting()}!`

  return (
    <section className="min-h-full space-y-mx-md bg-surface-alt">
      <OwnerPageHeading
        icon={Home}
        title={greetingTitle}
        subtitle="Aqui está o panorama da sua loja hoje."
        actions={null}
      />

      {section === 'home' && (
        <OwnerHome
          data={data}
          alerts={ownerAlerts}
          actions={actions}
          departments={departments}
          mxScore={mxScore}
          marginPercent={marginPercent}
          onOpenConsultant={() => navigate(`/falar-consultor?storeId=${encodeURIComponent(data.operationalStore?.id || '')}`)}
        />
      )}

      {section === 'planejamento' && (
        <StrategicPlanningView data={data} planningIndicators={centralMx.planningIndicators} />
      )}

      {section === 'plano-acao' && (
        <>
          <CentralMxPlanoSegmentadoPanel
            storeId={data.operationalStore?.id || null}
          />
        </>
      )}

      {section === 'consultoria' && (
        <OwnerConsultingView data={data} />
      )}

      {section === 'benchmarking' && <BenchmarkingView data={data} mxScore={mxScore} marginPercent={marginPercent} />}

      {(section === 'universidade' || section === 'biblioteca') && universityContent}

      {section === 'consultor' && (
        <ConsultorIaStoreSection storeId={data.operationalStore?.id || null} />
      )}

      {section === 'resultados' && (
        <ResultsView data={data} alerts={ownerAlerts} panoramaData={panoramaData} mxScore={mxScore} />
      )}

      {section === 'alertas' && (
        <>
          <AlertsView alerts={ownerAlerts} />
          <CentralMxPersistedAlertsPanel storeId={data.operationalStore?.id || null} />
        </>
      )}

      {section === 'agenda' && (
        <>
          <AgendaView alerts={ownerAlerts} />
          <CentralMxPersistedAgendaPanel storeId={data.operationalStore?.id || null} />
        </>
      )}

      {section === 'visitas' && (
        <OwnerModuleGrid
          title="Visitas"
          subtitle="Acompanhamento PMR, PMR Plus, PPA e evidências."
          items={[
            { title: 'Checklist da visita', detail: 'Roteiro, observações e execução.', icon: <CalendarDays size={20} />, tone: 'brand' },
            { title: 'Relatório e ata', detail: 'Resumo da visita e próximos passos.', icon: <LineChartIcon size={20} />, tone: 'info' },
            { title: 'Evidências', detail: 'Fotos, anexos e validações.', icon: <Package size={20} />, tone: 'warning' },
          ]}
        />
      )}
    </section>
  )
}

export default OwnerExecutiveCockpit
