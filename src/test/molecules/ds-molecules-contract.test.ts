import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { ariaSortFor } from '@/components/molecules/SortControl'
import { initialsFrom } from '@/components/molecules/UserSummary'

const root = process.cwd()
const read = (name: string) =>
  readFileSync(resolve(root, 'src/components/molecules', name), 'utf8')

/** Moléculas criadas sobre a arquitetura de tokens (§9.2). */
const DS_MOLECULES = [
  'AlertMessage.tsx',
  'ErrorState.tsx',
  'FilterChip.tsx',
  'LoadingState.tsx',
  'MetricCard.tsx',
  'NotificationItem.tsx',
  'Pagination.tsx',
  'SearchField.tsx',
  'SortControl.tsx',
  'UserSummary.tsx',
  'ViewModeSelector.tsx',
] as const

describe('moléculas do MX Design System', () => {
  it('estão todas exportadas pelo barrel', () => {
    const barrel = read('index.ts')
    for (const file of DS_MOLECULES) {
      const name = file.replace('.tsx', '')
      expect(barrel, `${name} ausente em molecules/index.ts`).toContain(`from './${name}'`)
    }
  })

  it('não contém hex literal (§8.5)', () => {
    for (const file of DS_MOLECULES) {
      expect(read(file), `${file} tem hex hardcoded`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('não bifurca a aparência por perfil (§8.5)', () => {
    for (const file of DS_MOLECULES) {
      expect(read(file), `${file} bifurca por perfil`).not.toMatch(/useMxSurfaceVisualMode/)
    }
  })

  it('só referencia tokens semânticos, nunca primitivos', () => {
    for (const file of [...DS_MOLECULES, 'fieldStyles.ts']) {
      const offenders = [
        ...read(file).matchAll(/var\(--mx-(green|neutral|emerald|amber|red|blue)-\d+\)/g),
      ].map(([match]) => match)
      expect(offenders, `${file} usa primitivo direto`).toEqual([])
    }
  })

  it('mantém foco visível em todo controle interativo', () => {
    for (const file of DS_MOLECULES) {
      const source = read(file)
      if (!source.includes('<button')) continue
      expect(source, `${file} tem botão sem focus-visible`).toContain('focus-visible:ring-')
    }
  })

  it('diferencia rede, permissão, servidor e desconhecido no estado de erro (§12.2)', () => {
    const source = read('ErrorState.tsx')
    for (const kind of ['network', 'permission', 'server', 'unknown']) {
      expect(source).toContain(`${kind}:`)
    }
    // Nova tentativa é oferecida e bloqueia clique duplicado enquanto executa.
    expect(source).toContain('onRetry')
    expect(source).toContain('disabled={retrying}')
    // Detalhe técnico vira referência: a exceção crua nunca chega ao usuário —
    // o componente não aceita um Error, só um código de suporte.
    expect(source).toContain('Código de referência')
    expect(source).toContain('reference?: string')
    expect(source).not.toMatch(/error\??\s*:\s*(Error|unknown)/)
    expect(source).not.toMatch(/\.stack\b/)
  })

  it('anuncia erro com assertividade e informação com polidez (§14)', () => {
    const source = read('AlertMessage.tsx')
    expect(source).toContain("role={tone === 'danger' ? 'alert' : 'status'}")
    expect(source).toContain("'assertive'")
    expect(source).toContain("'polite'")
  })

  it('nunca usa cor como único indicador', () => {
    // Tendência de métrica: seta + descrição textual, não só verde/vermelho.
    const metric = read('MetricCard.tsx')
    expect(metric).toContain('trendDescriptions')
    expect(metric).toContain('VisuallyHidden')

    // Filtro selecionado: aria-pressed, não só fundo colorido.
    expect(read('FilterChip.tsx')).toContain('aria-pressed={selected}')

    // Notificação não lida: texto além do ponto.
    expect(read('NotificationItem.tsx')).toContain('(não lida)')

    // Alerta: prefixo textual do tom.
    expect(read('AlertMessage.tsx')).toContain('prefix')
  })

  it('devolve o foco ao input depois de limpar a busca (§13.1)', () => {
    const source = read('SearchField.tsx')
    expect(source).toContain('innerRef.current?.focus()')
    // Placeholder não substitui label.
    expect(source).toContain('label: string')
    expect(source).toContain('htmlFor={inputId}')
  })

  it('expõe o modo de visualização como radiogroup navegável por setas', () => {
    const source = read('ViewModeSelector.tsx')
    expect(source).toContain("role=\"radiogroup\"")
    expect(source).toContain("role=\"radio\"")
    expect(source).toContain('ArrowRight')
    expect(source).toContain('ArrowLeft')
    expect(source).toContain('tabIndex={selected ? 0 : -1}')
  })

  it('formata contagens de paginação em pt-BR', () => {
    expect(read('Pagination.tsx')).toContain("Intl.NumberFormat('pt-BR')")
  })

  it('ariaSortFor traduz a direção para o valor ARIA', () => {
    expect(ariaSortFor('asc')).toBe('ascending')
    expect(ariaSortFor('desc')).toBe('descending')
    expect(ariaSortFor(null)).toBe('none')
  })

  it('initialsFrom lida com nome vazio, único e composto', () => {
    expect(initialsFrom('')).toBe('?')
    expect(initialsFrom('Pedro')).toBe('PE')
    expect(initialsFrom('Pedro Guilherme Lemos')).toBe('PL')
    expect(initialsFrom('  ana   maria  ')).toBe('AM')
  })
})
