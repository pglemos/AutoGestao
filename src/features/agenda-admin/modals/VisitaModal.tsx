import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, Sparkles } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Modal } from '@/components/organisms/Modal'
import { Select } from '@/components/atoms/Select'
import { DatePicker } from '@/components/atoms/DatePicker'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { AgendaClient, AgendaConsultant } from '@/hooks/agenda'

export type ScheduleForm = {
  client_id: string
  visit_number: string
  status: string
  scheduled_at: string
  scheduled_time: string
  duration_hours: string
  modality: string
  consultant_id: string
  auxiliary_consultant_id: string
  visit_reason: string
  target_audience: string
  product_name: string
  objective: string
  fora_do_contrato: boolean
}

type PresenceBalance = {
  contratadas: number | null
  minimas: number | null
  usadas: number
  disponiveis: number | null
}

interface VisitaModalProps {
  open: boolean
  onClose: () => void
  editingVisitId: string | null
  scheduleForm: ScheduleForm
  setScheduleForm: React.Dispatch<React.SetStateAction<ScheduleForm>>
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
  clients: AgendaClient[]
  consultants: AgendaConsultant[]
  visitReasonSelectOptions: string[]
  targetAudienceSelectOptions: string[]
  productSelectOptions: string[]
  getNextVisitNumber: (clientId: string) => number
  getVisitLabel: (clientId: string, visitNumber: number) => string
}

export function getSelectableAgendaClients(clients: AgendaClient[]) {
  return clients
}

