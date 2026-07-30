import { type FormEvent } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'

type NewStoreState = { name: string; manager_email: string }

type CreateStoreModalProps = {
  open: boolean
  newStore: NewStoreState
  setNewStore: (updater: (prev: NewStoreState) => NewStoreState) => void
  creating: boolean
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
}

/**
 * Modal de criação de nova loja — usado pelo Admin MX.
 * Extraído de DashboardLoja.tsx (Story 2.5).
 */
export function CreateStoreModal({ open, newStore, setNewStore, creating, onClose, onSubmit }: CreateStoreModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nova Loja"
      description="Cadastro administrativo MX"
      size="lg"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={creating}>CANCELAR</Button>
          <Button type="submit" form="store-create-form" disabled={creating} className="">
            {creating ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Plus size={16} className="mr-2" />}
            CADASTRAR
          </Button>
        </>
      }
    >
      <form id="store-create-form" onSubmit={onSubmit} className="space-y-mx-lg">
        <label className="space-y-mx-xs block">
          <Typography as="span" variant="caption" className="">Nome da Loja</Typography>
          <Input
            id="dashboard-new-store-name"
            name="store_name"
            required
            value={newStore.name}
            onChange={event => setNewStore(prev => ({ ...prev, name: event.target.value.toUpperCase() }))}
            className="!h-14 font-bold uppercase tracking-widest"
          />
        </label>
        <label className="space-y-mx-xs block">
          <Typography as="span" variant="caption" className="">E-mail do Gestor</Typography>
          <Input
            id="dashboard-new-store-manager-email"
            name="manager_email"
            type="email"
            value={newStore.manager_email}
            onChange={event => setNewStore(prev => ({ ...prev, manager_email: event.target.value }))}
            placeholder="gestor@loja.com.br"
            className="!h-14 font-bold"
          />
        </label>
      </form>
    </Modal>
  )
}

export default CreateStoreModal
