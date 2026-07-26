import { Link } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, CalendarDays } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { ConsultingClientsPage } from '@/features/consulting-clients/ConsultingClientsPage'
import { useOwnerConsultingProgram } from '@/features/dashboard-loja/hooks/useOwnerConsultingProgram'
import { InternalMxPlanningShell, useInternalPlanningRealtime, useInternalPlanningStore } from './InternalMxPlanningShell'

export default function InternalConsultingPage() {
  const store = useInternalPlanningStore()
  const program = useOwnerConsultingProgram(store.selectedStoreId, Boolean(store.selectedStoreId))
  useInternalPlanningRealtime(program.refresh)

  return (
    <InternalMxPlanningShell title="Consultoria" description="Administre clientes, programas, visitas, módulos, indicadores e entregas sem sair do módulo interno MX." store={store} onRefresh={() => void Promise.all([store.refetch(), program.refresh()])} refreshing={program.loading}>
      {store.selectedStoreId ? <MxSectionCard>
        <MxSectionHeader title="Programa da loja selecionada" description="Resumo operacional do programa consultivo persistido para esta loja." actions={<Button asChild variant="managerSecondary" size="sm"><Link to="/agenda"><CalendarDays size={16} />Abrir agenda</Link></Button>} />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Summary label="Programa" value={program.program?.programName || 'Nenhum programa ativo'} />
          <Summary label="Visitas concluídas" value={program.program ? `${program.program.visitsCompleted}/${program.program.totalVisits}` : '—'} />
          <Summary label="Próxima visita" value={program.program?.nextVisitScheduledAt ? new Date(program.program.nextVisitScheduledAt).toLocaleDateString('pt-BR') : 'Não agendada'} />
        </div>
        {program.error ? <div className="px-5 pb-5"><MxStatusBanner tone="danger">{program.error}</MxStatusBanner></div> : null}
      </MxSectionCard> : null}
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"><BriefcaseBusiness size={17} className="mr-2 inline" aria-hidden="true" />A carteira abaixo é global para os perfis internos: abra qualquer cliente para editar dados, unidades, contatos, atribuições, módulos, visitas, evidências e financeiro.<Button asChild variant="managerGhost" size="sm" className="ml-2"><Link to="/consultoria/clientes">Abrir carteira completa <ArrowRight size={15} /></Link></Button></div>
      <div className="-mx-4 lg:-mx-6"><ConsultingClientsPage /></div>
    </InternalMxPlanningShell>
  )
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div><div className="mt-2 text-sm font-semibold text-gray-800">{value}</div></div> }
