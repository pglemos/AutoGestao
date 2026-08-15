import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

/**
 * FASE J — 10.015 gap Header → Toolbar → Tabs → Content.
 *
 * O empilhamento vertical das seções de página (Header, Toolbar, Tabs, Content)
 * precisa usar o token semântico `--mx-gap-section` (24px desktop / 16px
 * compact), nunca um tamanho cru aproximado (`space-y-5` = 20px não corresponde
 * a nenhum degrau da escala). O `MxModulePage` é o único dono desse gap para
 * os 26 consumers de features do módulo gerencial.
 */
const root = resolve(import.meta.dir, '..', '..')

const primitives = readFileSync(
  resolve(root, 'src/design-system/tokens/primitives.css'),
  'utf8',
)
const semantic = readFileSync(
  resolve(root, 'src/design-system/tokens/semantic.css'),
  'utf8',
)
const modulePage = readFileSync(
  resolve(root, 'src/components/module/MxModuleVisualPrimitives.tsx'),
  'utf8',
)
const modulePageTest = readFileSync(
  resolve(root, 'src/components/module/MxModuleVisualPrimitives.test.tsx'),
  'utf8',
)

describe('FASE J 10.015 — gap canônico Header→Toolbar→Tabs→Content', () => {
  test('token semântico de gap de seção existe e é o degrau 6 (24px) no desktop', () => {
    expect(semantic).toContain('--mx-gap-section: var(--mx-space-6)')
    expect(primitives).toContain('--mx-space-6: 24px')
  })

  test('MxModulePage usa o token --mx-gap-section no empilhamento, não space-y-5 cru', () => {
    expect(modulePage).toContain('space-y-[var(--mx-gap-section)]')
    expect(modulePage).not.toContain("space-y-5'")
  })

  test('teste do MxModulePage reflete o gap tokenizado', () => {
    // O teste do MxModulePage afirma o token (escreve gap-section) e nega o
    // degrau cru (escreve not.toContain('space-y-5')). A presença do token na
    // asserção é o que este contrato verifica.
    expect(modulePageTest).toContain('gap-section')
    expect(modulePageTest).toContain("not.toContain('space-y-5')")
  })

  test('semantic declara o degrau compacto (16px) para a variante compacta', () => {
    // A sobrescrita em @media da variante compacta precisa existir.
    const compact = semantic.match(/--mx-gap-section: var\(--mx-space-4\)/g)
    expect(compact).not.toBeNull()
    expect(primitives).toContain('--mx-space-4: 16px')
  })
})
