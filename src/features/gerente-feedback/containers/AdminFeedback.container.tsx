import { FeedbackErrorBoundary } from '../components/FeedbackErrorBoundary'
import { useAdminFeedback } from '../hooks/useAdminFeedback'
import { AdminFeedbackModal } from '../modals/AdminFeedbackModal'
import { AdminFeedbackHeader } from '../sections/AdminFeedbackHeader'
import { FeedbackList } from '../sections/FeedbackList'
import { FeedbackLoadingSkeleton } from '../sections/FeedbackLoadingSkeleton'
import { WeeklyReportsList } from '../sections/WeeklyReportsList'

export function AdminFeedbackContainer() {
  const vm = useAdminFeedback()

  if (vm.isLoading) {
    return (
      <FeedbackLoadingSkeleton
        ariaLabel="Carregando feedback"
        errorMessage={vm.reportsError}
      />
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-6 pb-20 lg:pb-0" aria-label="Devolutivas">
      <FeedbackErrorBoundary sectionName="Cabeçalho">
        <AdminFeedbackHeader
          activeTab={vm.activeTab}
          onTabChange={vm.setActiveTab}
          searchTerm={vm.searchTerm}
          onSearchChange={vm.setSearchTerm}
          isRefetching={vm.isRefetching}
          onRefresh={vm.handleRefresh}
          onOpenForm={() => vm.setShowForm(true)}
        />
      </FeedbackErrorBoundary>

      <FeedbackErrorBoundary sectionName="Modal de mentoria">
        <AdminFeedbackModal
          open={vm.showForm}
          onClose={() => vm.setShowForm(false)}
          saving={vm.saving}
          formData={vm.formData}
          setFormData={vm.setFormData}
          selectedStoreId={vm.selectedStoreId}
          setSelectedStoreId={vm.setSelectedStoreId}
          filteredSellers={vm.filteredSellers}
          lojas={vm.lojas}
          previousWeekLabel={vm.previousWeek.label}
          onSellerSelect={vm.handleSellerSelect}
          onWeekReferenceChange={vm.handleWeekReferenceChange}
          onSubmit={vm.handleSubmit}
        />
      </FeedbackErrorBoundary>

      <div className="flex-1 min-h-0" aria-live="polite">
        {vm.activeTab === 'individual' ? (
          <FeedbackErrorBoundary sectionName="Lista de devolutivas">
            <FeedbackList
              feedbacks={vm.filteredFeedbacks}
              onShareWhatsApp={vm.handleShareWhatsApp}
              variant="admin"
            />
          </FeedbackErrorBoundary>
        ) : (
          <FeedbackErrorBoundary sectionName="Relatórios semanais">
            <WeeklyReportsList reports={vm.reports} variant="admin" />
          </FeedbackErrorBoundary>
        )}
      </div>
    </main>
  )
}

export default AdminFeedbackContainer
