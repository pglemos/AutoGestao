import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { TabNav } from '@/components/molecules/TabNav'

const meta = {
  title: 'Molecules/TabNav',
  component: TabNav,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

type TabKey = 'resumo' | 'detalhes' | 'historico'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'resumo', label: 'Resumo' },
  { key: 'detalhes', label: 'Detalhes' },
  { key: 'historico', label: 'Histórico' },
]

function TabNavDemo() {
  const [active, setActive] = useState<TabKey>('resumo')
  return <TabNav tabs={TABS} activeTab={active} onTabChange={setActive} />
}

export const Padrão = { render: () => <TabNavDemo /> }

export const MuitasAbas = {
  render: () => {
    const [active, setActive] = useState('tab-1')
    const many = Array.from({ length: 6 }, (_, i) => ({ key: `tab-${i + 1}`, label: `Aba ${i + 1}` }))
    return <TabNav tabs={many} activeTab={active} onTabChange={setActive} />
  },
}
