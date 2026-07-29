# MX Design System — Unificação Visual (Fase 0: Diagnóstico)

**Branch:** `feat/unified-mx-design-system`
**Base:** `393ebc5b` (origin/main)
**Referência visual:** módulo do Dono (`.owner-b44` / `OwnerLayout`)
**Data:** 2026-07-29

---

## 1. Estado inicial medido

| Métrica | Valor |
|---|---:|
| Rotas declaradas em `src/App.tsx` | 110 |
| Ocorrências de hex literal em `.tsx/.ts/.jsx` (excl. `base44-reference`) | 1.442 |
| Arquivos com hex literal | 86 |
| `style={{ ... }}` inline | 315 |
| Referências a `.owner-b44` | 36 |
| Referências a `mx-manager-scope` | 8 |
| Referências a `mx-internal-scope` | 12 |
| Linhas de CSS (index + styles/) | 2.640 |
| Componentes `ui/` (shadcn) | 53 |
| Átomos existentes | 13 |
| Moléculas existentes | 18 |
| Organismos existentes | 8 |

## 2. Escopos visuais fragmentados (a consolidar)

| Escopo | Arquivo CSS | Linhas | Consumidores |
|---|---|---:|---|
| `.owner-b44` | `src/styles/owner-base44-exact.css` | 146 | `features/owner-base44/OwnerShell.tsx`, `features/action-plan/ActionPlanWorkspace.tsx` |
| `.mx-manager-scope` | `src/styles/manager-visual-scope.css` | 55 | `components/module/MxRoleVisualScope.tsx` |
| `.mx-internal-scope` | `src/styles/internal-mx-manager-scope.css` | 441 | `components/module/InternalMxVisualScope.tsx` |
| slots internos | `src/styles/internal-mx-template-slots.css` | 79 | módulos internos |
| tokens globais | `src/index.css` (`@theme` + `:root`) | 1.902 | app inteiro |

## 3. Shells paralelos (a unificar em um único App Shell)

- `src/components/AppShell.tsx` — shell atual das rotas protegidas
- `src/components/Layout.tsx`
- `src/components/layout/AppLayout.jsx` + `layout/Sidebar.jsx`
- `src/components/owner/OwnerLayout.jsx` + `OwnerSidebar.jsx` + `OwnerTopbar.jsx`
- `src/features/owner-base44/OwnerShell.tsx`
- `src/components/MxSidebarShell.tsx`
- `src/features/internal-mx-planning/InternalMxPlanningShell.tsx`
- `src/features/internal-reports/ReportPageShell.tsx`
- `src/features/configuracoes/components/ConfiguracoesShell.tsx`
- `src/components/ui/sidebar.jsx` (primitivo shadcn)

**Total: 9 shells/layouts + 5 sidebars distintas.**

## 4. Paletas conflitantes identificadas

`src/index.css` declara **três identidades cromáticas simultâneas**:

1. **MX Brand (teal):** `--color-brand-primary: #00A89D`, `--color-mx-teal`, `--color-mx-action`
2. **Sidebar do Dono (verde):** `--color-mxsb-active: #198653` — este é o valor de referência do prompt (`primary`)
3. **Seller dark theme:** `--color-seller-screen-bg: #030B14`, `--color-seller-money: #39FF5A` — tema escuro exclusivo do Vendedor

> **Conflito central:** o prompt define `primary = #198653` (verde do Dono), mas o token global `brand-primary` é `#00A89D` (teal). O tema escuro do Vendedor (`seller-*`) é uma identidade visual paralela completa e é o maior desvio da referência do Dono.

## 5. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| ~~Tema escuro do Vendedor é identidade paralela inteira~~ — **medido na Fase 6: confinado a `features/remuneracao`, 8 arquivos** | Média | Decisão de produto pendente (§6.1.3), não repintado |
| 1.442 hex literais — substituição em massa pode alterar cores sem querer | Alta | Substituição por mapa hex→token auditado, commit por módulo, regressão visual |
| `base44-reference/` é referência congelada, não deve ser migrada | Média | Excluir de todo lint/codemod |
| RLS/grants recém-remediados (2026-07-17) | Média | Nenhuma mudança de banco nesta migração |
| Watcher que reverte `main` mid-sessão | Média | Trabalhar em worktree + commits frequentes |

## 6. Plano de fases

| Fase | Escopo | Status |
|---|---|---|
| 0 | Diagnóstico + inventário + baseline visual | ✅ |
| 1 | Fundação de tokens (primitive → semantic → component → motion) | ✅ |
| 2 | Átomos e moléculas consolidados | ✅ 12 átomos + 11 moléculas |
| 3 | App Shell único (Dono migrado sem mudança de aparência) | ✅ moldura + superfície da sidebar convergidas |
| 4 | Gerente | ✅ superfícies alinhadas ao visual aprovado |
| 5 | Admin / Consultor | ✅ já recebiam o modo aprovado; verificado |
| 6 | Vendedor | 🔄 medido; 32 tokens mortos removidos; painel de comissão aguarda decisão de produto |
| 7 | Páginas compartilhadas (login, perfil, erros) | 🔄 senha obrigatória e 403 migrados; Termos/Privacidade/404 pendentes |
| 8 | Remoção do legado | ⬜ |
| 9 | Deploy preview → produção | ⬜ |

