import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { DashboardErrorBoundary } from '@/features/dashboard-loja/components/DashboardErrorBoundary'
import { OwnerProvider } from '@/components/owner/OwnerContext'
import ConsultantRequestModal from '@/components/owner/ConsultantRequestModal'
import PlanoDeAcao from '@/pages/owner/PlanoDeAcao'
import OwnerLiveDataPage from '@/features/owner-base44/OwnerLiveDataPage'

// Conteúdo executivo real montado dentro do shell universal do MX.
export default function OwnerModule() {
  const { role } = useAuth()
  if (role !== 'dono') {
    return <Navigate to="/lojas" replace />
  }

  return (
    <DashboardErrorBoundary sectionName="OwnerModule">
      <OwnerProvider>
        <div data-mx-owner-workspace="true" className="h-full min-h-0 w-full">
          <Routes>
            <Route path="plano-acao" element={<PlanoDeAcao />} />
            <Route path="*" element={<OwnerLiveDataPage />} />
          </Routes>
          <ConsultantRequestModal />
        </div>
      </OwnerProvider>
    </DashboardErrorBoundary>
  )
}
