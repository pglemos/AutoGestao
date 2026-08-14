import { describe, expect, test } from 'bun:test'

import {
  SEMANTIC_RULES,
  auditSemanticRuleText,
  runZIndexAudit,
  unknownScaleTokens,
} from '../../scripts/lint-z-index.mjs'

describe('lint-z-index — semântica determinística por ocorrência', () => {
  test('token em OUTRA linha/elemento do mesmo arquivo não gera falso positivo', () => {
    const source = [
      '<div className="fixed inset-0 z-[var(--mx-z-modal)]" />',
      '<span className="z-[var(--mx-z-popover)]" />',
    ].join('\n')
    expect(auditSemanticRuleText(source, { token: 'mx-z-modal', lines: [1] })).toEqual([])
  })

  test('token errado na linha pinada é problema', () => {
    const source = '<div className="z-[var(--mx-z-popover)]" />'
    expect(auditSemanticRuleText(source, { token: 'mx-z-modal', lines: [1] })).toHaveLength(1)
  })

  test('linha pinada sem z-index é problema', () => {
    const source = '<div className="p-4" />'
    expect(auditSemanticRuleText(source, { token: 'mx-z-modal', lines: [1] })).toHaveLength(1)
  })

  test('linha pinada com z numérico é problema', () => {
    const zArbitrary = `z-[${60}]`
    const zNumeric = `z-${50}`
    expect(auditSemanticRuleText(`<div className="${zArbitrary}" />`, { token: 'mx-z-modal', lines: [1] })).toHaveLength(1)
    expect(auditSemanticRuleText(`<div className="${zNumeric}" />`, { token: 'mx-z-modal', lines: [1] })).toHaveLength(1)
  })

  test('linha pinada ausente é problema', () => {
    expect(auditSemanticRuleText('<div />', { token: 'mx-z-modal', lines: [5] })).toHaveLength(1)
  })

  test('zIndex inline com var semântica é aceito', () => {
    const source = "const s = { position: 'fixed', zIndex: 'var(--mx-z-tooltip)' }"
    expect(auditSemanticRuleText(source, { token: 'mx-z-tooltip', lines: [1] })).toEqual([])
  })

  test('linha pinada com dois tokens distintos é problema', () => {
    const source = '<div className="z-[var(--mx-z-modal)] z-[var(--mx-z-popover)]" />'
    expect(auditSemanticRuleText(source, { token: 'mx-z-modal', lines: [1] })).toHaveLength(1)
  })
})

describe('lint-z-index — escala fechada de tokens (var(--mx-z-*))', () => {
  const unknown = (name) => `var(--mx-z-${name})`

  test('token conhecido da escala não é problema', () => {
    expect(unknownScaleTokens('className="z-[var(--mx-z-modal)]"')).toEqual({})
  })

  test('token desconhecido em classe z-[var(...)] é problema', () => {
    expect(unknownScaleTokens(`className="z-[${unknown('peek')}]"`)).toEqual({ 'mx-z-peek': 1 })
  })

  test('token desconhecido em zIndex inline é problema', () => {
    expect(unknownScaleTokens(`zIndex: '${unknown('custom')}'`)).toEqual({ 'mx-z-custom': 1 })
  })

  test('token desconhecido em declaração CSS z-index é problema', () => {
    expect(unknownScaleTokens(`z-index: ${unknown('custom')};`)).toEqual({ 'mx-z-custom': 1 })
  })

  test('conta ocorrências e ignora os tokens conhecidos', () => {
    const source = `a ${unknown('modal')} b ${unknown('ghost')} c ${unknown('modal')} d ${unknown('popover')}`
    expect(unknownScaleTokens(source)).toEqual({ 'mx-z-ghost': 1 })
  })

  test('nenhum token desconhecido na escala fechada do checkout real', () => {
    const { counts } = runZIndexAudit()
    expect(counts.unknownScaleTotal).toBe(0)
  })
})

describe('contrato das 25 regras semânticas no checkout real', () => {
  test('são exatamente 25 regras por ocorrência', () => {
    expect(SEMANTIC_RULES).toHaveLength(25)
  })

  test('todas as regras passam no estado atual', () => {
    const { problems } = runZIndexAudit()
    expect(problems).toEqual([])
  })

  test('escala fechada e exceção de superfície pública preservadas', () => {
    const { counts } = runZIndexAudit()
    expect(counts.arbitraryTotal).toBe(0)
    expect(counts.numericTotal).toBe(0)
    expect(counts.declarationTotal).toBe(0)
    expect(counts.inlineTotal).toBe(0)
  })
})
