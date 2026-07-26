import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { DashboardErrorBoundary } from '@/features/dashboard-loja/components/DashboardErrorBoundary'
import { Toaster as OwnerToaster } from '@/components/ui/toaster'
import OwnerLayout from '@/components/owner/OwnerLayout'
import OwnerHome from '@/pages/owner/OwnerHome'
import PlanoEstrategico from '@/pages/owner/PlanoEstrategico'
import PlanoDeAcao from '@/pages/owner/PlanoDeAcao'
import Consultoria from '@/pages/owner/Consultoria'
import OwnerLiveDataPage from '@/features/owner-base44/OwnerLiveDataPage'
import '@/styles/owner-base44-exact.css'

// Espelha o módulo do Dono do Base44 (paths /dono/*) montado dentro do MX.
export default function OwnerModule() {
  const { role } = useAuth()
  if (role !== 'dono') {
    return <Navigate to="/lojas" replace />
  }

  return (
    <DashboardErrorBoundary sectionName="OwnerModule">
      <div className="owner-b44 owner-base44-exact h-full min-h-0">
        <Routes>
          <Route element={<OwnerLayout />}>
            <Route index element={<OwnerHome />} />
            <Route path="plano-estrategico" element={<PlanoEstrategico />} />
            <Route path="plano-acao" element={<PlanoDeAcao />} />
            <Route path="consultoria" element={<Consultoria />} />
            <Route path="*" element={<OwnerLiveDataPage />} />
          </Route>
        </Routes>
        <OwnerToaster />
      </div>
    </DashboardErrorBoundary>
  )
}
