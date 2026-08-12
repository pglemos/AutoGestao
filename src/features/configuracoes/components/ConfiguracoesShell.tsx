import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { MxModuleHeader, MxModulePage, MxSectionCard } from '@/components/module/MxModuleVisualPrimitives'
import { MxPageTabs, type MxPageTabItem } from '@/components/module/MxPageTabs'
import { TAB_REGISTRY, SECTION_LABELS, getVisibleTabs } from '../tabRegistry'
import type { ConfigTabDefinition, ConfigTabKey } from '../types'
import type { UserRole } from '@/types/database'
import { ConfiguracoesTabSummary } from './ConfiguracoesTabSummary'

const ROLE_LABELS: Record<UserRole, string> = {
  administrador_geral: 'Admin Master MX',
  administrador_mx: 'Admin MX',
  consultor_mx: 'Consultor MX',
  dono: 'Dono',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

function isConfigTabKey(value: string | null): value is ConfigTabKey {
  return Boolean(value && TAB_REGISTRY.some((tab: ConfigTabDefinition) => tab.key === value))
}

export function ConfiguracoesShell({
  role,
  profileEmail,
  initialTab,
  onSignOut,
}: {
  role: UserRole
  profileEmail?: string | null
  initialTab?: ConfigTabKey
  onSignOut: () => Promise<void> | void
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const visibleTabs = useMemo(() => getVisibleTabs(role), [role])
  const requestedTab = initialTab || searchParams.get('aba')

  const activeTab = useMemo(() => {
    if (isConfigTabKey(requestedTab) && visibleTabs.some((tab: ConfigTabDefinition) => tab.key === requestedTab)) return requestedTab
    return visibleTabs[0]?.key
  }, [requestedTab, visibleTabs])

  useEffect(() => {
    if (!activeTab || initialTab) return
    if (requestedTab === 'remuneracao') {
      navigate('/configuracoes/remuneracao', { replace: true })
      return
    }
    if (requestedTab !== activeTab) setSearchParams({ aba: activeTab }, { replace: true })
  }, [activeTab, initialTab, navigate, requestedTab, setSearchParams])

  if (!activeTab || visibleTabs.length === 0) return <Navigate to="/home" replace />

  const activeDefinition = visibleTabs.find((tab: ConfigTabDefinition) => tab.key === activeTab) || visibleTabs[0]
  const ActiveComponent = activeDefinition.component
  const isReadOnly = Boolean(activeDefinition.readOnlyRoles?.includes(role))
  const tabItems: MxPageTabItem<ConfigTabKey>[] = visibleTabs.map((definition: ConfigTabDefinition) => ({
    key: definition.key,
    label: definition.label,
    description: definition.description,
    icon: definition.icon,
    group: definition.section,
    readOnly: Boolean(definition.readOnlyRoles?.includes(role)),
  }))

  const handleSelect = (key: ConfigTabKey) => {
    if (key === 'remuneracao') {
      navigate('/configuracoes/remuneracao')
      return
    }
    navigate(`/configuracoes?aba=${key}`)
  }

  return (
    <MxModulePage id="configuracoes" accessMode={isReadOnly ? 'read-only' : 'manage'}>
      <div data-testid="configuracoes-shell">
        <MxModuleHeader
          title="Configurações"
          description="Conta, rede, governança e sistema em um único centro de controle."
          eyebrow={
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{ROLE_LABELS[role]}</Badge>
              {profileEmail ? <Badge variant="outline">{profileEmail}</Badge> : null}
            </span>
          }
          actions={
            <Button variant="outline" onClick={() => void onSignOut()}>
              <LogOut size={16} className="mr-2" aria-hidden="true" />
              Encerrar sessão
            </Button>
          }
        />
      </div>

      <MxPageTabs
        items={tabItems}
        activeKey={activeTab}
        onChange={handleSelect}
        ariaLabel="Configurações"
        getPanelId={(key) => key === activeTab ? `mx-tab-panel-${key}` : undefined}
        searchable
        searchPlaceholder="Buscar configuração"
        groupLabels={SECTION_LABELS}
      />

      <ConfiguracoesTabSummary definition={activeDefinition} isReadOnly={isReadOnly} />

      <MxSectionCard id={`mx-tab-panel-${activeTab}`} role="tabpanel" aria-label={activeDefinition.label} data-testid={`settings-tab-${activeTab}`}>
        <div className="p-5">
          <ActiveComponent isReadOnly={isReadOnly} role={role} />
        </div>
      </MxSectionCard>
    </MxModulePage>
  )
}
