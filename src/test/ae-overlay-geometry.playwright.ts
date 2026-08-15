import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * FASE AE — 31.012: medir geometria de modal/drawer quando aberto.
 *
 * Abre o modal representativo "Nova atividade" (Central de Execução, vendedor)
 * e mede a geometria do overlay canônico `[data-mx-overlay]` no estado aberto:
 * - presença e layer (modal)
 * - largura dentro do viewport, centralizado horizontalmente (>=4.5% do lado)
 * - raio via `--mx-card-radius` (token, não cru)
 * - scroll: conteúdo não transborda o viewport verticalmente
 *
 * Read-only — não submete mutação. Credenciais reais via e2e-helpers/auth;
 * skip quando E2E_ROLE_PASSWORD/E2E_AUTH_PASSWORD ausente.
 */
const senha = () => getE2ERolePassword()
const vendedor = process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br'

test.describe('FASE AE 31.012 — geometria de overlay aberto', () => {
  test('modal representativo: medidas canônicas no estado aberto', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Medição de geometria de modal roda no desktop.')
    await loginWithCredentials(page, vendedor, senha())
    await page.goto('/central-execucao')

    const novaAtividade = page.getByRole('button', { name: 'Nova atividade' }).first()
    await expect(novaAtividade).toBeVisible({ timeout: 30_000 })
    await novaAtividade.click()

    const modal = page.getByRole('dialog', { name: 'Nova atividade' })
    await expect(modal).toBeVisible({ timeout: 20_000 })

    const geometry = await page.evaluate(() => {
      const overlay = document.querySelector<HTMLElement>('[data-mx-overlay="modal"][data-state="open"]')
      if (!overlay) return null
      const rect = overlay.getBoundingClientRect()
      const style = getComputedStyle(overlay)
      const maxWidth = style.maxWidth && style.maxWidth !== 'none'
        ? Number.parseFloat(style.maxWidth) : null
      const body = overlay.querySelector<HTMLElement>('[data-mx-overlay-body]')
      return {
        present: true,
        layer: overlay.dataset.mxOverlayLayer || null,
        left: Math.round(rect.left),
        rightGap: Math.round(window.innerWidth - rect.right),
        width: Math.round(rect.width),
        maxWidth,
        borderRadius: style.borderRadius,
        borderRadiusPx: Number.parseFloat(style.borderRadius),
        scrollOwner: Boolean(body),
        overflowY: style.overflowY,
        verticalFit: rect.height <= window.innerHeight + 1,
        maxWidthToken: maxWidth != null && maxWidth <= window.innerWidth * 0.98,
      }
    })

    expect(geometry, 'overlay aberto deve ser mensurável').not.toBeNull()
    const viewportWidth = page.viewportSize()?.width ?? 1440
    expect(geometry!.layer, 'layer deve ser modal').toBe('modal')
    // centralizado: laterais >= 4% do viewport em desktop
    expect(geometry!.left, 'margem esquerda mínima').toBeGreaterThanOrEqual(Math.round(viewportWidth * 0.04))
    expect(geometry!.rightGap, 'margem direita mínima').toBeGreaterThanOrEqual(Math.round(viewportWidth * 0.04))
    // largura limitada por token max-width
    expect(geometry!.maxWidthToken, 'max-width dentro do viewport').toBe(true)
    // raio vem de token semântico, não valor cru: > 0 e < 50% (não é 0 nem pill)
    expect(geometry!.borderRadiusPx, 'raio tokenizado').toBeGreaterThan(0)
    expect(geometry!.borderRadiusPx, 'raio não é pill').toBeLessThan(50)
    // scroll: overlay body declarado e sem overflow vertical global
    expect(geometry!.scrollOwner, 'overlay body declarado').toBe(true)
    expect(geometry!.verticalFit, 'overlay não estoura o viewport').toBe(true)

    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden({ timeout: 10_000 })
  })

  test('fecha sem submeter mutação (read-only)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Interação representativa roda no desktop.')
    await loginWithCredentials(page, vendedor, senha())
    await page.goto('/central-execucao')

    const novaAtividade = page.getByRole('button', { name: 'Nova atividade' }).first()
    await expect(novaAtividade).toBeVisible({ timeout: 30_000 })
    await novaAtividade.click()
    const modal = page.getByRole('dialog', { name: 'Nova atividade' })
    await expect(modal).toBeVisible({ timeout: 20_000 })

    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden({ timeout: 10_000 })
  })
})
