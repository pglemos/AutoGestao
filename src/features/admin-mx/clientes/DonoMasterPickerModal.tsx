import { useState } from 'react'
import { Crown } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'

export type DonoMasterCandidate = {
  id: string
  nome: string
  email: string
}

export function DonoMasterPickerModal(props: {
  open: boolean
  title?: string
  donos: DonoMasterCandidate[]
  submitting: boolean
  onPick: (personId: string) => void
  onClose: () => void
}) {
  const [selectedId, setSelectedId] = useState<string>('')

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.title ?? 'Definir Dono Master'}
      description="Escolha explicitamente quem será o Dono Master. A designação não é automática."
      size="md"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button
            onClick={() => selectedId && props.onPick(selectedId)}
            disabled={props.submitting || !selectedId}
          >
            <Crown size={16} />{props.submitting ? 'Definindo...' : 'Confirmar Dono Master'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-3">
        <MxStatusBanner tone="warning">Há mais de um Dono. Selecione um — não escolhemos automaticamente.</MxStatusBanner>
        <ul className="space-y-2">
          {props.donos.map(dono => (
            <li key={dono.id}>
              <label className={`flex items-center gap-3 rounded-lg border p-3 ${selectedId === dono.id ? 'border-primary/50 bg-status-success-bg' : 'border-border'}`}>
                <input
                  type="radio"
                  name="dono-master-pick"
                  checked={selectedId === dono.id}
                  onChange={() => setSelectedId(dono.id)}
                />
                <div>
                  <div className="text-sm font-medium text-foreground">{dono.nome}</div>
                  <div className="text-xs text-muted-foreground">{dono.email}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
