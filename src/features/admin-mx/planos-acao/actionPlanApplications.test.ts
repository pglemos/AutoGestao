import { describe, expect, test } from 'bun:test'
import {
  applicationMetrics,
  applicationStatusLabel,
  calculateWeightedProgress,
  efficacyLabel,
  type ApplicationPlan,
  type ChecklistItem,
} from './actionPlanApplications'

function plan(overrides: Partial<ApplicationPlan> = {}): ApplicationPlan {
  return {
    id: 'p1',
    codigo: 'PA-001',
    departamento: 'Vendas',
    indicador: 'Vendas Totais',
    problema: 'Problema',
    acao: 'Ação',
    status: 'em_andamento',
    prioridade: 'alta',
    prazo: '2026-10-01',
    progresso: 0,
    eficacia_score: null,
    eficacia_nota: null,
    responsavel_id: null,
    checklist: null,
    createdAt: '2026-08-15T12:00:00Z',
    storeId: 'store-1',
    storeName: 'Loja A',
    clientId: 'client-1',
    clientName: 'Auto Up',
    ...overrides,
  }
}

describe('actionPlanApplications — progresso ponderado', () => {
  test('sem checklist usa o progresso gravado', () => {
    expect(calculateWeightedProgress(null, 42)).toEqual({ percentage: 42, completedCount: 0, totalCount: 0 })
    expect(calculateWeightedProgress([], 10)).toEqual({ percentage: 10, completedCount: 0, totalCount: 0 })
  })

  test('peso das concluídas divide pelo total', () => {
    const items: ChecklistItem[] = [
      { titulo: 'A1', como: null, peso_bp: 5000, peso_pct: '50.00%', status: 'concluido' },
      { titulo: 'A2', como: null, peso_bp: 5000, peso_pct: '50.00%', status: 'pendente' },
    ]
    const result = calculateWeightedProgress(items, 0)
    expect(result.percentage).toBe(50)
    expect(result.completedCount).toBe(1)
    expect(result.totalCount).toBe(2)
  })

  test('todas concluídas dão 100%', () => {
    const items: ChecklistItem[] = [
      { titulo: 'A1', como: null, peso_bp: 3333, peso_pct: '33.33%', status: 'concluido' },
      { titulo: 'A2', como: null, peso_bp: 3333, peso_pct: '33.33%', status: 'concluida' },
      { titulo: 'A3', como: null, peso_bp: 3334, peso_pct: '33.34%', status: 'realizado' },
    ]
    expect(calculateWeightedProgress(items, 0).percentage).toBe(100)
  })

  test('nenhuma concluída dá 0%', () => {
    const items: ChecklistItem[] = [
      { titulo: 'A1', como: null, peso_bp: 5000, peso_pct: '50.00%', status: 'pendente' },
      { titulo: 'A2', como: null, peso_bp: 5000, peso_pct: '50.00%', status: 'em_andamento' },
    ]
    expect(calculateWeightedProgress(items, 0).percentage).toBe(0)
  })
})

describe('actionPlanApplications — rótulos', () => {
  test('status conhecidos viram rótulos amigáveis', () => {
    expect(applicationStatusLabel('concluido')).toBe('Concluída')
    expect(applicationStatusLabel('em_andamento')).toBe('Em andamento')
    expect(applicationStatusLabel('atrasado')).toBe('Atrasada')
    expect(applicationStatusLabel(null)).toBe('—')
  })

  test('eficácia pelo score', () => {
    expect(efficacyLabel(null)).toBeNull()
    expect(efficacyLabel(85)).toBe('Eficaz')
    expect(efficacyLabel(50)).toBe('Parcialmente eficaz')
    expect(efficacyLabel(10)).toBe('Ineficaz')
  })
})

describe('actionPlanApplications — métricas', () => {
  test('conta planos, clientes e status', () => {
    const plans = [
      plan({ id: 'p1', status: 'em_andamento', clientId: 'c1' }),
      plan({ id: 'p2', status: 'atrasado', clientId: 'c1' }),
      plan({ id: 'p3', status: 'concluido', clientId: 'c2' }),
      plan({ id: 'p4', status: 'validando_eficacia', clientId: 'c3' }),
    ]
    const metrics = applicationMetrics(plans)
    expect(metrics.total).toBe(4)
    expect(metrics.clients).toBe(3)
    expect(metrics.emAndamento).toBe(1)
    expect(metrics.atrasadas).toBe(1)
    expect(metrics.concluidas).toBe(1)
    expect(metrics.validando).toBe(1)
  })
})
