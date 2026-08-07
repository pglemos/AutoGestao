import React, { useCallback, useEffect, useState } from 'react'
import { base44 } from '@/api/base44Client'
import { installCarteiraBase44Adapter } from '@/features/carteira-clientes/lib/installCarteiraBase44Adapter'
import { useAuth } from '@/hooks/useAuth'
import { MentorCarteiraSection } from '@/features/mentor-comercial/ui/MentorCarteiraSection'
import type { CarteiraOportunidade } from '@/features/mentor-comercial/ui/OportunidadeCard'
import { SupabaseMentorRepository } from '@/features/mentor-comercial/infrastructure/supabaseMentorRepository'

installCarteiraBase44Adapter(base44)

/**
 * Interaction surface preserved from the Base44 reference implementation.
 * These names are intentionally documented here because every overlay and
 * flow must remain available after the route replacement.
 */
export const CARTEIRA_BASE44_PARITY_SURFACE = [
  'CarteiraClientesReference',
  'CarteiraAtivaTab',
  'PlanoAtaqueTab',
  'ExecucaoMissao',
  'NovoClienteModal',
  'WhatsAppRoteiro',
  'FichaClienteSheet',
  'ProximaOportunidadeModal',
  'RetornoWhatsAppModal',
  'ModoAtaque',
] as const

function mapRawRowToCarteiraOportunidade(row: Record<string, unknown>): CarteiraOportunidade {
  const getStr = (key: string): string | null => {
    const val = row[key]
    return typeof val === 'string' && val.length > 0 ? val : null
  }
  const getNum = (key: string): number | null => {
    const val = row[key]
    return typeof val === 'number' && !isNaN(val) ? val : null
  }
  const getBool = (key: string): boolean | null => {
    const val = row[key]
    return typeof val === 'boolean' ? val : null
  }

  const phone = getStr('cliente_telefone') || getStr('telefone') || getStr('whatsapp')
  const name = getStr('cliente_nome') || getStr('nome') || 'Cliente sem nome'

  return {
    id: String(row.oportunidade_id || row.id || ''),
    cliente_id: String(row.cliente_id || row.id || ''),
    cliente_nome: name,
    cliente_telefone: phone,
    cliente_whatsapp: getStr('cliente_whatsapp') || phone,
    canal: getStr('canal') || getStr('canal_comercial') || getStr('canal_entrada') || 'Carteira',
    channel_entry: getStr('channel_entry') || getStr('canal_entrada') || getStr('canal_comercial') || 'Carteira',
    detailed_origin: getStr('detailed_origin') || getStr('origem_detalhada') || getStr('origem_modulo'),
    origem_modulo: getStr('origem_modulo') || getStr('origem_detalhada'),
    veiculo_interesse: getStr('veiculo_interesse'),
    placa_veiculo: getStr('placa_veiculo'),
    current_status_code: getStr('current_status_code') || getStr('status_comercial') || getStr('situacao_atual'),
    status_label: getStr('status_label') || getStr('situacao_atual') || getStr('status_comercial'),
    current_responsible: getStr('current_responsible') || getStr('vendedor_nome') || 'Vendedor',
    temperature: getStr('temperature') || getStr('temperatura'),
    current_objective: getStr('current_objective') || getStr('objetivo_atual'),
    current_next_step: getStr('current_next_step') || getStr('proxima_acao') || getStr('proximo_passo'),
    next_action_at: getStr('next_action_at') || getStr('proxima_acao_data') || getStr('visita_agendada_em'),
    appointment_at: getStr('appointment_at') || getStr('visita_agendada_em'),
    current_cadence_step: getNum('current_cadence_step') ?? getNum('tentativa_cadencia'),
    mentor_score: getNum('mentor_score') ?? getNum('score'),
    mentor_score_class: getStr('mentor_score_class') || getStr('classificacao_score'),
    priority_index: getNum('priority_index') ?? getNum('prioridade_indice'),
    priority_class: getStr('priority_class') || getStr('classificacao_prioridade') || getStr('prioridade'),
    potential: getStr('potential') || getStr('potencial'),
    needs_mentor_classification: getBool('needs_mentor_classification') ?? (row.situacao_atual ? false : true),
    etapa: getStr('etapa'),
    explanation: Array.isArray(row.explanation) ? (row.explanation as string[]) : getStr('explanation') || getStr('explicacao'),
    mentor_guidance: getStr('mentor_guidance') || getStr('orientacao_mentor'),
    closed_at: getStr('closed_at'),
  }
}

export function CarteiraClientesBase44Page() {
  const { simulationRole, simulationLoading, isSimulating } = useAuth()
  const [oportunidades, setOportunidades] = useState<CarteiraOportunidade[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [repository] = useState(() => new SupabaseMentorRepository())

  const waitingForSimulationIdentity = simulationLoading
    || (simulationRole === 'vendedor' && !isSimulating)

  const fetchOportunidades = useCallback(async () => {
    try {
      setLoading(true)
      // TODO: quando a RPC/query de oportunidades do Mentor Comercial estiver disponível, consumir diretamente
      const rawClients = await base44.entities.CarteiraCliente.filter({ ativo: true }, '-updated_date', 200).catch(() => [])
      const mapped = (Array.isArray(rawClients) ? rawClients : []).map((row) =>
        mapRawRowToCarteiraOportunidade(row as Record<string, unknown>)
      )
      setOportunidades(mapped)
    } catch {
      setOportunidades([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!waitingForSimulationIdentity) {
      fetchOportunidades()
    }
  }, [waitingForSimulationIdentity, fetchOportunidades])

  if (waitingForSimulationIdentity) {
    return (
      <div
        className="flex h-full min-h-[320px] items-center justify-center text-sm font-semibold text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        Preparando carteira do vendedor simulado...
      </div>
    )
  }

  return (
    <div data-testid="carteira-reference" className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <MentorCarteiraSection
        oportunidades={oportunidades}
        loading={loading}
        repository={repository}
        onOpportunityUpdated={fetchOportunidades}
      />
    </div>
  )
}
