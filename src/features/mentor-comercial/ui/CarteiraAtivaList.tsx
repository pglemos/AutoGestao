/**
 * Componente CarteiraAtivaList — Mentor Comercial (TASK 28 / TAREFA A04).
 *
 * Lista de oportunidades da Carteira Ativa em UMA coluna (cards horizontais largos em desktop,
 * empilhados em mobile).
 *
 * Regras principais:
 * 1. Ordenação padrão via `carteiraOrdering.ts`: prioridade desc, nextAction asc, potencial desc, score asc.
 * 2. Exibe somente oportunidades ativas que exigem desenvolvimento quando a busca estiver vazia.
 * 3. Quando houver termo de busca, encontra também encerrados por nome, telefone, WhatsApp, veículo e placa.
 * 4. NÃO possui aba "Base Completa".
 */

import React, { useMemo, useState } from 'react'
import { Briefcase, Filter, Search, X } from 'lucide-react'
import { isEtapaTerminal } from '../../../lib/schemas/crm.schema'
import { OportunidadeCard, type CarteiraOportunidade } from './OportunidadeCard'
import { sortCarteiraAtiva } from './carteiraOrdering'

export type CarteiraAtivaListProps = {
  oportunidades?: CarteiraOportunidade[]
  onExecutar?: (op: CarteiraOportunidade) => void
  onAtualizarSituacao?: (op: CarteiraOportunidade) => void
  onAbrirFicha?: (op: CarteiraOportunidade) => void
  loading?: boolean
}

function matchesSearch(op: CarteiraOportunidade, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase().trim()
  const qDigits = query.replace(/\D/g, '')

  // 1. Nome do cliente
  if (op.cliente_nome?.toLowerCase().includes(q)) return true

  // 2. Telefone
  if (op.cliente_telefone) {
    if (op.cliente_telefone.toLowerCase().includes(q)) return true
    if (qDigits && op.cliente_telefone.replace(/\D/g, '').includes(qDigits)) return true
  }

  // 3. WhatsApp
  if (op.cliente_whatsapp) {
    if (op.cliente_whatsapp.toLowerCase().includes(q)) return true
    if (qDigits && op.cliente_whatsapp.replace(/\D/g, '').includes(qDigits)) return true
  }

  // 4. Veículo de interesse
  if (op.veiculo_interesse?.toLowerCase().includes(q)) return true

  // 5. Placa do veículo
  if (op.placa_veiculo?.toLowerCase().includes(q)) return true

  return false
}

export const CarteiraAtivaList: React.FC<CarteiraAtivaListProps> = ({
  oportunidades = [],
  onExecutar,
  onAtualizarSituacao,
  onAbrirFicha,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredAndSortedOportunidades = useMemo(() => {
    const q = searchTerm.trim()

    const list = oportunidades.filter((op) => {
      if (q !== '') {
        // Busca encontra ativas e encerrados por nome, telefone, WhatsApp, veículo e placa
        return matchesSearch(op, q)
      }
      // Sem busca: somente oportunidades ativas que exigem desenvolvimento
      return !isEtapaTerminal(op.etapa)
    })

    // Ordenação determinística padrão: prioridade desc, nextAction asc, potencial desc, score asc
    return sortCarteiraAtiva(list)
  }, [oportunidades, searchTerm])

  const totalAtivasCount = useMemo(() => {
    return oportunidades.filter((op) => !isEtapaTerminal(op.etapa)).length
  }, [oportunidades])

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 p-4 md:p-6">
      {/* Topo / Barra de Ferramentas e Busca */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-status-info-text" />
            <h2 className="text-xl font-bold text-foreground">Carteira Ativa</h2>
            <span className="bg-status-info-surface text-status-info-text text-xs font-bold px-2.5 py-0.5 rounded-full border border-status-info/30">
              {totalAtivasCount} ativas
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Oportunidades organizadas por prioridade, data de ação, potencial e score de condução.
          </p>
        </div>

        {/* Input de busca */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nome, tel, WhatsApp, veículo, placa..."
            className="w-full pl-9 pr-8 py-2 bg-surface-alt border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-status-info focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Indicador se a busca expandiu para encerrados */}
      {searchTerm.trim() !== '' && (
        <div className="bg-status-info-surface border border-status-info/20 rounded-lg px-4 py-2 text-xs text-status-info-text flex items-center justify-between">
          <span>
            Exibindo resultados da busca para &quot;<strong>{searchTerm}</strong>&quot; (inclui ativas e encerradas).
          </span>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="text-status-info-text underline hover:text-status-info-text font-medium"
          >
            Limpar busca
          </button>
        </div>
      )}

      {/* Lista de Cards — UMA COLUNA NO DESKTOP, EMPILHADO NO MOBILE */}
      {loading ? (
        <div className="w-full bg-white rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">
          Carregando oportunidades da carteira ativa...
        </div>
      ) : filteredAndSortedOportunidades.length === 0 ? (
        <div className="w-full bg-white rounded-xl border border-border p-12 text-center flex flex-col items-center gap-3">
          <Filter className="w-10 h-10 text-text-disabled" />
          <h3 className="text-base font-bold text-foreground">Nenhuma oportunidade encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            {searchTerm
              ? `Nenhuma oportunidade (ativa ou encerrada) encontrada para "${searchTerm}".`
              : 'Não há oportunidades ativas pendentes de desenvolvimento no momento.'}
          </p>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="mt-2 bg-status-info text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-status-info transition-colors"
            >
              Limpar filtro de busca
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {filteredAndSortedOportunidades.map((op) => (
            <OportunidadeCard
              key={op.id}
              oportunidade={op}
              onExecutar={onExecutar}
              onAtualizarSituacao={onAtualizarSituacao}
              onAbrirFicha={onAbrirFicha}
            />
          ))}
        </div>
      )}
    </div>
  )
}
