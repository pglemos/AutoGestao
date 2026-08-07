import { describe, expect, it } from 'bun:test'

import {
  isInternalScript,
  OFFICIAL_PLACEHOLDERS,
  renderScript,
  resolveScriptRef,
  SOURCE_BLOCKED_STATUSES,
} from './script'

/**
 * Script Engine (TASK 16). Fonte: aba `05 Scripts` da matriz v1.
 *
 * Regra central: o renderer é ESTRITO. Variável obrigatória ausente nunca é
 * preenchida, adivinhada ou omitida — ela bloqueia o envio.
 */

describe('placeholders oficiais', () => {
  it('são exatamente os 15 da fonte', () => {
    expect(OFFICIAL_PLACEHOLDERS.size).toBe(15)
    expect(OFFICIAL_PLACEHOLDERS.has('{nome}')).toBe(true)
    expect(OFFICIAL_PLACEHOLDERS.has('{dataRetorno}')).toBe(true)
  })
})

describe('renderScript — caminho feliz', () => {
  it('substitui todas as variáveis fornecidas', () => {
    const result = renderScript('Oi, {nome}! Aqui é {vendedor}, da {loja}.', {
      nome: 'Ana',
      vendedor: 'Bruno',
      loja: 'MX Centro',
    })
    expect(result.scriptReady).toBe(true)
    expect(result.text).toBe('Oi, Ana! Aqui é Bruno, da MX Centro.')
    expect(result.missingVariables).toEqual([])
  })

  it('substitui todas as ocorrências da mesma variável', () => {
    const result = renderScript('{nome}, {nome} e {nome}', { nome: 'Ana' })
    expect(result.text).toBe('Ana, Ana e Ana')
  })

  it('preserva as quebras de linha CRLF da fonte', () => {
    const result = renderScript('Oi, {nome}!\r\n\r\nTudo bem?', { nome: 'Ana' })
    expect(result.text).toBe('Oi, Ana!\r\n\r\nTudo bem?')
  })
})

describe('renderScript — variável ausente bloqueia', () => {
  it('marca scriptReady=false e lista o que falta', () => {
    const result = renderScript('Oi, {nome}! Vi seu interesse no {veiculo}.', { nome: 'Ana' })
    expect(result.scriptReady).toBe(false)
    expect(result.missingVariables).toEqual(['veiculo'])
  })

  it('nunca inventa valor para a variável ausente', () => {
    const result = renderScript('Valor: {valorAvaliacao}', {})
    expect(result.text).toBeNull()
    expect(result.missingVariables).toEqual(['valorAvaliacao'])
  })

  it('trata string vazia e espaços em branco como ausência', () => {
    expect(renderScript('{nome}', { nome: '' }).missingVariables).toEqual(['nome'])
    expect(renderScript('{nome}', { nome: '   ' }).missingVariables).toEqual(['nome'])
  })

  it('lista várias ausências sem repetir', () => {
    const result = renderScript('{nome} {veiculo} {nome} {loja}', {})
    expect(result.missingVariables).toEqual(['nome', 'veiculo', 'loja'])
  })

  it('rejeita placeholder fora da lista oficial', () => {
    const result = renderScript('Oi {apelido}', { apelido: 'Aninha' })
    expect(result.scriptReady).toBe(false)
    expect(result.unknownPlaceholders).toEqual(['{apelido}'])
  })
})

describe('SCR-INTERNO — ação interna, não WhatsApp', () => {
  it('identifica script interno', () => {
    expect(isInternalScript('SCR-INTERNO')).toBe(true)
    expect(isInternalScript('SCR-INT-CAD01-T1')).toBe(false)
  })

  it('script interno nunca libera WhatsApp', () => {
    const result = renderScript('Verificar internamente', {}, { scriptId: 'SCR-INTERNO' })
    expect(result.allowWhatsApp).toBe(false)
    expect(result.isInternal).toBe(true)
  })

  it('script normal e completo libera WhatsApp', () => {
    const result = renderScript('Oi, {nome}!', { nome: 'Ana' }, { scriptId: 'SCR-INT-CAD01-T1' })
    expect(result.allowWhatsApp).toBe(true)
  })

  it('script normal incompleto NÃO libera WhatsApp', () => {
    const result = renderScript('Oi, {nome}!', {}, { scriptId: 'SCR-INT-CAD01-T1' })
    expect(result.allowWhatsApp).toBe(false)
  })
})

describe('resolveScriptRef — expansão {n} e bloqueios de fonte', () => {
  const catalog = new Set([
    'SCR-INT-CAD01-T1',
    'SCR-INT-CAD01-T2',
    'SCR-INT-CAD01-T3',
    'SCR-INT-CAD01-T4',
    'SCR-INT-CAD01-T5',
    'SCR-INT-CAD01-T6',
    'SCR-INTERNO',
  ])

  it('resolve ID direto', () => {
    const r = resolveScriptRef('SCR-INTERNO', { catalog, attempt: 1 })
    expect(r.resolved).toBe(true)
    expect(r.scriptId).toBe('SCR-INTERNO')
  })

  it('expande {n} usando o número da tentativa', () => {
    const r = resolveScriptRef('SCR-INT-CAD01-T{n}', { catalog, attempt: 3 })
    expect(r.resolved).toBe(true)
    expect(r.scriptId).toBe('SCR-INT-CAD01-T3')
  })

  it('não expande além das tentativas existentes', () => {
    const r = resolveScriptRef('SCR-INT-CAD01-T{n}', { catalog, attempt: 9 })
    expect(r.resolved).toBe(false)
    expect(r.reason).toBe('ATTEMPT_OUT_OF_RANGE')
  })

  it('referência inexistente não resolve e não inventa substituto', () => {
    const r = resolveScriptRef('SCR-NAO-EXISTE-01', { catalog, attempt: 1 })
    expect(r.resolved).toBe(false)
    expect(r.scriptId).toBeNull()
    expect(r.reason).toBe('NOT_FOUND')
  })

  it.each(Object.keys(SOURCE_BLOCKED_STATUSES))(
    '%s é reportado como SOURCE_BLOCKER, não como defeito do código',
    (statusId) => {
      const ref = SOURCE_BLOCKED_STATUSES[statusId as keyof typeof SOURCE_BLOCKED_STATUSES]
      const r = resolveScriptRef(ref, { catalog, attempt: 1, statusId })
      expect(r.resolved).toBe(false)
      expect(r.reason).toBe('SOURCE_BLOCKER')
    },
  )

  it('os 5 bloqueios de fonte estão registrados', () => {
    expect(Object.keys(SOURCE_BLOCKED_STATUSES).sort()).toEqual([
      'CAR-C07',
      'CAR-C08',
      'INT-N04',
      'INT-Q07',
      'POR-A04',
    ])
  })
})

describe('determinismo', () => {
  it('mesma entrada produz o mesmo resultado', () => {
    const a = renderScript('Oi {nome}, {veiculo}', { nome: 'Ana' })
    const b = renderScript('Oi {nome}, {veiculo}', { nome: 'Ana' })
    expect(a).toEqual(b)
  })
})
