import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (name: string) => readFileSync(resolve(root, 'src/components/atoms', name), 'utf8')

/** Átomos criados sobre a arquitetura de tokens (§9.1). */
const DS_ATOMS = [
  'Checkbox.tsx',
  'Divider.tsx',
  'IconButton.tsx',
  'Kbd.tsx',
  'Label.tsx',
  'Link.tsx',
  'Progress.tsx',
  'Radio.tsx',
  'Spinner.tsx',
  'StatusDot.tsx',
  'Switch.tsx',
  'VisuallyHidden.tsx',
] as const

describe('átomos do MX Design System', () => {
  it('estão todos exportados pelo barrel', () => {
    const barrel = read('index.ts')
    for (const file of DS_ATOMS) {
      const name = file.replace('.tsx', '')
      expect(barrel, `${name} ausente em atoms/index.ts`).toContain(`from './${name}'`)
    }
  })

  it('não contém hex literal — cores só via token semântico (§8.5)', () => {
    for (const file of DS_ATOMS) {
      expect(read(file), `${file} tem hex hardcoded`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    }
  })

  it('não bifurca a aparência por perfil (§8.5)', () => {
    // O anti-padrão que a unificação existe para eliminar: um mesmo componente
    // com um ramo visual "do Gerente"/"do Dono"/"do Vendedor" embutido.
    for (const file of DS_ATOMS) {
      const source = read(file)
      expect(source, `${file} bifurca por perfil`).not.toMatch(
        /useMxSurfaceVisualMode|manager|vendedor|owner-b44/i,
      )
    }
  })

  it('só referencia tokens semânticos, nunca primitivos, nas classes', () => {
    for (const file of DS_ATOMS) {
      const source = read(file)
      // `--mx-neutral-0` é aceito apenas como foreground de superfície sólida.
      const primitiveRefs = [...source.matchAll(/var\(--mx-(green|neutral|emerald|amber|red|blue)-\d+\)/g)]
      const offenders = primitiveRefs
        .map(([match]) => match)
        .filter((match) => match !== 'var(--mx-neutral-0)')
      expect(offenders, `${file} usa primitivo direto`).toEqual([])
    }
  })

  it('exige nome acessível nos controles que só mostram ícone', () => {
    const iconButton = read('IconButton.tsx')
    expect(iconButton).toContain('label: string')
    expect(iconButton).toContain('<VisuallyHidden>{label}</VisuallyHidden>')
    expect(iconButton).toContain('aria-hidden')
  })

  it('impede submissão duplicada durante loading', () => {
    expect(read('IconButton.tsx')).toContain('disabled={disabled || loading}')
  })

  it('nunca usa cor como único indicador de estado (§43.15)', () => {
    const statusDot = read('StatusDot.tsx')
    expect(statusDot).toContain('label: string')
    expect(statusDot).toContain('VisuallyHidden')
  })

  it('respeita prefers-reduced-motion nas animações', () => {
    expect(read('Spinner.tsx')).toContain('motion-reduce:')
    expect(read('StatusDot.tsx')).toContain('motion-reduce:hidden')
  })

  it('renderiza links reais, abríveis em nova aba (§13.3)', () => {
    const link = read('Link.tsx')
    expect(link).toContain('href={to}')
    expect(link).toContain('rel="noopener noreferrer"')
    expect(link).toContain('(abre em nova aba)')
  })

  it('mantém foco visível em todo controle interativo', () => {
    for (const file of ['Checkbox.tsx', 'Radio.tsx', 'Switch.tsx', 'IconButton.tsx', 'Link.tsx']) {
      expect(read(file), `${file} sem focus-visible`).toContain('focus-visible:ring-')
    }
  })
})
