import type { RefObject } from 'react'
import { ArrowRightLeft, Building2, RefreshCw } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/atoms/Button'

export type TransferConfirmationData = {
  existingUser: {
    id: string
    name: string
    email: string
    current_store_id: string | null
    current_store_name: string
  }
  targetStoreName?: string
  onConfirm: () => Promise<void> | void
}

export function TransferConfirmationDialog({
  data,
  isOpen,
  dialogRef,
  onClose,
  loading = false,
}: {
  data: TransferConfirmationData | null
  isOpen: boolean
  dialogRef?: RefObject<HTMLDivElement | null>
  onClose: () => void
  loading?: boolean
}) {
  return (
    <AlertDialog
      open={isOpen && !!data}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      {data && (
        <AlertDialogContent ref={dialogRef}>
          <div className="flex items-center gap-mx-md mb-mx-md">
            <div className="w-mx-14 h-mx-14 rounded-2xl bg-status-warning-surface text-status-warning-text flex items-center justify-center shrink-0 border border-status-warning/30">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <AlertDialogTitle className="text-foreground tracking-tight">
                Transferir integrante de loja?
              </AlertDialogTitle>
              <p className="mt-1 text-mx-nano block font-medium text-muted-foreground">
                Vínculo ativo identificado em outra unidade
              </p>
            </div>
          </div>

          <AlertDialogDescription className="rounded-2xl border border-status-warning/60 bg-status-warning-surface/60 p-mx-md text-foreground">
            O e-mail <strong className="font-bold">{data.existingUser.email}</strong> já pertence ao integrante{' '}
            <strong className="font-bold">{data.existingUser.name}</strong>, que está ativamente vinculado à loja{' '}
            <span className="inline-flex items-center gap-1 font-bold text-status-warning-text bg-amber-200/60 px-2 py-0.5 rounded-md">
              <Building2 size={12} /> {data.existingUser.current_store_name}
            </span>. Deseja encerrar o vínculo na loja{' '}
            <strong className="font-bold">{data.existingUser.current_store_name}</strong> e transferi-lo
            {data.targetStoreName ? ` para a loja ${data.targetStoreName}` : ' para a nova unidade'}?
          </AlertDialogDescription>

          <div className="mt-mx-xl flex flex-col-reverse sm:flex-row gap-mx-sm sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="warning"
              onClick={() => void data.onConfirm()}
              disabled={loading}
              className="gap-2"
            >
              {loading ? <RefreshCw className="animate-spin size-4" /> : <ArrowRightLeft size={16} />}
              Confirmar Transferência
            </Button>
          </div>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
