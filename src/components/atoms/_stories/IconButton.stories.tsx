import type { Meta, StoryObj } from '@storybook/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { IconButton } from '@/components/atoms/IconButton'

const meta = {
  title: 'Atoms/IconButton',
  component: IconButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'outline', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  args: {
    icon: <Plus />,
    label: 'Adicionar',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Ghost: Story = { args: { variant: 'ghost' } }

export const Outline: Story = { args: { variant: 'outline', icon: <Pencil />, label: 'Editar' } }

export const Primary: Story = { args: { variant: 'primary' } }

export const Danger: Story = { args: { variant: 'danger', icon: <Trash2 />, label: 'Excluir' } }

export const Carregando: Story = { args: { variant: 'primary', loading: true, label: 'Salvando' } }

export const Desabilitado: Story = { args: { variant: 'primary', disabled: true } }