## 6.1 Lacunas de acessibilidade encontradas na Fase 3

Confirmadas por inspeção do código e verificadas em runtime:

| Lacuna | Situação antes | Depois |
|---|---|---|
| Skip-link | **Inexistente em todo o produto**, apesar de `src/test/navigation.playwright.ts:132` já testar `a[href="#main-content"]` | `SkipLink` na moldura, primeiro elemento focável |
| Foco ao trocar de rota | Inexistente — o foco ficava no link clicado | `RouteAnnouncer` move o foco para o landmark |
| Landmark do módulo do Dono | `<div role="region">`, não focável | `<main tabIndex={-1}>` |
| Anúncio de navegação | Inexistente | `aria-live="polite"` com o `h1` da tela |

> `document.title` é estático (`MX PERFORMANCE`) em todas as rotas — nenhuma
> tela o atualiza. Por isso o anúncio de rota lê o `h1` da tela montada, e não
> o título do documento, que repetiria a mesma frase a cada navegação.

## 6.1.1 Correção de leitura: o que é o modo `manager`

Na Fase 2 registrei os ramos `useMxSurfaceVisualMode() === 'manager'` como "um
tema do perfil Gerente". **Está errado.** O único fornecedor de
`mode="manager"` no código era `src/components/owner/OwnerPageHeading.jsx` — o
cabeçalho do **Dono**.

`manager` é a aparência aprovada do Base44/Dono. `default` é o visual legado do
MX. A unificação caminha para `manager`, não para longe dele.

Nove componentes bifurcam: `Badge`, `Input`, `Select`, `Textarea`, `Skeleton`,
`Typography`, `Card`, `PageHeading`, `DataGrid`.

**Inconsistência encontrada:** `MxRoleVisualScope` já fornecia
`ButtonVisualProvider mode="manager"` às rotas não-vendedor, mas não o
equivalente de superfície. A mesma tela do Gerente combinava botão Base44 com
campo, card e tabela legados. Corrigido na Fase 4.

Delta medido em runtime (`Design System/Modos de superfície`):

| Elemento | Legado | Aprovado |
|---|---|---|
| Badge sucesso | teal sólido `rgb(0,168,157)`, texto branco, raio 12px | verde suave sobre fundo claro, pill |
| Campo | altura 48px, peso 700 | altura 40px, peso 400 |
| Descrição de card | CAIXA ALTA, peso 900, 16px | caixa normal, peso 400, 14px |

## 6.1.2 Por que o ramo legado ainda não pode ser removido

Medição em runtime dos dois ramos (story `Modos de superfície`):

| Componente | Legado | Aprovado |
|---|---|---|
| `Input` | 48px, raio 12px, peso 700 | 40px, raio 20px, peso 400 |
| `Select` | 56px, raio 12px, peso 700 | 40px, raio 20px, peso 400 |
| `Textarea` | raio 16px, peso 700 | raio 20px, peso 400 |
| `PageHeading` | sem card, sem sombra | card branco, raio 24px, padding 20px, sombra |
| `Badge` | teal sólido, texto branco | verde suave, pill |
| `Card` (descrição) | CAIXA ALTA, peso 900, 16px | caixa normal, peso 400, 14px |

**Nenhum par é equivalente.** Promover o ramo aprovado a único repintaria também
o vendedor (que renderiza os mesmos átomos sem provider), o login e os Termos.
O §26 coloca a remoção do legado na Fase 8, depois de internos (5) e vendedor
(6) — a ordem existe por este motivo.

Cobertura do modo aprovado por escopo:

| Escopo | Fornece modo aprovado | Desde |
|---|---|---|
| Perfis internos MX | ✅ | já existia |
| Gerente (`MxRoleVisualScope`) | ✅ | Fase 4 |
| Dono (`OwnerShell`) | ✅ | Fase 4 |
| Vendedor | ❌ por decisão | Fase 6 |
| Login, Termos, fluxo de senha | ❌ | Fase 7 |

## 6.1.3 Correção de leitura: o tema do vendedor

Na Fase 0 registrei o tema escuro do vendedor como "a identidade paralela mais
divergente e o maior risco da migração". A estimativa veio da **declaração** de
tokens, não do uso. Medido:

| Família | Tokens declarados | Usos reais |
|---|---:|---:|
| `--mx-seller-*` | 32 | **0** |
| `--color-seller-*` | 19 | 51 (via `var()`) |

Os 32 `--mx-seller-*` eram código morto — removidos nesta fase.

O tema escuro vivo está confinado a **uma feature**: `src/features/remuneracao`
(“Minha Remuneração”), 8 arquivos:

