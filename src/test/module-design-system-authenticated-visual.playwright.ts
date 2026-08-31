import { test, expect, type Page, type TestInfo } from '@playwright/test'
import { writeFileSync } from 'node:fs'

const profiles = [
  {
    key: 'gerente',
    email: 'visual-gerente@mxgestaopreditiva.com.br',
    role: 'gerente',
    path: '/ranking',
    moduleLabel: 'Gerencial',
    roleLabel: 'Gerente',
  },
  {
    key: 'administrador-geral',
    email: 'visual-administrador-geral@mxgestaopreditiva.com.br',
    role: 'administrador_geral',
    path: '/clientes',
    moduleLabel: 'Admin',
    roleLabel: 'Admin geral',
  },
  {
    key: 'administrador-mx',
    email: 'visual-administrador-mx@mxgestaopreditiva.com.br',
    role: 'administrador_mx',
    path: '/clientes',
    moduleLabel: 'Admin MX',
    roleLabel: 'Admin MX',
  },
  {
    key: 'consultor-mx',
    email: 'visual-consultor-mx@mxgestaopreditiva.com.br',
    role: 'consultor_mx',
    path: '/clientes',
    moduleLabel: 'Consultoria',
    roleLabel: 'Consultor MX',
  },
] as const

type VisualProfile = (typeof profiles)[number]

type ShellMetrics = {
  profile: string
  viewport: string
  sidebar: {
    width: number
    backgroundColor: string
    borderRightWidth: string
    borderRightColor: string
    boxShadow: string
  } | null
  mobileHeader: {
    height: number
    backgroundColor: string
    borderBottomWidth: string
  } | null
  content: {
    backgroundColor: string
    paddingLeft: string
    fontFamily: string
  }
  logo: { width: number; height: number } | null
  moduleLabel: {
    text: string
    color: string
    fontSize: string
    fontWeight: string
    letterSpacing: string
  }
  pageHeader: {
    backgroundColor: string
    borderRadius: string
    borderColor: string
    boxShadow: string
  } | null
  currentNavigationItems: number
  forbiddenLegacyNodes: number
  horizontalOverflow: boolean
}

async function installLocalVisualProfile(page: Page, profile: VisualProfile) {
  await page.addInitScript(
    ({ visualProfile, storageKey }) => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          id: `visual-${visualProfile.key}`,
          name: visualProfile.roleLabel,
          email: visualProfile.email,
          role: visualProfile.role,
          active: true,
          created_at: '2026-07-18T00:00:00.000Z',
        }),
      )
    },
    { visualProfile: profile, storageKey: 'mx_auth_profile' },
  )
}

async function visibleModuleLabel(page: Page) {
  return page.evaluate(() => {
    const surfaces = [
      document.querySelector<HTMLElement>('aside[aria-label^="Menu principal"]'),
      document.querySelector<HTMLElement>('[role="dialog"][aria-label^="Menu principal"]'),
      document.querySelector<HTMLElement>('header.xl\\:hidden'),
    ].filter(Boolean) as HTMLElement[]

    for (const surface of surfaces) {
      const candidates = Array.from(surface.querySelectorAll<HTMLElement>('p[title], span[title]'))
        .filter((node) => {
          const text = node.textContent?.trim() || ''
          return text.length > 0 && text !== 'MX PERFORMANCE' && node.getBoundingClientRect().width > 0
        })
      if (candidates.length) return candidates[0].textContent?.trim() || ''
    }
    return ''
  })
}

async function hasCanonicalPageHeader(page: Page) {
  return page.evaluate(() => {
    const visualScope = document.querySelector<HTMLElement>('[data-mx-visual-system="manager"]')
    if (!visualScope) return false
    const candidates = [
      ...Array.from(visualScope.querySelectorAll<HTMLElement>('header')),
      ...Array.from(visualScope.querySelectorAll<HTMLElement>('[data-mx-module-header], [data-mx-page-header]')),
    ]
    return candidates.some((node) => node.getBoundingClientRect().width > 300)
  })
}