export function VisitaModal({
  open, onClose, editingVisitId,
  scheduleForm, setScheduleForm,
  submitting, onSubmit,
  clients, consultants,
  visitReasonSelectOptions, targetAudienceSelectOptions, productSelectOptions,
  getNextVisitNumber, getVisitLabel,
}: VisitaModalProps) {
  const [presenceBalance, setPresenceBalance] = useState<PresenceBalance | null>(null)

  // Consulta saldo presencial do cliente selecionado
  useEffect(() => {
    if (!open || !scheduleForm.client_id) {
      setPresenceBalance(null)
      return
    }

    let cancelled = false
    supabase
      .rpc('saldo_presencial_cliente', {
        p_client_id: scheduleForm.client_id,
        p_exclude_visit_id: editingVisitId,
      })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data || !Array.isArray(data) || data.length === 0) {
          setPresenceBalance(null)
        } else {
          setPresenceBalance(data[0] as PresenceBalance)
        }
      })

    return () => {
      cancelled = true
    }
  }, [editingVisitId, open, scheduleForm.client_id])

  const handleSelectClient = (clientId: string) => {
    const selectedClient = clients.find((c) => c.id === clientId)
    setScheduleForm((prev) => ({
      ...prev,
      client_id: clientId,
      product_name: selectedClient?.product_name || '',
      modality: selectedClient?.modality || 'Presencial',
    }))
  }

  const selectedClientVisitNum = useMemo(() => {
    if (!scheduleForm.client_id) return null
    if (editingVisitId) return Number(scheduleForm.visit_number) || null
    return getNextVisitNumber(scheduleForm.client_id)
  }, [editingVisitId, scheduleForm.client_id, scheduleForm.visit_number, getNextVisitNumber])

  const isPresencialExhausted = useMemo(() => {
    if (!presenceBalance || presenceBalance.disponiveis === null) return false
    return presenceBalance.disponiveis <= 0
  }, [presenceBalance])

  const isPresencialSelected = scheduleForm.modality?.toLowerCase() === 'presencial'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingVisitId ? 'Editar Visita de Consultoria' : 'Agendar Visita de Consultoria'}
      description="Vincule a um cliente do CRM de consultoria"
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>CANCELAR</Button>
          <Button type="submit" form="agenda-schedule-form" disabled={submitting || !scheduleForm.client_id} className="">
            {submitting ? 'SALVANDO...' : editingVisitId ? 'SALVAR ALTERAÇÕES' : 'CONFIRMAR AGENDAMENTO'}
          </Button>
        </>
      }
    >
      <form id="agenda-schedule-form" onSubmit={onSubmit} className="space-y-mx-lg">
        {/* Seleção do Cliente */}
        <div className="space-y-mx-xs">
          <Select
            id="agenda-client"
            label="Cliente da Consultoria *"
            value={scheduleForm.client_id}
            onChange={(e) => handleSelectClient(e.target.value)}
          >
            <option value="">Selecionar cliente...</option>
            {getSelectableAgendaClients(clients).map((c) => (
              <option key={c.id} value={c.id}>{c.name} (Etapa atual: {c.current_visit_step || 0})</option>
            ))}
          </Select>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {selectedClientVisitNum ? (
              <Typography variant="tiny" tone="muted" className="flex items-center gap-1">
                <Calendar size={14} className="text-brand-primary shrink-0" />
                Será <strong className="text-foreground">{getVisitLabel(scheduleForm.client_id, selectedClientVisitNum).toLowerCase()}</strong> deste cliente
              </Typography>
            ) : <span />}

            {presenceBalance && presenceBalance.contratadas !== null && (
              <div className="flex items-center gap-2">
                <span className="text-caption text-muted-foreground">
                  Presenciais do pacote: <strong className="text-foreground">{presenceBalance.usadas}/{presenceBalance.contratadas}</strong>
                </span>
                <span className={cn(
                  "font-medium px-2 py-0.5 rounded-full text-mx-tiny",
                  presenceBalance.disponiveis !== null && presenceBalance.disponiveis > 0
                    ? "bg-status-success-bg text-status-success-text"
                    : "bg-status-error-bg text-status-error-text"
                )}>
                  {presenceBalance.disponiveis !== null && presenceBalance.disponiveis > 0
                    ? `${presenceBalance.disponiveis} disponível(is)`
                    : 'Saldo esgotado'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alerta de Saldo Esgotado quando Presencial selecionado */}
        {isPresencialSelected && isPresencialExhausted && !scheduleForm.fora_do_contrato && (
          <div className="p-mx-sm rounded-xl border border-status-error/30 bg-status-error-bg/60 text-status-error-text space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              <AlertCircle size={14} className="shrink-0 text-status-error-text" />
              <span>Saldo presencial contratual esgotado ({presenceBalance?.usadas}/{presenceBalance?.contratadas})</span>
            </div>
            <p className="text-xs opacity-90">
              O produto contratado permite {presenceBalance?.contratadas} encontro(s) presencial(is) e já há {presenceBalance?.usadas} marcado(s).
              Para agendar esta visita presencial como adicional, ative a opção <strong>"Encontro adicional (fora do contrato)"</strong> abaixo ou altere a modalidade para <strong>Online</strong>.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7 bg-white text-foreground"
                onClick={() => setScheduleForm((prev) => ({ ...prev, fora_do_contrato: true }))}
              >
                <Sparkles size={14} className="mr-1 text-brand-primary" /> Marcar como Adicional
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-foreground"
                onClick={() => setScheduleForm((prev) => ({ ...prev, modality: 'Online' }))}
              >
                Mudar para Online
              </Button>
            </div>
          </div>
        )}

        {/* Opção de Encontro Adicional (Fora do Contrato) */}
        <div className={cn(
          "rounded-xl border p-mx-sm transition-colors",
          scheduleForm.fora_do_contrato
            ? "border-brand-primary/40 bg-brand-primary/5"
            : "border-border bg-surface-alt/40"
        )}>
          <label className="flex items-start gap-mx-sm cursor-pointer select-none">
            <input
              type="checkbox"
              id="agenda-fora-do-contrato"
              className="mt-0.5 h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary/20"
              checked={scheduleForm.fora_do_contrato}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, fora_do_contrato: e.target.checked }))}
            />
            <div className="space-y-0.5 min-w-0">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                Encontro adicional (fora do contrato)
                {scheduleForm.fora_do_contrato && (
                  <span className="text-mx-tiny font-semibold px-1.5 py-0.2 rounded bg-brand-primary/20 text-brand-primary">
                    EXTRA
                  </span>
                )}
              </span>
              <p className="text-xs text-muted-foreground">
                Marque caso este encontro seja um acompanhamento extra, cortesia ou repactuação além do pacote contratado.
              </p>
            </div>
          </label>
        </div>

        {editingVisitId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="agenda-visit-number" variant="caption" className="">Número da visita</Typography>
              <Input
                id="agenda-visit-number"
                type="number"
                min="1"
                value={scheduleForm.visit_number}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, visit_number: e.target.value }))}
              />
            </div>
            <Select
              id="agenda-visit-status"
              label="Status"
              value={scheduleForm.status}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="agendada">Agendada</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-date" variant="caption" className="">Data *</Typography>
            <DatePicker
              id="agenda-date"
              value={scheduleForm.scheduled_at}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
            />
          </div>
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-time" variant="caption" className="">Horário *</Typography>
            <Input
              id="agenda-time"
              type="time"
              value={scheduleForm.scheduled_time}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduled_time: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <div className="space-y-mx-xs">
            <Typography as="label" htmlFor="agenda-duration" variant="caption" className="">Duração (horas)</Typography>
            <Input
              id="agenda-duration"
              type="number"
              min="1"
              max="12"
              value={scheduleForm.duration_hours}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, duration_hours: e.target.value }))}
            />
          </div>
          <Select
            id="agenda-modality"
            label="Modalidade"
            value={scheduleForm.modality}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, modality: e.target.value }))}
          >
            <option value="Presencial">Presencial</option>
            <option value="Online">Online</option>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="agenda-consultant"
            label="Consultor Responsável"
            value={scheduleForm.consultant_id}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, consultant_id: e.target.value }))}
          >
            <option value="">Sem consultor...</option>
            {consultants.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select
            id="agenda-aux"
            label="Consultor Auxiliar"
            value={scheduleForm.auxiliary_consultant_id}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, auxiliary_consultant_id: e.target.value }))}
          >
            <option value="">Sem auxiliar...</option>
            {consultants.filter((c) => c.id !== scheduleForm.consultant_id).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-mx-xs">
          <Select
            id="agenda-visit-reason"
            label="Motivo da visita"
            value={scheduleForm.visit_reason}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, visit_reason: e.target.value }))}
          >
            <option value="">Selecionar motivo...</option>
            {visitReasonSelectOptions.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
          <Select
            id="agenda-target-audience"
            label="Alvo"
            value={scheduleForm.target_audience}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, target_audience: e.target.value }))}
          >
            <option value="">Selecionar alvo...</option>
            {targetAudienceSelectOptions.map((target) => (
              <option key={target} value={target}>{target}</option>
            ))}
          </Select>
          <Select
            id="agenda-product-name"
            label="Produto"
            value={scheduleForm.product_name}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, product_name: e.target.value }))}
          >
            <option value="">Selecionar produto...</option>
            {productSelectOptions.map((product) => (
              <option key={product} value={product}>{product}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-mx-xs">
          <Typography as="label" htmlFor="agenda-objective" variant="caption" className="">Objetivo da Visita</Typography>
          <Textarea
            id="agenda-objective"
            value={scheduleForm.objective}
            onChange={(e) => setScheduleForm((prev) => ({ ...prev, objective: e.target.value }))}
            placeholder="Descreva o objetivo principal desta visita..."
            className="min-h-mx-24"
          />
        </div>
      </form>
    </Modal>
  )
}
