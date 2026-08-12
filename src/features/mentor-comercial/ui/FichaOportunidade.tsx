/**
 * Ficha da Oportunidade — Visão de Consulta e Contexto Comercial (TASK 29).
 *
 * PROIBIDO transformar a ficha em modal de IA.
 * Mentor é 100% determinístico.
 *
 * Reutiliza a função pura `buildFichaBlocks` para estruturar os 5 blocos:
 *   1. Cabeçalho da oportunidade
 *   2. Próxima ação recomendada
 *   3. O que sabemos
 *   4. O que falta para evoluir
 *   5. Histórico
 *
 * TODO (TASK 29): O fluxo de execução reutiliza o componente principal ExecuteNextStepPanel.
 * Caminho oficial de importação: `src/features/mentor-comercial/ui/ExecuteNextStepPanel`
 */

import React, { useState } from 'react'
import type { MentorDecision, OpportunityFacts } from '../engine/engine'
import {
  buildFichaBlocks,
  type ExtraFichaFacts,
  type FichaBlocks,
  type MissingPillarInfo,
  type ScorePillarDetail,
} from './fichaBlocks'

export type FichaOportunidadeProps = {
  decision: MentorDecision
  facts: OpportunityFacts
  extraFacts?: ExtraFichaFacts
  onClose?: () => void
  onExecuteNextStep?: () => void
  /**
   * Componente reutilizado para a execução do CTA principal.
   * TODO: Quando src/features/mentor-comercial/ui/ExecuteNextStepPanel estiver criado no escopo,
   * ele será injetado por padrão neste slot.
   */
  ExecuteNextStepPanel?: React.ComponentType<{
    decision: MentorDecision
    facts: OpportunityFacts
    onClose?: () => void
  }>
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Não programada'
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function translateUrgency(urgency: string): string {
  const map: Record<string, string> = {
    clientRespondedAwaitingSeller: 'Cliente respondeu e aguarda vendedor',
    actionOverdue: 'Ação com atraso',
    actionToday: 'Ação vence hoje',
    actionTomorrow: 'Ação vence amanhã',
    actionWithin3Days: 'Ação vence em até 3 dias',
    actionFuture: 'Ação futura',
  }
  return map[urgency] ?? urgency
}

function translatePillarQuality(quality: string): { label: string; badgeClass: string } {
  const map: Record<string, { label: string; badgeClass: string }> = {
    complete: { label: 'Completo (Pontuação máxima)', badgeClass: 'bg-status-info-surface text-status-info-text' },
    partial: { label: 'Parcial (Atenção aos dados)', badgeClass: 'bg-status-warning-surface text-status-warning-text' },
    undefined: { label: 'Indefinido (Sem dados)', badgeClass: 'bg-status-error-surface text-status-error-text' },
    missing: { label: 'Ausente', badgeClass: 'bg-status-error-surface text-status-error-text' },
    onTime: { label: 'No prazo', badgeClass: 'bg-status-info-surface text-status-info-text' },
    dueToday: { label: 'Vence hoje', badgeClass: 'bg-status-warning-surface text-status-warning-text' },
    lateUnder24h: { label: 'Atraso < 24h', badgeClass: 'bg-status-warning-surface text-status-warning-text' },
    lateOver24h: { label: 'Atraso > 24h', badgeClass: 'bg-status-error-surface text-status-error-text' },
    awaitingSellerResponse: { label: 'Cliente aguarda retorno', badgeClass: 'bg-status-error-surface text-status-error-text' },
    respected: { label: 'Cadência respeitada', badgeClass: 'bg-status-info-surface text-status-info-text' },
    completedWithoutResponse: { label: 'Cadência concluída sem resposta', badgeClass: 'bg-muted text-foreground' },
    broken: { label: 'Cadência interrompida/quebrada', badgeClass: 'bg-status-error-surface text-status-error-text' },
    stale: { label: 'Histórico desatualizado', badgeClass: 'bg-status-warning-surface text-status-warning-text' },
  }
  return map[quality] ?? { label: quality, badgeClass: 'bg-muted text-foreground' }
}

export function FichaOportunidade({
  decision,
  facts,
  extraFacts,
  onClose,
  onExecuteNextStep,
  ExecuteNextStepPanel: ExecuteNextStepPanelProp,
}: FichaOportunidadeProps) {
  const [showExecution, setShowExecution] = useState(false)
  const blocksData: FichaBlocks = buildFichaBlocks(decision, facts, extraFacts)
  const { header, nextAction, whatWeKnow, whatIsMissing, history } = blocksData

  const handleExecuteClick = () => {
    if (onExecuteNextStep) {
      onExecuteNextStep()
    }
    setShowExecution(true)
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-surface-alt font-sans text-foreground rounded-2xl shadow-xl border border-border overflow-hidden my-4">
      {/* Structural Top Bar — Identity Sidebar Navy */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">
              MX Performance — Mentor Comercial
            </span>
            <span className="text-xs bg-slate-800 text-text-disabled px-2.5 py-0.5 rounded-full font-mono">
              Versão {decision.ruleVersion}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            Ficha da Oportunidade — Consulta e Contexto
          </h1>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar Ficha"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* BLOCO 1: Cabeçalho da Oportunidade */}
        <section className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border-subtle">
            <div>
              <span className="text-xs font-bold text-status-info-text uppercase tracking-wide">
                Bloco 1 — Identificação
              </span>
              <h2 className="text-2xl font-bold text-foreground">{header.clientName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Veículo: <span className="font-medium text-foreground">{header.vehicleName}</span> | Loja:{' '}
                <span className="font-medium text-foreground">{header.storeName}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-slate-900 text-slate-100 font-medium text-xs rounded-full">
                {header.statusLabel} ({header.statusCode})
              </span>
              <span className="px-3 py-1 bg-status-info-surface text-status-info-text font-medium text-xs rounded-full border border-status-info/30">
                {header.family}
              </span>
              <span className="px-3 py-1 bg-muted text-foreground font-medium text-xs rounded-full">
                Resp: {header.responsible}
              </span>
              {header.temperature && (
                <span className="px-3 py-1 bg-status-warning-surface text-status-warning-text font-medium text-xs rounded-full border border-status-warning/30">
                  Temp: {header.temperature}
                </span>
              )}
            </div>
          </div>

          {/* Separação estrita: Qualidade (Score) ≠ Urgência (Prioridade) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Qualidade da Condução (Score) */}
            <div className="bg-status-info-surface/70 rounded-xl p-5 border border-status-info/30 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-status-info-text">
                    Qualidade da Condução (Score)
                  </span>
                  <span className="text-xs bg-status-info-surface text-status-info-text px-2.5 py-0.5 rounded-full font-bold">
                    {header.score.classification}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-status-info-text">{header.score.total}</span>
                  <span className="text-sm font-semibold text-status-info-text">/ 100 pontos</span>
                </div>
                <p className="text-xs text-status-info-text/80 mt-1">
                  Mede a qualidade do trabalho e condução do vendedor (5 pilares).
                </p>
              </div>

              {/* Breakdown dos 5 pilares do score */}
              <div className="space-y-2 pt-2 border-t border-status-info/60">
                <span className="text-xs font-semibold text-status-info-text">Detalhamento dos Pilares:</span>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  {header.score.pillarsDetail.map((item: ScorePillarDetail) => (
                    <div key={item.pillar} className="flex justify-between items-center bg-white/80 px-2.5 py-1.5 rounded border border-status-info/20">
                      <span className="text-foreground font-medium">{item.label}</span>
                      <span className="font-bold text-status-info-text">
                        {item.score} / {item.maxScore} pt
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Urgência da Ação (Prioridade) */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-disabled">
                    Urgência da Ação (Prioridade)
                  </span>
                  <span className="text-xs bg-status-info text-white px-2.5 py-0.5 rounded-full font-bold">
                    {header.priority.classification}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="text-4xl font-extrabold text-white">{header.priority.index}</span>
                  <span className="text-sm font-semibold text-muted-foreground">/ 100 índice</span>
                </div>
                <p className="text-xs text-text-disabled mt-1">
                  Mede a urgência e o impacto imediato da próxima ação.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escala de Urgência:</span>
                  <span className="font-semibold text-blue-300">
                    {translateUrgency(header.priority.urgencyLevel)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potencial Comercial:</span>
                  <span className="font-semibold text-slate-200">
                    {header.priority.potential ?? 'Baixo'}
                  </span>
                </div>
                {header.priority.appliedOverrides.length > 0 && (
                  <div className="pt-1">
                    <span className="text-muted-foreground">Pisos aplicados: </span>
                    <span className="font-mono text-blue-400">
                      {header.priority.appliedOverrides.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* BLOCO 2: Próxima Ação Recomendada */}
        <section className="bg-white rounded-xl border-2 border-status-info p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <div>
              <span className="text-xs font-bold text-status-info-text uppercase tracking-wide">
                Bloco 2 — Ação Requerida
              </span>
              <h3 className="text-lg font-bold text-foreground">{nextAction.title}</h3>
            </div>
            <button
              type="button"
              onClick={handleExecuteClick}
              className="bg-status-info hover:bg-status-info text-white font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm flex items-center space-x-2"
            >
              <span>Executar Próxima Ação</span>
              <span>→</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-surface-alt p-4 rounded-lg border border-border space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase">Próximo Passo</span>
              <p className="font-bold text-foreground text-base">{nextAction.nextStep}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Objetivo: <span className="font-medium text-foreground">{nextAction.objective}</span>
              </p>
            </div>

            <div className="bg-surface-alt p-4 rounded-lg border border-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencimento da Ação:</span>
                <span className="font-bold text-foreground">{formatDate(nextAction.nextActionAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cadência Ativa:</span>
                <span className="font-medium text-foreground">
                  {nextAction.cadenceCode ? `${nextAction.cadenceCode} (Tentativa ${nextAction.cadenceStep} de ${nextAction.totalCadenceAttempts ?? '?'})` : 'Sem cadência (Diretiva)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Script Determinístico:</span>
                <span className="font-mono text-status-info-text font-semibold">
                  {nextAction.scriptId ?? `Não resolvido (${nextAction.scriptReason})`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-border">
                <span className="text-muted-foreground">Entra na Central:</span>
                <span className={`px-2 py-0.5 rounded font-semibold ${nextAction.centralAction ? 'bg-status-info-surface text-status-info-text' : 'bg-muted text-foreground'}`}>
                  {nextAction.centralAction ? `Sim (${nextAction.centralRule ?? 'Regra'})` : 'Não'}
                </span>
              </div>
            </div>
          </div>

          {/* Renderização do fluxo de execução reutilizado */}
          {showExecution && (
            <div className="mt-4 pt-4 border-t border-status-info/30 bg-status-info-surface/50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-status-info-text text-sm">Painel de Execução Principal</h4>
                <button
                  type="button"
                  onClick={() => setShowExecution(false)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Ocultar painel
                </button>
              </div>

              {ExecuteNextStepPanelProp ? (
                <ExecuteNextStepPanelProp
                  decision={decision}
                  facts={facts}
                  onClose={() => setShowExecution(false)}
                />
              ) : (
                <div className="bg-white p-4 rounded-lg border border-status-info/30 text-xs space-y-2">
                  <p className="font-semibold text-foreground">
                    CTA de Execução acionado.
                  </p>
                  <p className="text-muted-foreground">
                    TODO (TASK 29): O fluxo reutiliza o componente{' '}
                    <code className="font-mono text-status-info-text">
                      src/features/mentor-comercial/ui/ExecuteNextStepPanel
                    </code>
                    .
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* BLOCO 3: O que Sabemos */}
        <section className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-status-info-text uppercase tracking-wide">
              Bloco 3 — Fatos Confirmados
            </span>
            <h3 className="text-lg font-bold text-foreground">{whatWeKnow.title}</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {whatWeKnow.factsSummary.map((item, idx) => (
              <div key={idx} className="bg-surface-alt p-3 rounded-lg border border-border">
                <span className="text-muted-foreground block">{item.label}</span>
                <span className="font-semibold text-foreground mt-1 block">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-bold text-foreground uppercase mb-2">
              Avaliação dos Pilares de Qualidade:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              {Object.entries(whatWeKnow.qualityDetails).map(([key, val]) => {
                const info = translatePillarQuality(val)
                return (
                  <div key={key} className="flex justify-between items-center bg-surface-alt p-2.5 rounded border border-border">
                    <span className="font-medium text-foreground capitalize">{key}:</span>
                    <span className={`px-2 py-0.5 rounded font-semibold ${info.badgeClass}`}>
                      {info.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* BLOCO 4: O que Falta para Evoluir */}
        <section className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-status-info-text uppercase tracking-wide">
              Bloco 4 — Diagnóstico de Lacunas
            </span>
            <h3 className="text-lg font-bold text-foreground">{whatIsMissing.title}</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Alertas & Pendências */}
            <div className="space-y-3">
              <span className="font-bold text-foreground block">Bandeiras e Alertas Pendentes:</span>
              {whatIsMissing.pendingFlags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {whatIsMissing.pendingFlags.map((flag) => (
                    <span key={flag} className="px-2.5 py-1 bg-status-warning-surface text-status-warning-text rounded font-mono border border-status-warning/30">
                      {flag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Nenhuma bandeira pendente.</p>
              )}

              {whatIsMissing.scoreAlerts.length > 0 && (
                <div className="space-y-1 pt-2">
                  <span className="font-semibold text-foreground block">Alertas de Perda:</span>
                  <div className="space-y-1">
                    {whatIsMissing.scoreAlerts.map((alert) => (
                      <div key={alert} className="bg-status-error-surface text-status-error-text p-2 rounded border border-status-error/30">
                        ⚠ Alerta: <span className="font-mono">{alert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Oportunidades de Ganho de Score */}
            <div className="space-y-3">
              <span className="font-bold text-foreground block">Pontos a Recuperar nos Pilares:</span>
              {whatIsMissing.missingPillars.length > 0 ? (
                <div className="space-y-1.5">
                  {whatIsMissing.missingPillars.map((item: MissingPillarInfo) => (
                    <div key={item.pillar} className="flex justify-between items-center bg-surface-alt p-2 rounded border border-border">
                      <span>{item.label}</span>
                      <span className="font-semibold text-status-error-text">
                        -{item.missing} pt (Atual: {item.current}/{item.max})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-status-info-text font-medium">Pontuação máxima atingida em todos os pilares!</p>
              )}
            </div>
          </div>

          {/* Explicações determinísticas */}
          {whatIsMissing.explanations.length > 0 && (
            <div className="bg-surface-alt p-3 rounded-lg border border-border text-xs space-y-1">
              <span className="font-bold text-foreground block">Notas Determinísticas do Mentor:</span>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {whatIsMissing.explanations.map((exp, i) => (
                  <li key={i}>{exp}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* BLOCO 5: Histórico */}
        <section className="bg-white rounded-xl border border-border p-6 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-status-info-text uppercase tracking-wide">
              Bloco 5 — Registro de Atividades
            </span>
            <h3 className="text-lg font-bold text-foreground">{history.title}</h3>
          </div>

          {history.transitionSummary && (
            <div className="bg-status-info-surface text-status-info-text p-3 rounded-lg border border-status-info/30 text-xs font-medium">
              {history.transitionSummary}
            </div>
          )}

          {history.entries.length > 0 ? (
            <div className="space-y-2">
              {history.entries.map((entry, index) => (
                <div key={index} className="flex justify-between items-center bg-surface-alt p-3 rounded-lg border border-border text-xs">
                  <div>
                    <span className="font-bold text-foreground block">{entry.description}</span>
                    {entry.result && (
                      <span className="text-muted-foreground">Resultado: {entry.result}</span>
                    )}
                  </div>
                  <span className="text-muted-foreground font-mono">{formatDate(entry.at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Sem eventos históricos adicionais registrados.</p>
          )}
        </section>
      </div>
    </div>
  )
}
