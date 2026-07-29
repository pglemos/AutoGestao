import { FeedbackErrorBoundary } from '../components/FeedbackErrorBoundary'
import { useStoreFeedback } from '../hooks/useStoreFeedback'
import { StoreFeedbackModal } from '../modals/StoreFeedbackModal'
import { FeedbackList } from '../sections/FeedbackList'
import { FeedbackLoadingSkeleton } from '../sections/FeedbackLoadingSkeleton'
import { ManagerScopeBanner, OwnerScopeBanner } from '../sections/ScopeBanners'
import { StoreFeedbackHeader } from '../sections/StoreFeedbackHeader'
import { WeeklyReportsList } from '../sections/WeeklyReportsList'

export function StoreFeedbackContainer() {
  const vm = useStoreFeedback()

  if (vm.isLoading) return <FeedbackLoadingSkeleton ariaLabel="Carregando devolutivas" />

  return (
    <main id="page-devolutivas" role="main" className="flex min-h-0 flex-1 flex-col space-y-6 px-4 pb-20 lg:px-8 lg:pb-0" aria-label="Devolutivas">
      <FeedbackErrorBoundary sectionName="Cabeçalho">
        <StoreFeedbackHeader
          isOwner={vm.isOwner}
          canCreateFeedback={vm.canCreateFeedback}
          activeTab={vm.activeTab}
          onTabChange={vm.setActiveTab}
          searchTerm={vm.searchTerm}
          onSearchChange={vm.setSearchTerm}
          isRefetching={vm.isRefetching}
          onRefresh={vm.handleRefresh}
          onOpenForm={() => vm.setShowForm(true)}
        />
      </FeedbackErrorBoundary>

      {vm.isManager && <ManagerScopeBanner />}
      {vm.isOwner && <OwnerScopeBanner />}

      <FeedbackErrorBoundary sectionName="Modal de mentoria">
        <StoreFeedbackModal
          open={vm.showForm}
          onClose={() => vm.setShowForm(false)}
          saving={vm.saving}
          formData={vm.formData}
          setFormData={vm.setFormData}
          sellers={vm.sellers}
          onSellerSelect={vm.handleSellerSelect}
          onWeekReferenceChange={vm.handleWeekReferenceChange}
          onSubmit={vm.handleSubmit}
        />
      </FeedbackErrorBoundary>

      <div className="flex-1 min-h-0">
        {vm.activeTab === 'individual' ? (
          <section id="feedback-tab-panel-individual" role="tabpanel" aria-label="Individual">
            <FeedbackErrorBoundary sectionName="Lista de devolutivas">
              <FeedbackList
                feedbacks={vm.filteredFeedbacks}
                onShareWhatsApp={vm.handleShareWhatsApp}
                variant="store"
              />
            </FeedbackErrorBoundary>
          </section>
        ) : (
          <section id="feedback-tab-panel-weekly" role="tabpanel" aria-label="Relatórios semanais">
            <FeedbackErrorBoundary sectionName="Relatórios semanais">
              <WeeklyReportsList reports={vm.reports} variant="store" />
            </FeedbackErrorBoundary>
          </section>
        )}
      </div>
    </main>
  )
}

export default StoreFeedbackContainer
