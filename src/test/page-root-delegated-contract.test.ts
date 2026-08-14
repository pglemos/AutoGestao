import { describe, expect, test } from 'bun:test'

import { inspectDelegatedComponent } from '../../scripts/lint-page-roots-delegated.mjs'

describe('contrato de raízes delegadas de página', () => {
  test('detecta wrapper de página dentro de view delegada', () => {
    const source = `
      export function DashboardHeader() {
        return <div className="mx-auto w-full max-w-7xl space-y-4"><header /></div>
      }
    `

    expect(inspectDelegatedComponent(source, 'DashboardHeader.tsx')).toEqual([
      expect.objectContaining({
        rule: 'delegated-page-wrapper',
        file: 'DashboardHeader.tsx',
        utility: 'mx-auto w-full max-w-7xl space-y-4',
      }),
    ])
  })

  test('não acusa largura de conteúdo de um componente interno', () => {
    const source = `
      export function EmptyState() {
        return <div className="mx-auto max-w-sm text-center"><p>Vazio</p></div>
      }
    `

    expect(inspectDelegatedComponent(source, 'EmptyState.tsx')).toEqual([])
  })

  test('exige declaração explícita para scroll de fullscreen delegado', () => {
    const source = `
      export function FullscreenMode() {
        return <div className="fixed inset-0 overflow-y-auto bg-white"><p>Conteúdo</p></div>
      }
    `

    expect(inspectDelegatedComponent(source, 'FullscreenMode.tsx')).toEqual([
      expect.objectContaining({
        rule: 'delegated-page-scroll-owner',
        file: 'FullscreenMode.tsx',
      }),
    ])
  })

  test('aceita scroll de fullscreen quando o primitivo ScrollableRegion é o owner', () => {
    const source = `
      export function FullscreenMode() {
        return <ScrollableRegion axis="vertical" label="Modo fullscreen" className="fixed inset-0 overflow-y-auto"><p>Conteúdo</p></ScrollableRegion>
      }
    `

    expect(inspectDelegatedComponent(source, 'FullscreenMode.tsx')).toEqual([])
  })

  test('desembrulha fragmento e detecta owner fullscreen delegado', () => {
    const source = `
      export function FullscreenMode() {
        return <><div className="fixed inset-0 overflow-y-auto bg-white"><p>Conteúdo</p></div></>
      }
    `

    expect(inspectDelegatedComponent(source, 'FullscreenMode.tsx')).toEqual([
      expect.objectContaining({
        rule: 'delegated-page-scroll-owner',
        file: 'FullscreenMode.tsx',
      }),
    ])
  })

  test('audita wrapper imediato da view delegada', () => {
    const source = `
      export function DelegatedView() {
        return <section><div className="mx-auto w-full max-w-7xl space-y-4"><p>Conteúdo</p></div></section>
      }
    `

    expect(inspectDelegatedComponent(source, 'DelegatedView.tsx')).toEqual([
      expect.objectContaining({
        rule: 'delegated-page-wrapper',
        file: 'DelegatedView.tsx',
      }),
    ])
  })
})
