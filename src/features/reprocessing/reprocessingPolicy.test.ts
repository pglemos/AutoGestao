import { describe, expect, test } from 'bun:test'
import { canExecuteReprocessing } from './reprocessingPolicy'
describe('reprocessing policy', () => { test('only administrators execute', () => { expect(canExecuteReprocessing('administrador_geral')).toBe(true); expect(canExecuteReprocessing('administrador_mx')).toBe(true); expect(canExecuteReprocessing('consultor_mx')).toBe(false); expect(canExecuteReprocessing('gerente')).toBe(false) }) })
