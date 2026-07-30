import { useState } from 'react'
import { Network } from 'lucide-react'
import { PageHeading } from '@/components/molecules/PageHeading'
import { TabNav, type TabNavItem } from '@/components/molecules/TabNav'
import { EmptyState } from '@/components/atoms/EmptyState'
import { useLojasDoUsuario } from '@/hooks/useLojasDoUsuario'
import { OrganogramaVisual } from './components/OrganogramaVisual'
import { PlanoCarreira } from './components/PlanoCarreira'
import { PageCanvas } from '@/design-system/page'

type TabKey = 'organograma' | 'carreira'

const TABS: TabNavItem<TabKey>[] = [
  { key: 'organograma', label: 'Organograma' },
  { key: 'carreira', label: 'Plano de carreira' },
]

export default function OrganogramaPage() {
  const { lojas, loading } = useLojasDoUsuario()
  const [lojaId, setLojaId] = useState('')
  const [tab, setTab] = useState<TabKey>('organograma')

  const lojaSelecionada = lojaId || (lojas.length === 1 ? lojas[0].id : '')

  return (
    <PageCanvas as="div" width="dashboard" className="flex flex-col gap-mx-lg">
      <PageHeading
        title="Organograma & Plano de Carreira"
        subtitle="ESTRUTURA HIERÁRQUICA DA EMPRESA E A TRILHA DE EVOLUÇÃO POR CARGO"
        actions={
          <label className="flex items-center gap-mx-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Loja</span>
            <select
              value={lojaSelecionada}
              onChange={e => setLojaId(e.target.value)}
              disabled={loading || lojas.length === 0}
              className="h-mx-12 px-mx-sm bg-gray-50 border border-gray-100 rounded-xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="">Selecione…</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        }
      />

<TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

<section id={`${tab}-panel`} role="tabpanel" aria-labelledby={`${tab}-tab`}>
{tab === 'carreira' ? (
<PlanoCarreira />
) : !lojaSelecionada ? (
<EmptyState icon={<Network size={28} />} title={loading ? 'Carregando lojas…' : 'Selecione uma loja'} description="Escolha a loja para montar o organograma." />
) : (
<OrganogramaVisual lojaId={lojaSelecionada} />
)}
</section>
    </PageCanvas>
  )
}
