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
        return 'bg-red-100 text-red-800 border-red-200'
      case 'morno':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'frio':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const potentialColor = (pot: string | null | undefined) => {
    switch (pot?.toLowerCase()) {
      case 'muito alto':
      case 'alto':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'médio':
      case 'medio':
        return 'bg-slate-100 text-slate-800 border-slate-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const priorityClass = opportunity.priorityClass ?? opportunity.decision?.priority?.classification ?? 'P2'

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl h-full p-0 flex flex-col bg-slate-50 overflow-hidden">
        {/* Cabeçalho Fixo em Azul Marinho */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 shrink-0 border-b border-slate-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className="border-blue-400 text-blue-300 bg-blue-950/60 text-xs font-semibold">
                  {opportunity.statusCode}
                </Badge>
                <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-800 text-xs">
                  Prioridade {priorityClass}
                </Badge>
                {isInternal && (
                  <Badge variant="secondary" className="bg-amber-900/80 text-amber-200 border border-amber-700 text-xs">
                    Ação Interna
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl font-bold text-white tracking-tight">
                {opportunity.clientName}
              </SheetTitle>
              <SheetDescription className="text-sm text-slate-400 mt-1">
                {opportunity.statusLabel}
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Card 1: Ficha do Cliente & Dados Origem */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dados do Cliente & Origem
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Canal</span>
                <span className="font-medium text-slate-900">{opportunity.channel}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Origem detalhada</span>
                <span className="font-medium text-slate-900">
                  {opportunity.detailedOrigin || 'Não informada'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Responsável</span>
                <span className="font-medium text-slate-900">{opportunity.responsible}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Telefone</span>
                <span className="font-medium text-slate-900">
                  {opportunity.clientPhone || 'Não informado'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500">Temperatura:</span>
              <Badge variant="outline" className={temperatureColor(opportunity.temperature)}>
                {opportunity.temperature || 'Não classificada'}
              </Badge>
              <span className="text-slate-500 ml-2">Potencial:</span>
              <Badge variant="outline" className={potentialColor(opportunity.potential)}>
                {opportunity.potential || 'Não classificado'}
              </Badge>
            </div>
          </div>

          {/* Card 2: Diagnóstico & Orientação do Mentor */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Orientação Comercial do Mentor
              </h3>
              <span className="text-xs text-slate-400 font-medium">100% Determinístico</span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-600 block">Objetivo</span>
                <p className="text-slate-900 font-medium bg-slate-50 p-2.5 rounded border border-slate-200">
                  {opportunity.objective}
                </p>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-600 block">Próximo Passo</span>
                <p className="text-blue-900 font-semibold bg-blue-50/70 p-2.5 rounded border border-blue-200">
                  {opportunity.nextStep}
                </p>
              </div>

              {(opportunity.mentorGuidance || opportunity.decision?.explanations?.length) && (
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">Orientação técnica</span>
                  <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                    {opportunity.mentorGuidance ?? opportunity.decision?.explanations?.join(' ')}
                  </p>
                </div>
              )}

              {(opportunity.centralRule || opportunity.decision?.centralRule) && (
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">Por que está aqui (Regra Central)</span>
                  <p className="text-slate-700 text-xs italic bg-slate-50 p-2 rounded border border-slate-200">
                    {opportunity.centralRule ?? opportunity.decision?.centralRule}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Cadência & Tentativas */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Plano de Cadência
            </h3>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">Cadência</span>
                <span className="font-semibold text-slate-900">
                  {opportunity.cadenceCode || 'Sem cadência'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Tentativa</span>
                <span className="font-semibold text-slate-900">
                  {opportunity.cadenceStep ?? 1} / {opportunity.totalCadenceAttempts ?? 1}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Próxima Ação</span>
                <span className="font-semibold text-slate-900">
                  {formattedNextActionAt || 'Sem agendamento'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Script Renderizado & Status de Envio */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Script Comercial
              </h3>
              {opportunity.scriptRef && (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {opportunity.scriptRef}
                </span>
              )}
            </div>

            {isSourceBlocker ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-sm space-y-1">
                <p className="font-bold text-amber-950">Script ainda não cadastrado na matriz</p>
                <p className="text-xs text-amber-800">
                  O envio via WhatsApp fica desabilitado até a atualização da matriz. O restador do Mentor permanece totalmente operacional.
                </p>
              </div>
            ) : isInternal ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-900 text-sm space-y-1">
                <p className="font-bold text-blue-950">Ação Interna (SCR-INTERNO)</p>
                <p className="text-xs text-blue-800">
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
                    className="text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    {copied ? 'Mensagem copiada!' : 'Copiar mensagem'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-sm space-y-2">
                <p className="font-semibold">Variáveis pendentes no script:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 font-mono text-amber-900">
                  {missingVariables.map((v) => (
                    <li key={v}>{`{${v}}`}</li>
                  ))}
                </ul>
                <p className="text-xs text-amber-800">
                  Preencha as variáveis ausentes para habilitar o envio via WhatsApp.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Fixo de Ações Operacionais */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 shrink-0 space-y-3 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {!isInternal && (
              <Button
                type="button"
                variant="outline"
                disabled={!renderedScript.allowWhatsApp}
                onClick={handleOpenWhatsApp}
                className="w-full border-blue-600 text-blue-700 hover:bg-blue-50 font-medium"
              >
                Abrir WhatsApp
              </Button>
            )}

            {isInternal ? (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteInternal}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold col-span-2"
              >
                {isSubmitting ? 'Registrando...' : 'Executar ação interna'}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleMessageSent('Mensagem enviada')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {isSubmitting ? 'Registrando...' : 'Mensagem enviada'}
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onReschedule?.(new Date())}
                className="text-slate-600 hover:text-slate-900 text-xs h-7 px-2"
              >
                Reagendar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUpdateStatus}
                className="text-slate-600 hover:text-slate-900 text-xs h-7 px-2"
              >
                Atualizar situação
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenDetails}
              className="text-blue-700 hover:text-blue-900 font-medium text-xs h-7 px-2"
            >
              Abrir ficha →
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