| Arquivo | Usos |
|---|---:|
| `components/dashboard/CommissionHeroCard.tsx` | 8 |
| `components/dashboard/LastSixMonthsCard.tsx` | 6 |
| `components/dashboard/RecordRoutineCard.tsx` | 5 |
| `components/dashboard/PotentialCommissionCard.tsx` | 4 |
| `components/dashboard/HotOpportunitiesCard.tsx` | 4 |
| `components/dashboard/PerformanceCard.tsx` | 3 |
| `MinhaRemuneracaoPage.tsx` | 2 |
| `components/dashboard/MilestoneCard.tsx` | 1 |

Não é o módulo do vendedor inteiro: é o painel de comissão. As demais telas do
vendedor já usam os componentes comuns.

> **Decisão pendente do produto.** O painel de comissão é deliberadamente
> escuro e celebratório (verde-dinheiro `#39FF5A`, gradientes). Repintá-lo no
> visual claro aprovado é o que o §43.1 pede, mas descaracteriza a tela mais
> motivacional do vendedor. Não foi repintado: é uma decisão de produto, não
> técnica. As alternativas são (a) migrar para o visual claro, (b) mantê-lo
> como exceção formalmente documentada — o §43.4 admite exceção "salvo decisão
> formal documentada".

## 6.1.4 Fase 7 — páginas compartilhadas

Medição do uso dos componentes bifurcados:

| Página | Componentes | Ação |
|---|---|---|
| `ForcePasswordChange` | 6 `Typography`, 2 `Input` | ✅ modo aprovado — renderizava fora do `MxRoleVisualScope` |
| `ForbiddenRoute` (403) | nenhum — layout próprio | ✅ migrada para `ErrorState kind="permission"` |
| `Login` | 1 `Typography`, com `className` sobrescrevendo | delta nulo; não alterada |
| `Privacy`, `Terms` | 14 e 11 `Typography`, 4 `Card` cada | ⏸ ver abaixo |
| `NotFound` (404) | `Card`, `Typography` | ⏸ pendente |

**`ForcePasswordChange` estava fora do escopo visual.** O retorno antecipado em
`Layout.tsx:284` acontece antes do `MxRoleVisualScope`, então a troca
obrigatória de senha renderizava campos legados para todos os perfis, inclusive
os que já veem o visual aprovado no resto do produto.

**403 deixou de inventar o próprio layout de erro** (§9.5). Passou a usar o
`ErrorState` do Design System, com um novo slot `action` — em um 403, repetir
não resolve, então a saída oferecida é voltar, não "tentar novamente".

> **`Privacy` e `Terms` não foram migradas.** São páginas institucionais com
> linguagem visual própria (herói escuro, gradientes, `shadow-mx-elite`), mais
> próximas da landing do que do produto. Sobrescrevem o `Card` com classes
> próprias, então o modo aprovado mudaria pouco e o risco de quebrar o layout
> sob medida é maior que o ganho. Decisão de produto, como o painel de comissão.

## 6.2 Pendências de verificação autenticada

Mudanças aplicadas que só podem ser confirmadas com sessão logada:

| Mudança | Perfis afetados | O que conferir |
|---|---|---|
| Drawer mobile perdeu a borda direita | gerente, vendedor, admin, consultor | Abrir o menu em < 1280px e comparar com o drawer do Dono |
| Superfícies passam ao visual aprovado | **gerente** | Badges, campos, cards e tabelas em todas as telas do Gerente (ver delta em §6.1.1) |
| Campos do Dono passam ao visual aprovado | **dono** | 2 campos: assunto em `FalarConsultorDono` e confirmação em `DeleteActionDialog` |
| Troca obrigatória de senha no visual aprovado | todos | Forçar `must_change_password` e conferir os 2 campos |
| 403 usa o `ErrorState` do DS | todos | Acessar rota sem permissão; conferir texto, ação e foco |
| Landmark do Dono virou `<main>` | dono | Navegar entre telas e conferir que o conteúdo não deslocou |
| Densidade por perfil | todos | `comfortable` no Dono, `compact` nos perfis internos |

## 6.3 Dívida de z-index

61 ocorrências de `z-[N]` em 21 valores distintos (80 → 9999). Não foram
migradas: reescrever o empilhamento sem percorrer todas as telas arriscaria
sobrepor modal, drawer e topbar.

`scripts/lint-z-index.mjs` congela o inventário em `scripts/z-index-baseline.json`
e falha se o total subir ou surgir valor novo — a dívida só pode diminuir. Ao
migrar um arquivo para a escala `--mx-z-*`, rode `npm run lint:z-index -- --update`.

## 7. Débito registrado

- `npm run lint` já roda `lint-tokens-ast.mjs` — existe governança de tokens parcial; precisa ser estendida para cobrir hex inline e `style={{}}` visual.
- `src/design-system/tokens/` contém apenas `colors.ts` — arquitetura de tokens em camadas ainda não existe.
