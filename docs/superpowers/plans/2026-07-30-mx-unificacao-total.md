# MX Unificação Total — Plano de Execução

> Data: 2026-07-30 · Branch: `main` (por decisão explícita do solicitante) · Stack real: Vite 7 + React 19 + TS + Tailwind 4 + Radix/shadcn + Supabase + Vercel + Playwright + Storybook + bun test

## 0. Estado real medido (Fase 0 — concluída)

Auditado em 2026-07-30, não por leitura de relatório anterior mas por execução:

| Item | Estado medido | Evidência |
|---|---|---|
| Build | **verde** | `npm run build` → exit 0 |
| Token lint (hex hardcoded) | **verde** | `lint-tokens-ast` → 842 arquivos, 0 hex |
| Z-index lint | **verde** | `lint-z-index` → 61 ocorrências, dentro do inventário |
| Tokens em camadas | **parcial** | `primitives.css`, `semantic.css`, `components.css` existem |
| App Shell | **duplicado** | ver Gap 2 |
| PageCanvas / larguras semânticas | **inexistente** | ver Gap 1 |
| Scopes CSS legados | **ativos, e fixados por teste** | ver Gap 3 |
| Rotas | 110 `path=` em `src/App.tsx` (516 linhas) | — |
| Páginas | 54 em `src/pages` (+ subpasta `owner`) | — |

Conclusão: o sistema **não** é greenfield. A premissa "nada existe" do briefing está incorreta para tokens, z-index, shell frame e contratos de teste. Recomeçar do zero destruiria trabalho verificadamente verde. O plano abaixo audita e fecha os gaps reais.

## 1. Gaps reais

### Gap 1 — Não existe container canônico de página (requisito central §7/§8)
`src/design-system/` tem `tokens/`, `shell/`, `sidebar/`, `internal-mx/` — **nenhum** `PageCanvas`, largura semântica, margem responsiva por breakpoint, safe-area inferior centralizada ou `RouteLayoutMetadata`. Cada página decide sua própria margem: 15 arquivos em `src/pages` usam `max-w-*`/`px-*`/`mx-auto` na raiz (pior caso `PDIPrint.tsx` com 14 ocorrências, `ConsultorTreinamentos.tsx` com 11).

### Gap 2 — Dois shells vivos em paralelo
`src/App.tsx` importa **ambos**:
- `Layout` (`src/components/Layout.tsx`) → usa `MxSidebarShell`, importa `owner-base44-exact.css`
- `AppShell` (`src/components/AppShell.tsx`, lazy) → usa `design-system/shell/AppShellFrame`

Mais `src/components/layout/AppLayout.jsx` (aparentemente órfão) e `src/components/layout/Sidebar.jsx`. O AppShellFrame canônico existe mas não é o único caminho de runtime.

### Gap 3 — Legado fixado por contrato de teste (conflito a resolver antes de remover)
Quatro folhas de scope ativas: `manager-visual-scope.css` e `search-interactions.css` (via `main.tsx`), `owner-base44-exact.css` (via `Layout.tsx`), `internal-mx-manager-scope.css` + `internal-mx-template-slots.css` (via `InternalMxVisualScope.tsx`).

**Elas não são resíduo esquecido — são requisito de teste.** `src/test/module-design-system-parity.test.ts:82` exige `main.tsx` conter `./styles/manager-visual-scope.css`; `src/lib/owner-base44-exact-parity-contract.test.ts:24` exige `Layout.tsx` conter o import de `owner-base44-exact.css`; `tokens/semantic.css:62` documenta que valores shadcn foram *medidos a partir* de `owner-base44-exact.css`.

Ou seja: a Fase 10 do briefing ("remover scopes CSS antigos") colide de frente com os contratos de paridade Base44 que o projeto adotou deliberadamente. Isso exige decisão de produto, não execução silenciosa — ver §3.

## 2. Ondas de execução

Cada onda = commit atômico + gate verde antes da próxima.

