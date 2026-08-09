import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, History, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MONTHS } from './strategicUtils'
import { formatDateTime } from '@/features/owner/lib/ownerFormatters'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/features/owner/lib/ownerAuth'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function TargetHistoryPanel({ repository, indicatorId, year, onRestored }) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState([])
  const [confirmId, setConfirmId] = useState(null)

  const load = () => setHistory(repository.getTargetHistory(indicatorId, year) || [])
  useEffect(() => { if (open) load() }, [open, indicatorId, year, repository])

  const restore = async id => {
    try {
      await repository.restoreHistoryVersion(id, user)
      toast({ title: 'Versão restaurada com sucesso.' })
      setConfirmId(null)
      load()
      onRestored?.()
    } catch (error) {
      toast({ title: 'Não foi possível restaurar a versão.', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' })
      setConfirmId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Histórico de alterações</h4>
          {history.length > 0 ? <span className="text-xs text-muted-foreground">({history.length})</span> : null}
        </div>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          {history.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma alteração registrada para este indicador.</p> : (
            <div className="space-y-3">
              {history.map(entry => {
                const changedMonths = (entry.previousValues || []).map((value, index) => value !== entry.newValues?.[index] ? index : -1).filter(index => index >= 0)
                return (
                  <Fragment key={entry.id}>
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">{formatDateTime(entry.timestamp)}</p>
                          <p className="text-xs text-muted-foreground">Por: {entry.user || 'Sistema'}</p>
                          {changedMonths.length ? <p className="mt-1 text-xs text-muted-foreground">Meses alterados: {changedMonths.map(index => MONTHS[index]).join(', ')}</p> : null}
                          {entry.note ? <p className="mt-1 text-xs italic text-muted-foreground">{entry.note}</p> : null}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmId(entry.id)} className="text-xs">
                          <RotateCcw className="h-3 w-3" /> Restaurar
                        </Button>
                      </div>
                    </div>
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
      <AlertDialog open={confirmId !== null} onOpenChange={next => !next && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar versão?</AlertDialogTitle>
            <AlertDialogDescription>Os valores atuais serão substituídos e a restauração também ficará registrada no histórico.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && restore(confirmId)}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
