import { useLocation, useNavigate } from 'react-router-dom'
import { TabNav, type TabNavItem } from '@/components/molecules/TabNav'

export function InternalMxDomainTabs<T extends string>({
  tabs,
  fallback,
  modeParam = 'mode',
}: {
  tabs: TabNavItem<T>[]
  fallback: T
  modeParam?: string
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const requested = params.get(modeParam)
  const active = tabs.some(tab => tab.key === requested && !tab.disabled)
    ? requested as T
    : fallback

  const change = (next: T) => {
    const nextParams = new URLSearchParams(location.search)
    if (next === fallback) nextParams.delete(modeParam)
    else nextParams.set(modeParam, next)
    const search = nextParams.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: false })
  }

  return {
    active,
    tabs: (
      <div className="w-full px-mx-lg pt-mx-md">
        <TabNav tabs={tabs} activeTab={active} onTabChange={change} scrollable />
      </div>
    ),
  }
}