- **Onda 1 — PageCanvas + tokens de layout.** Criar `src/design-system/page/` com `PageCanvas.tsx` (variantes `fluid|dashboard|wide|focused|form|reading`, densidade, `bottomClearance`), `FullBleed.tsx`, tokens de espaço/margem/breakpoint em `primitives.css`+`semantic.css`, `routeLayoutMetadata.ts`, e `page-contract.test.ts`. Gate: `npm run lint` + `npm run test` verdes.
- **Onda 2 — regra automatizada anti-padding na raiz.** `scripts/lint-page-roots.mjs`, exit≠0 acima do inventário congelado; inventário inicial = 15 arquivos atuais, só pode decrescer.
- **Onda 3 — consolidar shell.** Um único caminho de runtime via `AppShellFrame`; migrar consumidores de `Layout`; remover `layout/AppLayout.jsx` se órfão comprovado.
- **Onda 4 — migração por perfil.** Vendedor → Gerente → Dono → Admin/Consultor → rotas públicas. Por rota: PageCanvas + largura semântica + remover padding de raiz + estados + responsivo.
- **Onda 5 — validação.** Playwright matriz perfil × rota × viewport (390/600/840/1024/1280/1440/1600/1920), axe, console/rede limpos, regressão visual.
- **Onda 6 — publicação.** Preview → validação → produção → smoke → monitoramento Sentry.

## 2.1 Estado das ondas medido em 2026-07-31

| Onda | Estado | Evidência (comando, exit code) |
|---|---|---|
| 1 — PageCanvas + tokens de layout | **concluída** | `src/design-system/page/` com `PageCanvas.tsx`, `FullBleed.tsx`, `routeLayoutMetadata.ts`, `page-contract.test.ts`; tokens `--mx-page-*` em `semantic.css` |
| 2 — lint anti-padding na raiz | **concluída** | `npm run lint` → `[lint-page-roots] OK — 0 ocorrência(s) em 64 páginas, teto 0` (partiu de 15) |
| 3 — shell único | **concluída** | `src/App.tsx` importa só `AppShell` → `AppShellFrame`; `Layout.tsx` só aparece em testes de contrato |
| 4 — migração por perfil | **concluída** | inventário de raiz zerado; `lint-tokens-ast` 847 arquivos, 0 hex; `lint-z-index` 60 |
| 5 — validação | **em curso** | matriz interna MX 19 rotas × 3 viewports × 3 perfis verde (exit 0); demais suítes em medição |
| 6 — publicação | **não iniciada** | — |

Gates medidos em 2026-07-31: `npm run lint` exit 0, `npm run test` exit 0 (1697 testes), `npm run build` exit 0.

### Lacuna conhecida na Onda 5

`administrador_mx` e `consultor_mx` não têm conta E2E; a auditoria de rotas entra por bypass de
desenvolvimento e, por isso, não afirma nada sobre conteúdo carregado (título, cabeçalho da área,
erros de console vindos de consulta real) para esses dois perfis — só sobre anatomia de página.
Fechar essa lacuna exige contas de teste dedicadas, o que é criação de usuário em produção e
depende de decisão do solicitante.

## 3. Decisões que precisam do solicitante

1. **Gap 3:** manter a paridade visual Base44 (e portanto os scopes CSS e seus contratos de teste) ou removê-los, quebrando deliberadamente contratos de paridade que já foram aprovados? O briefing pede remoção; a memória do projeto registra "paridade Base44↔MX é visual, não só funcional" como requisito firme. Não resolvo isso por conta própria.
2. **Escopo vs. sessão:** 110 rotas × 8 viewports × ~13 estados de captura = ordem de 10⁴ artefatos visuais. Isso é um programa de semanas, não de uma sessão. Executo por ondas, com evidência por onda.

## 4. Gates por onda

```bash
npm run lint          # tsc + lint-tokens-ast + lint-z-index + eslint
npm run test          # bun test
npm run build         # vite build + assert_no_public_sourcemaps
npm run test:e2e      # playwright (ondas 4+)
```

Nenhuma onda é declarada concluída sem exit code 0 registrado e, para mudanças visíveis, screenshot.
