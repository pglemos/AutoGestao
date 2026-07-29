import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { MX_DENSITIES, MX_DS_ROOT_CLASS } from '@/design-system/tokens'
import {
  OWNER_CONFIG,
  UNIVERSAL_CONFIG,
  resolveAppShellConfig,
} from '@/design-system/shell/appShellConfig'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

/**
 * Fonte sem comentários. Asserções negativas precisam olhar o que executa —
 * um termo citado na documentação do próprio arquivo não é uma violação.
 */
const readCode = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

describe('App Shell unificado', () => {
  it('renderiza uma única implementação de shell na moldura', () => {
    const appShell = read('src/components/AppShell.tsx')
    expect(appShell).toContain('<AppShellFrame role={role}>')
    expect(appShell).toContain('<Layout />')
    expect(appShell).not.toContain('OwnerShell')
    expect(appShell).not.toContain("role === 'dono'")
  })

  it('aplica o escopo de tokens e a densidade do perfil', () => {
    const frame = read('src/design-system/shell/AppShellFrame.tsx')
    expect(frame).toContain('MX_DS_ROOT_CLASS')
    expect(frame).toContain('data-mx-density={config.density}')
    // `contents` mantém o layout dos shells intacto — a moldura não cria caixa.
    expect(frame).toContain('contents')
  })

  it('resolve densidade por perfil sem inventar identidade', () => {
    expect(resolveAppShellConfig('dono').density).toBe('comfortable')
    expect(resolveAppShellConfig('gerente').density).toBe('standard')
    expect(resolveAppShellConfig('vendedor').density).toBe('standard')
    expect(resolveAppShellConfig('administrador_mx').density).toBe('compact')
    expect(resolveAppShellConfig('consultor_mx').density).toBe('compact')
    // Perfil desconhecido ou ausente não quebra o shell.
    expect(resolveAppShellConfig(null)).toEqual(UNIVERSAL_CONFIG)
    expect(resolveAppShellConfig('perfil_inexistente')).toEqual(UNIVERSAL_CONFIG)

    for (const config of [OWNER_CONFIG, UNIVERSAL_CONFIG]) {
      expect(MX_DENSITIES).toContain(config.density)
    }
  })

  it('a configuração por perfil não carrega cor nem tema', () => {
    const source = read('src/design-system/shell/appShellConfig.ts')
    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(source).not.toMatch(/\bcolor\b|\btheme\b|bg-/i)
  })

  it('publica um skip-link como primeiro elemento focável', () => {
    const frame = read('src/design-system/shell/AppShellFrame.tsx')
    const skip = read('src/design-system/shell/SkipLink.tsx')

    // Precede qualquer conteúdo do shell.
    expect(frame.indexOf('<SkipLink')).toBeLessThan(frame.indexOf('{children}'))
    expect(skip).toContain('href={`#${targetId}`}')
    // Invisível até receber foco.
    expect(skip).toContain('sr-only')
    expect(skip).toContain('focus:not-sr-only')
    // Move o foco de fato, não apenas o scroll.
    expect(skip).toContain('target.focus()')
  })

  it('aponta o skip-link para o landmark real de cada shell', () => {
    expect(UNIVERSAL_CONFIG.mainContentId).toBe('main-content')
    expect(OWNER_CONFIG.mainContentId).toBe('main-content')

    // O contrato existente exige um único `main-content`, no shell universal.
    const sidebarShell = read('src/components/MxSidebarShell.tsx')
    expect(sidebarShell.split('id="main-content"').length - 1).toBe(1)

    expect(OWNER_CONFIG.mainContentId).toBe(UNIVERSAL_CONFIG.mainContentId)
  })

  it('move o foco e anuncia a rota após navegar, mas não na montagem', () => {
    const announcer = read('src/design-system/shell/RouteAnnouncer.tsx')
    expect(announcer).toContain('useLocation')
    expect(announcer).toContain('firstRender.current')
    expect(announcer).toContain('target.focus({ preventScroll: true })')
    expect(announcer).toContain('aria-live="polite"')
    // O app não atualiza document.title por rota — anunciá-lo repetiria a
    // mesma frase em toda navegação.
    expect(readCode('src/design-system/shell/RouteAnnouncer.tsx')).not.toContain('document.title')
    expect(announcer).toContain("querySelector('h1')")
  })

  it('preserva a aparência aprovada do Dono', () => {
    const layout = read('src/components/Layout.tsx')
    expect(layout).toContain('owner-base44-exact')
    expect(layout).not.toContain('owner-b44')
    expect(layout).toContain('<OwnerProvider>')
    expect(layout).toContain('<MxSidebarShell')
  })

  it('expõe a classe raiz esperada pelo Storybook e pelo runtime', () => {
    expect(MX_DS_ROOT_CLASS).toBe('mx-ds')
  })
})
