import type { ComponentType, PropsWithChildren, ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/atoms/Button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// `ui/tooltip.jsx` é JavaScript: cast documenta o contrato usado aqui.
const Content = TooltipContent as unknown as ComponentType<PropsWithChildren<{ side?: 'top' | 'right' | 'bottom' | 'left'; sideOffset?: number; className?: string }>>
const Trigger = TooltipTrigger as unknown as ComponentType<PropsWithChildren<{ asChild?: boolean }>>

const meta = {
  title: 'Organisms/Tooltip',
  component: TooltipContent,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['top', 'right', 'bottom', 'left'] },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function TooltipDemo({ side = 'top' }: { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <Trigger asChild>
          <Button variant="outline">Passe o mouse</Button>
        </Trigger>
        <Content side={side} sideOffset={6}>
          Explicação contextual do elemento.
        </Content>
      </Tooltip>
    </TooltipProvider>
  )
}

export const Topo = { render: () => <TooltipDemo side="top" /> }

export const Direita = { render: () => <TooltipDemo side="right" /> }

export const Inferior = { render: () => <TooltipDemo side="bottom" /> }

