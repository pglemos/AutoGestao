import { describe, expect, test } from 'bun:test'
import { canExportInternalReport } from './reportPolicy'
describe('report policy', () => { test('admin exports and consultant exports only owned scope', () => { expect(canExportInternalReport('administrador_mx')).toBe(true); expect(canExportInternalReport('consultor_mx', true)).toBe(true); expect(canExportInternalReport('consultor_mx', false)).toBe(false); expect(canExportInternalReport('gerente', true)).toBe(false) }) })
