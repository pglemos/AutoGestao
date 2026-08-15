import type { Meta, StoryObj } from '@storybook/react'
import { LoadingState } from '@/components/molecules/LoadingState'

const meta = {
  title: 'Molecules/LoadingState',
  component: LoadingState,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['spinner', 'skeleton'] },
    context: { control: 'select', options: ['initial', 'refresh', 'pagination'] },
    rows: { control: { type: 'number', min: 1, max: 8 } },
  },
  args: { label: 'Carregando dados' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Spinner: Story = {
  args: { variant: 'spinner' },
}

export const Esqueleto: Story = {
  args: { variant: 'skeleton', rows: 3 },
}

export const Refresh: Story = {
  args: { variant: 'spinner', context: 'refresh', label: 'Atualizando…' },
}

export const Paginacao: Story = {
  args: { variant: 'spinner', context: 'pagination', label: 'Carregando mais itens…' },
}
