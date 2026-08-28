import type { RefObject } from 'react'
import { UserSearch, RefreshCw } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/atoms/Button'

export type DuplicateNameConfirmationData = {
  existingUser: {
    id: string
    name: string
    email: string
  }
  targetStoreName?: string
  onConfirm: () => Promise<void> | void
}

/**
 * Confirmação de homônimo na mesma loja.
 *
 * Cadastrar a mesma pessoa duas vezes divide as vendas dela entre dois logins:
 * ranking, meta e atingimento passam a mostrar metades. O caminho certo quase
 * sempre é usar o cadastro que já existe — por isso ele é a ação em destaque, e
 * seguir mesmo assim é a saída discreta.
 */
export function DuplicateNameConfirmationDialog({
  data,
  isOpen,
  dialogRef,
  onClose,
  loading = false,
}: {
  data: DuplicateNameConfirmationData | null
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
              <UserSearch size={24} />
            </div>
            <div>
              <AlertDialogTitle className="text-foreground tracking-tight">
                Já existe alguém com esse nome na loja
              </AlertDialogTitle>
              <p className="mt-1 text-mx-tiny block font-medium text-muted-foreground">
                Cadastro ativo encontrado{data.targetStoreName ? ` em ${data.targetStoreName}` : ''}
              </p>
            </div>
          </div>

          <AlertDialogDescription className="rounded-2xl border border-status-warning/60 bg-status-warning-surface/60 p-mx-md text-foreground">
            <strong className="font-bold">{data.existingUser.name}</strong> ({data.existingUser.email}) já está
            ativo nesta loja. Se for a mesma pessoa, cadastrar de novo divide as vendas dela entre dois logins —
            ranking, meta e atingimento passam a mostrar só uma parte dos números. Continue apenas se for outra
            pessoa com nome parecido.
          </AlertDialogDescription>

          <div className="mt-mx-xl flex flex-col-reverse sm:flex-row gap-mx-sm sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Usar o cadastro existente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => data.onConfirm()}
              disabled={loading}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : null}
              É outra pessoa, cadastrar
            </Button>
          </div>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
