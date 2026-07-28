import { useEffect, useState, type ComponentType, type PropsWithChildren } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { ActionPlanItem } from '../actionPlan.types'

const TypedAlertDialog = AlertDialog as ComponentType<PropsWithChildren<{
  open: boolean
  onOpenChange(open: boolean): void
}>>
const TypedAlertDialogContent = AlertDialogContent as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedAlertDialogDescription = AlertDialogDescription as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedAlertDialogFooter = AlertDialogFooter as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedAlertDialogHeader = AlertDialogHeader as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedAlertDialogTitle = AlertDialogTitle as ComponentType<PropsWithChildren<{ className?: string }>>
const TypedAlertDialogCancel = AlertDialogCancel as ComponentType<PropsWithChildren<{
  disabled?: boolean
  className?: string
}>>

export function DeleteActionDialog({
  action,
  open,
  busy,
  onOpenChange,
  onConfirm,
}: {
  action: ActionPlanItem | null
  open: boolean
  busy: boolean
  onOpenChange(open: boolean): void
  onConfirm(action: ActionPlanItem): Promise<void> | void
}) {
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (!open) setConfirmation('')
  }, [open])

  const canDelete = Boolean(action && confirmation === action.code)

  return (
    <TypedAlertDialog open={open} onOpenChange={onOpenChange}>
      <TypedAlertDialogContent>
        <TypedAlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            <TypedAlertDialogTitle>Excluir ação definitivamente?</TypedAlertDialogTitle>
          </div>
          <TypedAlertDialogDescription>
            Esta operação remove a ação e não pode ser desfeita. Histórico e evidências relacionados também poderão ser afetados.
          </TypedAlertDialogDescription>
        </TypedAlertDialogHeader>
        {action ? (
          <div className="space-y-2 py-2">
            <label htmlFor="delete-action-confirmation">Digite o código <strong>{action.code}</strong> para confirmar.</label>
            <Input
              id="delete-action-confirmation"
              value={confirmation}
              onChange={(event: { target: { value: string } }) => setConfirmation(event.target.value)}
              autoComplete="off"
              aria-describedby="delete-action-help"
            />
            <p id="delete-action-help" className="text-xs text-muted-foreground">A confirmação diferencia maiúsculas de minúsculas.</p>
          </div>
        ) : null}
        <TypedAlertDialogFooter>
          <TypedAlertDialogCancel disabled={busy}>Cancelar</TypedAlertDialogCancel>
          <Button
            variant="danger"
            disabled={!canDelete || busy}
            onClick={() => action && void onConfirm(action)}
          >
            {busy ? 'Excluindo...' : 'Excluir definitivamente'}
          </Button>
        </TypedAlertDialogFooter>
      </TypedAlertDialogContent>
    </TypedAlertDialog>
  )
}
