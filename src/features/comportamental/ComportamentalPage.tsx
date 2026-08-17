import { useState } from 'react'
import { UserCheck } from 'lucide-react'
import { PageHeading } from '@/components/molecules/PageHeading'
import { TabNav, type TabNavItem } from '@/components/molecules/TabNav'
import { TesteComportamental } from './components/TesteComportamental'
import { BancoTalentos } from './components/BancoTalentos'
import { PageCanvas } from '@/design-system/page'

type TabKey = 'teste' | 'banco'

const TABS: TabNavItem<TabKey>[] = [
  { key: 'teste', label: 'Teste comportamental' },
  { key: 'banco', label: 'Banco de talentos' },
]

export default function ComportamentalPage() {
  const [tab, setTab] = useState<TabKey>('teste')

  return (
    <PageCanvas as="div" width="dashboard" className="flex flex-col gap-mx-lg">
      <PageHeading
        icon={UserCheck}
        title="Teste Comportamental & Banco de Talentos"
        subtitle="APLIQUE O TESTE NO ONBOARDING E CONSTRUA O BANCO DE PERFIS VENCEDORES"
      />
      <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
      <section id={`${tab}-panel`} role="tabpanel" aria-labelledby={`${tab}-tab`}>
        {tab === 'teste' ? <TesteComportamental /> : <BancoTalentos />}
      </section>
    </PageCanvas>
  )
}
