import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@/components/atoms/Button'
import { Modal, ModalBody } from '@/components/organisms/Modal'

const meta = {
  title: 'Organisms/Modal',
  component: Modal,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl'] },
    showClose: { control: 'boolean' },
    closeOnEscape: { control: 'boolean' },
  },
  args: {
    open: true,
    onClose: () => undefined,
    title: 'Título do modal',
    children: 'Conteúdo',
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

function ModalDemo(props: Partial<React.ComponentProps<typeof Modal>>) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Abrir modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar vendedor"
        description="Atualize os dados do vendedor."
        footer={<div className="flex w-full justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => setOpen(false)}>Salvar</Button></div>}
        {...props}
      >
        <ModalBody>
          <p>Corpo do modal. O scroll interno é responsabilidade do <code>ModalBody</code> (único scroll owner).</p>
        </ModalBody>
      </Modal>
    </div>
  )
}

export const Padrão = { render: () => <ModalDemo /> }

export const Large = { render: () => <ModalDemo size="lg" title="Detalhes do PDI" /> }

export const SemFechar = { render: () => <ModalDemo showClose={false} title="Termo de responsabilidade" /> }
