import { useState, type ComponentType, type PropsWithChildren, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/atoms/Button'
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// `ui/sheet.jsx` é JavaScript: sem types declarados no forwardRef, o TS não
// enxerga `children`/`className`. Cast documenta o contrato usado aqui.
const Content = SheetContent as unknown as ComponentType<PropsWithChildren<{ side?: 'left' | 'right' | 'top' | 'bottom'; className?: string }>>
const Header = SheetHeader as unknown as ComponentType<PropsWithChildren<{ className?: string }>>
const Body = SheetBody as unknown as ComponentType<PropsWithChildren<{ className?: string }>>
const Footer = SheetFooter as unknown as ComponentType<PropsWithChildren<{ className?: string }>>
const Title = SheetTitle as unknown as ComponentType<PropsWithChildren<{ className?: string }>>
const Description = SheetDescription as unknown as ComponentType<PropsWithChildren<{ className?: string }>>

const meta = {
  title: 'Organisms/Drawer (Sheet)',
  component: SheetContent,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['left', 'right', 'top', 'bottom'] },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function DrawerDemo({ side = 'right' }: { side?: 'left' | 'right' | 'top' | 'bottom' }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Abrir drawer</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <Content side={side}>
          <Header>
            <Title>Detalhes da loja</Title>
            <Description>Informações cadastrais e métricas da unidade.</Description>
          </Header>
          <Body>
            <p>Conteúdo rolável do drawer. O <code>SheetBody</code> é o único scroll owner interno.</p>
          </Body>
          <Footer>
            <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          </Footer>
        </Content>
      </Sheet>
    </div>
  )
}

export const Direita = { render: () => <DrawerDemo side="right" /> }

export const Esquerda = { render: () => <DrawerDemo side="left" /> }

