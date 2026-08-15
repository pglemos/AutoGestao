import { FileCheck, Plus } from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'

/**
 * Escolha de como criar uma nova ação (Base44 `NewActionChoiceModal`):
 * usar um template ou criar um plano personalizado.
 */
export function NewActionChoiceModal(props: {
  open: boolean
  onClose: () => void
  onUseTemplate: () => void
  onCreateCustom: () => void
}) {
  return (
    <Modal open={props.open} onClose={props.onClose} title="Nova ação" size="md">
      <div className="mt-5 space-y-3">
        <button
          type="button"
          onClick={props.onUseTemplate}
          className="w-full space-y-1 rounded-lg border-2 border-primary bg-primary/5 p-4 text-left transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <FileCheck size={16} className="text-primary" />
            <span className="font-medium text-foreground">Usar template</span>
            <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-white">Recomendado</span>
          </div>
          <p className="text-xs text-muted-foreground">Selecione uma orientação da metodologia MX e adapte responsáveis, prazos e metas para este cliente.</p>
        </button>
        <button
          type="button"
          onClick={props.onCreateCustom}
          className="w-full space-y-1 rounded-lg border border-border p-4 text-left transition-colors hover:bg-surface-alt"
        >
          <div className="flex items-center gap-2">
            <Plus size={16} className="text-muted-foreground" />
            <span className="font-medium text-foreground">Criar plano personalizado</span>
          </div>
          <p className="text-xs text-muted-foreground">Crie um plano específico para uma necessidade deste cliente.</p>
        </button>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="outline" onClick={props.onClose}>Fechar</Button>
      </div>
    </Modal>
  )
}
