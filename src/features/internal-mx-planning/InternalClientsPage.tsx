import AdminClientesPage from '@/features/admin-mx/AdminClientesPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'
import { Lojas } from '@/features/lojas/Lojas.container'

type ClientsMode = 'cliente' | 'lojas'

const CLIENTS_TABS = [
  { key: 'cliente' as const, label: 'Clientes' },
  { key: 'lojas' as const, label: 'Lojas' },
]

export default function InternalClientsPage() {
  const domain = useInternalMxDomainTabs<ClientsMode>({ tabs: CLIENTS_TABS, fallback: 'cliente' })

  if (domain.active === 'lojas') {
    return (
      <>
        {domain.tabs}
        <Lojas />
      </>
    )
  }

  return (
    <>
      {domain.tabs}
      <AdminClientesPage />
    </>
  )
}