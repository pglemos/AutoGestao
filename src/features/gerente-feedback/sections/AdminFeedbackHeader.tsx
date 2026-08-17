import { MessageSquare, Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { TabNavPill, type TabNavPillItem } from '@/components/molecules/TabNavPill'
import { MxModuleHeader } from '@/components/module/MxModuleVisualPrimitives'
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
    <MxModuleHeader
      icon={MessageSquare}
      eyebrow="ADMIN — VISÃO DA REDE • METODOLOGIA MX"
      title="Gestão de Devolutivas"
      actions={
        <div className="flex w-full min-w-0 max-w-full flex-col items-stretch gap-mx-sm sm:flex-row sm:items-center xl:w-auto">
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
            className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors"
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
            className="pl-12 h-[var(--mx-input-height)] !text-mx-tiny uppercase tracking-widest font-bold"
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
      }
    />
  )
}

export default AdminFeedbackHeader
