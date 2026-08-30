import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import type { Store } from '@/types/database'

type HardDeleteStoreModalProps = {
  store: Store | null
  confirmation: string
  deleting: boolean
  onConfirmationChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}

export function HardDeleteStoreModal({
  store,
  confirmation,
  deleting,
  onConfirmationChange,
  onClose,
  onConfirm,
}: HardDeleteStoreModalProps) {
  const matches = Boolean(store && confirmation.trim() === store.name.trim())

  return (
    <Modal
      open={Boolean(store)}
      onClose={onClose}
      title="Excluir loja definitivamente"
      description="A loja e as dependências operacionais removíveis serão apagadas em uma única transação."
      size="md"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={deleting} disabled={!matches}>
            Excluir definitivamente
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <MxStatusBanner tone="danger">
          Esta ação não possui restauração. Digite exatamente o nome <strong>{store?.name}</strong> para confirmar.
        </MxStatusBanner>
        <MxField label="Nome da loja">
          <Input
            value={confirmation}
            onChange={(event) => onConfirmationChange(event.target.value)}
            autoComplete="off"
            aria-label="Confirmação do nome da loja"
          />
        </MxField>
      </div>
    </Modal>
  )
}

export default HardDeleteStoreModal
