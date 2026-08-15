import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE T — focus/hover/pressed (20.009-011).
 *
 * 20.009 — o scroll owner reserva `scroll-padding-top` para o mobile header
 * fixo, de modo que o foco programático/Tab não fique oculto sob ele.
 * 20.010 — o shell tem skip-link + tab order previsível (viewport passiva,
 * primeiro Tab no skip-link).
 * 20.011 — o Modal canônico captura o elemento focado antes de abrir e
 * restaura o foco ao fechar.
 */
describe('FASE T — focus não fica oculto sob header fixo (20.009)', () => {
  test('PageViewport (scroll owner) reserva scroll-padding-top para o header fixo', () => {
    const viewport = read('src/design-system/page/PageViewport.tsx')
    expect(viewport).toContain('data-mx-page-scroll-owner=""')
    expect(viewport).toContain('scroll-padding-top:var(--mx-mobile-header-height)')
    const tokens = read('src/design-system/tokens/components.css')
    expect(tokens).toContain('--mx-mobile-header-height: 72px')
  })

  test('mobile header é fixed e usa o token de altura', () => {
    const shell = read('src/components/MxSidebarShell.tsx')
    expect(shell).toContain('fixed left-0 right-0 top-0')
    expect(shell).toContain('var(--mx-mobile-header-height)')
  })
})

describe('FASE T — tab order previsível (20.010)', () => {
  test('PageViewport é passiva na tabulação (tabIndex -1) — primeiro Tab no skip-link', () => {
    const viewport = read('src/design-system/page/PageViewport.tsx')
    expect(viewport).toContain('tabIndex={props.tabIndex ?? -1}')
  })

  test('AppShellFrame expõe SkipLink como primeira parada de tabulação', () => {
    const frame = read('src/design-system/shell/AppShellFrame.tsx')
    expect(frame).toContain('<SkipLink')
    expect(frame).toContain('skipLinkLabel')
    const skip = read('src/design-system/shell/SkipLink.tsx')
    expect(skip).toContain('targetId')
    expect(skip).toContain('target.focus()')
  })

  test('main#main-content é o alvo do skip-link', () => {
    const frame = read('src/design-system/shell/AppShellFrame.tsx')
    expect(frame).toContain('mainContentId')
  })
})

describe('FASE T — focus restore após modal (20.011)', () => {
  test('Modal canônico captura o elemento focado antes de abrir', () => {
    const modal = read('src/components/organisms/Modal.tsx')
    expect(modal).toContain('previouslyFocusedElementRef')
    expect(modal).toContain('document.activeElement')
  })

  test('Modal canônico restaura o foco ao fechar', () => {
    const modal = read('src/components/organisms/Modal.tsx')
    expect(modal).toContain('onCloseAutoFocus')
    expect(modal).toContain('previouslyFocusedElement.focus')
  })

  test('Modal usa o Dialog canônico (aria-modal + overlay)', () => {
    const modal = read('src/components/organisms/Modal.tsx')
    expect(modal).toContain('Dialog.Root')
    expect(modal).toContain('Dialog.Portal')
    expect(modal).toContain('Dialog.Overlay')
    expect(modal).toContain('Dialog.Content')
  })
})
