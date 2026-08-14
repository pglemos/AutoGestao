import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
import { NotificacoesErrorBoundary } from './components/NotificacoesErrorBoundary'
import { useNotificacoesPage } from './hooks/useNotificacoesPage'
import { NotificacoesHeader } from './sections/NotificacoesHeader'
import { NotificacoesRoleBanners } from './sections/NotificacoesRoleBanners'
import { NotificacoesFiltersBar } from './sections/NotificacoesFiltersBar'
import { NotificacoesListSection } from './sections/NotificacoesListSection'

export function Notificacoes() {
  const state = useNotificacoesPage()
  return (
    <NotificacoesErrorBoundary sectionName="Notificacoes">
      <MxModulePage id="internal-notifications" width="wide" bottomClearance="navigation">
        <NotificacoesHeader isRefetching={state.isRefetching} handleRefresh={state.handleRefresh} markAllAsRead={state.markAllAsRead} />
        <NotificacoesRoleBanners isOwner={state.isOwner} />
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
          <section className="order-2 flex flex-col lg:order-1 lg:col-span-8">
            <NotificacoesErrorBoundary sectionName="Lista de Notificações">
              <NotificacoesListSection unreadCount={state.unreadCount} grouped={state.grouped} isOwner={state.isOwner} markRead={state.markRead} markUnread={state.markUnread} deleteNotification={state.deleteNotification} isApprovalNotification={state.isApprovalNotification} getApprovalForNotification={state.getApprovalForNotification} reviewingPreRegistrationId={state.reviewingPreRegistrationId} handleReviewPreRegistration={state.handleReviewPreRegistration} />
            </NotificacoesErrorBoundary>
          </section>
          <aside className="order-1 flex flex-col gap-4 lg:order-2 lg:col-span-4">
            <NotificacoesErrorBoundary sectionName="Filtros">
              <NotificacoesFiltersBar searchTerm={state.searchTerm} setSearchTerm={state.setSearchTerm} filterType={state.filterType} setFilterType={state.setFilterType} />
            </NotificacoesErrorBoundary>
          </aside>
        </div>
      </MxModulePage>
    </NotificacoesErrorBoundary>
  )
}

export default Notificacoes
