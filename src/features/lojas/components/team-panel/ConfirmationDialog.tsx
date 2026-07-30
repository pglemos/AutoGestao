import type { RefObject } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Typography } from '@/components/atoms/Typography'
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
    <AnimatePresence>
      {pendingConfirmation && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-mx-md" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-mx-black/60 backdrop-blur-md"
            onClick={() => onDismiss(pendingConfirmation.key)}
          />
          <motion.div
            ref={confirmDialogRef}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="team-confirm-title"
            aria-describedby="team-confirm-description"
            className="relative z-10 w-full max-w-md rounded-mx-3xl border border-border-default bg-white p-mx-xl shadow-mx-elite"
          >
            <Typography id="team-confirm-title" variant="h2" className="tracking-tight">
              {pendingConfirmation.title}
            </Typography>
            <Typography id="team-confirm-description" variant="caption" tone="muted" className="mt-mx-sm block font-bold leading-relaxed">
              {pendingConfirmation.description}
            </Typography>
            <div className="mt-mx-xl flex flex-col-reverse sm:flex-row gap-mx-sm sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onDismiss(pendingConfirmation.key)}
                className="h-mx-12 rounded-mx-xl font-black uppercase tracking-widest text-mx-nano"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  const action = pendingConfirmation.onConfirm
                  onDismiss(pendingConfirmation.key)
                  action()
                }}
                className="h-mx-12 rounded-mx-xl font-black uppercase tracking-widest text-mx-nano"
              >
                {pendingConfirmation.label}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
