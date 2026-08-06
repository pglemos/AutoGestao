import type { RefObject } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRightLeft, Building2, UserCheck, RefreshCw } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
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
  if (!isOpen || !data) return null

  const { existingUser, targetStoreName, onConfirm } = data

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-mx-md" role="presentation">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/70 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="transfer-confirm-title"
          aria-describedby="transfer-confirm-description"
          className="relative z-10 w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-mx-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-mx-md mb-mx-md">
            <div className="w-mx-14 h-mx-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <Typography id="transfer-confirm-title" variant="h3" className="text-gray-900 font-bold text-lg tracking-tight">
                Transferir integrante de loja?
              </Typography>
              <Typography variant="caption" tone="muted" className="text-mx-nano block font-medium">
                Vínculo ativo identificado em outra unidade
              </Typography>
            </div>
          </div>

          <div id="transfer-confirm-description" className="space-y-mx-md bg-amber-50/60 rounded-2xl p-mx-md border border-amber-200/60">
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              O e-mail <strong className="text-gray-900 font-bold">{existingUser.email}</strong> já pertence ao integrante{' '}
              <strong className="text-gray-900 font-bold">{existingUser.name}</strong>, que está ativamente vinculado à loja{' '}
              <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-md">
                <Building2 size={12} /> {existingUser.current_store_name}
              </span>.
            </p>

            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 pt-2 border-t border-amber-200/40">
              <UserCheck size={14} className="text-emerald-600 shrink-0" />
              <span>
                Deseja encerrar o vínculo na loja <strong>{existingUser.current_store_name}</strong> e transferi-lo{targetStoreName ? ` para a loja ${targetStoreName}` : ' para a nova unidade'}?
              </span>
            </div>
          </div>

          <div className="mt-mx-xl flex flex-col-reverse sm:flex-row gap-mx-sm sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-mx-12 rounded-2xl font-bold uppercase tracking-widest text-mx-nano"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void onConfirm()}
              disabled={loading}
              className="h-mx-12 rounded-2xl font-bold uppercase tracking-widest text-mx-nano bg-amber-600 hover:bg-amber-700 text-white shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin size-4" /> : <ArrowRightLeft size={16} />}
              Confirmar Transferência
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
