/**
 * GuidedStatusUpdate.tsx — Atualização Guiada de Situação (TASK 24).
 *
 * Substitui o dropdown direto de 86 status por um fluxo em 2 níveis determinístico:
 *  1. Seleção da intenção / situação comercial (8 opções de primeiro nível).
 *  2. Escolha do status específico compatível do catálogo.
 *  3. Prévia completa (Status, Objetivo, Próximo Passo, Responsável, Cadência e Script).
 *  4. Validação estrita de campos obrigatórios antes de habilitar o salvamento.
 *
 * Identidade visual: Cabeçalho azul-marinho, azul principal, cards brancos,
 * tipografia Inter e fundo claro.
 */

import React, { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MessageSquare,
  Search,
  Calendar,
  Handshake,
  Car,
  CreditCard,
  CheckCircle2,
  Users,
  ArrowLeft,
  Check,
  AlertCircle,
  FileText,
  User,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

import type { StatusDefinition } from '../engine/engine'
import {
  getCompatibleStatuses,
  getGuidedOptions,
  GUIDED_STATUS_OPTIONS,
  type GuidedStatusOptionText,
} from './guidedStatusOptions'

import defaultStatusesCatalog from '../../../../rules/mentor-comercial/v1/statuses.json'

export type GuidedStatusUpdateProps = {
  /** Se informado, o modal é controlado por este estado */
  isOpen?: boolean
  /** Callback para fechar o modal */
  onClose?: () => void
  /** Catálogo de status da aplicação. Se não fornecido, usa o catálogo padrão v1 */
  catalogStatuses?: StatusDefinition[]
  /** Canal da oportunidade para filtragem (Internet, Porta, Carteira, Compartilhado) */
  channel?: string | null
  /** Status atual da oportunidade */
  currentStatusCode?: string | null
  /** Flags pendentes da oportunidade para priorização */
  pendingFlags?: string[] | null
  /** ID da oportunidade para referência */
  opportunityId?: string
  /** Callback executado ao confirmar a alteração do status */
  onConfirm?: (
    selectedStatus: StatusDefinition,
    extraData?: { notes?: string },
  ) => void | Promise<void>
  /** Texto do botão de acionamento quando usado de forma autônoma (padrão: "Atualizar situação") */
  triggerButtonText?: string
  /** Desabilita interações durante envio */
  isSubmitting?: boolean
  /** Renderiza o formulário diretamente sem o wrapper Dialog */
  standalone?: boolean
  /** Classe CSS customizada para o contêiner */
  className?: string
}

const OPTION_ICONS: Record<GuidedStatusOptionText, React.ElementType> = {
  'Ainda não consegui falar com o cliente': MessageSquare,
  'Estou entendendo o que ele procura': Search,
  'Preciso gerar ou confirmar uma visita': Calendar,
  'O cliente visitou e estamos negociando': Handshake,
  'Existe uma pendência do carro da troca': Car,
  'Existe uma pendência de financiamento': CreditCard,
  'A venda foi concluída ou perdida': CheckCircle2,
  'É uma ação de relacionamento': Users,
}

export const GuidedStatusUpdate: React.FC<GuidedStatusUpdateProps> = ({
  isOpen: externalIsOpen,
  onClose,
  catalogStatuses,
  channel,
  currentStatusCode,
  pendingFlags,
  onConfirm,
  triggerButtonText = 'Atualizar situação',
  isSubmitting = false,
  standalone = false,
  className = '',
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isControlled = externalIsOpen !== undefined
  const isOpen = isControlled ? externalIsOpen : internalIsOpen

  const [selectedOption, setSelectedOption] = useState<GuidedStatusOptionText | null>(null)
  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(null)
  const [notes, setNotes] = useState<string>('')
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false)

  // Usar catálogo fornecido em props ou o catálogo v1 padrão
  const catalog: StatusDefinition[] = useMemo(() => {
    if (catalogStatuses && catalogStatuses.length > 0) {
      return catalogStatuses
    }
    return defaultStatusesCatalog.records as StatusDefinition[]
  }, [catalogStatuses])

  const guidedOptions = useMemo(() => {
    return getGuidedOptions(catalog, channel, currentStatusCode, pendingFlags)
  }, [catalog, channel, currentStatusCode, pendingFlags])

  const compatibleStatuses = useMemo(() => {
    if (!selectedOption) return []
    return getCompatibleStatuses({
      catalogStatuses: catalog,
      optionText: selectedOption,
      channel,
      currentStatusCode,
      pendingFlags,
    })
  }, [catalog, selectedOption, channel, currentStatusCode, pendingFlags])

  const selectedStatus = useMemo(() => {
    if (!selectedStatusId) return undefined
    return catalog.find((s) => s.statusId === selectedStatusId)
  }, [catalog, selectedStatusId])

  // Validação dos campos obrigatórios
  const isFormValid = useMemo(() => {
    return selectedOption !== null && selectedStatusId !== null && selectedStatus !== undefined
  }, [selectedOption, selectedStatusId, selectedStatus])

  const handleClose = () => {
    setSelectedOption(null)
    setSelectedStatusId(null)
    setNotes('')
    if (onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }

  const handleConfirm = async () => {
    if (!isFormValid || !selectedStatus) return
    try {
      setIsSubmittingLocal(true)
      if (onConfirm) {
        await onConfirm(selectedStatus, { notes: notes.trim() || undefined })
      }
      handleClose()
    } finally {
      setIsSubmittingLocal(false)
    }
  }

  const renderFormContent = () => (
    <div className={`space-y-6 ${className}`}>
      {/* Indicador de Passos / Fluxo */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              selectedOption ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            1
          </div>
          <span className={`text-sm font-medium ${selectedOption ? 'text-muted-foreground' : 'text-foreground'}`}>
            Intenção Comercial
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              selectedOption ? 'bg-slate-900 text-white' : 'bg-slate-100 text-muted-foreground'
            }`}
          >
            2
          </div>
          <span className={`text-sm font-medium ${selectedOption ? 'text-foreground' : 'text-muted-foreground'}`}>
            Status Específico
          </span>
        </div>

        {selectedOption && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedOption(null)
              setSelectedStatusId(null)
            }}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Alterar opção
          </Button>
        )}
      </div>

      {/* Passo 1: Seleção de primeiro nível (8 opções guiadas) */}
      {!selectedOption ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">
            Selecione qual é a situação atual do atendimento:
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {guidedOptions.map((opt) => {
              const IconComp = OPTION_ICONS[opt.optionText] || MessageSquare
              return (
                <button
                  key={opt.optionText}
                  type="button"
                  onClick={() => {
                    setSelectedOption(opt.optionText)
                    // Se houver apenas 1 status compatível, seleciona-o automaticamente
                    if (opt.compatibleStatuses.length === 1) {
                      setSelectedStatusId(opt.compatibleStatuses[0].statusId)
                    } else {
                      setSelectedStatusId(null)
                    }
                  }}
                  className={`group relative flex items-start space-x-3 rounded-lg border p-3.5 text-left transition-all hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-sm ${
                    opt.isRecommended
                      ? 'border-blue-300 bg-blue-50/30'
                      : 'border-border bg-white'
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-foreground transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <IconComp className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground group-hover:text-blue-900">
                        {opt.optionText}
                      </span>
                      {opt.isRecommended && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-caption ml-1">
                          Recomendado
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {opt.compatibleCount} status compatíve{opt.compatibleCount > 1 ? 'is' : 'l'}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        /* Passo 2: Seleção do status específico compatível */
        <div className="space-y-4">
          <div className="rounded-md bg-slate-100 p-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Opção selecionada
              </span>
              <p className="text-sm font-bold text-foreground">{selectedOption}</p>
            </div>
            <Badge variant="outline" className="bg-white text-foreground border-border-strong">
              {compatibleStatuses.length} status disponível{compatibleStatuses.length > 1 ? 'is' : ''}
            </Badge>
          </div>

          <div className="space-y-2">
            <span
              id="mentor-status-especifico-label"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Selecione o status específico: <span className="text-red-500">*</span>
            </span>

            <div
              role="radiogroup"
              aria-labelledby="mentor-status-especifico-label"
              aria-required="true"
              className="max-h-60 overflow-y-auto space-y-2 pr-1"
            >
              {compatibleStatuses.map((st) => {
                const isSelected = selectedStatusId === st.statusId
                const isCurrent = currentStatusCode === st.statusId
                return (
                  <div
                    key={st.statusId}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={isSelected || !selectedStatusId ? 0 : -1}
                    onClick={() => setSelectedStatusId(st.statusId)}
                    onKeyDown={(event) => {
                      // Espaço e Enter selecionam, igual a um radio nativo.
                      if (event.key === ' ' || event.key === 'Enter') {
                        event.preventDefault()
                        setSelectedStatusId(st.statusId)
                      }
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 shadow-sm'
                        : 'border-border bg-white hover:border-border-strong hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-border-strong bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <Badge className="bg-slate-900 text-white font-mono text-caption">
                          {st.statusId}
                        </Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {st.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {isCurrent && (
                          <Badge variant="outline" className="bg-slate-100 text-muted-foreground text-caption">
                            Atual
                          </Badge>
                        )}
                        {st.temperature && (
                          <Badge
                            variant="secondary"
                            className={`text-caption ${
                              st.temperature.toLowerCase().includes('quente')
                                ? 'bg-red-100 text-red-800'
                                : st.temperature.toLowerCase().includes('morno')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-foreground'
                            }`}
                          >
                            {st.temperature}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {st.definition && (
                      <p className="mt-1.5 ml-6 text-xs text-muted-foreground leading-relaxed">
                        {st.definition}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* PRÉVIA DETERMINÍSTICA DO NOVO ESTADO */}
      {selectedStatus && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3">
          <div className="flex items-center space-x-2 border-b border-blue-200/60 pb-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Prévia da Atualização Determinística
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded border border-blue-100">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-blue-600" /> Status Resultante
              </span>
              <p className="font-bold text-foreground mt-1">
                {selectedStatus.statusId} — {selectedStatus.label}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded border border-blue-100">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Target className="h-3.5 w-3.5 text-blue-600" /> Objetivo Comercial
              </span>
              <p className="font-semibold text-foreground mt-1">{selectedStatus.objective}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-blue-100">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Próximo Passo
              </span>
              <p className="font-semibold text-foreground mt-1">{selectedStatus.nextStep}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-blue-100">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-blue-600" /> Responsável
              </span>
              <p className="font-semibold text-foreground mt-1">{selectedStatus.responsible}</p>
            </div>

            <div className="bg-white p-2.5 rounded border border-blue-100">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-600" /> Cadência
              </span>
              <p className="font-semibold text-foreground mt-1">
                {selectedStatus.cadenceId ?? 'Sem cadência'}
              </p>
            </div>

            <div className="bg-white p-2.5 rounded border border-blue-100">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5 text-blue-600" /> Script
              </span>
              <p className="font-semibold text-foreground mt-1">
                {selectedStatus.scriptId ?? 'Sem script'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label
              htmlFor="mentor-observacoes-adicionais"
              className="text-xs font-semibold text-foreground mb-1 block"
            >
              Observações adicionais (opcional):
            </label>
            <textarea
              id="mentor-observacoes-adicionais"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Cliente solicitou retorno no final da tarde..."
              className="w-full rounded-md border border-border-strong p-2 text-xs focus:border-blue-500 focus:outline-none bg-white"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Validação e Ações do Rodapé */}
      <div className="flex items-center justify-between border-t pt-4">
        {!isFormValid ? (
          <span className="text-xs text-amber-700 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            Selecione uma situação e um status para habilitar o salvamento.
          </span>
        ) : (
          <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-blue-600" />
            Pronto para salvar a nova situação.
          </span>
        )}

        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting || isSubmittingLocal}
            className="text-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!isFormValid || isSubmitting || isSubmittingLocal}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting || isSubmittingLocal ? 'Salvando...' : 'Confirmar atualização'}
          </Button>
        </div>
      </div>
    </div>
  )

  if (standalone) {
    return renderFormContent()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : setInternalIsOpen(true))}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm font-medium">
            {triggerButtonText}
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-2xl bg-white p-6 rounded-xl shadow-xl border border-border">
        <DialogHeader className="border-b pb-3 mb-2">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-600" />
            {triggerButtonText}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualização guiada determinística de situação comercial. Selecione o objetivo e o status correspondente.
          </DialogDescription>
        </DialogHeader>

        {renderFormContent()}
      </DialogContent>
    </Dialog>
  )
}
