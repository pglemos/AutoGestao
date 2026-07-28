import { expect, test } from 'bun:test'
import { clearActionPlanLaunchContext, readActionPlanLaunchContext } from './actionPlanLaunchContext'

test('abre o formulário canônico com contexto da Consultoria', () => {
  const result = readActionPlanLaunchContext('?storeId=loja-1&createAction=1&origin=consulting&visitId=visita-2&indicator=Consultoria')
  expect(result.autoOpen).toBe(true)
  expect(result.initialValues.origin).toBe('consulting')
  expect(result.initialValues.indicator).toBe('Consultoria')
  expect(result.initialValues.evidenceRequired).toBe(true)
})

test('remove somente os parâmetros transitórios após consumir o lançamento', () => {
  expect(clearActionPlanLaunchContext('?storeId=loja-1&createAction=1&origin=consulting&visitId=v1')).toBe('?storeId=loja-1')
})
