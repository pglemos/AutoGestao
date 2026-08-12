import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { PageHeading } from '@/components/molecules/PageHeading'
import { TabNav, type TabNavItem } from '@/components/molecules/TabNav'
import { EmptyState } from '@/components/atoms/EmptyState'
import { CadastroPlanos } from './components/CadastroPlanos'
import { CadastroRegras } from './components/CadastroRegras'
import { CadastroCarreira } from './components/CadastroCarreira'
import { ComparativoMercado } from './components/ComparativoMercado'
import { useLojasDoUsuario } from './hooks/useRemuneracao'

type TabKey = 'cadastro' | 'regras' | 'carreira' | 'comparativo'

const TABS: TabNavItem<TabKey>[] = [
  { key: 'cadastro', label: 'Plano atual' },
  { key: 'regras', label: 'Regras e bônus' },
  { key: 'carreira', label: 'Nível de carreira' },
  { key: 'comparativo', label: 'Comparativo de mercado' },
]

export default function RemuneracaoPage() {
  const { lojas, loading } = useLojasDoUsuario()
  const [lojaId, setLojaId] = useState<string>('')
  const [tab, setTab] = useState<TabKey>('cadastro')

  const lojaSelecionada = lojaId || (lojas.length === 1 ? lojas[0].id : '')

  return (
<div className="w-full space-y-mx-lg">
      <PageHeading
        title="Remuneração Inteligente"
        subtitle="CADASTRE O PLANO DE REMUNERAÇÃO POR CARGO E COMPARE COM A MÉDIA DE MERCADO"
        actions={
          <label className="flex items-center gap-mx-sm">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Loja</span>
            <select
              value={lojaSelecionada}
              onChange={e => setLojaId(e.target.value)}
              disabled={loading || lojas.length === 0}
              className="h-mx-12 px-mx-sm bg-gray-50 border border-border-subtle rounded-xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
            >
              <option value="">Selecione…</option>
              {lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
        }
      />

      {!lojaSelecionada ? (
        <EmptyState
          icon={<Wallet size={28} />}
          title={loading ? 'Carregando lojas…' : 'Selecione uma loja'}
          description="Escolha a loja para gerenciar a remuneração dos cargos."
        />
) : (
<>
<TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />
<section id={`${tab}-panel`} role="tabpanel" aria-labelledby={`${tab}-tab`}>
{tab === 'cadastro' && <CadastroPlanos lojaId={lojaSelecionada} />}
{tab === 'regras' && <CadastroRegras lojaId={lojaSelecionada} />}
{tab === 'carreira' && <CadastroCarreira lojaId={lojaSelecionada} />}
{tab === 'comparativo' && <ComparativoMercado lojaId={lojaSelecionada} />}
</section>
</>
)}
    </div>
  )
}
