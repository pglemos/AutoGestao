import type { RefObject } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/atoms/Button'

export type PendingConfirmation = {
  key: string
  title: string
  description: string
  label: string
  onConfirm: () => void
}

export function ConfirmationDialog({
  pendingConfirmation,
  confirmDialogRef,
  onDismiss,
}: {
  pendingConfirmation: PendingConfirmation | null
  confirmDialogRef: RefObject<HTMLDivElement | null>
  onDismiss: (key: string) => void
}) {
  return (
    <AlertDialog
      open={pendingConfirmation !== null}
      onOpenChange={(open) => {
        if (!open && pendingConfirmation) onDismiss(pendingConfirmation.key)
      }}
    >
      {pendingConfirmation && (
        <AlertDialogContent ref={confirmDialogRef}>
          <AlertDialogTitle>{pendingConfirmation.title}</AlertDialogTitle>
          <AlertDialogDescription>{pendingConfirmation.description}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="font-semibold"
              onClick={() => onDismiss(pendingConfirmation.key)}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                const action = pendingConfirmation.onConfirm
                onDismiss(pendingConfirmation.key)
                action()
              }}
            >
              {pendingConfirmation.label}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
