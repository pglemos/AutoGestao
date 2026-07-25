# Onda 2 — Configurações, Desenvolvimento e Produtos Digitais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` and validate every checkpoint before moving `main`.

**Goal:** Migrar Configurações, Desenvolvimento e Produtos Digitais para a fundação canônica `MxModule*`, preservando rotas, dados, Supabase e permissões.

**Architecture:** Configurações continua orientada pelo `TAB_REGISTRY`; Desenvolvimento é dividido em Feedback e PDI; Produtos Digitais é separado em controller, política, schema, catálogo e componentes. A autorização é aplicada na interface e na função de mutação.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, React Router 7, Bun Test, Playwright, Supabase JS 2, Zod 4 e Tailwind CSS 4.

## Restrições globais

- Base: `edbcb9f980bad03c81188a78d5a4973c8eb7bb7c` ou descendente revisado.
- Alvo: `main`.
- Exatamente um commit consolidado e um deploy de produção.
- Nenhuma migration, tabela, coluna, RLS, RPC, trigger ou Edge Function.
- Nenhuma alteração nos contratos persistidos de `produtos_digitais`.
- Nenhuma alteração nos nomes das rotas.
- Containers migrados não podem criar `<main>` nem usar `PageHeading`.
- Usar slots `page`, `header`, `tabs`, `toolbar`, `section` e `table`.
- Consultor MX não pode executar mutações administrativas.
- Falhas de mutação preservam modal e campos.
- Validar desktop `1440×900`, tablet `1024×768` e mobile `390×844`.

## Task 1 — Contratos da Onda 2

**Arquivos:**
- `src/test/internal-mx-wave2-contract.test.ts`
- `src/test/internal-manager-page-contract.test.ts`

- [x] Verificar que Configurações, Desenvolvimento e Produtos não usam `PageHeading` ou `<main>` próprio.
- [x] Verificar presença de `MxModulePage`, `MxModuleHeader` e slot canônico de tabs.
- [x] Verificar registro único de 13 abas.
- [x] Verificar decomposição de Produtos Digitais.

## Task 2 — Tabs canônicas

**Arquivos:**
- `src/components/module/MxPageTabs.tsx`
- `src/components/module/MxPageTabs.test.tsx`

- [x] Implementar busca por grupo, rótulo e descrição.
- [x] Implementar agrupamento visual.
- [x] Implementar `role="tab"`, `aria-selected`, `aria-controls` e navegação por teclado.
- [x] Expor `data-mx-read-only` e `data-mx-page-tabs`.
- [x] Manter rolagem horizontal responsiva.

## Task 3 — Configurações canônica

**Arquivos:**
- `src/features/configuracoes/types.ts`
- `src/features/configuracoes/components/ConfiguracoesShell.tsx`
- `src/features/configuracoes/components/ConfiguracoesTabSummary.tsx`
- `src/features/configuracoes/configuracoes-policy.test.ts`
- `src/pages/Configuracoes.tsx`

- [x] Uniformizar contrato `SettingsTabProps { isReadOnly, role }`.
- [x] Manter `TAB_REGISTRY` como única fonte de verdade.
- [x] Preservar as 13 abas e o redirecionamento de Remuneração.
- [x] Excluir Remuneração do Consultor MX.
- [x] Aplicar somente leitura em Equipe & Usuários, Lojas & Rede, Operacional e Sistema MX.
- [x] Substituir navegação lateral por `MxPageTabs` pesquisável.
- [x] Renderizar resumo, badge e banner de somente leitura.
- [x] Remover consumidor de `ConfigTabsNav`.

## Task 4 — Filtros e métricas de Feedback

**Arquivos:**
- `src/features/manager/development/development-filters.ts`
- `src/features/manager/development/development-filters.test.ts`
- `src/features/manager/development/DevelopmentFeedbackMetrics.tsx`
- `src/features/manager/development/DevelopmentFeedbackFilters.tsx`
- `src/features/manager/development/DevelopmentFeedbackTable.tsx`
- `src/features/manager/development/ManagerFeedbackReference.tsx`

- [x] Preservar filtros por período, vendedor, tipo, competência e status.
- [x] Extrair métricas para `MxMetricCard`.
- [x] Extrair filtros para `MxToolbar` e `MxField`.
- [x] Extrair tabela para `MxTableSurface`.
- [x] Preservar criação, detalhe e compartilhamento por WhatsApp.
- [x] Usar estados canônicos de loading, erro e vazio.

