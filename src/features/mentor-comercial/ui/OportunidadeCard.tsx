/**
 * Componente OportunidadeCard — Mentor Comercial (TASK 28 / TAREFA A04).
 *
 * Card horizontal amplo em desktop (UMA coluna no container pai), empilhado no mobile.
 * Apresenta todas as dimensões determinísticas do Mentor Comercial.
 *
 * Regra dura: Se `needs_mentor_classification = true`, exibe "Definir situação atual"
 * em vez do score, omitindo qualquer valor numérico ou classificação falsa.
 */

import React from 'react'
import {
  Calendar,
  Car,
  Clock,
  FileText,
  MessageSquare,
  Phone,
  Play,
  RefreshCw,
  ShieldAlert,
  Target,
  User,
  Zap,
} from 'lucide-react'
import { formatarTelefoneBR, formatDateBR } from '../../../lib/schemas/crm.schema'

export type CarteiraOportunidade = {
  id: string
  cliente_id: string
  cliente_nome: string
  cliente_telefone?: string | null
  cliente_whatsapp?: string | null
  canal?: string | null
  channel_entry?: string | null
  detailed_origin?: string | null
  origem_modulo?: string | null
  veiculo_interesse?: string | null
  placa_veiculo?: string | null
  current_status_code?: string | null
  status_label?: string | null
  current_responsible?: string | null
  temperature?: string | null
  current_objective?: string | null
  current_next_step?: string | null
  next_action_at?: string | Date | null
  appointment_at?: string | Date | null
  current_cadence_step?: number | null
  mentor_score?: number | null
  mentor_score_class?: string | null
  priority_index?: number | null
  priority_class?: string | null
  potential?: string | null
  needs_mentor_classification?: boolean | null
  etapa?: string | null
  explanation?: string | string[] | null
  mentor_guidance?: string | null
  closed_at?: string | Date | null
}

