# Story UX-20260718 — Paridade visual real com o módulo Gerente

## Status

Ready for Review — preview Vercel bloqueado por cota diária externa.

## Contexto

A entrega anterior unificou a origem dos componentes de `administrador_geral`, `administrador_mx`, `consultor_mx` e `dono`, porém não reproduziu o design visual canônico do módulo `gerente`. Os testes validavam apenas compartilhamento de arquivos e tokens próprios, permitindo sidebar com 264 px, item ativo em verde-claro, botões primários rosa e superfícies `mx-*`, enquanto a referência aprovada usa sidebar branca de 224 px, item ativo verde sólido, fundo `gray-50`, cards brancos, raios de 12/16 px, bordas `gray-100`, sombras leves e ações emerald.

## Objetivo

Fazer Admin MX, Administrador Geral, Consultor MX e Dono utilizarem a mesma matriz visual concreta do Gerente, preservando regras de negócio, RBAC, Supabase, rotas, dados e interações.

## Requisitos

- FR-01: O shell compartilhado deve reproduzir largura, navegação, estados ativo/inativo, tipografia, bordas, sombras e comportamento responsivo da referência do Gerente.
- FR-02: As primitivas de página, cabeçalho, toolbar, KPI, seção, tabela, estado vazio e carregamento devem usar a anatomia concreta do Gerente.
- FR-03: Ações primárias desses módulos devem usar emerald, nunca o `mx-action` rosa do Vendedor.
- FR-04: `PainelConsultor`, `Lojas` e `ConsultoriaClientes` devem herdar a fundação sem CSS corretivo por rota.
- FR-05: Navegação, simulação, perfil, notificações, filtros, relatórios e seleção de loja devem continuar funcionais.
- NFR-01: Não alterar schema, migration, RPC, trigger, Edge Function ou RLS do Supabase.
- NFR-02: Não introduzir novo design system paralelo.
- NFR-03: Não alterar contratos de dados nem permissões.
- NFR-04: Desktop e mobile não podem apresentar overflow horizontal acidental.

## Critérios de aceitação

- [x] Sidebar expandida mede 224 px (`w-56`) e recolhida 64 px (`w-16`).
- [x] Item ativo usa `bg-emerald-600 text-white shadow-sm` sem trilho lateral decorativo.
- [x] Existe exatamente um item ativo e um `aria-current="page"` por rota.
- [x] Fundo das páginas é `bg-gray-50`; conteúdo usa `max-w-7xl`, `px-4`, `py-6` e ritmo vertical consistente.
- [x] Cabeçalhos, toolbars, KPIs, seções e tabelas usam fundo branco, borda `gray-100`, sombra leve e raio computado de 16 px nas superfícies `rounded-2xl` da referência.
- [x] Botões principais de Admin, Consultoria e Dono usam emerald e não `mx-action` rosa.
- [x] O design system do Vendedor permanece isolado.
- [x] Os testes de paridade comparam classes e estilos computados reais, não apenas origem de imports.
- [x] TypeScript, lint, testes, build, bundle budget e matriz visual passam.
- [ ] Preview Vercel fica READY sem erro de build ou runtime. Bloqueado por `api-deployments-free-per-day`.
- [x] Nenhuma alteração de banco foi aplicada ao Supabase.

## Checklist de execução

- [x] Auditar screenshots, ZIP de referência e código publicado do Gerente.
- [x] Identificar causa-raiz nos componentes, tokens, raios e testes.
- [x] Criar contratos RED de fidelidade visual.
- [x] Corrigir primitives, sidebar, botões e páginas consumidoras.
- [x] Corrigir seleção única de navegação por rota e query string.
- [x] Reconstruir a landing de Consultoria com a fundação compartilhada.
- [x] Rodar testes focados e suíte completa.
- [x] Corrigir os contratos residuais de adapters, escopo consultivo, storage e diálogos de desenvolvimento.
- [x] Eliminar o erro de console no fluxo de persistência resiliente da Carteira.
- [x] Validar build de produção e bundle budget.
- [x] Validar matriz Playwright desktop/mobile dos cinco perfis.
- [x] Validar Supabase sem mutação.
- [x] Registrar evidências QA.
- [ ] Validar Preview Vercel após liberação da cota diária.

## Evidência principal

- Commit validado: `3beaf746843926548c61e4d51481efe89aa10873`.
- Matriz visual: 5 perfis × 2 viewports, PASS.
- Sidebar desktop: 224 px.
- Topbar mobile: 72 px.
- Cabeçalho dos módulos alvo: 16 px de raio computado.
- Item ativo: 1.
- `aria-current`: 1.
- Overflow horizontal: 0.
- Nós visuais legados: 0.
- Supabase: `ACTIVE_HEALTHY`, sem alterações.
- Vercel: preview impedido por cota diária, antes do build.

## File List

- `docs/stories/story-UX-20260718-paridade-visual-gerente-admin-v2.md`
- `docs/superpowers/plans/2026-07-18-paridade-visual-gerente-admin-v2.md`
- `docs/qa/2026-07-18-paridade-visual-gerente-admin-v2.md`
- `src/components/Layout.tsx`
- `src/components/MxSidebarShell.tsx`
- `src/components/MxSidebarShell.test.ts`
- `src/components/atoms/Button.tsx`
- `src/components/module/MxModuleVisualPrimitives.tsx`
- `src/components/module/MxModuleVisualPrimitives.test.tsx`
- `src/components/module/MxRoleVisualScope.tsx`
- `src/styles/manager-visual-scope.css`
- `src/main.tsx`
- `src/pages/PainelConsultor.tsx`
- `src/pages/ConsultoriaClientes.tsx`
- `src/features/lojas/sections/LojasHeader.tsx`
- `src/features/checkin/CheckinStickyHeader.test.ts`
- `src/test/module-design-system-parity.test.ts`
- `src/test/internal-mx-surface-provider.test.ts`
- `src/test/internal-mx-waves34-contract.test.ts`
- `src/test/internal-mx-consulting-scope-contract.test.ts`
- `src/hooks/auth/authHelpers.simulation.test.ts`
- `src/features/manager/development/ManagerDevelopmentDialogs.test.tsx`
- `src/features/manager/development/ManagerFeedbackReference.tsx`
- `src/components/carteira/ExecucaoMissao.jsx`
- `src/test/module-design-system-authenticated-visual.playwright.ts`
