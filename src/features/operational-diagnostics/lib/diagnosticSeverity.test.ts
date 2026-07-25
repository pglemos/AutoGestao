import { describe, expect, test } from 'bun:test'
import { diagnosticSeverityLabel, normalizeDiagnosticSeverity } from './diagnosticSeverity'
describe('diagnostic severity', () => { test('normalizes unknown values safely', () => { expect(normalizeDiagnosticSeverity('danger')).toBe('critical'); expect(normalizeDiagnosticSeverity('whatever')).toBe('info'); expect(diagnosticSeverityLabel(normalizeDiagnosticSeverity(null))).toBe('Informativo') }) })