async function collectMetrics(page: Page, profile: string, viewport: string): Promise<ShellMetrics> {
  return page.evaluate(({ profile, viewport }) => {
    const findVisibleModuleLabelNode = () => {
      const surfaces = [
        document.querySelector<HTMLElement>('aside[aria-label^="Menu principal"]'),
        document.querySelector<HTMLElement>('[role="dialog"][aria-label^="Menu principal"]'),
        document.querySelector<HTMLElement>('header.xl\\:hidden'),
      ].filter(Boolean) as HTMLElement[]

      for (const surface of surfaces) {
        const candidates = Array.from(surface.querySelectorAll<HTMLElement>('p[title], span[title]'))
          .filter((node) => {
            const text = node.textContent?.trim() || ''
            return text.length > 0 && text !== 'MX PERFORMANCE' && node.getBoundingClientRect().width > 0
          })
        if (candidates.length) return candidates[0]
      }
      return null
    }

    const desktopSidebar = document.querySelector<HTMLElement>('aside[aria-label^="Menu principal"]')
    const mobileDrawer = document.querySelector<HTMLElement>('[role="dialog"][aria-label^="Menu principal"]')
    const navigationSurface = viewport === 'mobile' ? mobileDrawer : desktopSidebar
    // A superfície (bg-mxsb-surface) vive no div interno, não no aside: o
    // aside só posiciona (SIDEBAR.aside), o div carrega a cor e a tipografia
    // (SIDEBAR.root). Medir o aside retornava rgba(0,0,0,0).
    const sidebarSurface =
      navigationSurface?.querySelector<HTMLElement>('[data-sidebar-surface]') ?? navigationSurface
    const mobileHeader = document.querySelector<HTMLElement>('header.xl\\:hidden')
    const content = document.querySelector<HTMLElement>('main#main-content')
    const visibleLogo = Array.from(document.querySelectorAll<HTMLImageElement>('img[alt="MX"]'))
      .find((node) => node.getBoundingClientRect().width > 0)
    const visibleModuleLabel = findVisibleModuleLabelNode()
    const visualScope = document.querySelector<HTMLElement>('[data-mx-visual-system="manager"]')
    const pageHeader = visualScope
      ? [
          ...Array.from(visualScope.querySelectorAll<HTMLElement>('header')),
          ...Array.from(visualScope.querySelectorAll<HTMLElement>('[data-mx-module-header], [data-mx-page-header]')),
        ].find((node) => node.getBoundingClientRect().width > 300)
      : null

    if (!content || !visibleModuleLabel) throw new Error('Shell universal não encontrado no DOM.')

    const contentStyle = getComputedStyle(content)
    const moduleStyle = getComputedStyle(visibleModuleLabel)
    const navigationStyle = navigationSurface ? getComputedStyle(navigationSurface) : null
    const mobileHeaderStyle = mobileHeader ? getComputedStyle(mobileHeader) : null
    const pageHeaderStyle = pageHeader ? getComputedStyle(pageHeader) : null
    // Item ativo detectado pelo contrato acessível (aria-current), não pela
    // classe de cor: a sidebar canônica usa tokens mxsb-* desde a unificação,
    // e o sidebar-contract.test.ts proíbe explicitamente o bg-emerald-600 que
    // este teste buscava antes. `aria-current="page"` é a fonte de verdade que
    // leitores de tela consomem.
    const currentNavigationItems = navigationSurface
      ? navigationSurface.querySelectorAll('a[aria-current="page"]').length
      : 0

    return {
      profile,
      viewport,
      sidebar: navigationSurface && navigationSurface.getBoundingClientRect().width > 0 && navigationStyle
        ? {
            width: Math.round(navigationSurface.getBoundingClientRect().width),
            backgroundColor: sidebarSurface
              ? getComputedStyle(sidebarSurface).backgroundColor
              : navigationStyle.backgroundColor,
            borderRightWidth: navigationStyle.borderRightWidth,
            borderRightColor: navigationStyle.borderRightColor,
            boxShadow: navigationStyle.boxShadow,
          }
        : null,
      mobileHeader: mobileHeader && mobileHeader.getBoundingClientRect().height > 0 && mobileHeaderStyle
        ? {
            height: Math.round(mobileHeader.getBoundingClientRect().height),
            backgroundColor: mobileHeaderStyle.backgroundColor,
            borderBottomWidth: mobileHeaderStyle.borderBottomWidth,
          }
        : null,
      content: {
        backgroundColor: contentStyle.backgroundColor,
        paddingLeft: contentStyle.paddingLeft,
        fontFamily: contentStyle.fontFamily,
      },
      logo: visibleLogo
        ? {
            width: Math.round(visibleLogo.getBoundingClientRect().width),
            height: Math.round(visibleLogo.getBoundingClientRect().height),
          }
        : null,
      moduleLabel: {
        text: visibleModuleLabel.textContent?.trim() || '',
        color: moduleStyle.color,
        fontSize: moduleStyle.fontSize,
        fontWeight: moduleStyle.fontWeight,
        letterSpacing: moduleStyle.letterSpacing,
      },
      pageHeader: pageHeader && pageHeaderStyle
        ? {
            backgroundColor: pageHeaderStyle.backgroundColor,
            borderRadius: pageHeaderStyle.borderRadius,
            borderColor: pageHeaderStyle.borderColor,
            boxShadow: pageHeaderStyle.boxShadow,
          }
        : null,
      currentNavigationItems,
      forbiddenLegacyNodes: document.querySelectorAll(
        '.mxds-page-frame, .mx-internal-workspace, [class*="mxds-"]',
      ).length,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  }, { profile, viewport })
}

async function auditProfile(
  page: Page,
  testInfo: TestInfo,
  profile: VisualProfile,
  viewport: { width: number; height: number; name: string },
) {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.setViewportSize({ width: viewport.width, height: viewport.height })
  await installLocalVisualProfile(page, profile)
  await page.goto(profile.path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })

  if (viewport.name === 'mobile') {
    await page.getByRole('button', { name: 'Abrir menu principal' }).click()
    await expect(
      page.getByRole('dialog', { name: `Menu principal do ${profile.roleLabel}` }),
    ).toBeVisible()
  }

  await expect.poll(() => visibleModuleLabel(page), { timeout: 20_000 }).toBe(profile.moduleLabel)
  if (profile.key !== 'gerente') {
    await expect.poll(() => hasCanonicalPageHeader(page), { timeout: 20_000 }).toBe(true)
  }
  await page.waitForTimeout(250)

  const metrics = await collectMetrics(page, profile.key, viewport.name)

  expect(metrics.moduleLabel.text).toBe(profile.moduleLabel)
  expect(metrics.forbiddenLegacyNodes).toBe(0)
  expect(metrics.horizontalOverflow).toBe(false)
  expect(metrics.logo).not.toBeNull()
  expect(metrics.currentNavigationItems).toBe(1)

  if (profile.key !== 'gerente') {
    expect(metrics.pageHeader).toMatchObject({
      backgroundColor: 'rgb(255, 255, 255)',
      borderRadius: '12px',
    })
    expect(metrics.pageHeader?.borderColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(metrics.pageHeader?.boxShadow).not.toBe('none')
  }

  expect(pageErrors, `Erros de página em ${profile.key}/${viewport.name}`).toEqual([])

  if (viewport.name === 'desktop') {
    expect(metrics.sidebar).not.toBeNull()
    // 256px = SIDEBAR_METRICS.width em src/design-system/sidebar/tokens.ts
    // (w-64), a largura expandida canônica — §6 do plano de unificação.
    expect(metrics.sidebar?.width).toBe(256)
    // #FAFAFA = --color-mxsb-surface, a superfície documentada em
    // docs/design-system/sidebar-dono.md (não branco puro).
    expect(metrics.sidebar?.backgroundColor).toBe('rgb(250, 250, 250)')
    expect(metrics.content.paddingLeft).toBe('256px')
  } else {
    expect(metrics.sidebar).not.toBeNull()
    expect(metrics.mobileHeader).not.toBeNull()
    // #FAFAFA = --color-mxsb-surface (header mobile alinhado à sidebar canônica).
    expect(metrics.mobileHeader?.backgroundColor).toBe('rgb(250, 250, 250)')
    expect(metrics.content.paddingLeft).toBe('0px')
  }

  writeFileSync(
    testInfo.outputPath(`${profile.key}-${viewport.name}-metrics.json`),
    JSON.stringify(metrics, null, 2),
  )
  await page.screenshot({
    path: testInfo.outputPath(`${profile.key}-${viewport.name}.png`),
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })

  return metrics
}

test.describe('paridade visual isolada dos módulos que usam o shell universal', () => {
  test.describe.configure({ timeout: 240_000 })

  test('desktop preserva a anatomia compartilhada do Gerente', async ({ browser }, testInfo) => {
    const results: ShellMetrics[] = []
    for (const profile of profiles) {
      const context = await browser.newContext()
      const page = await context.newPage()
      results.push(await auditProfile(page, testInfo, profile, { width: 1440, height: 900, name: 'desktop' }))
      await context.close()
    }

    const reference = results.find((item) => item.profile === 'gerente')
    expect(reference?.sidebar).not.toBeNull()
    for (const result of results.filter((item) => item.profile !== 'gerente')) {
      expect(result.sidebar).toEqual(reference?.sidebar)
      expect(result.logo).toEqual(reference?.logo)
      expect({ ...result.moduleLabel, text: reference?.moduleLabel.text }).toEqual(reference?.moduleLabel)
      expect(result.content.backgroundColor).toBe(reference?.content.backgroundColor)
      expect(result.content.fontFamily).toBe(reference?.content.fontFamily)
    }
  })

  test('mobile preserva a anatomia compartilhada do Gerente', async ({ browser }, testInfo) => {
    const results: ShellMetrics[] = []
    for (const profile of profiles) {
      const context = await browser.newContext()
      const page = await context.newPage()
      results.push(await auditProfile(page, testInfo, profile, { width: 390, height: 844, name: 'mobile' }))
      await context.close()
    }

    const reference = results.find((item) => item.profile === 'gerente')
    expect(reference?.mobileHeader).not.toBeNull()
    for (const result of results.filter((item) => item.profile !== 'gerente')) {
      expect(result.mobileHeader).toEqual(reference?.mobileHeader)
      expect(result.sidebar).toEqual(reference?.sidebar)
      expect(result.logo).toEqual(reference?.logo)
      expect({ ...result.moduleLabel, text: reference?.moduleLabel.text }).toEqual(reference?.moduleLabel)
      expect(result.content.backgroundColor).toBe(reference?.content.backgroundColor)
      expect(result.content.fontFamily).toBe(reference?.content.fontFamily)
    }
  })
})
