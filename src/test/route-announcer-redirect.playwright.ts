import { expect, test } from '@playwright/test'
import { loginWithCredentials } from './e2e-helpers/auth'

const password = process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD || ''
const internalEmail = process.env.E2E_ADMIN_MX_EMAIL || process.env.E2E_ADMIN_EMAIL || ''

/**
 * H 08.003 — o redirect inicial não pode roubar o foco do skip-link.
 *
 * Em uma carga nova em "/" o app monta o shell na rota raiz e o redirect para a
 * home (ex.: "/painel" para perfil interno MX) é uma navegação interna. O
 * guard `firstRender` do RouteAnnouncer é consumido pela rota "/" que o usuário
 * nunca vê — sem correção, o RouteAnnouncer move o foco para `main` e a
 * primeira parada de Tab cai no conteúdo (ex.: botão "Atualizar"), pulando a
 * skip-link, que fica antes de `main` no DOM.
 *
 * O usuário fez um carregamento novo: a skip-link deve continuar sendo a
 * primeira parada. Este teste navega SEM interação prévia e pressiona Tab uma
 * vez, sem blur — o estado natural pós-redirect.
 */
test.describe('H 08.003 — foco inicial no fluxo "/" → redirect → home', () => {
  test.skip(!internalEmail || !password, 'conta interna MX ou senha ausente — teste ignorado.')

  test('primeira parada Tab após redirect inicial é o skip-link (sem blur)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginWithCredentials(page, internalEmail, password)

    // Carga nova em "/": mount fresco consome o firstRender do RouteAnnouncer e
    // o redirect interno resolve para a home do perfil.
    await page.goto('/')
    await page.waitForURL('**/painel**', { timeout: 20000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(300)

    // Estado natural: nenhuma interação (Tab) ainda — foco não deve ter sido
    // roubado para `main`.
    const focusBeforeTab = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return {
        isMain: el?.id === 'main-content',
        url: location.pathname,
      }
    })

    await page.keyboard.press('Tab')
    const firstStopIsSkipLink = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return el?.getAttribute('href') === '#main-content'
    })

    expect(
      firstStopIsSkipLink,
      `primeira parada deve ser a skip-link (foco pré-Tab: ${JSON.stringify(focusBeforeTab)})`,
    ).toBe(true)
  })
})
