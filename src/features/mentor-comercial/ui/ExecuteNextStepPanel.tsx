/**
 * Painel / Drawer "Executar Próximo Passo" (TASK 25 & 26).
 *
 * Exibe o diagnóstico determinístico do Mentor Comercial para a oportunidade selecionada:
 *  - Informações do cliente, canal, origem, status, responsável, temperatura, potencial e prioridade
 *  - Objetivo comercial, próximo passo, orientação e motivo de presença na Central
 *  - Dados de cadência, tentativa atual, total de tentativas e próxima ação
 *  - Script comercial renderizado estritamente ou mensagens de bloqueio/variáveis pendentes
 *  - Botões de ação rápida: Copiar mensagem, Abrir WhatsApp, Mensagem enviada,
 *    Executar ação interna, Reagendar, Atualizar situação e Abrir ficha.
 *
 * Identidade visual: Cabeçalho/Sidebar azul-marinho, azul principal, cards brancos,
 * tipografia Inter, fundo claro.
 */

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  useExecuteNextStep,
  type OpportunityData,
  type UseExecuteNextStepOptions,
} from './useExecuteNextStep'
import type { MentorRepository } from '../application/mentorApplicationService'
import type { ScriptVariables } from '../engine/script'

export type ExecuteNextStepPanelProps = {
  isOpen: boolean
  onClose: () => void
  opportunity: OpportunityData
  repository?: MentorRepository | null
  scriptVariables?: ScriptVariables
  now?: Date
  ruleVersion?: string
  onSuccess?: UseExecuteNextStepOptions['onSuccess']
  onError?: UseExecuteNextStepOptions['onError']
  onOpenWhatsApp?: UseExecuteNextStepOptions['onOpenWhatsApp']
  onCopyScript?: UseExecuteNextStepOptions['onCopyScript']
  onReschedule?: UseExecuteNextStepOptions['onReschedule']
  onUpdateStatus?: UseExecuteNextStepOptions['onUpdateStatus']
  onOpenDetails?: UseExecuteNextStepOptions['onOpenDetails']
}

