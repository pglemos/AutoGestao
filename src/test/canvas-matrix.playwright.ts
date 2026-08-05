import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/**
 * Matriz canônica de layout — §27.4, §27.5 e §28.
 *
 * Afirma, no navegador, aquilo que a unificação promete: telas equivalentes têm
 * geometria equivalente. As medidas não são aproximadas por screenshot — são
 * lidas do DOM e comparadas com os tokens, o que torna a falha legível ("margem
 * 16 onde devia ser 32") em vez de "3% de pixels diferentes".
 *
 * O que cada caso verifica:
 *   1. o PageCanvas existe na rota e declara a largura registrada;
 *   2. a margem lateral corresponde à classe de tela (16 / 24 / 32);
 *   3. o padding de topo é o mesmo em todo perfil e breakpoint (§28.4);
 *   4. não há rolagem horizontal acidental (§28.13);
 *   5. nenhuma violação de acessibilidade grave ou crítica (§21).
 *
 * Credenciais vêm do ambiente. Sem elas o teste é ignorado em vez de falhar,
 * porque uma suíte vermelha por configuração ausente ensina a equipe a ignorar
 * vermelho.
 */

const require = createRequire(import.meta.url)
const AXE_SOURCE = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')

const PASSWORD = process.env.E2E_AUTH_PASSWORD

type RoleKey = 'vendedor' | 'gerente' | 'dono'

const CREDENTIALS: Record<RoleKey, string> = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
  dono: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
}

/** Rotas adotadas pelo PageCanvas, por perfil que as alcança. */
const ADOPTED_ROUTES: Record<RoleKey, string[]> = {
  vendedor: ['/ajuda', '/configuracoes', '/meu-funil', '/terminal-mx'],
  gerente: ['/pdi', '/funil-vendas', '/falar-consultor'],
  dono: ['/treinamentos', '/organograma', '/banco-talentos'],
}

/**
 * Margem lateral esperada por classe de tela — §7.3.
 *
 * Espelha `--mx-page-margin` de propósito: se o token mudar sem que este mapa
 * mude, a matriz falha e obriga a decisão a ser consciente.
 */
function expectedMargin(viewportWidth: number): number {
  if (viewportWidth >= 840) return 32
  if (viewportWidth >= 600) return 24
  return 16
}

/** Padding de topo — constante em todo breakpoint e perfil (§28.4). */
const EXPECTED_PADDING_TOP = 24

/**
 * Dívida de acessibilidade conhecida, por rota e regra — §21 e §27.6.
 *
 * Os números são teto: podem cair, nunca subir. Zerar uma entrada é a forma de
 * fechá-la. Cada valor é o maior entre desktop e mobile, porque os dois
 * viewports expõem conjuntos diferentes.
 *
 * Já fechado desde a medição inicial de 2026-07-31, com auditoria de contraste
 * por par de cor em vez de tela a tela:
 *   - `label` e `button-name`, as duas únicas violações `critical`. Não resta
 *     nenhuma crítica.
 *   - `text-slate-400`/`300` em texto pequeno, que davam 4.47:1 sobre branco.
 *   - `--mx-neutral-500`, corrigido de 45% para 42% no primitives: era a origem
 *     de todo `text-secondary`/`muted-foreground` reprovado sobre cinza-claro.
 *   Efeito medido: /meu-funil 21 → 2, /funil-vendas 15 → 7, /terminal-mx 11 → 8.
 *
 * Fechado também: o `emerald-600` do Tailwind (#009966) usado como marca em 192
 * arquivos, inclusive no botão primário. Convivia com o #198653 real em seis
 * rotas. Redefinido no @theme, zerou /ajuda, /configuracoes e /falar-consultor,
 * e reduziu /pdi, /organograma e /banco-talentos.
 *
 * Fechado antes disso:
 *   - badges de percentual por categoria, via tons `--color-status-*-text`
 *     escurecidos, e `status-success` deixando de ser o teal herdado. Zerou
 *     /funil-vendas por completo e levou /metas de 7 para 6.
 *   - `scrollable-region-focusable`, com tabIndex e role nas tabelas roláveis
 *     de /metas e /funil-vendas.
 *
 * O que sobra é contraste pontual em telas ainda não auditadas par a par —
 * mesma natureza do que já foi corrigido, sem causa única identificada.
 */
const A11Y_BUDGET: Record<string, Record<string, number>> = {
  '/ajuda': {},
  '/configuracoes': {},
  '/falar-consultor': {},
  '/treinamentos': {},
  '/funil-vendas': {},
  '/meu-funil': {},
  '/pdi': {},
  '/organograma': {},
  '/banco-talentos': {},
  // Único teto restante. São botões e rótulos em laranja no fechamento diário;
  // o laranja é a cor da etapa Showroom, então escurecer mais mexe na
  // identidade da etapa e não só no contraste.
  '/terminal-mx': { 'color-contrast': 4 },
}

