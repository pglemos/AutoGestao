import { useState } from 'react'
import { Info, BarChart3, Building2, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import {
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { useClientPortfolio } from './clientes/useClientPortfolio'

interface BenchmarkRow {
  indicator: string
  yourStore: string
  groupAvg: string
  top25: string
  status: 'BOM' | 'ATENCAO' | 'CRITICO'
}

const DEFAULT_BENCHMARK_ROWS: BenchmarkRow[] = [
  {
    indicator: 'Margem Média de Venda',
    yourStore: '11,2%',
    groupAvg: '13,1%',
    top25: '15,8%',
    status: 'ATENCAO',
  },
  {
    indicator: 'Conversão Visitas → Venda',
    yourStore: '24,0%',
    groupAvg: '27,0%',
    top25: '32,0%',
    status: 'ATENCAO',
  },
  {
    indicator: 'Estoque > 90 dias',
    yourStore: '28%',
    groupAvg: '24%',
    top25: '15%',
    status: 'ATENCAO',
  },
  {
    indicator: 'Giro de Estoque (meses)',
    yourStore: '0,61',
    groupAvg: '0,78',
    top25: '1,15',
    status: 'ATENCAO',
  },
  {
    indicator: 'Custo por Venda',
    yourStore: 'R$ 2.350',
    groupAvg: 'R$ 2.150',
    top25: 'R$ 1.650',
    status: 'ATENCAO',
  },
  {
    indicator: 'Margem de Contribuição',
    yourStore: '18,7%',
    groupAvg: '18,7%',
    top25: '21%',
    status: 'BOM',
  },
]

export function AdminBenchmarkPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const { rows: clients } = useClientPortfolio()
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  const selectedClient = clients.find(c => c.id === selectedClientId || c.slug === selectedClientId)

  return (
    <MxModulePage id="admin-mx-benchmark" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={BarChart3}
          eyebrow="Produto e Metodologia"
          title="Benchmark e Mercado"
          description="Comparação de performance com grupos e lojas similares do setor automotivo"
        />

        {/* Banner de Requisitos da Metodologia */}
        <div className="bg-status-warning-bg border border-status-warning-border rounded-xl p-4 flex items-start gap-3">
          <Info size={16} className="text-status-warning-text mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold text-sm text-status-warning-text mb-1">
              PAINEL DE BENCHMARK DO SETOR
            </div>
            <div className="text-xs text-status-warning-text">
              A consolidação de mercado exige massa mínima de 5 lojas ativas na base comparável e anonimização rigorosa. Informações confidenciais individuais nunca são exibidas a terceiros.
            </div>
          </div>
        </div>

        {/* Filtro de Seleção de Cliente / Loja */}
        {clients.length > 0 ? (
          <MxSectionCard>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  Cliente de Referência:
                </span>
                <select
                  aria-label="Cliente de Referência"
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="text-xs bg-surface-alt border border-border rounded-lg px-3 py-1.5 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">Todos os clientes (Visão Consolidada MX)</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.primary_store_city || 'Matriz'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClient ? (
                <div className="text-xs text-muted-foreground">
                  Fase: <span className="font-medium text-foreground">{selectedClient.business_phase || 'PMR'}</span> • Status: <span className="font-medium text-foreground">{selectedClient.status}</span>
                </div>
              ) : null}
            </div>
          </MxSectionCard>
        ) : null}

        {/* Tabela de Indicadores Comparados */}
        <MxSectionCard>
          <div className="p-5 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-foreground" />
              <h3 className="font-semibold text-sm text-foreground">
                Indicadores Comparados
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-status-success-text inline-block" />
                Sua Empresa
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-status-info-text inline-block" />
                Média do Grupo
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="w-3 h-3 rounded-full bg-foreground inline-block" />
                Top 25%
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-alt border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Indicador
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-status-success-text uppercase">
                    Sua Empresa
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-status-info-text uppercase">
                    Média do Grupo
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-foreground uppercase">
                    Top 25%
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEFAULT_BENCHMARK_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-surface-alt transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">
                      {row.indicator}
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-status-success-text">
                      {row.yourStore}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.groupAvg}
                    </td>
                    <td className="px-4 py-3 text-center text-foreground font-medium">
                      {row.top25}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 border ${
                          row.status === 'BOM'
                            ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                            : row.status === 'CRITICO'
                              ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                              : 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                        }`}
                      >
                        {row.status === 'BOM' ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <AlertTriangle size={12} />
                        )}
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </MxSectionCard>
      </div>
    </MxModulePage>
  )
}

export default AdminBenchmarkPage
