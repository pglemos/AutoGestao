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
      return 'bg-red-50 text-red-700 border-red-200'
    case 'Alta':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'Média':
      return 'bg-blue-50 text-blue-800 border-blue-200'
    case 'Baixa':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function getScoreBadgeClass(scoreClass?: string | null): string {
  switch (scoreClass) {
    case 'Excelente':
      return 'bg-blue-50 text-blue-800 border-blue-200'
    case 'Boa':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200'
    case 'Atenção':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'Crítica':
    default:
      return 'bg-red-50 text-red-800 border-red-200'
  }
}

function getTemperatureBadgeClass(temp?: string | null): string {
  if (!temp) return 'bg-slate-100 text-slate-600 border-slate-200'
  const t = temp.toLowerCase()
  if (t.includes('quente') || t.includes('alta')) {
    return 'bg-red-50 text-red-700 border-red-200 font-semibold'
  }
  if (t.includes('morno') || t.includes('média')) {
    return 'bg-amber-50 text-amber-700 border-amber-200'
  }
  return 'bg-blue-50 text-blue-700 border-blue-200'
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
    <div className="w-full bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col gap-4">
      {/* Cabeçalho do Card: Iniciais, Nome, Contato, Canal, Origem, Veículo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-blue-900 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm">
            {getInitials(cliente_nome)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900">{cliente_nome}</h3>
              {temperature && (
                <span className={`px-2.5 py-0.5 text-xs rounded-full border ${getTemperatureBadgeClass(temperature)}`}>
                  {temperature}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
              {phone && (
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Phone className="w-3.5 h-3.5 text-blue-800" />
                  {formatarTelefoneBR(phone)}
                </span>
              )}
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                Canal: {canalDisplay}
              </span>
              <span className="text-slate-500">Origem: {origemDisplay}</span>
            </div>
          </div>
        </div>

        {/* Veículo & Responsável */}
        <div className="flex flex-col md:items-end gap-1 text-xs">
          {veiculo_interesse && (
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Car className="w-4 h-4 text-blue-900" />
              <span>{veiculo_interesse}</span>
              {placa_veiculo && (
                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono">
                  {placa_veiculo}
                </span>
              )}
            </div>
          )}
          {current_responsible && (
            <div className="flex items-center gap-1 text-slate-500">
              <User className="w-3.5 h-3.5" />
              <span>Responsável: {current_responsible}</span>
            </div>
          )}
        </div>
      </div>

      {/* Corpo Intermediário: Status, Objetivo, Próximo Passo, Data, Tentativa */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
        <div>
          <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block mb-1">
            Status Atual
          </span>
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
            <Target className="w-4 h-4 text-blue-800 shrink-0" />
            <span>{statusDisplay}</span>
          </div>
          {current_objective && (
            <p className="text-slate-600 mt-1 text-[11px] line-clamp-2">
              <strong className="text-slate-700">Obj:</strong> {current_objective}
            </p>
          )}
        </div>

        <div>
          <span className="text-slate-400 font-medium uppercase text-[10px] tracking-wider block mb-1">
            Próximo Passo
          </span>
          <p className="font-semibold text-slate-800 text-sm">{current_next_step || 'A definir pelo mentor'}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-900" />
              {nextActionDisplay}
            </span>
            {typeof current_cadence_step === 'number' && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-medium">
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
            <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Prioridade:
            </span>
            <div className="flex items-center gap-1.5">
              {typeof priority_index === 'number' && (
                <span className="font-bold text-slate-900 text-sm">{priority_index} pt</span>
              )}
              {priority_class && (
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${getPriorityBadgeClass(priority_class)}`}>
                  {priority_class}
                </span>
              )}
            </div>
          </div>

          {/* Score — Trata Regra Dura: needs_mentor_classification */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium text-[11px]">Score de Condução:</span>
            {needs_mentor_classification ? (
              <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600" />
                Definir situação atual
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                {typeof mentor_score === 'number' && (
                  <span className="font-bold text-slate-900 text-sm">{mentor_score}/100</span>
                )}
                {mentor_score_class && (
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${getScoreBadgeClass(mentor_score_class)}`}>
                    {mentor_score_class}
                  </span>
                )}
              </div>
            )}
          </div>

          {potential && (
            <div className="text-[10px] text-slate-500 text-right">
              Potencial: <strong className="text-slate-700">{potential}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Explicações / Mentor Guidance */}
      {explanationsList.length > 0 && (
        <div className="text-xs bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 text-blue-950">
          <strong className="font-semibold text-blue-900">Orientação do Mentor:</strong>
          <ul className="list-disc list-inside mt-0.5 space-y-0.5">
            {explanationsList.map((exp, idx) => (
              <li key={idx} className="text-slate-700">
                {exp}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rodapé: Botões de Ação */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onExecutar?.(oportunidade)}
          className="bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Executar
        </button>

        <button
          type="button"
          onClick={() => onAtualizarSituacao?.(oportunidade)}
          className="border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          Atualizar situação
        </button>

        <button
          type="button"
          onClick={() => onAbrirFicha?.(oportunidade)}
          className="border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Abrir ficha
        </button>
      </div>
    </div>
  )
}
