import { MessageSquare, Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { TabNavPill, type TabNavPillItem } from '@/components/molecules/TabNavPill'
import { cn } from '@/lib/utils'
import type { FeedbackTab } from '../lib/helpers'

const FEEDBACK_TABS: TabNavPillItem<FeedbackTab>[] = [
  { key: 'individual', label: 'Individual' },
  { key: 'weekly', label: 'Relatórios' },
]

type Props = {
  isOwner: boolean
  canCreateFeedback: boolean
  activeTab: FeedbackTab
  onTabChange: (tab: FeedbackTab) => void
  searchTerm: string
  onSearchChange: (term: string) => void
  isRefetching: boolean
  onRefresh: () => void
  onOpenForm: () => void
}

export function StoreFeedbackHeader({
  isOwner,
  canCreateFeedback,
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange,
  isRefetching,
  onRefresh,
  onOpenForm,
}: Props) {
  return (
    <SellerPageHeader icon={MessageSquare} title={isOwner ? 'Devolutivas da Rede' : 'Feedbacks'} subtitle={isOwner ? 'Acompanhe qualidade e cobranças semanais' : 'Rotina semanal obrigatória'} actions={<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-mx-sm shrink-0 w-full xl:w-auto max-w-full">
        <TabNavPill
          tabs={FEEDBACK_TABS}
          activeTab={activeTab}
          onTabChange={onTabChange}
          buttonClassName="h-mx-9 px-6"
          className="w-full sm:w-auto xl:mr-2"
          aria-label="Feedbacks"
        />
        <div className="relative group w-full sm:w-mx-sidebar-expanded">
          <Search
            size={16}
            className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors"
          />
          <label htmlFor="feedback-store-search" className="sr-only">
            Buscar mentoria
          </label>
          <Input
            id="feedback-store-search"
            name="feedback-store-search"
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
          aria-label="Sincronizar devolutivas"
          className="h-mx-xl w-mx-xl bg-white"
        >
          <RefreshCw size={20} className={cn(isRefetching && 'animate-spin')} />
        </Button>
        {activeTab === 'individual' && canCreateFeedback && (
          <Button
            onClick={onOpenForm}
            className="h-mx-xl px-8 text-xs w-full sm:w-auto"
          >
            <Plus size={18} className="mr-2" /> NOVO FEEDBACK
          </Button>
        )}
      </div>} />
  )
}

export default StoreFeedbackHeader
