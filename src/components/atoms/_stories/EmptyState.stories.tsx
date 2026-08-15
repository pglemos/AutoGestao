import type { Meta, StoryObj } from '@storybook/react'
import { Package } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { EmptyState } from '@/components/atoms/EmptyState'

const meta = {
  title: 'Atoms/EmptyState',
  component: EmptyState,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['dataset', 'filter'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    title: 'Nenhum registro localizado',
    description: 'Cadastre um registro ou ajuste os filtros para começar.',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Dataset: Story = {
  args: { variant: 'dataset' },
}

export const Filter: Story = {
  args: { variant: 'filter', title: 'Nenhum resultado para os filtros', description: 'Tente remover um filtro ou ajustar a busca.' },
}

export const ComIconeEAcao: Story = {
  args: {
    variant: 'dataset',
    icon: <Package size={24} />,
    action: <Button>Cadastrar produto</Button>,
  },
}

export const Compacto: Story = {
  args: { variant: 'filter', size: 'sm', title: 'Nenhum vendedor corresponde à busca.' },
}
