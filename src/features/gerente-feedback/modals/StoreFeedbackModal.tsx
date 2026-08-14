import { motion } from 'motion/react'
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
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
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
  const selectedSellerName = sellers.find(s => s.id === formData.seller_id)?.name || 'Nome não informado'

  const handleFeedbackActionSelect = (actionId: string) => {
    const actionText = applyFeedbackActionTemplate(actionId, {
      sellerName: selectedSellerName,
      weekReference: formData.week_reference,
    })
    if (!actionText) return
    setFormData((f) => ({ ...f, action: actionText }))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        showClose={false}
        className="bottom-0 top-auto w-full max-w-[var(--container-mx-4xl)] translate-y-0 gap-0 p-0 sm:bottom-auto sm:top-1/2 sm:translate-y-[-50%]"
      >
        <header className="flex items-center justify-between gap-mx-md border-b border-border bg-white p-mx-lg md:p-10">
          <div className="flex items-center gap-mx-sm">
            <div className="flex h-mx-xl w-mx-xl items-center justify-center rounded-2xl bg-brand-primary text-white shadow-sm">
              <MessageSquare size={24} />
            </div>
            <div>
              <DialogTitle className="text-h2 tracking-tighter">
                Nova Mentoria
              </DialogTitle>
              <DialogDescription className="text-mx-tiny text-muted-foreground">
                Ciclo de Devolutiva Semanal
              </DialogDescription>
            </div>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fechar diálogo"
              className="h-mx-xl w-mx-xl rounded-mx-full"
            >
              <X size={24} />
            </Button>
          </DialogClose>
        </header>

        <DialogBody className="space-y-mx-xl p-mx-lg md:p-10">
          <div className="grid md:grid-cols-2 gap-mx-lg">
            <div className="space-y-mx-xs">
              <label
                htmlFor="feedback-seller"
                className="ml-2 text-mx-tiny uppercase font-bold tracking-widest text-muted-foreground"
              >
                Especialista
              </label>
              <div className="relative">
                <select
                  id="feedback-seller"
                  name="seller_id"
                  value={formData.seller_id}
                  onChange={(e) => onSellerSelect(e.target.value)}
                  className="w-full h-mx-14 px-6 bg-surface-alt border border-border rounded-xl text-sm font-bold uppercase shadow-none appearance-none cursor-pointer"
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
                  className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                />
              </div>
            </div>
            <div className="space-y-mx-xs">
              <label
                htmlFor="feedback-week-reference"
                className="ml-2 text-mx-tiny uppercase font-bold tracking-widest text-muted-foreground"
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
                  className="w-full h-mx-14 pl-12 pr-6 bg-surface-alt border border-border rounded-xl text-sm font-bold text-status-success-text shadow-none"
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
              <div className="p-mx-lg bg-surface-alt rounded-2xl border border-border space-y-mx-lg shadow-none">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-mx-md">
                  {[
                    { label: 'Leads', val: formData.leads_week },
                    { label: 'Agend.', val: formData.agd_week },
                    { label: 'Visitas', val: formData.visit_week },
                    { label: 'Vendas', val: formData.vnd_week },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white p-mx-5 rounded-2xl border border-border shadow-sm text-center"
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
                  className="text-mx-tiny font-bold uppercase tracking-widest text-status-success-text ml-2 flex items-center gap-mx-xs"
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
                  className="w-full h-mx-3xl p-mx-md bg-white border border-border rounded-2xl text-sm font-bold focus:border-brand-primary transition-all shadow-sm outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-mx-lg">
                <div className="space-y-mx-sm">
                  <label
                    htmlFor="feedback-positives"
                    className="text-mx-tiny font-bold uppercase tracking-widest text-status-success-text ml-2 flex items-center gap-mx-xs"
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
                    className="w-full h-mx-4xl p-mx-md bg-white border border-border rounded-2xl text-sm font-bold focus:border-status-success transition-all shadow-sm outline-none resize-none"
                  />
                </div>
                <div className="space-y-mx-sm">
                  <label
                    htmlFor="feedback-attention"
                    className="text-mx-tiny font-bold uppercase tracking-widest text-status-error-text ml-2 flex items-center gap-mx-xs"
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
                    className="w-full h-mx-4xl p-mx-md bg-white border border-border rounded-2xl text-sm font-bold focus:border-status-error transition-all shadow-sm outline-none resize-none"
                  />
                </div>
              </div>
              <div className="space-y-mx-sm">
                <label
                  htmlFor="feedback-action"
                  className="text-mx-tiny font-bold uppercase tracking-widest text-status-success-text ml-2 flex items-center gap-mx-xs"
                >
                  <Target size={16} /> Ação
                </label>
                <div className="space-y-mx-xs">
                  <label
                    htmlFor="feedback-store-action-template"
                    className="ml-2 text-mx-tiny uppercase font-bold tracking-widest text-muted-foreground"
                  >
                    Ação padronizada
                  </label>
                  <div className="relative">
                    <select
                      id="feedback-store-action-template"
                      value=""
                      onChange={(e) => handleFeedbackActionSelect(e.target.value)}
                      className="w-full h-mx-14 px-6 bg-surface-alt border border-border rounded-xl text-sm font-bold uppercase shadow-none appearance-none cursor-pointer"
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
                      className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
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
              <label className="flex items-start gap-mx-xs text-xs text-muted-foreground">
                <input
                  aria-label="Enviar este feedback ao vendedor"
                  type="checkbox"
                  checked={formData.visible_to_seller !== false}
                  onChange={(e) => setFormData((f) => ({ ...f, visible_to_seller: e.target.checked }))}
                  className="mt-0.5 rounded border-border text-status-success-text focus:ring-brand-primary"
                />
                <span>
                  <span className="font-semibold text-foreground">Enviar este feedback ao vendedor</span>
                  <span className="block text-caption text-muted-foreground">Desmarque para manter a observação somente com a liderança.</span>
                </span>
              </label>
            </motion.div>
          )}
        </DialogBody>

        <footer className="flex flex-col gap-mx-sm border-t border-border bg-white p-mx-lg md:p-10 sm:flex-row sm:justify-end">
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
      </DialogContent>
    </Dialog>
  )
}

export default StoreFeedbackModal
