import { describe, expect, test } from 'bun:test'
import { planModulesRepair, planResponsibleRepair, planStoreRepair } from './clientRepairs'

describe('reparo do consultor responsável', () => {
  test('promove o vínculo ativo mais antigo quando ninguém é responsável', () => {
    const plan = planResponsibleRepair([
      { id: 'b', active: true, assignment_role: 'apoio', created_at: '2026-03-01' },
      { id: 'a', active: true, assignment_role: 'apoio', created_at: '2026-01-01' },
    ])
    expect(plan).toEqual({ kind: 'promover-responsavel', assignmentId: 'a' })
  })

  test('não mexe quando já existe responsável', () => {
    const plan = planResponsibleRepair([{ id: 'a', active: true, assignment_role: 'responsavel', created_at: '2026-01-01' }])
    expect(plan.kind).toBe('nada-a-fazer')
  })

  test('ignora vínculos inativos', () => {
    const plan = planResponsibleRepair([{ id: 'a', active: false, assignment_role: 'apoio', created_at: '2026-01-01' }])
    expect(plan).toEqual({ kind: 'nada-a-fazer', reason: 'Nenhum consultor vinculado ao cliente.' })
  })
})

describe('reparo dos módulos', () => {
  test('aplica os módulos do produto quando o cliente não tem nenhum', () => {
    expect(planModulesRepair('pmr_7', [])).toEqual({ kind: 'aplicar-modulos-do-produto', programKey: 'pmr_7' })
  })

  test('não faz nada se já há módulo liberado', () => {
    expect(planModulesRepair('pmr_7', [{ enabled: true }]).kind).toBe('nada-a-fazer')
  })

  test('sem produto contratado não há o que aplicar', () => {
    expect(planModulesRepair(null, []).kind).toBe('nada-a-fazer')
  })
})

describe('reparo da loja principal', () => {
  test('vincula quando há exatamente uma loja livre equivalente', () => {
    const plan = planStoreRepair('Concessionária Alfa', [
      { id: 's1', name: 'Concessionaria Alfa' },
      { id: 's2', name: 'Beta Motors' },
    ])
    expect(plan).toEqual({ kind: 'vincular-loja', storeId: 's1', storeName: 'Concessionaria Alfa' })
  })

  test('com duas candidatas deixa a escolha para a equipe', () => {
    const plan = planStoreRepair('Alfa', [
      { id: 's1', name: 'Alfa Centro' },
      { id: 's2', name: 'Alfa Norte' },
    ])
    expect(plan.kind).toBe('nada-a-fazer')
    expect(plan).toMatchObject({ reason: expect.stringContaining('escolha manual') })
  })

  test('sem candidata equivalente não inventa vínculo', () => {
    expect(planStoreRepair('Alfa', [{ id: 's1', name: 'Beta' }]).kind).toBe('nada-a-fazer')
  })
})
