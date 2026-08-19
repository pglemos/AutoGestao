import { describe, expect, it } from 'bun:test'
import {
  calculatePlanProgress,
  calculateWeights,
  generateTemplateCode,
  reorderItems,
  suggestTitle,
} from './actionPlanOperations'

describe('actionPlanOperations', () => {
  describe('calculatePlanProgress', () => {
    it('retorna 0 para lista vazia ou nula', () => {
      expect(calculatePlanProgress([])).toEqual({ percentage: 0, completedCount: 0, totalCount: 0 })
      expect(calculatePlanProgress(null)).toEqual({ percentage: 0, completedCount: 0, totalCount: 0 })
    })

    it('calcula progresso por proporção simples quando não há basis points', () => {
      const items = [
        { status: 'concluido' },
        { status: 'pendente' },
        { status: 'em_andamento' },
        { status: 'concluido' },
      ]
      expect(calculatePlanProgress(items)).toEqual({
        percentage: 50,
        completedCount: 2,
        totalCount: 4,
      })
    })

    it('calcula progresso ponderado usando weight_basis_points', () => {
      const items = [
        { status: 'concluido', weight_basis_points: 6000 },
        { status: 'pendente', weight_basis_points: 4000 },
      ]
      expect(calculatePlanProgress(items)).toEqual({
        percentage: 60,
        completedCount: 1,
        totalCount: 2,
      })
    })
  })

  describe('calculateWeights', () => {
    it('retorna lista vazia para 0 ações', () => {
      expect(calculateWeights(0)).toEqual([])
    })

    it('divide 10000 pontos igualmente para 3 ações', () => {
      const weights = calculateWeights(3)
      expect(weights).toHaveLength(3)
      expect(weights[0].weight_basis_points).toBe(3334)
      expect(weights[1].weight_basis_points).toBe(3333)
      expect(weights[2].weight_basis_points).toBe(3333)
      const sum = weights.reduce((acc, w) => acc + w.weight_basis_points, 0)
      expect(sum).toBe(10000)
    })
  })

  describe('suggestTitle', () => {
    it('sugere título com base na direção e nome do indicador', () => {
      expect(suggestTitle('increase', 'faturamento')).toBe('Aumentar faturamento')
      expect(suggestTitle('decrease', 'taxa de cancelamento')).toBe('Reduzir taxa de cancelamento')
      expect(suggestTitle('AUMENTAR', 'conversão de leads')).toBe('Aumentar conversão de leads')
      expect(suggestTitle(null, 'ticket médio')).toBe('Melhorar ticket médio')
    })
  })

  describe('generateTemplateCode', () => {
    it('gera código no padrão com prefixo de departamento e indicador', () => {
      const code = generateTemplateCode('comercial', 'sales_door_flow', [])
      expect(code).toBe('PA_COMERCIAL_SALESDOORFLOW_001')
    })

    it('incrementa a sequência quando já existem códigos com o mesmo prefixo', () => {
      const existing = [
        'PA_COMERCIAL_SALESDOORFLOW_001',
        'PA_COMERCIAL_SALESDOORFLOW_002',
      ]
      const code = generateTemplateCode('comercial', 'sales_door_flow', existing)
      expect(code).toBe('PA_COMERCIAL_SALESDOORFLOW_003')
    })
  })

  describe('reorderItems', () => {
    it('reordena item preservando imutabilidade', () => {
      const list = ['A', 'B', 'C', 'D']
      const reordered = reorderItems(list, 1, 3)
      expect(reordered).toEqual(['A', 'C', 'D', 'B'])
      expect(list).toEqual(['A', 'B', 'C', 'D'])
    })

    it('retorna cópia idêntica se índices forem inválidos', () => {
      const list = ['A', 'B']
      expect(reorderItems(list, -1, 1)).toEqual(['A', 'B'])
      expect(reorderItems(list, 0, 5)).toEqual(['A', 'B'])
    })
  })
})
