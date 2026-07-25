import { describe, expect, test } from 'bun:test'
import { canCompleteCorrectiveAction } from './diagnosticPolicy'
describe('diagnostic policy', () => { test('consultant completes only owned scope', () => { expect(canCompleteCorrectiveAction({ role: 'administrador_mx', ownsScope: false })).toBe(true); expect(canCompleteCorrectiveAction({ role: 'consultor_mx', ownsScope: true })).toBe(true); expect(canCompleteCorrectiveAction({ role: 'consultor_mx', ownsScope: false })).toBe(false) }) })
