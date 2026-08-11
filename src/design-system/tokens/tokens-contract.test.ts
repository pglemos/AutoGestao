import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { MX_DS_ROOT_CLASS, MX_MOTION, MX_Z_INDEX, mxColor } from './index'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const primitives = read('src/design-system/tokens/primitives.css')
const semantic = read('src/design-system/tokens/semantic.css')
const components = read('src/design-system/tokens/components.css')
/**
 * Valores medidos no export Base44 do módulo do Dono.
 *
 * Vinham de `src/styles/owner-base44-exact.css`, que este teste lia para
 * confrontar com o DS. O arquivo foi absorvido: escopava a identidade a
 * `[data-mx-role='dono']`, o que §5 proíbe. Como o arquivo era a fonte da
 * medição, os números passam a viver aqui — é o teste que impede o DS de
 * derivar da referência aprovada, e para isso ele precisa da referência.
 */
const BASE44_MEASURED = {
  primary: '152 69% 31%',
} as const

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

  it('reproduz a identidade aprovada do Base44 nas variáveis shadcn', () => {
    // O DS não pode divergir da referência visual aprovada — que agora é a
    // identidade de todos os perfis, não de um.
    const prim = declarations(primitives)
    expect(prim.get('--mx-green-600')).toBe(BASE44_MEASURED.primary)
    expect(prim.get('--mx-neutral-0')).toBe('0 0% 100%')
    expect(prim.get('--mx-neutral-950')).toBe('0 0% 4%')
    expect(prim.get('--mx-neutral-200')).toBe('0 0% 90%')
    // 42% e não os 45% do export: em 45% o texto secundário reprovava contraste
    // AA sobre superfície cinza-clara. Ver a justificativa em primitives.css.
    expect(prim.get('--mx-neutral-500')).toBe('0 0% 42%')

    const sem = declarations(semantic)
    expect(sem.get('--primary')).toBe('var(--mx-color-primary)')
    expect(sem.get('--mx-color-primary')).toBe('var(--mx-green-600)')
    // Raio base shadcn deriva do primitivo canônico (--mx-radius-lg: 10px),
    // que reproduz o 0.625rem medido no Base44 sem valor cru na camada
    // semântica.
    expect(sem.get('--radius')).toBe('var(--mx-radius-lg)')
    expect(prim.get('--mx-radius-lg')).toBe('10px')
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
