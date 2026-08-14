import { AnimatePresence } from 'motion/react'
import { PageCanvas } from '@/design-system/page'
import { RotinaErrorBoundary } from './components/RotinaErrorBoundary'
import { useRotinaGerentePage } from './hooks/useRotinaGerentePage'
import { RotinaAdminStoreSelector } from './sections/RotinaAdminStoreSelector'
import { RotinaAjustesTab } from './sections/RotinaAjustesTab'
import { RotinaDiarioTab } from './sections/RotinaDiarioTab'
import { RotinaHeader } from './sections/RotinaHeader'
import { RotinaNoticeBar } from './sections/RotinaNoticeBar'

/**
 * Container da página RotinaGerente — Centro de Comando do gerente.
 * Orquestra sections via `useRotinaGerentePage` e envolve cada bloco em
 * `RotinaErrorBoundary` para isolamento de falhas (Story 3.6, ADR-0050).
 *
 * NOTA: Story 3.6 originalmente abrangia RotinaGerente + RotinaVendedor,
 * mas RotinaVendedor não existe no codebase — escopo parcial.
 */
export function RotinaGerenteContainer() {
  const page = useRotinaGerentePage()

  const showSelector = page.isAdmin && !page.selectedStoreId
  const showContent = !page.isAdmin || page.selectedStoreId

  return (
    <PageCanvas
      as="div"
      id="page-rotina-gerente"
      aria-label="Rotina do Gerente"
      bottomClearance="navigation"
      className="flex min-h-0 flex-1 flex-col gap-mx-lg"
    >
      {showSelector && (
        <RotinaErrorBoundary sectionName="seletor de unidade">
          <RotinaAdminStoreSelector
            lojas={page.lojas}
            onSelect={page.setSelectedStoreId}
          />
        </RotinaErrorBoundary>
      )}

      {showContent && (
        <>
          <RotinaErrorBoundary sectionName="cabeçalho">
            <RotinaHeader
              tab={page.tab}
              onTabChange={page.setTab}
              pendingRequestsCount={page.pendingRequests.length}
              isRefetching={page.isRefetching}
              onRefresh={page.handleRefresh}
              isAdmin={page.isAdmin}
              selectedStoreId={page.selectedStoreId}
              onClearStore={() => page.setSelectedStoreId('')}
              lojas={page.lojas}
              membership={page.membership}
            />
          </RotinaErrorBoundary>

          <RotinaErrorBoundary sectionName="banner de status">
            <RotinaNoticeBar notice={page.routineNotice} />
          </RotinaErrorBoundary>

          <div className="flex-1 min-h-0 pb-32" aria-live="polite">
            <AnimatePresence mode="wait">
              {page.tab === 'diario' && (
                <RotinaErrorBoundary sectionName="aba diário">
                  <RotinaDiarioTab
                    routineProgress={page.routineProgress}
                    reuniaoDone={page.reuniaoDone}
                    setReuniaoDone={page.setReuniaoDone}
                    agendaValidated={page.agendaValidated}
                    setAgendaDone={page.setAgendaDone}
                    totalAgendamentosHoje={page.totalAgendamentosHoje}
                    canTriggerMatinal={page.canTriggerMatinal}
                    executing={page.executing}
                    matinalAudit={page.matinalAudit}
                    onTriggerMatinal={page.handleTriggerMatinal}
                    pendingSellersCount={page.pendingSellers.length}
                    activeRoutineStoreId={page.activeRoutineStoreId}
                    onSendDailyReminders={page.handleSendDailyReminders}
                    routineLog={page.routineLog}
                    routineNotes={page.routineNotes}
                    setRoutineNotes={page.setRoutineNotes}
                    savingRoutine={page.savingRoutine}
                    onRegisterRoutine={page.handleRegisterRoutine}
                  />
                </RotinaErrorBoundary>
              )}

              {page.tab === 'ajustes' && (
                <RotinaErrorBoundary sectionName="aba ajustes">
                  <RotinaAjustesTab
                    pendingRequests={page.pendingRequests}
                    auditorLoading={page.auditorLoading}
                    onApprove={page.handleApproveCorrection}
                    onReject={page.handleRejectCorrection}
                  />
                </RotinaErrorBoundary>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </PageCanvas>
  )
}

export default RotinaGerenteContainer
