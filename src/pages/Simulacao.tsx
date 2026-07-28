import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Crown, MonitorPlay, ShieldCheck, UserRound } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { slugify } from '@/lib/utils'
import type { UserRole } from '@/types/database'
import { MxModuleHeader, MxModulePage, MxSectionCard, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'

type SimulationRole = Extract<UserRole, 'dono' | 'gerente' | 'vendedor'>
const OPTIONS: Array<{ role: SimulationRole; title: string; description: string; icon: typeof UserRound; path: string }> = [
  { role: 'vendedor', title: 'Vendedor', description: 'Rotina, carteira, funil, desenvolvimento e treinamentos.', icon: UserRound, path: '/terminal-mx' },
  { role: 'gerente', title: 'Gerente', description: 'Painel da loja, equipe, metas, rotina e desenvolvimento.', icon: ShieldCheck, path: '/rotina' },
  { role: 'dono', title: 'Dono', description: 'Visão executiva, departamentos, relatórios e governança.', icon: Crown, path: '/dono' },
]

export default function Simulacao() {
  const { simulationRole: requestedRole } = useParams<{ simulationRole?: string }>()
  const { baseRole, isSimulating, simulationRole, simulationLoading, membership, startSimulation, stopSimulation } = useAuth()
  const navigate = useNavigate()
  const option = useMemo(() => OPTIONS.find(item => item.role === requestedRole), [requestedRole])

  useEffect(() => {
    if (option && (!isSimulating || simulationRole !== option.role)) startSimulation(option.role)
  }, [isSimulating, option, simulationRole, startSimulation])

  useEffect(() => {
    if (!option || !isSimulating || simulationRole !== option.role || simulationLoading) return
    const target = option.role === 'gerente' && membership?.store?.name ? `/lojas/${slugify(membership.store.name)}` : option.path
    navigate(target, { replace: true })
  }, [isSimulating, membership?.store?.name, navigate, option, simulationLoading, simulationRole])

  if (!isPerfilInternoMx(baseRole) && !isSimulating) return <Navigate to="/" replace />
  if (option) return <MxModulePage id="simulation-loading"><MxModuleHeader eyebrow="Simulação MX" title={`Preparando visão de ${option.title}`} description="Carregando a identidade operacional e a loja autorizada para o teste." /><MxStatusBanner tone="info">A identidade administrativa real permanece preservada e poderá ser restaurada imediatamente.</MxStatusBanner></MxModulePage>

  return (
    <MxModulePage id="simulation-selector">
      <MxModuleHeader eyebrow="Simulação" title="Simulação de Perfis" description="Valide as experiências reais de Vendedor, Gerente e Dono sem substituir sua identidade administrativa." actions={isSimulating ? <Button variant="managerSecondary" onClick={() => { stopSimulation(); navigate('/simulacao', { replace: true }) }}>Encerrar simulação</Button> : undefined} />
      {isSimulating ? <MxStatusBanner tone="warning">Simulando {simulationRole}. Loja operacional: {membership?.store?.name || 'carregando'}. Ações não delegadas permanecem bloqueadas.</MxStatusBanner> : null}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3" aria-label="Perfis disponíveis para simulação">
        {OPTIONS.map(item => { const Icon = item.icon; return <MxSectionCard key={item.role} className="flex flex-col p-5"><span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Icon size={24} /></span><h2 className="mt-4 text-lg font-semibold text-gray-800">{item.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-gray-500">{item.description}</p><Button className="mt-5" onClick={() => navigate(`/simulacao/${item.role}`)}><MonitorPlay size={18} />Simular {item.title}</Button></MxSectionCard> })}
      </section>
    </MxModulePage>
  )
}
