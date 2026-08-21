import { describe, expect, test } from 'bun:test'
import { buildStoreHierarchyPlan, resolveUnitStoreId } from './createClientProgram'

describe('hierarquia operacional do cadastro de cliente', () => {
  test('separa matriz e filiais na ordem do wizard', () => {
    const result = buildStoreHierarchyPlan({
      units: [
        { name: 'Matriz Centro', city: 'Goiânia', state: 'GO', is_primary: true },
        { name: 'Filial Norte', city: 'Anápolis', state: 'GO', is_primary: false },
        { name: 'Filial Sul', city: 'Aparecida', state: 'GO', is_primary: false },
      ],
    })

    expect(result).toEqual({
      primaryUnitName: 'Matriz Centro',
      filialUnitNames: ['Filial Norte', 'Filial Sul'],
    })
  })

  test('usa a primeira unidade como matriz quando o draft ainda não marcou uma', () => {
    expect(buildStoreHierarchyPlan({ units: [{ name: 'Única', city: '', state: '', is_primary: false }] })).toEqual({
      primaryUnitName: 'Única',
      filialUnitNames: [],
    })
  })

  test('ignora linhas vazias sem criar lojas órfãs', () => {
    expect(buildStoreHierarchyPlan({ units: [{ name: '  ', city: '', state: '', is_primary: true }] })).toEqual({
      primaryUnitName: '',
      filialUnitNames: [],
    })
  })

  test('resolve matriz e filiais para os ids operacionais', () => {
    const hierarchy = {
      primaryStoreId: 'store-matrix',
      storeIdsByName: { 'filial norte': 'store-north' },
    }
    expect(resolveUnitStoreId({ name: 'Matriz renomeada', is_primary: true }, hierarchy)).toBe('store-matrix')
    expect(resolveUnitStoreId({ name: 'Filial Norte', is_primary: false }, hierarchy)).toBe('store-north')
    expect(resolveUnitStoreId({ name: 'Sem vínculo', is_primary: false }, hierarchy)).toBeNull()
  })
})
