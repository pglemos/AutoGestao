import type { Meta, StoryObj } from '@storybook/react'
import { ErrorState } from '@/components/molecules/ErrorState'

const meta = {
  title: 'Molecules/ErrorState',
  component: ErrorState,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    kind: { control: 'select', options: ['network', 'permission', 'server', 'unknown'] },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Rede: Story = {
  args: { kind: 'network' },
}

export const Permissao: Story = {
  args: { kind: 'permission' },
}

export const Servidor: Story = {
  args: { kind: 'server', onRetry: () => undefined },
}

export const ComReferencia: Story = {
  args: { kind: 'server', onRetry: () => undefined, reference: 'MX-2026-0814-1234' },
}
