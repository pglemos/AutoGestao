import { Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { TabNavPill, type TabNavPillItem } from '@/components/molecules/TabNavPill'
import { cn } from '@/lib/utils'
import type { FeedbackTab } from '../lib/helpers'

const FEEDBACK_TABS: TabNavPillItem<FeedbackTab>[] = [
  { key: 'individual', label: 'Individual' },
  { key: 'weekly', label: 'Relatórios' },
]

type Props = {
  activeTab: FeedbackTab
  onTabChange: (tab: FeedbackTab) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  isRefetching: boolean
  onRefresh: () => void
  onOpenForm: () => void
}

export function AdminFeedbackHeader({
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  isRefetching,
  onRefresh,
  onOpenForm,
}: Props) {
  return (
    <header
      className="flex flex-col xl:flex-row xl:items-center justify-between gap-mx-lg border-b border-gray-200 pb-10 shrink-0"
      role="banner"
    >
      <div className="flex flex-col gap-mx-tiny min-w-0 max-w-full">
        <div className="flex items-center gap-mx-sm">
          <div
            className="w-mx-xs h-mx-10 bg-emerald-600 rounded-mx-full shadow-sm"
            aria-hidden="true"
          />
          <Typography variant="h1">
            Gestão de <span className="text-mx-green-700">Devolutivas</span>
          </Typography>
        </div>
        <Typography
          variant="caption"
          className="pl-mx-md"
        >
          ADMIN — VISÃO DA REDE • METODOLOGIA MX
        </Typography>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-mx-sm shrink-0 w-full xl:w-auto max-w-full">
        <TabNavPill
          tabs={FEEDBACK_TABS}
          activeTab={activeTab}
          onTabChange={onTabChange}
          buttonClassName="h-mx-9 px-6"
          className="w-full sm:w-auto xl:mr-2"
        />
        <div className="relative group w-full sm:w-mx-sidebar-expanded">
          <Search
            size={16}
            className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-600 transition-colors"
            aria-hidden="true"
          />
          <label htmlFor="feedback-admin-search" className="sr-only">
            Buscar mentoria
          </label>
          <Input
            id="feedback-admin-search"
            name="feedback-admin-search"
            placeholder="BUSCAR MENTORIA..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="!pl-11 !h-12 !text-mx-tiny uppercase tracking-widest font-bold"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          className="h-mx-xl w-mx-xl bg-white"
          aria-label="Sincronizar"
        >
          <RefreshCw size={20} className={cn(isRefetching && 'animate-spin')} />
        </Button>
        {activeTab === 'individual' && (
          <Button
            onClick={onOpenForm}
            className="h-mx-xl px-8 text-xs w-full sm:w-auto"
          >
            <Plus size={18} className="mr-2" /> NOVO FEEDBACK
          </Button>
        )}
      </div>
    </header>
  )
}

export default AdminFeedbackHeader