async function signIn(page: Page, role: RoleKey): Promise<void> {
  await page.goto('/login')
  await page.fill('input[type="email"]', CREDENTIALS[role])
  await page.fill('input[type="password"]', PASSWORD as string)
  await page.click('button[type="submit"]')
  // O destino varia por perfil, então esperamos sair do login em vez de fixar
  // uma rota — fixar tornaria o teste frágil a mudanças de redirect.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 })
}

interface CanvasGeometry {
  found: boolean
  width: string | null
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  hasHorizontalScroll: boolean
  role: string | null
}

async function readCanvas(page: Page): Promise<CanvasGeometry> {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('[data-mx-page-canvas]')
    const shell = document.querySelector<HTMLElement>('.mx-ds')
    if (!canvas) {
      return {
        found: false,
        width: null,
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        role: shell?.dataset.mxRole ?? null,
      }
    }
    const style = getComputedStyle(canvas)
    return {
      found: true,
      width: canvas.dataset.mxPageWidth ?? null,
      paddingLeft: Math.round(parseFloat(style.paddingLeft)),
      paddingRight: Math.round(parseFloat(style.paddingRight)),
      paddingTop: Math.round(parseFloat(style.paddingTop)),
      hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
      role: shell?.dataset.mxRole ?? null,
    }
  })
}

interface AxeViolation {
  id: string
  impact: string | null
  nodes: number
}

async function runAxe(page: Page): Promise<AxeViolation[]> {
  await page.addScriptTag({ content: AXE_SOURCE })
  return page.evaluate(async () => {
    // Restringe ao conteúdo principal: a matriz cobre páginas, e violações do
    // shell devem ser relatadas uma vez, não repetidas em cada rota.
    const results = await (window as unknown as {
      axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: Array<{ id: string; impact: string | null; nodes: unknown[] }> }> }
    }).axe.run(
      { include: [['#main-content']] },
      { resultTypes: ['violations'], runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } },
    )
    return results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))
  })
}

test.describe('matriz canônica de layout', () => {
  test.skip(!PASSWORD, 'E2E_AUTH_PASSWORD não configurado — matriz ignorada em vez de falhar por config.')

  for (const role of Object.keys(ADOPTED_ROUTES) as RoleKey[]) {
    test.describe(`perfil ${role}`, () => {
      test(`mantém geometria e acessibilidade nas rotas adotadas`, async ({ page }, testInfo) => {
        const viewport = page.viewportSize()
        const margin = expectedMargin(viewport?.width ?? 1280)

        await signIn(page, role)

        const failures: string[] = []

        for (const route of ADOPTED_ROUTES[role]) {
          await page.goto(route)
          await page.waitForLoadState('networkidle')

          const geometry = await readCanvas(page)

          if (!geometry.found) {
            failures.push(`${route}: PageCanvas ausente (perfil resolvido: ${geometry.role})`)
            continue
          }
          if (geometry.paddingLeft !== margin || geometry.paddingRight !== margin) {
            failures.push(
              `${route}: margem ${geometry.paddingLeft}/${geometry.paddingRight}, esperada ${margin} em ${viewport?.width}px`,
            )
          }
          if (geometry.paddingTop !== EXPECTED_PADDING_TOP) {
            failures.push(`${route}: padding-top ${geometry.paddingTop}, esperado ${EXPECTED_PADDING_TOP}`)
          }
          if (geometry.hasHorizontalScroll) {
            failures.push(`${route}: rolagem horizontal acidental em ${viewport?.width}px`)
          }

          // Acessibilidade entra como catraca, não como portão binário.
          //
          // A primeira execução encontrou 13 violações reais (contraste em texto
          // pequeno colorido, região rolável sem foco, um campo sem rótulo).
          // Reprovar tudo de uma vez deixaria a suíte vermelha por dívida
          // preexistente, e uma suíte cronicamente vermelha ensina a equipe a
          // ignorar vermelho. O inventário congela o que existe hoje e falha
          // quando cresce — a dívida fica visível e não pode piorar.
          const budget = A11Y_BUDGET[route] ?? {}
          const blocking = (await runAxe(page)).filter(
            (v) => v.impact === 'critical' || v.impact === 'serious',
          )
          for (const violation of blocking) {
            const allowed = budget[violation.id] ?? 0
            if (violation.nodes > allowed) {
              failures.push(
                `${route}: a11y ${violation.impact} — ${violation.id} em ${violation.nodes} nó(s), teto ${allowed}`,
              )
            }
          }

          await testInfo.attach(`${role}-${route.replace(/\//g, '_')}.png`, {
            body: await page.screenshot({ fullPage: true }),
            contentType: 'image/png',
          })
        }

        expect(failures, `divergências encontradas:\n  ${failures.join('\n  ')}`).toEqual([])
      })
    })
  }
})
