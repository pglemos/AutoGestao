import type { Meta, StoryObj } from '@storybook/react'
import { Plus, Settings } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { PageHeader } from '@/components/molecules/PageHeader'

const meta = {
  title: 'Molecules/PageHeader',
  component: PageHeader,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    titleVariant: { control: 'select', options: ['h1', 'h2', 'h3', 'h4'] },
    descriptionVariant: { control: 'select', options: ['caption', 'p'] },
  },
  args: {
    title: 'Minha Remuneração',
    description: 'Acompanhe comissões, metas e a evolução da sua carreira.',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Padrão: Story = {}

export const ComAções: Story = {
  render: (args) => (
    <PageHeader
      {...args}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Settings className="h-3.5 w-3.5" />Configurar</Button>
          <Button size="sm"><Plus className="h-3.5 w-3.5" />Novo</Button>
        </div>
      }
    />
  ),
}

export const ComEyebrowEMeta: Story = {
  render: (args) => (
    <PageHeader
      {...args}
      eyebrow="Vendas"
      meta={<span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-muted-foreground">Mês atual</span>}
    />
  ),
}

export const ComIcone: Story = {
  render: (args) => <PageHeader {...args} icon={Settings} />,
}