## Task 5 — PDI canônico

**Arquivos:**
- `src/features/manager/development/DevelopmentPdiMetrics.tsx`
- `src/features/manager/development/DevelopmentPdiFilters.tsx`
- `src/features/manager/development/DevelopmentPdiTable.tsx`
- `src/features/manager/development/DevelopmentTeamCompetencyMap.tsx`
- `src/features/manager/development/ManagerPDIReference.tsx`

- [x] Preservar Meu PDI e PDI da Equipe.
- [x] Preservar filtros por vendedor e status.
- [x] Preservar `WizardPDI` e navegação para impressão.
- [x] Preservar mapa de competências.
- [x] Exibir progresso e ações vencidas.
- [x] Usar métricas, tabs, toolbar, tabela e estados canônicos.

## Task 6 — Shell de Desenvolvimento

**Arquivo:** `src/pages/ManagerDevelopment.tsx`

- [x] Usar `MxModulePage` e `MxModuleHeader`.
- [x] Usar `MxPageTabs` para Feedback e PDI.
- [x] Preservar query string `tab`.
- [x] Preservar rota real `/gerente/feedbacks-pdis`.

## Task 7 — Domínio de Produtos Digitais

**Arquivos:**
- `src/features/digital-products/types.ts`
- `src/features/digital-products/lib/digitalProductCatalog.ts`
- `src/features/digital-products/lib/digitalProductPolicy.ts`
- `src/features/digital-products/lib/digitalProductSchema.ts`
- `src/features/digital-products/lib/digitalProductFilters.ts`
- testes correspondentes

- [x] Centralizar catálogo padrão, públicos, categorias e status.
- [x] Centralizar normalização, visibilidade e autorização.
- [x] Manter geração de link interno por slug.
- [x] Cobrir filtros, métricas e política em testes.

## Task 8 — Controller de Produtos Digitais

**Arquivos:**
- `src/features/digital-products/hooks/useDigitalProductsController.ts`
- `src/features/digital-products/hooks/useDigitalProductsController.test.tsx`

- [x] Preservar consulta à tabela `produtos_digitais`.
- [x] Preservar criação, edição, arquivamento e catálogo padrão.
- [x] Bloquear mutações antes do Supabase por `assertCanManageDigitalProducts`.
- [x] Manter modal e formulário após erro.
- [x] Liberar flags em `finally`.
- [x] Expor estado recuperável de erro de consulta.

## Task 9 — UI de Produtos Digitais

**Arquivos:**
- `DigitalProductMetrics.tsx`
- `DigitalProductToolbar.tsx`
- `DigitalProductCard.tsx`
- `DigitalProductGrid.tsx`
- `DigitalProductFormModal.tsx`
- `DigitalProductsPage.tsx`
- `src/pages/ProdutosDigitais.tsx`

- [x] Usar página, header, métricas, toolbar, tabs, seção, vazio, loading e erro canônicos.
- [x] Manter modo Administração/Consumo.
- [x] Ocultar ações administrativas para não administradores.
- [x] Transformar a página de rota em adaptador mínimo.

## Task 10 — Matriz autenticada

**Arquivo:** `src/test/internal-mx-wave2.playwright.ts`

- [x] Declarar Administrador Geral, Administrador MX e Consultor MX.
- [x] Declarar desktop, tablet e mobile.
- [x] Cobrir Configurações, Desenvolvimento e Produtos Digitais.
- [x] Usar rota real `/gerente/feedbacks-pdis`.
- [x] Verificar overflow, console, slots e ações de gerenciamento.
- [ ] Executar matriz autenticada completa quando as três credenciais E2E estiverem disponíveis.

## Task 11 — Validação e publicação

- [x] Transpilar 38 arquivos TS/TSX sem diagnóstico.
- [x] Executar verificação estrita do recorte com stubs tipados.
- [x] Executar 10 asserts de lógica.
- [x] Executar 23 contratos estáticos.
- [x] Confirmar ausência de novos hexadecimais.
- [ ] Criar árvore Git sobre o SHA atual da `main`.
- [ ] Criar um commit consolidado.
- [ ] Mover `main` por fast-forward sem força.
- [ ] Aguardar TypeScript, testes, lint e build da Vercel.
- [ ] Executar smoke tests e verificar erros de runtime.

## Commit final

```bash
git commit -m "refactor(internal-mx): migrar configuracoes desenvolvimento e produtos na onda 2"
```

Nenhum commit intermediário deve ser criado.
