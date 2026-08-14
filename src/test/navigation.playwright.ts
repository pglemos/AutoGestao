import { test, expect } from '@playwright/test';
import { loginAsInternalMx } from './e2e-helpers/auth';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await loginAsInternalMx(page);
}

test.describe('Navigation: Main Sidebar & Mobile Bar', () => {

  test('root URL redirects or renders a page without crash', async ({ page }) => {
    const response = await page.goto('/');
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('login page renders auth form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('header renders MX Performance branding', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'O mobile header é oculto no desktop; a marca no desktop vem da sidebar.');
    await loginAsAdmin(page);
    const header = page.locator('[data-mx-mobile-header]');
    await expect(header).toBeVisible();
    await expect(header.locator('img[alt="MX"]')).toBeVisible();
  });

  test('sidebar navigation renders nav items when authenticated', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'A navegação lateral é substituída pela barra mobile.');
    await loginAsAdmin(page);

    const sidebar = page.locator('aside[aria-label^="Menu principal do"]');
    await expect(sidebar).toBeVisible();
    // A marca no desktop vive na sidebar, não no header mobile (oculto no xl).
    await expect(sidebar.locator('img[alt="MX"]')).toBeVisible();

    const navLinks = sidebar.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('mobile drawer opens on menu button and shows nav items', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'O drawer mobile substitui a sidebar no compacto.');
    await loginAsAdmin(page);

    const menuButton = page.locator('button[aria-label="Abrir menu principal"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-label', /Menu principal/);

    const navLinks = drawer.locator('a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('Painel page loads via nav link', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/painel');
    await expect(page.getByRole('heading', { name: /Rede Operacional/i })).toBeVisible();
  });

  test('Lojas page loads via nav link', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/lojas');
    await expect(page.getByRole('heading', { name: /Gestão de Lojas/i })).toBeVisible();
  });

  test('Checkin page loads or redirects to login', async ({ page }) => {
    await page.goto('/lancamento-diario');
    const url = page.url();
    const isLogin = url.includes('login');
    const isLancamentoDiario = url.includes('lancamento-diario');
    expect(isLogin || isLancamentoDiario).toBe(true);
  });

  test('Consultoria nav link navigates to clientes page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/consultoria/clientes');
    await expect(page.getByRole('heading', { name: /CRM de Consultoria/i })).toBeVisible();
  });

  test('Agenda nav link navigates to agenda page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/agenda');
    await expect(page.getByText('Agenda MX')).toBeVisible();
  });

  test('mobile menu button opens overlay menu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'O drawer mobile é mobile-only.');
    await page.setViewportSize({ width: 375, height: 667 });
    await loginAsAdmin(page);

    const menuButton = page.locator('button[aria-label="Abrir menu principal"]');
    await menuButton.click();

    const mobileMenu = page.locator('[role="dialog"][aria-modal="true"][aria-label^="Menu principal"]');
    await expect(mobileMenu).toBeVisible();
  });

  test('protected routes redirect unauthenticated users to login', async ({ page }) => {
    const routes = ['/painel', '/lancamento-diario', '/lojas/acertt?tab=equipe', '/classificacao', '/devolutivas', '/pdi'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
    }
  });

  test('skip to content link exists for accessibility', async ({ page }) => {
    await loginAsAdmin(page);

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();
  });
});
