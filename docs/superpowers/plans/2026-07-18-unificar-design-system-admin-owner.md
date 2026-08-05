# Unificação do Design System dos Módulos MX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer `administrador_geral`, `administrador_mx`, `consultor_mx` e `dono` renderizarem exclusivamente o mesmo sistema visual e os mesmos componentes canônicos usados pelo módulo `gerente`, sem wrappers, CSS de maquiagem ou componentes legados do módulo interno antigo.

**Architecture:** O shell lateral universal `MxSidebarShell` permanece como única navegação. O conteúdo passa a usar primitivas visuais neutras extraídas de `ManagerVisualPrimitives`, com `ManagerVisualPrimitives.tsx` preservado apenas como re-export compatível. `Layout.tsx` deixa de aplicar `InternalMxPageFrame`; as folhas `internal-mx-*.css` e o tema `mxds-*` deixam o runtime. As páginas de Admin/Consultoria e as superfícies exclusivas do Dono são migradas por rota para `MxModulePage`, `MxModuleHeader`, `MxMetricCard`, `MxSectionCard`, `MxToolbar`, `MxField`, `MxTableSurface`, `MxEmptyState`, `MxLoadingState` e `MxStatusBanner`, preservando hooks, queries, capabilities, RLS e regras de negócio.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Tailwind 4, Lucide, Motion, Supabase JS 2, Bun Test, Playwright, GitHub Actions e Vercel.

## Global Constraints

- A referência visual e comportamental é o módulo Gerente atualmente publicado.
- Não criar outro design system, outro shell ou tokens paralelos.
- Não manter componentes legados escondidos, reestilizados por CSS global ou marcados apenas como `deprecated`.
- Não alterar tabelas, migrations, RPCs, triggers, Edge Functions ou políticas RLS do Supabase.
- Preservar `canAccessPath`, capabilities, simulação, badges, notificações e resolução de loja.
- Não registrar credenciais de teste no repositório; Playwright usa variáveis de ambiente.
- A entrega só pode ser mesclada após typecheck, testes, acessibilidade, Atomic Design, bundle, Gitleaks, build e Preview Vercel verdes.

---

### Task 1: Contrato RED contra legado visual

**Files:**
- Create: `src/test/module-design-system-parity.test.ts`
- Modify: `src/components/MxSidebarShell.test.ts`

**Interfaces:**
- Consumes: arquivos de runtime de `Layout`, `main`, design system interno e páginas alvo.
- Produces: contrato que impede a volta de `InternalMxPageFrame`, `.mx-internal-workspace`, imports `internal-mx-*.css`, `mxds-*` no runtime e shells paralelos.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

const layout = read('../components/Layout.tsx')
const main = read('../main.tsx')
const legacyFiles = [
  '../design-system/internal-mx/InternalMxPageFrame.tsx',
  '../design-system/internal-mx/internal-mx-frame.css',
  '../design-system/internal-mx/internal-mx-components.css',
  '../design-system/internal-mx/internal-mx-routes.css',
]

const targetEntryPoints = [
  '../pages/PainelConsultor.tsx',
  '../pages/Lojas.tsx',
  '../pages/AgendaAdmin.tsx',
  '../pages/Consultoria.tsx',
  '../pages/ConsultoriaClientes.tsx',
  '../pages/ConsultoriaClienteDetalhe.tsx',
  '../pages/ConsultoriaVisitaExecucao.tsx',
  '../pages/ProdutosDigitais.tsx',
  '../pages/ConsultorTreinamentos.tsx',
  '../pages/Configuracoes.tsx',
  '../pages/OperationalSettings.tsx',
  '../pages/ConsultoriaParametros.tsx',
  '../pages/Reprocessamento.tsx',
  '../pages/AiDiagnostics.tsx',
  '../pages/MorningReport.tsx',
  '../pages/SalesPerformance.tsx',
  '../pages/SellerPerformance.tsx',
  '../pages/Simulacao.tsx',
  '../features/dono/FalarConsultorDono.tsx',
  '../features/organograma/OrganogramaPage.tsx',
  '../features/comportamental/ComportamentalPage.tsx',
]

