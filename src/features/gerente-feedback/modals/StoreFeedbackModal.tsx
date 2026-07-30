import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  Award,
  Calendar,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  Send,
  Target,
  X,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { FeedbackFormData } from '@/types/database'
import {
  FEEDBACK_ACTIONS_CATALOG,
  applyFeedbackActionTemplate,
} from '../lib/feedback-action-catalog'

type SellerOption = { id: string; name: string }

type Props = {
  open: boolean
  onClose: () => void
  saving: boolean
  formData: FeedbackFormData
  setFormData: React.Dispatch<React.SetStateAction<FeedbackFormData>>
  sellers: SellerOption[]
  onSellerSelect: (sellerId: string) => void
  onWeekReferenceChange: (weekReference: string) => void
  onSubmit: () => void
}

export function StoreFeedbackModal({
  open,
  onClose,
  saving,
  formData,
  setFormData,
  sellers,
  onSellerSelect,
  onWeekReferenceChange,
  onSubmit,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, open)
  const selectedSellerName = sellers.find(s => s.id === formData.seller_id)?.name || 'Nome não informado'

  const handleFeedbackActionSelect = (actionId: string) => {
    const actionText = applyFeedbackActionTemplate(actionId, {
      sellerName: selectedSellerName,
      weekReference: formData.week_reference,
    })
    if (!actionText) return
    setFormData((f) => ({ ...f, action: actionText }))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[140] flex items-end justify-center p-mx-sm bg-gray-900/60 backdrop-blur-sm sm:items-center md:p-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-store-title"
        >
          <Card className="flex max-h-full w-full max-w-[var(--container-mx-4xl)] flex-col overflow-hidden border-none bg-white shadow-mx-2xl">
            <header className="p-mx-lg md:p-10 border-b border-gray-200 flex items-center justify-between sticky top-mx-0 bg-white z-10">
              <div className="flex items-center gap-mx-sm">
                <div className="w-mx-xl h-mx-xl rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <Typography
                    id="feedback-store-title"
                    variant="h2"
                    className="tracking-tighter"
                  >
                    Nova Mentoria
                  </Typography>
                  <Typography
                    variant="tiny"
                    tone="muted"
                    className=""
                  >
                    Ciclo de Devolutiva Semanal
                  </Typography>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-mx-full w-mx-xl h-mx-xl"
              >
                <X size={24} />
              </Button>
            </header>
            <div className="overflow-y-auto p-mx-lg md:p-10 space-y-mx-xl">
              <div className="grid md:grid-cols-2 gap-mx-lg">
                <div className="space-y-mx-xs">
                  <label
                    htmlFor="feedback-seller"
                    className="ml-2 text-mx-tiny uppercase font-bold tracking-widest text-gray-500"
                  >
                    Especialista
                  </label>
                  <div className="relative">
                    <select
                      id="feedback-seller"
                      name="seller_id"
                      value={formData.seller_id}
                      onChange={(e) => onSellerSelect(e.target.value)}
                      className="w-full h-mx-14 px-6 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase shadow-none appearance-none cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={18}
                      className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                    />
                  </div>
                </div>
                <div className="space-y-mx-xs">
                  <label
                    htmlFor="feedback-week-reference"
                    className="ml-2 text-mx-tiny uppercase font-bold tracking-widest text-gray-500"
                  >
                    Semana
                  </label>
                  <div className="relative">
                    <Calendar
                      size={18}
                      className="absolute left-mx-sm top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
                    />
                    <input
                      id="feedback-week-reference"
                      name="week_reference"
                      type="date"
                      value={formData.week_reference}
                      onChange={(e) => onWeekReferenceChange(e.target.value)}
                      className="w-full h-mx-14 pl-12 pr-6 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-emerald-600 shadow-none"
                    />
                  </div>
                </div>
              </div>
              {formData.seller_id && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-mx-xl"
                >
                  <div className="p-mx-lg bg-gray-50 rounded-2xl border border-gray-200 space-y-mx-lg shadow-none">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-mx-md">
                      {[
                        { label: 'Leads', val: formData.leads_week },
                        { label: 'Agend.', val: formData.agd_week },
                        { label: 'Visitas', val: formData.visit_week },
                        { label: 'Vendas', val: formData.vnd_week },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-white p-mx-5 rounded-2xl border border-gray-200 shadow-sm text-center"
                        >
                          <Typography
                            variant="tiny"
                            tone="muted"
                            className="mb-1 block text-mx-micro"
                          >
                            {item.label}
                          </Typography>
                          <Typography
                            variant="h2"
                            className="text-xl font-mono-numbers"
                          >
                            {item.val}
                          </Typography>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-mx-sm">
                    <label
                      htmlFor="feedback-caso-motivo"
                      className="text-mx-tiny font-bold uppercase tracking-widest text-emerald-600 ml-2 flex items-center gap-mx-xs"
                    >
                      <AlertCircle size={14} /> Caso/Motivo
                    </label>
                    <textarea
                      id="feedback-caso-motivo"
                      name="caso_motivo"
                      value={formData.caso_motivo || ''}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, caso_motivo: e.target.value }))
                      }
                      className="w-full h-mx-3xl p-mx-md bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-brand-primary transition-all shadow-sm outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
                    <div className="space-y-mx-sm">
                      <label
                        htmlFor="feedback-positives"
                        className="text-mx-tiny font-bold uppercase tracking-widest text-status-success ml-2 flex items-center gap-mx-xs"
                      >
                        <Award size={14} /> Pontos Fortes
                      </label>
                      <textarea
                        id="feedback-positives"
                        name="positives"
                        value={formData.positives}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, positives: e.target.value }))
                        }
                        className="w-full h-mx-4xl p-mx-md bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-status-success transition-all shadow-sm outline-none resize-none"
                      />
                    </div>
                    <div className="space-y-mx-sm">
                      <label
                        htmlFor="feedback-attention"
                        className="text-mx-tiny font-bold uppercase tracking-widest text-status-error ml-2 flex items-center gap-mx-xs"
                      >
                        <AlertCircle size={14} /> Pontos de Atenção
                      </label>
                      <textarea
                        id="feedback-attention"
                        name="attention_points"
                        value={formData.attention_points}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, attention_points: e.target.value }))
                        }
                        className="w-full h-mx-4xl p-mx-md bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:border-status-error transition-all shadow-sm outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-mx-sm">
                    <label
                      htmlFor="feedback-action"
                      className="text-mx-tiny font-bold uppercase tracking-widest text-emerald-600 ml-2 flex items-center gap-mx-xs"
                    >
                      <Target size={16} /> Ação
                    </label>
                    <div className="space-y-mx-xs">
                      <label
                        htmlFor="feedback-store-action-template"
                        className="ml-2 text-mx-tiny uppercase font-bold tracking-widest text-gray-500"
                      >
                        Ação padronizada
                      </label>
                      <div className="relative">
                        <select
                          id="feedback-store-action-template"
                          value=""
                          onChange={(e) => handleFeedbackActionSelect(e.target.value)}
                          className="w-full h-mx-14 px-6 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase shadow-none appearance-none cursor-pointer"
                        >
                          <option value="">Selecionar ação...</option>
                          {FEEDBACK_ACTIONS_CATALOG.map((action) => (
                            <option key={action.id} value={action.id}>
                              {action.title}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={18}
                          className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                        />
                      </div>
                    </div>
                    <textarea
                      id="feedback-action"
                      name="action"
                      value={formData.action}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, action: e.target.value }))
                      }
                      className="w-full h-mx-3xl p-mx-md bg-white border-2 border-brand-primary/20 rounded-2xl text-base font-bold focus:border-brand-primary transition-all shadow-sm outline-none resize-none"
                    />
                  </div>
                  <label className="flex items-start gap-mx-xs text-xs text-gray-500">
                    <input
                      aria-label="Enviar este feedback ao vendedor"
                      type="checkbox"
                      checked={formData.visible_to_seller !== false}
                      onChange={(e) => setFormData((f) => ({ ...f, visible_to_seller: e.target.checked }))}
                      className="mt-0.5 rounded border-gray-200 text-emerald-600 focus:ring-brand-primary"
                    />
                    <span>
                      <span className="font-semibold text-gray-800">Enviar este feedback ao vendedor</span>
                      <span className="block text-[11px] text-gray-500">Desmarque para manter a observação somente com a liderança.</span>
                    </span>
                  </label>
                </motion.div>
              )}
            </div>
            <footer className="p-mx-lg md:p-10 border-t border-gray-200 sticky bottom-mx-0 bg-white z-10 flex flex-col gap-mx-sm sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-mx-14 w-full px-8 rounded-mx-full sm:w-auto"
              >
                CANCELAR
              </Button>
              <Button
                onClick={onSubmit}
                disabled={
                  saving ||
                  !formData.seller_id ||
                  !formData.caso_motivo?.trim() ||
                  !formData.positives.trim() ||
                  !formData.attention_points.trim() ||
                  !formData.action.trim()
                }
                className="h-mx-14 w-full px-12 rounded-mx-full sm:w-auto"
              >
                {saving ? (
                  <RefreshCw className="animate-spin mr-2" />
                ) : (
                  <Send size={18} className="mr-2" />
                )}{' '}
                REGISTRAR
              </Button>
            </footer>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default StoreFeedbackModal
