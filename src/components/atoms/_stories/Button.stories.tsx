import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/atoms/Button'

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'outline', 'ghost', 'success', 'warning', 'info', 'danger', 'whatsapp'],
    },
    size: { control: 'select', options: ['default', 'sm', 'xs', 'lg', 'icon'] },
    disabled: { control: 'boolean' },
  },
  args: { children: 'Botão MX' },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary' } }
export const Outline: Story = { args: { variant: 'outline' } }
export const Danger: Story = { args: { variant: 'danger' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Disabled: Story = { args: { variant: 'primary', disabled: true } }

export const AllSizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="xs">XS</Button>
      <Button {...args} size="sm">SM</Button>
      <Button {...args} size="default">Default</Button>
      <Button {...args} size="lg">LG</Button>
    </div>
  ),
  args: { variant: 'primary' },
}