describe('paridade visual dos módulos MX com o Gerente', () => {
  test('não mantém adaptadores visuais legados no runtime', () => {
    expect(layout).not.toContain('InternalMxPageFrame')
    expect(layout).not.toContain('mx-internal-workspace')
    expect(main).not.toContain('internal-mx-frame.css')
    expect(main).not.toContain('internal-mx-components.css')
    expect(main).not.toContain('internal-mx-routes.css')
    expect(main).not.toContain("../packages/mx-tokens/src/theme.css")
    for (const file of legacyFiles) expect(existsSync(new URL(file, import.meta.url))).toBe(false)
  })

  test('todas as entradas exclusivas de Admin, Consultoria e Dono usam a fundação canônica', () => {
    for (const path of targetEntryPoints) {
      const source = read(path)
      expect(source).toMatch(/MxModulePage|MxModuleSection|re-export|export \{.*default.*\}/s)
      expect(source).not.toContain('mxds-')
      expect(source).not.toContain('mx-internal-workspace')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/test/module-design-system-parity.test.ts`

Expected: FAIL porque `Layout.tsx` ainda importa `InternalMxPageFrame`, `main.tsx` importa quatro folhas antigas e os arquivos legados ainda existem.

- [ ] **Step 3: Extend the sidebar contract**

Adicionar a `src/components/MxSidebarShell.test.ts`:

```ts
test('não depende do pacote mxds antigo', () => {
  expect(shellSource).not.toContain('mxds-')
  expect(shellSource).not.toContain('AppShell')
  expect(shellSource).not.toContain('SidebarBrandHeader')
})
```

- [ ] **Step 4: Commit the RED contract**

```bash
git add src/test/module-design-system-parity.test.ts src/components/MxSidebarShell.test.ts
git commit -m "test: proibir legado visual em admin e dono"
```

---

### Task 2: Fundação visual compartilhada derivada do Gerente

**Files:**
- Create: `src/components/module/MxModuleVisualPrimitives.tsx`
- Create: `src/components/module/MxModuleVisualPrimitives.test.tsx`
- Modify: `src/features/manager/shared/ManagerVisualPrimitives.tsx`
- Modify: `src/components/molecules/PageHeading.tsx`

**Interfaces:**
- Produces:
  - `MxModulePage(props: { children: ReactNode; className?: string; maxWidth?: 'full' | '7xl' })`
  - `MxModuleHeader(props: { title: ReactNode; description?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode })`
  - `MxMetricCard(props: ManagerMetricCard-compatible props)`
  - `MxSectionCard(props: { children: ReactNode; className?: string; as?: ElementType })`
  - `MxToolbar`, `MxField`, `MxTableSurface`, `MxEmptyState`, `MxLoadingState`, `MxStatusBanner`
- `ManagerMetricCard`, `ManagerSectionCard` e `ManagerStatusGauge` continuam disponíveis por re-export.

- [ ] **Step 1: Write semantic tests**

```tsx
import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Activity } from 'lucide-react'
import {
  MxModulePage,
  MxModuleHeader,
  MxMetricCard,
  MxSectionCard,
  MxTableSurface,
} from './MxModuleVisualPrimitives'

describe('MxModuleVisualPrimitives', () => {
  test('reproduz a anatomia canônica do Gerente', () => {
    const html = renderToStaticMarkup(
      <MxModulePage>
        <MxModuleHeader title="Painel" description="Descrição" />
        <MxMetricCard title="Vendas" value={10} detail="no período" icon={Activity} />
        <MxSectionCard><MxTableSurface><table><tbody><tr><td>OK</td></tr></tbody></table></MxTableSurface></MxSectionCard>
      </MxModulePage>,
    )
    expect(html).toContain('bg-surface-alt')
    expect(html).toContain('max-w-7xl')
    expect(html).toContain('rounded-mx-xl')
    expect(html).toContain('border-border-subtle')
    expect(html).toContain('<h1')
    expect(html).toContain('<table')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/components/module/MxModuleVisualPrimitives.test.tsx`

Expected: FAIL com módulo inexistente.

- [ ] **Step 3: Implement the shared primitives**

Criar componentes token-only com as classes canônicas já aprovadas no Gerente:

```tsx
export function MxModulePage({ children, className, maxWidth = '7xl' }: MxModulePageProps) {
  return (
    <main className={cn('min-h-full w-full overflow-y-auto bg-surface-alt px-mx-sm py-mx-md sm:px-mx-md lg:px-mx-lg', className)} id="main-content">
      <div className={cn('mx-auto flex w-full flex-col gap-mx-md pb-mx-20', maxWidth === '7xl' ? 'max-w-7xl' : 'max-w-none')}>
        {children}
      </div>
    </main>
  )
}

export function MxSectionCard({ as: Component = 'section', children, className }: MxSectionCardProps) {
  return <Component className={cn('overflow-hidden rounded-mx-xl border border-border-subtle bg-white shadow-mx-sm', className)}>{children}</Component>
}
```

`MxMetricCard` e `MxStatusGauge` reutilizam integralmente a implementação atual de `ManagerVisualPrimitives.tsx`. `MxToolbar`, `MxField`, `MxTableSurface`, `MxEmptyState`, `MxLoadingState` e `MxStatusBanner` devem usar somente tokens de `src/index.css`, sem hex, `style` ou classes `gray-*`/`emerald-*` cruas.

- [ ] **Step 4: Make ManagerVisualPrimitives a compatibility facade**

```ts
export {
  MxMetricCard as ManagerMetricCard,
  MxSectionCard as ManagerSectionCard,
  MxStatusGauge as ManagerStatusGauge,
} from '@/components/module/MxModuleVisualPrimitives'
```

- [ ] **Step 5: Run focused and manager tests**

Run:

```bash
bun test src/components/module/MxModuleVisualPrimitives.test.tsx
bun test src/features/manager/shared/ManagerVisualPrimitives.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/module src/features/manager/shared/ManagerVisualPrimitives.tsx src/components/molecules/PageHeading.tsx
git commit -m "feat: extrair fundação visual compartilhada do gerente"
```

---

### Task 3: Remover shell contextual e CSS de maquiagem

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/main.tsx`
- Delete: `src/design-system/internal-mx/InternalMxPageFrame.tsx`
- Delete: `src/design-system/internal-mx/internal-mx-frame.css`
- Delete: `src/design-system/internal-mx/internal-mx-components.css`
- Delete: `src/design-system/internal-mx/internal-mx-routes.css`
- Modify: `packages/mx-tokens/src/theme.css`

**Interfaces:**
- Consumes: `MxSidebarShell`, navegação interna e páginas existentes.
- Produces: todos os papéis renderizam o conteúdo diretamente sob o mesmo shell; nenhum seletor global altera páginas por perfil.

- [ ] **Step 1: Simplify Layout**

Substituir a construção condicional por:

```tsx
const pageContent = (
  <MotionPage key={location.pathname} className="h-full">
    <Outlet />
  </MotionPage>
)
```

E passar `pageContent` diretamente como filho de `MxSidebarShell`. Remover imports e referências de `InternalMxPageFrame` e `mx-internal-workspace`.

- [ ] **Step 2: Remove runtime CSS imports**

`src/main.tsx` deve manter somente:

```ts
import './index.css'
```

Remover o import de `../packages/mx-tokens/src/theme.css` e das três folhas `internal-mx-*`.

- [ ] **Step 3: Delete legacy files**

Excluir os quatro arquivos listados e remover de `packages/mx-tokens/src/theme.css` toda regra `.mx-internal-workspace` ou `.mxds-*` sem consumidor de runtime. Se o arquivo ficar sem consumidor, removê-lo do pacote em uma tarefa posterior, sem apagar tokens JSON usados por build.

- [ ] **Step 4: Run RED contract**

Run: `bun test src/test/module-design-system-parity.test.ts src/components/MxSidebarShell.test.ts`

Expected: o teste de adaptadores legados passa; o teste de entrypoints ainda falha até a Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/components/Layout.tsx src/main.tsx packages/mx-tokens/src/theme.css src/design-system/internal-mx src/test/module-design-system-parity.test.ts
git commit -m "refactor: remover adaptadores visuais do módulo interno"
```

---

### Task 4: Migrar páginas exclusivas de Admin, Consultoria e Dono

**Files:**
- Modify entrypoints and their owned sections under:
  - `src/pages/PainelConsultor.tsx`
  - `src/features/lojas/**`
  - `src/pages/AgendaAdmin.tsx`
  - `src/features/agenda/**`
  - `src/pages/Consultoria*.tsx`
  - `src/features/consultoria/**`
  - `src/pages/ProdutosDigitais.tsx`
  - `src/pages/ConsultorTreinamentos.tsx`
  - `src/pages/Configuracoes.tsx`
  - `src/pages/OperationalSettings.tsx`
  - `src/pages/ConsultoriaParametros.tsx`
  - `src/pages/Reprocessamento.tsx`
  - `src/pages/AiDiagnostics.tsx`
  - `src/pages/MorningReport.tsx`
  - `src/pages/SalesPerformance.tsx`
  - `src/pages/SellerPerformance.tsx`
  - `src/pages/Simulacao.tsx`
  - `src/features/dono/FalarConsultorDono.tsx`
  - `src/features/organograma/**`
  - `src/features/comportamental/**`
  - `src/features/dashboard-loja/sections/owner-cockpit/**`
- Tests: focused tests next to each migrated feature.

**Interfaces:**
- Consumes: primitives da Task 2.
- Produces: páginas sem wrappers `mxds`, sem `!important`, sem superfícies paralelas e com a mesma anatomia do Gerente.

- [ ] **Step 1: Migrate page roots**

Cada entrypoint deve retornar `MxModulePage`. Remover `main` com classes próprias de fundo/padding e usar:

```tsx
<MxModulePage>
  <MxModuleHeader
    title="..."
    description="..."
    actions={...}
  />
  {...conteúdo existente...}
</MxModulePage>
```

- [ ] **Step 2: Replace page-owned visual components**

Substituições obrigatórias:

```text
Card de KPI local                -> MxMetricCard
section/article visual local     -> MxSectionCard
barra de filtros local           -> MxToolbar
label + input/select/textarea    -> MxField + Input/Select/Textarea canônicos
wrapper de tabela                -> MxTableSurface
loading inventado                -> MxLoadingState
empty state inventado            -> MxEmptyState
alert/status local               -> MxStatusBanner
```

Hooks, RPCs, queries, mutations, callbacks e regras de cálculo permanecem intactos.

- [ ] **Step 3: Migrate Owner cockpit surfaces**

As seções exclusivas do Dono em `owner-cockpit/**` devem usar os mesmos cards, cabeçalhos, tabelas, tabs e estados do Gerente. Remover gradientes, raios, sombras ou tipografia que não existam nos tokens canônicos. Não alterar filtros `ownerSection`, resolução de loja ou dados.

- [ ] **Step 4: Add focused semantic tests per subsystem**

Cada subsistema deve testar:

```ts
expect(source).toContain('MxModulePage')
expect(source).toMatch(/MxModuleHeader|PageHeading/)
expect(source).not.toContain('mxds-')
expect(source).not.toContain('mx-internal-workspace')
expect(source).not.toContain('!important')
```

Além disso, testes renderizados devem confirmar headings, labels, tabelas e dialogs acessíveis.

- [ ] **Step 5: Run subsystem tests after each migration**

Run focused suites for `painel`, `lojas`, `agenda`, `consultoria`, `configuracoes`, `relatorios`, `dono` and shared routes. Expected: PASS before moving to the next subsystem.

- [ ] **Step 6: Run the parity contract**

Run: `bun test src/test/module-design-system-parity.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit in reviewable slices**

```bash
git commit -m "refactor: migrar painel e lojas para fundação gerencial"
git commit -m "refactor: migrar consultoria e agenda para fundação gerencial"
git commit -m "refactor: migrar configurações e relatórios para fundação gerencial"
git commit -m "refactor: migrar superfícies do dono para fundação gerencial"
```

---

### Task 5: Role smoke, Supabase, CI e Vercel

**Files:**
- Create: `src/test/module-design-system-role-smoke.playwright.ts`
- Modify: relevant GitHub workflow only if the existing role E2E does not discover the new test.
- Create: `docs/qa/2026-07-18-admin-owner-design-system-parity.md`

**Interfaces:**
- Consumes: production-like environment and secrets.
- Produces: evidence per role and viewport without committing credentials.

- [ ] **Step 1: Add role matrix Playwright**

```ts
const roles = [
  { name: 'gerente', email: process.env.E2E_MANAGER_EMAIL, password: process.env.E2E_MANAGER_PASSWORD, routes: ['/home', '/fechamento-diario', '/rotina-equipe'] },
  { name: 'dono', email: process.env.E2E_OWNER_EMAIL, password: process.env.E2E_OWNER_PASSWORD, routes: ['/lojas', '/configuracoes', '/falar-consultor'] },
  { name: 'admin', email: process.env.E2E_ADMIN_EMAIL, password: process.env.E2E_ADMIN_PASSWORD, routes: ['/painel', '/lojas', '/agenda', '/consultoria/clientes', '/configuracoes'] },
]
```

Para cada rota, validar:
- `MxSidebarShell` presente;
- título e subtítulo do módulo corretos;
- nenhum `.mxds-page-frame` ou `.mx-internal-workspace` no DOM;
- nenhum erro no console;
- nenhum overflow horizontal em 1440x900, 1024x768 e 390x844;
- botões, tabs, tabelas e dialogs navegáveis por teclado.

- [ ] **Step 2: Verify Supabase without DDL**

Run read-only checks for the three supplied users and confirm `usuarios.role` resolves through `normalizeRole`. Do not alter role records, permissions or RLS.

- [ ] **Step 3: Run all gates**

```bash
npm run typecheck
bun test
npm run lint
npm run build
npm run bundle-size
npm run validate:structure
npm run validate:parity
```

Expected: all exit code 0.

- [ ] **Step 4: Publish Preview Vercel**

Verify deployment state `READY`, HTTP 200, no build errors and no runtime error clusters.

- [ ] **Step 5: Review and merge**

Check changed files, unresolved review threads and commit SHA. Merge only after all required workflows pass.

- [ ] **Step 6: Verify production**

Confirm the production deployment references the merge SHA, all aliases are attached, the site returns HTTP 200 and Supabase remains `ACTIVE_HEALTHY`.

- [ ] **Step 7: Document evidence**

Record routes, roles, viewports, test counts, deployment ID, production SHA and explicit statement that no Supabase DDL/RLS changes occurred.
