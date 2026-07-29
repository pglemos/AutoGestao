import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { MX_DS_ROOT_CLASS, MX_MOTION, MX_Z_INDEX, mxColor } from './index'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const primitives = read('src/design-system/tokens/primitives.css')
const semantic = read('src/design-system/tokens/semantic.css')
const components = read('src/design-system/tokens/components.css')
const ownerExact = read('src/styles/owner-base44-exact.css')

/** Extrai `--nome: valor;` de um bloco CSS. */
function declarations(css: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(name, value.trim())
  }
  return map
}

describe('arquitetura de tokens do MX Design System', () => {
  it('publica as três camadas sob o escopo de migração .mx-ds', () => {
    expect(primitives).toContain(':root {')
    expect(semantic).toContain(`.${MX_DS_ROOT_CLASS} {`)
    expect(components).toContain(`.${MX_DS_ROOT_CLASS} {`)
  })

  it('é carregada pelo entrypoint da aplicação', () => {
    const main = read('src/main.tsx')
    expect(main).toContain("import './design-system/tokens/primitives.css'")
    expect(main).toContain("import './design-system/tokens/semantic.css'")
    expect(main).toContain("import './design-system/tokens/components.css'")
  })

  it('mantém a camada semântica livre de valores crus (sem hex, sem px de cor)', () => {
    expect(semantic).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('só referencia primitivos que existem', () => {
    const declared = new Set(declarations(primitives).keys())
    const referenced = new Set<string>()
    for (const [, name] of semantic.matchAll(/var\((--mx-[\w-]+)\)/g)) referenced.add(name)
    for (const [, name] of components.matchAll(/var\((--mx-[\w-]+)\)/g)) referenced.add(name)

    const semanticDeclared = new Set([
      ...declarations(semantic).keys(),
      ...declarations(components).keys(),
    ])
    const orphans = [...referenced].filter(
      (name) => !declared.has(name) && !semanticDeclared.has(name),
    )
    expect(orphans).toEqual([])
  })

  it('reproduz a identidade aprovada do Dono nas variáveis shadcn', () => {
    // As duas fontes precisam concordar: o DS não pode divergir de .owner-b44
    // enquanto o módulo do Dono for a referência visual normativa.
    const owner = declarations(ownerExact)
    expect(owner.get('--primary')).toBe('152 69% 31%')

    const prim = declarations(primitives)
    expect(prim.get('--mx-green-600')).toBe('152 69% 31%')
    expect(prim.get('--mx-neutral-0')).toBe('0 0% 100%')
    expect(prim.get('--mx-neutral-950')).toBe('0 0% 4%')
    expect(prim.get('--mx-neutral-200')).toBe('0 0% 90%')
    expect(prim.get('--mx-neutral-500')).toBe('0 0% 45%')

    const sem = declarations(semantic)
    expect(sem.get('--primary')).toBe('var(--mx-color-primary)')
    expect(sem.get('--mx-color-primary')).toBe('var(--mx-green-600)')
    expect(sem.get('--radius')).toBe(owner.get('--radius'))
  })

  it('mantém a escala de z-index fechada e sincronizada com o CSS', () => {
    for (const [name, value] of Object.entries(MX_Z_INDEX)) {
      expect(components).toContain(`--mx-z-${name}: ${value};`)
    }
    const cssZ = [...components.matchAll(/--mx-z-([\w-]+):/g)].map(([, name]) => name)
    expect(cssZ.sort()).toEqual(Object.keys(MX_Z_INDEX).sort())
  })

  it('mantém os tokens de motion sincronizados entre TS e CSS', () => {
    for (const [name, ms] of Object.entries(MX_MOTION.duration)) {
      expect(primitives).toContain(`--mx-duration-${name}: ${ms}ms;`)
    }
    for (const [name, curve] of Object.entries(MX_MOTION.easing)) {
      expect(primitives).toContain(`--mx-easing-${name}: ${curve};`)
    }
  })

  it('neutraliza durações sob prefers-reduced-motion', () => {
    expect(components).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('expõe as três densidades sem alterar identidade', () => {
    expect(components).toContain("data-mx-density='comfortable'")
    expect(components).toContain("data-mx-density='compact'")
    // densidade nunca redefine cor
    const densityBlocks = components.match(/data-mx-density='[^']+'\s*\]?\s*\{[^}]*\}/g) ?? []
    expect(densityBlocks.length).toBeGreaterThan(0)
    for (const block of densityBlocks) {
      expect(block).not.toMatch(/--mx-color-/)
    }
  })

  it('mxColor produz referências HSL compostáveis', () => {
    expect(mxColor('primary')).toBe('hsl(var(--mx-color-primary))')
    expect(mxColor('primary', 0.1)).toBe('hsl(var(--mx-color-primary) / 0.1)')
  })
})