export const ExecuteNextStepPanel: React.FC<ExecuteNextStepPanelProps> = ({
  isOpen,
  onClose,
  opportunity,
  repository,
  scriptVariables,
  now,
  ruleVersion,
  onSuccess,
  onError,
  onOpenWhatsApp,
  onCopyScript,
  onReschedule,
  onUpdateStatus,
  onOpenDetails,
}) => {
  const {
    renderedScript,
    isSourceBlocker,
    isInternal,
    missingVariables,
    isSubmitting,
    copied,
    formattedNextActionAt,
    handleCopyScript,
    handleOpenWhatsApp,
    handleMessageSent,
    handleExecuteInternal,
    handleUpdateStatus,
    handleOpenDetails,
  } = useExecuteNextStep({
    opportunity,
    repository,
    scriptVariables,
    now,
    ruleVersion,
    onSuccess,
    onError,
    onOpenWhatsApp,
    onCopyScript,
    onReschedule,
    onUpdateStatus,
    onOpenDetails,
  })

  const temperatureColor = (temp: string | null | undefined) => {
    switch (temp?.toLowerCase()) {
      case 'quente':
        return 'bg-status-error-surface text-status-error-text border-status-error/30'
      case 'morno':
        return 'bg-status-warning-surface text-status-warning-text border-status-warning/30'
      case 'frio':
        return 'bg-slate-100 text-foreground border-border'
      default:
        return 'bg-slate-100 text-foreground border-border'
    }
  }

  const potentialColor = (pot: string | null | undefined) => {
    switch (pot?.toLowerCase()) {
      case 'muito alto':
      case 'alto':
        return 'bg-status-info-surface text-status-info-text border-status-info/30'
      case 'médio':
      case 'medio':
        return 'bg-slate-100 text-foreground border-border'
      default:
        return 'bg-gray-100 text-foreground border-border'
    }
  }

  // Sem classe persistida a UI diz que não sabe. 'P2' não existe no domínio —
  // as classes oficiais são Máxima, Alta, Média e Baixa.
  const priorityClass =
    opportunity.priorityClass ?? opportunity.decision?.priority?.classification ?? null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-full p-0 flex flex-col bg-slate-50 overflow-hidden">
        {/* Cabeçalho Fixo em Azul Marinho */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="border-status-info/50 text-blue-300 bg-status-info/60 text-xs font-semibold">
                  {opportunity.statusCode}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-text-disabled bg-slate-800 text-xs">
                  {priorityClass ? `Prioridade ${priorityClass}` : 'Prioridade não calculada'}
                </Badge>
                {isInternal && (
                  <Badge variant="secondary" className="bg-status-warning/80 text-amber-200 border border-status-warning text-xs">
                    Ação Interna
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl font-bold text-white tracking-tight">
                {opportunity.clientName}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground mt-1">
                {opportunity.statusLabel}
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Card 1: Ficha do Cliente & Dados Origem */}
          <div className="bg-white rounded-lg border border-border p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Dados do Cliente & Origem
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Canal</span>
                <span className="font-medium text-foreground">{opportunity.channel}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Origem detalhada</span>
                <span className="font-medium text-foreground">
                  {opportunity.detailedOrigin || 'Não informada'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Responsável</span>
                <span className="font-medium text-foreground">{opportunity.responsible}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Telefone</span>
                <span className="font-medium text-foreground">
                  {opportunity.clientPhone || 'Não informado'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border-subtle text-xs">
              <span className="text-muted-foreground">Temperatura:</span>
              <Badge variant="outline" className={temperatureColor(opportunity.temperature)}>
                {opportunity.temperature || 'Não classificada'}
              </Badge>
              <span className="text-muted-foreground ml-2">Potencial:</span>
              <Badge variant="outline" className={potentialColor(opportunity.potential)}>
                {opportunity.potential || 'Não classificado'}
              </Badge>
            </div>
          </div>

          {/* Card 2: Diagnóstico & Orientação do Mentor */}
          <div className="bg-white rounded-lg border border-border p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Orientação Comercial do Mentor
              </h3>
              <span className="text-xs text-muted-foreground font-medium">100% Determinístico</span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">Objetivo</span>
                <p className="text-foreground font-medium bg-slate-50 p-2.5 rounded border border-border">
                  {opportunity.objective}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-muted-foreground block">Próximo Passo</span>
                <p className="text-status-info-text font-semibold bg-status-info-surface/70 p-2.5 rounded border border-status-info/30">
                  {opportunity.nextStep}
                </p>
              </div>

              {(opportunity.mentorGuidance || opportunity.decision?.explanations?.length) && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Orientação técnica</span>
                  <p className="text-foreground text-xs bg-slate-50 p-2.5 rounded border border-border leading-relaxed">
                    {opportunity.mentorGuidance ?? opportunity.decision?.explanations?.join(' ')}
                  </p>
                </div>
              )}

              {(opportunity.centralRule || opportunity.decision?.centralRule) && (
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block">Por que está aqui (Regra Central)</span>
                  <p className="text-foreground text-xs italic bg-slate-50 p-2 rounded border border-border">
                    {opportunity.centralRule ?? opportunity.decision?.centralRule}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Cadência & Tentativas */}
          <div className="bg-white rounded-lg border border-border p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Plano de Cadência
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Cadência</span>
                <span className="font-semibold text-foreground">
                  {opportunity.cadenceCode || 'Sem cadência'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Tentativa</span>
                <span className="font-semibold text-foreground">
                  {opportunity.cadenceStep ?? 1} / {opportunity.totalCadenceAttempts ?? 1}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Próxima Ação</span>
                <span className="font-semibold text-foreground">
                  {formattedNextActionAt || 'Sem agendamento'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Script Renderizado & Status de Envio */}
          <div className="bg-white rounded-lg border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Script Comercial
              </h3>
              {opportunity.scriptRef && (
                <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-2 py-0.5 rounded">
                  {opportunity.scriptRef}
                </span>
              )}
            </div>

            {isSourceBlocker ? (
              <div className="bg-status-warning-surface border border-status-warning/30 rounded-lg p-3 text-status-warning-text text-sm space-y-1">
                <p className="font-bold text-status-warning-text">Script ainda não cadastrado na matriz</p>
                <p className="text-xs text-status-warning-text">
                  O envio via WhatsApp fica desabilitado até a atualização da matriz. O restador do Mentor permanece totalmente operacional.
                </p>
              </div>
            ) : isInternal ? (
              <div className="bg-status-info-surface border border-status-info/30 rounded-lg p-3 text-status-info-text text-sm space-y-1">
                <p className="font-bold text-status-info-text">Ação Interna (SCR-INTERNO)</p>
                <p className="text-xs text-status-info-text">
                  Esta atividade deve ser executada internamente no sistema. Não há script de envio de mensagem para o cliente.
                </p>
              </div>
            ) : renderedScript.scriptReady && renderedScript.text ? (
              <div className="space-y-2">
                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-sm font-sans whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner max-h-60 overflow-y-auto">
                  {renderedScript.text}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyScript}
                    className="text-xs border-border-strong text-foreground hover:bg-slate-100"
                  >
                    {copied ? 'Mensagem copiada!' : 'Copiar mensagem'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-status-warning-surface border border-status-warning/30 rounded-lg p-3 text-status-warning-text text-sm space-y-2">
                <p className="font-semibold">Variáveis pendentes no script:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 font-mono text-status-warning-text">
                  {missingVariables.map((v) => (
                    <li key={v}>{`{${v}}`}</li>
                  ))}
                </ul>
                <p className="text-xs text-status-warning-text">
                  Preencha as variáveis ausentes para habilitar o envio via WhatsApp.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Fixo de Ações Operacionais */}
        <div className="bg-white border-t border-border p-4 sm:p-5 shrink-0 space-y-3 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!isInternal && (
              <Button
                type="button"
                variant="outline"
                disabled={!renderedScript.allowWhatsApp}
                onClick={handleOpenWhatsApp}
                className="w-full border-status-info text-status-info-text hover:bg-status-info-surface font-medium"
              >
                Abrir WhatsApp
              </Button>
            )}

            {isInternal ? (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteInternal}
                className="w-full bg-status-info hover:bg-status-info text-white font-semibold col-span-2"
              >
                {isSubmitting ? 'Registrando...' : 'Executar ação interna'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleMessageSent('Mensagem enviada')}
                className="w-full bg-status-info hover:bg-status-info text-white font-semibold"
              >
                {isSubmitting ? 'Registrando...' : 'Mensagem enviada'}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-subtle text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onReschedule?.(new Date())}
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2"
              >
                Reagendar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUpdateStatus}
                className="text-muted-foreground hover:text-foreground text-xs h-7 px-2"
              >
                Atualizar situação
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenDetails}
              className="text-status-info-text hover:text-status-info-text font-medium text-xs h-7 px-2"
            >
              Abrir ficha →
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
