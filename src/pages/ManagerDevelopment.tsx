import { useSearchParams } from 'react-router-dom'
import { MessageSquare, Sparkles } from 'lucide-react'
import ManagerFeedbackReference from '@/features/manager/development/ManagerFeedbackReference'
import ManagerPDIReference from '@/features/manager/development/ManagerPDIReference'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { MxModuleHeader, MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
import { MxPageTabs } from '@/components/module/MxPageTabs'

type DevelopmentTab = 'feedbacks' | 'pdis'

const tabs = [
  { key: 'feedbacks', label: 'Feedback', description: 'Reconhecimento e orientação', icon: MessageSquare },
  { key: 'pdis', label: 'PDI', description: 'Planos de desenvolvimento', icon: Sparkles },
] as const

export default function ManagerDevelopment() {
  const [params, setParams] = useSearchParams()
  const requestedTab = params.get('tab')
  const tab: DevelopmentTab = requestedTab === 'pdi' || requestedTab === 'pdis' ? 'pdis' : 'feedbacks'
  const selectTab = (next: DevelopmentTab) => {
    const updated = new URLSearchParams(params)
    updated.set('tab', next)
    setParams(updated, { replace: true })
  }

  return (
    <MxModulePage id="desenvolvimento" width="focused">
      <ManagerHomeReturnLink />
      <MxModuleHeader icon={Sparkles} title="Desenvolvimento" description="Reconheça, oriente e desenvolva sua equipe com Feedback e PDI." eyebrow="Gestão de pessoas" />
      <MxPageTabs items={[...tabs]} activeKey={tab} onChange={selectTab} ariaLabel="Desenvolvimento" />
      {tab === 'pdis' ? <ManagerPDIReference /> : <ManagerFeedbackReference />}
    </MxModulePage>
  )
}