export type OportunidadeCardProps = {
  oportunidade: CarteiraOportunidade
  onExecutar?: (op: CarteiraOportunidade) => void
  onAtualizarSituacao?: (op: CarteiraOportunidade) => void
  onAbrirFicha?: (op: CarteiraOportunidade) => void
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getPriorityBadgeClass(prioClass?: string | null): string {
  switch (prioClass) {
    case 'Máxima':
      return 'bg-status-error-surface text-status-error-text border-status-error/30'
    case 'Alta':
      return 'bg-status-warning-surface text-status-warning-text border-status-warning/30'
    case 'Média':
      return 'bg-status-info-surface text-status-info-text border-status-info/30'
    case 'Baixa':
    default:
      return 'bg-muted text-foreground border-border'
  }
}

function getScoreBadgeClass(scoreClass?: string | null): string {
  switch (scoreClass) {
    case 'Excelente':
      return 'bg-status-info-surface text-status-info-text border-status-info/30'
    case 'Boa':
      return 'bg-status-info-surface text-status-info-text border-status-info/30'
    case 'Atenção':
      return 'bg-status-warning-surface text-status-warning-text border-status-warning/30'
    case 'Crítica':
    default:
      return 'bg-status-error-surface text-status-error-text border-status-error/30'
  }
}

function getTemperatureBadgeClass(temp?: string | null): string {
  if (!temp) return 'bg-muted text-muted-foreground border-border'
  const t = temp.toLowerCase()
  if (t.includes('quente') || t.includes('alta')) {
    return 'bg-status-error-surface text-status-error-text border-status-error/30 font-semibold'
  }
  if (t.includes('morno') || t.includes('média')) {
    return 'bg-status-warning-surface text-status-warning-text border-status-warning/30'
  }
  return 'bg-status-info-surface text-status-info-text border-status-info/30'
}

export const OportunidadeCard: React.FC<OportunidadeCardProps> = ({
  oportunidade,
  onExecutar,
  onAtualizarSituacao,
  onAbrirFicha,
}) => {
  const {
    cliente_nome,
    cliente_telefone,
    cliente_whatsapp,
    canal,
    channel_entry,
    detailed_origin,
    origem_modulo,
    veiculo_interesse,
    placa_veiculo,
    current_status_code,
    status_label,
    current_responsible,
    temperature,
    current_objective,
    current_next_step,
    next_action_at,
    appointment_at,
    current_cadence_step,
    mentor_score,
    mentor_score_class,
    priority_index,
    priority_class,
    potential,
    needs_mentor_classification,
    explanation,
    mentor_guidance,
  } = oportunidade

  const phone = cliente_telefone || cliente_whatsapp
  const canalDisplay = channel_entry || canal || 'Carteira'
  const origemDisplay = detailed_origin || origem_modulo || 'Geral'
  const statusDisplay = status_label || current_status_code || 'Em andamento'
  const nextActionDisplay = next_action_at
    ? formatDateBR(typeof next_action_at === 'string' ? next_action_at : next_action_at.toISOString())
    : appointment_at
    ? formatDateBR(typeof appointment_at === 'string' ? appointment_at : appointment_at.toISOString())
    : 'Sem data'

  const explanationsList: string[] = Array.isArray(explanation)
    ? explanation
    : typeof explanation === 'string'
    ? [explanation]
    : mentor_guidance
    ? [mentor_guidance]
    : []

  return (
    <div className="w-full bg-white rounded-xl border border-border shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4">
      {/* Cabeçalho do Card: Iniciais, Nome, Contato, Canal, Origem, Veículo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-status-info text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
            {getInitials(cliente_nome)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-foreground">{cliente_nome}</h3>
              {temperature && (
                <span className={`px-2.5 py-0.5 text-xs rounded-full border ${getTemperatureBadgeClass(temperature)}`}>
                  {temperature}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
              {phone && (
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Phone className="w-3.5 h-3.5 text-status-info-text" />
                  {formatarTelefoneBR(phone)}
                </span>
              )}
              <span className="bg-muted text-foreground px-2 py-0.5 rounded text-xs font-medium">
                Canal: {canalDisplay}
              </span>
              <span className="text-muted-foreground">Origem: {origemDisplay}</span>
            </div>
          </div>
        </div>

        {/* Veículo & Responsável */}
        <div className="flex flex-col md:items-end gap-1 text-xs">
          {veiculo_interesse && (
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Car className="w-4 h-4 text-status-info-text" />
              <span>{veiculo_interesse}</span>
              {placa_veiculo && (
                <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-caption font-mono">
                  {placa_veiculo}
                </span>
              )}
            </div>
          )}
          {current_responsible && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span>Responsável: {current_responsible}</span>
            </div>
          )}
        </div>
      </div>

      {/* Corpo Intermediário: Status, Objetivo, Próximo Passo, Data, Tentativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-surface-alt/70 p-3.5 rounded-lg border border-border-subtle">
        <div>
          <span className="text-muted-foreground font-medium uppercase text-caption tracking-wider block mb-1">
            Status Atual
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
            <Target className="w-4 h-4 text-status-info-text shrink-0" />
            <span>{statusDisplay}</span>
          </div>
          {current_objective && (
            <p className="text-muted-foreground mt-1 text-caption line-clamp-2">
              <strong className="text-foreground">Obj:</strong> {current_objective}
            </p>
          )}
        </div>

        <div>
          <span className="text-muted-foreground font-medium uppercase text-caption tracking-wider block mb-1">
            Próximo Passo
          </span>
          <p className="font-semibold text-foreground text-sm">{current_next_step || 'A definir pelo mentor'}</p>
          <div className="flex items-center gap-3 mt-1.5 text-caption text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-status-info-text" />
              {nextActionDisplay}
            </span>
            {typeof current_cadence_step === 'number' && (
              <span className="flex items-center gap-1 bg-status-info-surface text-status-info-text px-1.5 py-0.5 rounded font-medium">
                <Clock className="w-3 h-3" />
                Tentativa {current_cadence_step}
              </span>
            )}
          </div>
        </div>

        {/* Score & Prioridade */}
        <div className="flex flex-col justify-center gap-2">
          {/* Prioridade */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium text-caption flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-status-warning-text" />
              Prioridade:
            </span>
            <div className="flex items-center gap-1.5">
              {typeof priority_index === 'number' && (
                <span className="font-bold text-foreground text-sm">{priority_index} pt</span>
              )}
              {priority_class && (
                <span className={`px-2 py-0.5 text-caption font-bold rounded-full border ${getPriorityBadgeClass(priority_class)}`}>
                  {priority_class}
                </span>
              )}
            </div>
          </div>

          {/* Score — Trata Regra Dura: needs_mentor_classification */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-medium text-caption">Score de Condução:</span>
            {needs_mentor_classification ? (
              <span className="px-2.5 py-0.5 text-caption font-bold rounded-full bg-status-warning-surface text-status-warning-text border border-status-warning/40 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-status-warning-text" />
                Definir situação atual
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                {typeof mentor_score === 'number' && (
                  <span className="font-bold text-foreground text-sm">{mentor_score}/100</span>
                )}
                {mentor_score_class && (
                  <span className={`px-2 py-0.5 text-caption font-bold rounded-full border ${getScoreBadgeClass(mentor_score_class)}`}>
                    {mentor_score_class}
                  </span>
                )}
              </div>
            )}
          </div>

          {potential && (
            <div className="text-caption text-muted-foreground text-right">
              Potencial: <strong className="text-foreground">{potential}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Explicações / Mentor Guidance */}
      {explanationsList.length > 0 && (
        <div className="text-xs bg-status-info-surface/50 border border-status-info/20 rounded-lg p-2.5 text-status-info-text">
          <strong className="font-semibold text-status-info-text">Orientação do Mentor:</strong>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5">
            {explanationsList.map((exp, idx) => (
              <li key={idx} className="text-foreground">
                {exp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rodapé: Botões de Ação */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border-subtle">
        <button
          type="button"
          onClick={() => onExecutar?.(oportunidade)}
          className="bg-status-info hover:bg-status-info active:bg-status-info text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Executar
        </button>

        <button
          type="button"
          onClick={() => onAtualizarSituacao?.(oportunidade)}
          className="border border-border-strong bg-white hover:bg-surface-alt active:bg-muted text-foreground font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          Atualizar situação
        </button>

        <button
          type="button"
          onClick={() => onAbrirFicha?.(oportunidade)}
          className="border border-border bg-surface-alt hover:bg-muted text-muted-foreground font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          Abrir ficha
        </button>
      </div>
    </div>
  )
}
