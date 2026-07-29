# Módulo do Dono — Especificação completa do design system (produção)

> **Regra do sistema.** Este documento é normativo: descreve pixel a pixel o módulo do Dono
> conforme deploy em produção (`https://www.mxperformance.com.br`), levantado a partir dos
> tokens CSS, classes Tailwind e estrutura de componentes no código-fonte.
>
> O módulo do Dono roda dentro do escopo **`.owner-b44`**, que sobrescreve os custom properties
> CSS do shadcn (HSL) para o verde `#198653` e a tipografia Base44.
>
> **Por que isso existe?** O sistema atende 6 perfis de usuário com contextos de uso muito
> diferentes. Um vendedor passa o dia todo no sistema operacional em alta pressão (precisa de
> alto contraste, temas escuros para reduzir fadiga). Um dono acessa esporadicamente para
> decisões estratégicas (precisa de clareza, espaçamento generoso, sidebar clara). Um gerente
> opera no meio do caminho. Em vez de um tema único que serve mal a todos, cada módulo tem
> seu próprio escopo CSS que sobrescreve apenas os tokens que diferem — sem duplicar código.
> Fora desse escopo, a identidade visual segue o padrão de cada módulo conforme a tabela abaixo.

---

## Tabela comparativa — identidade visual por módulo

> **Arquitetura:** Existem 3 escopos CSS distintos na codebase. As funções compartilham escopos:
> - **Admin MX, Administrador MX e Consultor MX** usam o **mesmo** escopo (`.mx-manager-scope .mx-internal-scope`)
> - **Gerente** usa `.mx-manager-scope` (sem o internal)
> - **Dono** usa `.owner-b44` (isolado)
> - **Vendedor** não usa escopo (herda os tokens globais do `:root`)

### Comparação direta

| Atributo | Vendedor | Gerente | Dono | Admin MX / Adm. Geral / Consultor MX |
|---|---|---|---|---|
| **Escopo CSS** | Nenhum (global `:root`) | `.mx-manager-scope` | `.owner-b44` | `.mx-manager-scope .mx-internal-scope` |
| **Shell** | `Layout.tsx` (compartilhado) | `Layout.tsx` (compartilhado) | `OwnerShell.tsx` (exclusivo) | `Layout.tsx` (compartilhado) |
| **Primary** | `#00A896` (teal) | `#059669` (esmeralda) | `#198653` (verde floresta) | `#059669` (esmeralda) |
| **Primary hover** | `#00857D` | `#047857` | `#198653` com 90% opacidade | `#047857` |
| **Fundo página** | `#F8FAFC` (slate-50) | `#F9FAFB` (gray-50) | `#FFFFFF` | `#F9FAFB` (gray-50) |
| **Card/Surface** | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| **Borda** | `#E5E7EB` (gray-200) | `#E5E7EB` (gray-200) | `#E5E5E5` | `#E5E7EB` |
| **Texto primary** | `#0F172A` (slate-900) | `#1F2937` (gray-800) | `#0A0A0A` | `#1F2937` |
| **Texto muted** | `#64748B` (slate-500) | `#6B7280` (gray-500) | `#737373` (neutral-500) | `#6B7280` |
| **Fonte** | Inter (Google Fonts) | Inter (Google Fonts) | Stack do sistema | Inter (Google Fonts) |
| **Base font-size** | 16px | 16px | 14px | 16px |
| **Raio base (`--radius`)** | 16px (`1rem`) | 8px (`0.5rem`) | 10px (`0.625rem`) | 8px (`0.5rem`) |
| **Raio card** | 16px (`rounded-2xl`) | 12px (`rounded-xl`) | 12px (`rounded-xl`) | 12px (`rounded-xl`) |
| **Raio botão** | 8px (`rounded-lg`) | 12px (`rounded-xl`) | 6px (`rounded-md`) | 12px (`rounded-xl`) |
| **Sombra card** | `0 8px 24px rgba(5,25,35,0.06)` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(15,23,42,0.04)` | `0 1px 2px rgba(0,0,0,0.05)` |
| **Sombra ação** | `0 10px 22px rgba(0,168,150,0.20)` | `0 1px 3px rgba(0,0,0,0.10)` | `0 1px 3px rgba(0,0,0,0.1)` | `0 1px 3px rgba(0,0,0,0.10)` |
| **Modo botão** | `default` (teal) | `manager` (esmeralda) | `default` (verde) | `manager` (esmeralda) |

### Sidebar

| Atributo | Vendedor | Gerente | Dono | Admin MX / Adm. Geral / Consultor MX |
|---|---|---|---|---|
| **Fundo** | `#102C37` (navy escuro) | `#102C37` (navy escuro) | `#FAFAFA` (branco) | `#102C37` (navy escuro) |
| **Texto** | `#E0EBEA` (claro) | `#E0EBEA` (claro) | `#3F3F46` (zinc-600) | `#E0EBEA` (claro) |
| **Item ativo** | `#1A3E4D` + texto `#FFFFFF` | `#1A3E4D` + texto `#FFFFFF` | `primary/10` + `#198653` | `#1A3E4D` + texto `#FFFFFF` |
| **Item hover** | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.06)` | `#F4F4F5` | `rgba(255,255,255,0.06)` |
| **Borda** | `#1A3E4D` | `#1A3E4D` | `#E5E7EB` | `#1A3E4D` |
| **Largura** | 256px / recolhida 80px | 256px / recolhida 80px | 256px / recolhida 64px | 256px / recolhida 80px |
| **Tema** | Escuro | Escuro | Claro | Escuro |

### Tipografia headings

| Módulo | h1 | h2 | h3 | h4 |
|---|---|---|---|---|
| **Vendedor** | 28px / 700 (Inter) | 22px / 700 (Inter) | 18px / 600 (Inter) | 16px / 600 (Inter) |
| **Gerente** | 24px / 700 (Inter) | 20px / 700 (Inter) | 18px / 600 (Inter) | 16px / 600 (Inter) |
| **Dono** | 28px / 700 (sistema) | 22px / 700 (sistema) | 18px / 600 (sistema) | 16px / 600 (sistema) |
| **Admin/Consultor** | 24px / 700 (Inter) | 20px / 700 (Inter) | 18px / 600 (Inter) | 16px / 600 (Inter) |

### Tema geral

| Característica | Vendedor | Gerente | Dono | Admin MX / Consultor MX |
|---|---|---|---|---|
| **Claro/escuro** | Híbrido (sidebar escura, conteúdo claro) | Claro (com sidebar escura) | Claro (tudo claro) | Claro (com sidebar escura) |
| **Personalidade** | Operacional, alta pressão, gamificado | Tático, executivo, enxuto | Estratégico, limpo, espaçoso | Tático, funcional, enxuto |
| **Analogia** | "App de produção" — escuro como ferramenta de trabalho | "Dashboard gerencial" — profissional, contido | "Sala de reunião executiva" — clara, arejada | "Painel de controle" — igual gerente, sem badges do Dono |

### Por que não um tema único?

Cada perfil usa o sistema em contextos completamente diferentes:

1. **Vendedor** — usa o sistema 8h+ por dia em loja, muitas vezes em tablets. Precisa de alto
   contraste, fundos escuros para reduzir reflexo, gamificação para engajamento, tipografia
   grande para leitura rápida.
2. **Gerente** — opera em escritório, alterna entre métricas e ações. Precisa de visual limpo
   e enxuto, sem distrações. O esmeralda transmite confiança sem ser chamativo.
3. **Dono** — acessa esporadicamente (algumas vezes por semana), geralmente em desktop. Precisa
   de clareza absoluta, espaçamento generoso, sidebar clara (psicologicamente mais convidativa
   para quem não vive no sistema). O verde floresta comunica solidez.
4. **Admin/Consultor** — usa como ferramenta de suporte, compartilha o escopo do gerente pois
   as necessidades visuais são as mesmas: funcionalidade acima de identidade.

A implementação com escopos CSS isolados resolve isso sem duplicar componentes — um botão
`<Button>` no Vendedor renderiza teal com bordas arredondadas (8px), no Dono renderiza verde
com bordas retas (6px), no Gerente renderiza esmeralda com bordas grandes (12px). A mesma
classe `bg-primary` resolve para cores diferentes dependendo do módulo.

---

## Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | React | 19 |
| Roteamento | React Router | 7 |
| Estilo | Tailwind CSS v4 (`@theme` inline) | 4 |
| Primitivas UI | shadcn/ui sobre Radix | — |
| Ícones | lucide-react | — |
| Composição de classes | `cn()` = `clsx` + `tailwind-merge` | — |
| Formulários | shadcn Form (React Hook Form + Zod) | — |
| Gráficos | Recharts | — |
| Data-fetching | Supabase JS client (live repositories) | — |
| Observabilidade | Sentry (React + Vite plugin) | — |
| Build | Vite | 6 |
| Deploy | Vercel (auto-deploy em push p/ main) | — |

O módulo **não** usa CSS modules, styled-components, Emotion ou Framer Motion. Toda animação é
CSS nativa (`transition-colors`, `transition-[width]`, `animate-pulse`).

---

## Tabela comparativa — Páginas do Dono

> Situação de cada página que o perfil **Dono** enxerga, incluindo as páginas compartilhadas
> com Gerente/Admin. A coluna **Padrão** indica se o *wrapper*, os *tokens* e o *padrão de card*
> seguem a especificação deste documento. `REFATORADO` = refatorado nesta sprint.

### Dono-exclusivas (`OwnerShell`, escopo `.owner-b44`)

| Rota | Componente | Wrapper | Tokens | Cards | Estado |
|------|-----------|---------|--------|-------|--------|
| `/home` | `OwnerHome.jsx` | ✅ `main#page-home` | ✅ semânticos | ✅ `rounded-xl border bg-card p-4 shadow-sm` | ✅ Padronizado |
| `/plano-acao` | `PlanoDeAcao.jsx` | ✅ `main#page-plano-acao` | ✅ semânticos | ✅ idem | ✅ Padronizado |
| `/plano-estrategico` | `StrategicPlanWorkspace.tsx` | ✅ `main#page-plano-estrategico` | ✅ semânticos | ✅ idem | ✅ Padronizado |
| `/consultoria` | `Consultoria.jsx` | ✅ `main#page-consultoria` | ✅ semânticos | ✅ idem | ✅ Padronizado |
| `/rotina-do-dia` | `Placeholders.RotinaDoDia` | ❌ `main` genérico | ✅ semânticos | N/A (placeholder) | ⏳ Placeholder |
| `/decisoes` | `Placeholders.CentralDeDecisoes` | ❌ `main` genérico | ✅ semânticos | N/A | ⏳ Placeholder |
| `/departamentos/*` | `Placeholders.*` (6 páginas) | ❌ `main` genérico | ✅ semânticos | N/A | ⏳ 6× Placeholder |
| `/mercado` | `Placeholders.Mercado` | ❌ `main` genérico | ✅ semânticos | N/A | ⏳ Placeholder |
| `/treinamentos` | `OwnerUniversidade` | ❌ `main` genérico | ✅ semânticos | N/A | ⏳ Placeholder |

### Compartilhadas com Gerente/Admin (`Layout.tsx`, escopo `.mx-manager-scope`)

| Rota | Componente | Wrapper | Tokens | Cards | Estado |
|------|-----------|---------|--------|-------|--------|
| `/metas` | `MetasGerente.tsx` | ✅ `main#metas-gerente` | ✅ semânticos | ✅ `rounded-xl border bg-card p-4 shadow-sm` | ✅ **REFATORADO** |
| `/funil-vendas` | `FunilVendasGerente.tsx` | ✅ `main#funil-vendas` | ✅ semânticos | ✅ idem | ✅ **REFATORADO** |
| `/fechamento-diario` | `ManagerDailyClosing.container.tsx` | ⚠️ `main#fechamento-diario` | ⚠️ `bg-muted` + `rounded-[16px]` custom | ❌ `rounded-[16px] bg-white border-gray-100` | ⚠️ **REFATORADO** (skeleton + wrapper) |
| `/devolutivas` | `GerenteFeedback.container.tsx` | ✅ `main` padronizado | ✅ semânticos | N/A (delega) | ✅ **REFATORADO** |
| `/minha-equipe` | `DashboardLoja` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/meta-loja` | `DashboardLoja` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/vendas` | `DashboardLoja` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/mentor` | `ManagerMentor` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/feedbacks-pdis` | `ManagerDevelopment` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/treinamentos` | `GerenteTreinamentos` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/falar-consultor` | `FalarConsultorDono` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/pdi` | `GerentePDI` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/rotina-equipe` | `ManagerTeamRoutine` | ❓ | ❓ | ❓ | 🔍 Não auditado |

### Globais (qualquer escopo)

| Rota | Componente | Wrapper | Tokens | Cards | Estado |
|------|-----------|---------|--------|-------|--------|
| `/notificacoes` | `Notificacoes.container.tsx` | ✅ `MxModulePage` | ⚠️ `gap-4` (corrigido) | N/A (padrão MxModule) | ✅ **REFATORADO** |
| `/perfil` | `Perfil.tsx` → `InternalProfilePage` | ✅ `MxModulePage` | ✅ semânticos | N/A (padrão MxModule) | ✅ Padronizado |
| `/perfil` (vendedor) | `LegacyProfilePage.tsx` | ✅ `main#perfil` | ✅ semânticos | ✅ `rounded-xl border bg-card` | ✅ **REFATORADO** |
| `/configuracoes` | `ConfiguracoesShell.tsx` | ✅ `MxModulePage` | ✅ semânticos | N/A (padrão MxModule) | ✅ Padronizado |
| `/carteira-clientes` | `CarteiraClientes` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/organograma` | `Organograma` | ❓ | ❓ | ❓ | 🔍 Não auditado |
| `/comportamental` | `Comportamental` | ❓ | ❓ | ❓ | 🔍 Não auditado |

### Legenda

| Ícone | Significado |
|-------|------------|
| ✅ Padronizado | Segue a especificação (wrapper `main#page-xxx`, tokens semânticos, card padrão) |
| ⚠️ Parcial | Alguns elementos seguem, outros não |
| ⏳ Placeholder | Página de placeholder (não implementada), fora do escopo de padronização |
| 🔍 Não auditado | Página não analisada nesta sprint |
| ✅ **REFATORADO** | Refatorado para seguir o padrão nesta sprint |

### Resumo da sprint

| Métrica | Valor |
|---------|-------|
| Páginas alvo | 7 |
| Refatoradas | 7 (100%) |
| Wrapper `main` padronizado | 7/7 |
| Tokens semânticos aplicados | 7/7 |
| Cards padronizados (`rounded-xl border bg-card p-4 shadow-sm`) | 3/3 que usam cards |
| Dependências legadas removidas (`Card`, `Typography`) | 3/3 arquivos |
| `gap-*` corrigido para padrão | 2/2 (`Notificacoes`, `ManagerDailyClosing`) |
| Skeleton padronizado | 2/2 (`FeedbackLoadingSkeleton`, `ManagerClosingSkeleton`) |

---

## 1. Identidade visual e tokens globais

### 1.1 Tema do Dono (escopo `.owner-b44`)

O módulo herda as variáveis HSL do `:root` (teal `#00A89D`), mas o escopo `.owner-b44` as
sobrescreve para o verde Base44 (`#198653`). _Fonte: `src/styles/owner-base44-exact.css`_.

| Token | HSL | Hex | Uso |
|---|---|---|---|
| `--background` | `0 0% 100%` | `#FFFFFF` | Fundo da página |
| `--foreground` | `0 0% 4%` | `#0A0A0A` | Texto principal |
| `--card` | `0 0% 100%` | `#FFFFFF` | Fundo de cards |
| `--card-foreground` | `0 0% 4%` | `#0A0A0A` | Texto em cards |
| `--primary` | `152 69% 31%` | `#198653` | Verde institucional: CTA, ativo, link |
| `--primary-foreground` | `0 0% 98%` | `#FAFAFA` | Texto sobre primary |
| `--secondary` | `0 0% 96%` | `#F5F5F5` | Fundo secundário |
| `--secondary-foreground` | `0 0% 9%` | `#171717` | Texto sobre secondary |
| `--muted` | `0 0% 96%` | `#F5F5F5` | Fundo muted/desabilitado |
| `--muted-foreground` | `0 0% 45%` | `#737373` | Texto secundário, subtítulo |
| `--accent` | `0 0% 96%` | `#F5F5F5` | Hover de item |
| `--accent-foreground` | `0 0% 9%` | `#171717` | Texto no hover |
| `--destructive` | `0 84% 60%` | `#EF4444` | Vermelho: remover, sair, erro |
| `--destructive-foreground` | `0 0% 98%` | `#FAFAFA` | Texto sobre destructive |
| `--border` | `0 0% 90%` | `#E5E5E5` | Borda de cards, tabelas, inputs |
| `--input` | `0 0% 90%` | `#E5E5E5` | Borda de inputs |
| `--ring` | `0 0% 4%` | `#0A0A0A` | Foco de inputs |
| `--radius` | `0.625rem` | 10px | Raio base shadcn |

### 1.2 Sidebar (mesmo escopo)

| Token | HSL | Hex | Uso |
|---|---|---|---|
| `--sidebar-background` | `0 0% 98%` | `#FAFAFA` | Fundo da sidebar |
| `--sidebar-foreground` | `240 5% 26%` | `#3F3F46` | Texto dos itens |
| `--sidebar-accent` | `240 5% 96%` | `#F4F4F5` | Hover de item |
| `--sidebar-accent-foreground` | `240 6% 10%` | `#18181B` | Texto no hover |
| `--sidebar-border` | `220 13% 91%` | `#E5E7EB` | Borda direita, divisores |

### 1.3 Cores de área (Plano Estratégico)

| Área | HEX | Tailwind classes |
|---|---|---|
| Vendas | `#7C3AED` (violeta) | `bg-violet-50 text-violet-700 border-violet-200` |
| Marketing | `#4F46E5` (índigo) | `bg-indigo-50 text-indigo-700 border-indigo-200` |
| Estoque | `#2563EB` (azul) | `bg-blue-50 text-blue-700 border-blue-200` |
| Financeiro | `#16A34A` (verde) | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Operacional | `#F97316` (laranja) | `bg-orange-50 text-orange-700 border-orange-200` |

### 1.4 Cores semânticas (status de indicador)

| Status | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| Bom | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | Meta ≥ 100% |
| Atenção | `bg-amber-50` | `text-amber-700` | `border-amber-200` | Meta ≥ 90% |
| Crítico | `bg-red-50` | `text-red-700` | `border-red-200` | Meta < 90% |
| Neutro | `bg-slate-100` | `text-slate-500` | `border-slate-200` | Sem dados |

---

## 2. Layout shell

### 2.1 Estrutura geral

```
.owner-b44 (escopo, fundo #FFFFFF)
└── div.flex.h-full.min-h-0.overflow-hidden.bg-background (flex-row, 100vh)
    ├── aside (sidebar, w-64, border-r, xl:block)
    │   └── OwnerSidebar
    ├── div (drawer overlay, z-40, xl:hidden, <1280px)
    │   ├── div (scrim, bg-black/40)
    │   └── div[role="dialog"] (w-72 max-w-[85vw] sm:w-80 sm:max-w-sm)
    │       ├── button "Fechar" (X)
    │       └── OwnerSidebar (onNavigate fecha)
    └── div.flex.h-full.min-h-0.flex-1.flex-col.overflow-hidden
        ├── OwnerTopbar (xl:hidden, hamburger+marca+sino+avatar)
        └── div#owner-main-content (flex-1, overflow-y-auto)
            └── div.mx-auto.w-full.max-w-[1400px].flex.flex-col.gap-6 (padding)
                └── <Outlet />
```

### 2.2 Dimensões do conteúdo

| Propriedade | Valor | Tailwind |
|---|---|---|
| Largura máxima | 1400px | `max-w-[1400px]` |
| Padding lateral (mobile) | 16px | `px-4` |
| Padding lateral (≥1024px) | 32px | `lg:px-8` |
| Padding top | 24px / 32px (lg) | `pt-6 lg:pt-8` |
| Padding bottom (mobile) | 96px | `pb-24` |
| Padding bottom (≥1024px) | 32px | `lg:pb-8` |
| Gap entre seções | 24px | `space-y-6` |

### 2.3 Responsividade do layout

| Viewport | Sidebar | Topbar | Bottom nav |
|---|---|---|---|
| ≥1280px (xl) | Fixa 256px, recolhível 64px | Oculta | Oculta |
| 768-1279px | Drawer (320px) | Visível | Oculta |
| 375-811px | Drawer (~288px) | Visível | Fixa 56px |

---

## 3. Página Início (`/dono`)

### 3.1 Estrutura

```
main#page-home (space-y-6 pb-20 lg:pb-0)
├── HomeHeader (OwnerPageHeading)
├── section "Indicadores"
│   └── grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5
│       ├── MetricCard × 4
│       └── MxScoreCard (col-span-2 sm:col-span-1)
├── PriorityIntervention (border-2 cor dinâmica)
├── section.grid.grid-cols-1.gap-6.lg:grid-cols-3
│   ├── SalesGoalBlock
│   ├── SecondaryAlerts
│   └── OwnerActionsBlock
├── DepartmentPerformance
│   └── grid.grid-cols-1.gap-3.sm:grid-cols-2.lg:grid-cols-3
│       └── DepartmentCard × 6
├── ConsultantCard (gradiente from-primary/5 to-card)
├── MobileBottomNav (fixed, lg:hidden)
└── DepartmentDrawer (Sheet right)
```

### 3.2 OwnerPageHeading

```
div.flex.flex-col.gap-2.sm:flex-row.sm:items-center.sm:justify-between
├── div.flex.items-center.gap-3
│   ├── div.rounded-xl.bg-primary/10.p-2.5
│   │   └── Icon (h-5 w-5 text-primary)
│   └── div
│       ├── h1 (text-xl lg:text-2xl font-bold tracking-tight)
│       └── p (text-sm text-muted-foreground)
└── div.flex.items-center.gap-2 (actions slot)
```

**Medidas:** h1 20/24px, subtítulo 14px, ícone wrapper 40×40, ícone 20×20, gap 12px.

### 3.3 MetricCard

```
article (rounded-xl border bg-card p-4 shadow-sm)
├── div.flex.items-center.justify-between
│   ├── div.rounded-lg.w-9.h-9 (cor indicador) + Icon (h-5 w-5)
│   └── span.h-2.w-2.rounded-full (status)
├── p.text-sm.font-medium.text-muted-foreground (título)
├── p.text-2xl.font-bold.tracking-tight.text-foreground (valor)
└── div.flex.items-center.gap-2.border-t.pt-3.mt-3
    ├── span.text-xs (trend) + Sparkline (SVG)
```

### 3.4 DepartmentCard

```
button (w-full text-left rounded-xl border-l-4 p-4 shadow-sm)
├── ScoreGauge (56×56 circle)
├── p.text-sm.font-semibold + badge status (rounded-full)
└── p.text-xs.text-muted-foreground.line-clamp-2 (keyPoint)
```

### 3.5 MobileBottomNav

```
nav (fixed bottom-0 z-40 border-t bg-card px-2 py-2 lg:hidden)
└── div.flex.items-center.justify-around
    └── button × 5 (flex flex-col items-center gap-0.5)
        ├── Icon (h-5 w-5, primary/muted)
        │   └── se primary: span.rounded-full.bg-primary.shadow-md.h-10.w-10
        └── span.text-[10px] (label)
```

---

## 4. Plano de Ação (`/plano-acao`)

### 4.1 Estrutura

```
main#page-plano-acao (space-y-6 pb-20 lg:pb-0)
├── ActionPlanHeader (OwnerPageHeading + Exportar + Nova Ação)
├── ActionPlanTabs (Ações / Calendário)
├── section#tab-panel-acoes.space-y-6
│   ├── ExecutiveCardsStrip (grid-cols-2 gap-4 lg:grid-cols-5)
│   ├── ActionsToolbar
│   └── FocusView / BoardView / TableView
└── section#tab-panel-calendario → CalendarView
```

### 4.2 ExecutiveCardsStrip

```
button[role="listitem"] (rounded-xl border bg-card p-4 shadow-sm)
├── div.absolute.left-0.top-0.h-full.w-1 (strip colorido)
├── div.rounded-lg.h-9.w-9 (iconBg) + Icon (h-[18px])
├── p.text-3xl.font-bold + p.text-sm.font-semibold + p.text-xs (complemento)
└── span "Filtro ativo" (rounded-full text-[10px])
```

| Card | Strip | IconBg | Borda selecionado |
|---|---|---|---|
| Total | `bg-indigo-500` | `bg-indigo-100 text-indigo-600` | `border-indigo-400` |
| Não Iniciadas | `bg-slate-400` | `bg-slate-100 text-slate-600` | `border-slate-400` |
| Atrasadas | `bg-red-500` | `bg-red-100 text-red-600` | `border-red-400` |
| Em Andamento | `bg-blue-500` | `bg-blue-100 text-blue-600` | `border-blue-400` |
| Concluídas | `bg-emerald-500` | `bg-emerald-100 text-emerald-600` | `border-emerald-400` |

### 4.3 ActionsToolbar

```
section.space-y-2
├── div.flex.flex-col.gap-2.lg:flex-row.lg:items-center.lg:justify-between
│   ├── Select × 2 (Departamento + Responsável, w-[210px] h-9)
│   └── div.flex.items-center.gap-2
│       ├── Mode selector (inline-flex rounded-lg border bg-muted/40 p-1)
│       │   └── button × 3 (rounded-md px-3 py-1.5 text-xs)
│       ├── Sort Select (h-9 w-[160px] text-xs)
│       └── Button "Nova Ação" (bg-primary)
└── div (chips: rounded-full bg-emerald-50 px-2.5 py-1 text-xs + X)
```

### 4.4 Modais (padrão)

```
DialogContent (max-h-[90vh] overflow-y-auto sm:max-w-md ou sm:max-w-lg)
├── DialogHeader (Title + Description)
├── div.space-y-3
│   ├── Label (text-sm) + Input/Select/Textarea
│   └── checkbox cards (rounded-lg border p-3 hover:bg-muted/40)
└── DialogFooter (Cancel + Confirm bg-primary)
```

**Inputs:** h-9 (36px), rounded-md (6px), border 1px #E5E5E5, shadow-sm, text-sm.

---

## 5. Plano Estratégico (`/plano-estrategico`)

### 5.1 Estrutura

```
main#page-plano-estrategico (space-y-6 pb-20 lg:pb-0)
├── StrategicHeader (OwnerPageHeading)
├── StrategicPlanTabs (Resumo / Visão Geral / Detalhado)
└── Conteúdo por tab:
    ├── resumo:    grid xl:grid-cols-[58%_42%] gap-4
    ├── visao-geral: grid xl:grid-cols-[58%_42%] gap-4
    └── detalhado: grid lg:grid-cols-2 gap-4
```

### 5.2 StrategicIndicatorSummaryCards

```
div.rounded-xl.border.shadow-sm
├── div.h-1 (cor da área, 4px)
└── div.flex.flex-col.lg:flex-row.lg:items-stretch
    ├── div.lg:min-w-[260px].border-r.p-4
    │   ├── div.rounded-lg.h-11.w-11 (cor área) + Icon (h-5 w-5)
    │   └── p.text-sm.font-semibold + badges + status
    └── div.grid.sm:grid-cols-2.lg:grid-cols-4
        └── MetricBlock × 4 (Meta / Resultado / Atingimento / Variação)
```

### 5.3 StrategicIndicatorChart (Recharts)

```
div.rounded-xl.border.bg-card.shadow-sm.h-[360px]
├── div.border-b.px-4.py-2.5 (header + badge status)
├── div.flex.flex-wrap.gap-3.px-4.pt-2.5 (legenda clicável)
└── div.flex-1.px-2.pb-2
    └── LineChart (ReferenceLine + CartesianGrid + XAxis/YAxis + 3 Lines)
```

### 5.4 StrategicIndicatorComparisonTable

```
div.rounded-xl.border.bg-card.shadow-sm.h-[360px]
└── div.flex-1.overflow-auto
    └── table.min-w-[820px].border-collapse.text-sm
        ├── thead.sticky.top-0.bg-slate-50
        └── tbody (5 linhas: Meta, Resultado, % Meta, Ano Ant, Variação)
            ├── td.sticky.left-0.min-w-[170px] (rótulo + bullet)
            └── td × 13 (mês selecionado: bg-blue-50/60)
```

---

## 6. Consultoria (`/consultoria`)

### 6.1 Estrutura

```
main#page-consultoria (space-y-6 pb-20 lg:pb-0)
├── OwnerPageHeading + [loading] skeleton / [error] fallback
├── [programa carregado]
│   ├── div.flex.flex-col.gap-4.lg:flex-row
│   │   ├── div.flex-1 (status + nome + modalidade/unidade)
│   │   └── div.flex.flex-col.gap-3.sm:flex-row (métricas)
│   │       └── Metric (rounded-lg border bg-muted/20 p-3)
│   │           ├── Icon (h-4) + label (text-xs)
│   │           ├── text-lg font-bold + "de" + total + %
│   │           ├── Progress (h-1.5)
│   │           └── description (text-[11px])
│   └── div.grid.grid-cols-1.gap-4.lg:grid-cols-[1fr_280px]
│       (conteúdo + sidebar)
└── [sem programa] "Nenhum programa encontrado"
```

---

## 7. Placeholder

```
main (flex min-h-0 flex-1 flex-col items-center justify-center p-6)
└── div.flex.max-w-md.flex-col.items-center.text-center
    ├── div.rounded-2xl.bg-muted.p-6 + Hammer (h-12 w-12)
    ├── h1.text-xl.font-bold.mt-6
    ├── p.text-sm.text-muted-foreground.mt-2
    ├── span.rounded-full.bg-amber-50.px-3.py-1.text-xs.text-amber-700.mt-4
    │   └── "Em construção"
    └── Button "Voltar ao Início" (variant=outline, mt-6)
```

---

## 8. Tipografia

Família: stack do sistema (`ui-sans-serif,system-ui,sans-serif`). Base 14px no `.owner-b44`.

| Elemento | Tamanho | Peso | Classe |
|---|---|---|---|
| Título h1 | 20/24px (lg) | 700 | `text-xl lg:text-2xl font-bold tracking-tight` |
| Subtítulo | 14px | 400 | `text-sm text-muted-foreground` |
| Título card | 14px | 600 | `text-sm font-semibold` |
| Valor métrica | 24px | 700 | `text-2xl font-bold tracking-tight` |
| Card executivo | 30px | 700 | `text-3xl font-bold leading-none` |
| Badge | 12px | 500 | `text-xs font-medium` |
| Label input | 14px | 500 | `text-sm font-medium` |
| Texto base | 14px | 400 | `text-sm` |
| Texto pequeno | 12px | 400 | `text-xs` |
| Texto extra-peq | 11px | 400 | `text-[11px]` |
| Sidebar seção | 10px | 600 | `text-[10px] font-semibold tracking-wider` |
| Sidebar item | 14px | 500/600 | `text-sm font-medium` |
| Bottom nav | 10px | 400/500 | `text-[10px]` |
| Sidebar badge | 9px | 500 | `text-[9px] font-medium` |

---

## 9. Raios

| Elemento | Raio | Tailwind |
|---|---|---|
| Card página | 12px | `rounded-xl` |
| Input/Select/Textarea | 6px | `rounded-md` |
| Botão | 6px | `rounded-md` |
| Modal/Dialog | 10px | `rounded-lg` |
| Badge/Avatar | 9999px | `rounded-full` |
| Tab container | 8px | `rounded-lg` |
| Tab ativa | 6px | `rounded-md` |
| Sidebar item | 8px | `rounded-[8px]` |
| Sidebar subitem | 6px | `rounded-[6px]` |
| Sidebar CTA | 6px | `rounded-md` |
| Sidebar recolher | 12px | `rounded-[12px]` |
| Cartão perfil/menu | 16px | `rounded-2xl` |
| Popover | 8px | `rounded-lg` |
| Ícone wrapper | 12px | `rounded-xl` |
| Ícone wrapper menor | 8px | `rounded-lg` |

---

## 10. Sombras

| Elemento | Sombra | Tailwind |
|---|---|---|
| Card padrão | `0 1px 2px rgba(15,23,42,0.04)` | `shadow-sm` |
| Card hover | `0 8px 24px rgba(15,23,42,0.08)` + `translateY(-2px)` | `shadow-md -translate-y-0.5` |
| CTA primary | `0 1px 3px rgba(0,0,0,0.1)` | `shadow` |
| Menu conta | `0 20px 25px -5px rgba(0,0,0,0.1)` | `shadow-xl` |
| Modal | `0 24px 60px rgba(15,23,42,0.22)` | `shadow-lg` |
| Popover | `0 16px 40px rgba(15,23,42,0.14)` | `shadow-lg` |
| Drawer overlay | `rgba(0,0,0,0.4)` | `bg-black/40` |
| Bottom nav primary | `0 4px 6px -1px rgba(0,0,0,0.1)` | `shadow-md` |

Sidebar: **sem sombra** — apenas `border-r`.

---

## 11. Bordas

| Elemento | Grossura | Cor | Classe |
|---|---|---|---|
| Card/tabela | 1px | `#E5E5E5` | `border border-border` |
| Sidebar direita | 1px | `#E5E7EB` | `border-r border-sidebar-border` |
| Divisores | 1px | `#E5E5E5` | `border-t/b` |
| Input/Select | 1px | `#E5E5E5` | `border border-input` |
| Foco input (ring) | 2px | ring color | `focus-visible:ring-2` |
| Card departamento (lateral) | 4px | cor status | `border-l-4` |
| Card executivo (strip) | 4px | cor card | `w-1 absolute left-0` |
| Card prioridade | 2px | cor status | `border-2` |
| Top bar indicador | 4px | cor área | `h-1` |
| Tabela linha | 1px | `border-border/40` | `border-b border-border/40` |

---

## 12. Espaçamentos

### 12.1 Páginas

| Contexto | Valor |
|---|---|
| Gap entre seções | 24px (`space-y-6`) |
| Padding lateral mobile | 16px (`px-4`) |
| Padding lateral desktop | 32px (`lg:px-8`) |
| Padding top | 24px / 32px lg (`pt-6 lg:pt-8`) |
| Padding bottom mobile | 96px (`pb-24`) |
| Padding bottom desktop | 32px (`lg:pb-8`) |

### 12.2 Cards e grids

| Contexto | Valor |
|---|---|
| Card padding | 16px (`p-4`) |
| Grid home indicadores | 16px (`gap-4`) |
| Grid strip plano-acao | 16px (`gap-4`) |
| Grid departamentos | 12px (`gap-3`) |
| Grid 3 widgets (home) | 24px (`gap-6`) |
| Grid estratégico | 16px (`gap-4`) |
| Grid modal 2 colunas | 12px (`gap-3`) |
| Gap ícone-texto card | 8px (`gap-2`) |

### 12.3 Sidebar

| Contexto | Expandida | Recolhida |
|---|---|---|
| Nav padding | `px-3 py-4` | `px-2` |
| Entre seções | `mb-5` (20px) | `mb-5` |
| Item padding | `px-3 py-2` | centralizado |
| Gap ícone-texto | `gap-2.5` (10px) | — |
| Seção label | `px-3 pb-1.5` | oculto |
| CTA footer | `p-3` | centralizado |
| Perfil | `py-3 px-3` min-h-14 | avatar só |

---

## 13. Responsividade

### 13.1 Desktop 1440×900

- Sidebar fixa 256px, topbar/bottom nav ocultas
- Conteúdo `max-w-[1400px]`, padding 32px
- Indicadores: 5 col. Widgets: 3 col. Departamentos: 3 col.
- PA strip: 5 col. Toolbar horizontal.
- PE: `xl:grid-cols-[58%_42%]`
- Consultoria: `lg:grid-cols-[1fr_280px]`

### 13.2 Tablet 768×1024

- Sidebar drawer 320px, topbar visível, bottom nav oculta
- Indicadores: 3 col. Departamentos: 2 col.
- PA toolbar vertical, filtros em Sheet
- PE/Consultoria: empilhado (1 col)

### 13.3 Mobile 375×812

- Sidebar drawer ~288px, topbar visível, bottom nav fixa (56px)
- Padding lateral 16px, `pb-24`
- Indicadores: 2 col. Demais: empilhado
- PA: 2 col strip, toolbar compacta
- PE: scroll horizontal tabela (`min-w-[820px]`)
- ConsultantCard: empilhado

### 13.4 Breakpoints

| Breakpoint | Mínimo | Uso |
|---|---|---|
| `sm` | 640px | grids 3-col, 2-col, toolbar |
| `lg` | 1024px | drawer cutoff, padding, 3-col, bottom nav |
| `xl` | 1280px | sidebar fixa, 58/42 layout, toolbar |

---

## 14. Ícones

Todos `lucide-react`, `strokeWidth: 2`. Tamanho:

| Contexto | Tamanho | Classe |
|---|---|---|
| Sidebar item | 16px | `h-4 w-4` |
| Sidebar recolher | 18px | `h-[18px] w-[18px]` |
| Cabeçalho página | 20px | `h-5 w-5` |
| Card executivo | 18px | `h-[18px] w-[18px]` |
| Métrica | 20px | `h-5 w-5` |
| Alerta, badge | 16px | `h-4 w-4` |
| Botão ação | 14-16px | `h-3.5 w-3.5` / `h-4 w-4` |
| Tab | 16px | `h-4 w-4` |
| Select | 16px | `h-4 w-4` |
| Placeholder | 48px | `h-12 w-12` |
| Bottom nav | 20px | `h-5 w-5` |
| Fechar | 16px | `h-4 w-4` |

Todos decorativos com `aria-hidden="true"`.

---

## 15. Botões

| Variante | Fundo | Texto | Hover |
|---|---|---|---|
| `default` | `bg-primary` | `text-primary-foreground` | `hover:bg-primary/90` |
| `outline` | `bg-background` | `text-foreground` | `hover:bg-muted/40` |
| `ghost` | transparente | `text-foreground` | `hover:bg-muted` |
| `destructive` | `bg-destructive` | `text-destructive-foreground` | `hover:bg-destructive/90` |

**Medidas:** h-9 (sm) / h-10 (default), px-4 py-2, rounded-md, text-sm font-medium.

**Mode selector / Tabs:**
```
inline-flex rounded-lg border bg-muted/40 p-1
└── button rounded-md px-4 py-2 text-sm (ou px-3 py-1.5 text-xs)
    ├── ativo:  bg-emerald-50 text-emerald-700 shadow-sm
    └── inativo: text-muted-foreground hover:text-foreground
```

---

## 16. Formulários

| Elemento | Altura | Raio | Borda | Sombra |
|---|---|---|---|---|
| Input | 36px | 6px | 1px #E5E5E5 | `shadow-sm` |
| Select | 36px | 6px | 1px #E5E5E5 | `shadow-sm` |
| Textarea | min-60px | 6px | 1px #E5E5E5 | `shadow-sm` |

Label: `text-sm font-medium leading-none`.
Layout: `div.space-y-1` por campo. Grid 2 col: `div.grid.grid-cols-2.gap-3`.

---

## 17. Modais

| Elemento | shadcn | Customizações |
|---|---|---|
| Dialog | `bg-black/40 overlay` + `rounded-lg sm:max-w-md content` | `max-h-[90vh] overflow-y-auto` |
| Sheet (drawer) | `side="right"` + `w-80 sm:max-w-md p-6 shadow-xl` | `bg-black/40 overlay` |

---

## 18. Animações

| Alvo | Duração | Propriedade |
|---|---|---|
| Sidebar width | 300ms | `transition-[width]` |
| Card hover | 150ms | `transition-all` (shadow+translate) |
| Botão/nav hover | 150ms | `transition-colors` |
| Tab ativa | 150ms | `transition-colors` |
| Chevron | 200ms | `transition-transform rotate-180` |
| Dialog/Sheet | 150-200ms | Radix fade+scale |
| Sparkline gauge | 600ms | `transition-[stroke-dashoffset]` |
| Skeleton | 2s | `animate-pulse` |

---

## 19. Acessibilidade

- `aside[aria-label="Menu principal do Dono"]`
- `aria-current="page"` no NavLink ativo
- `aria-expanded` + `aria-controls` em grupos
- Sidebar recolhida: `aria-label` + `title` em itens
- Cartão perfil: `aria-haspopup="menu"` + `aria-expanded`
- Menu conta: `role="menu"` + `role="menuitem"`. Fecha com Esc
- `focus-visible:ring` em todos interativos
- `role="tablist"` + `role="tab"` + `aria-selected` + `aria-controls` + `tabIndex`
- `role="list"` + `role="listitem"` em coleções
- `aria-hidden="true"` em ícones decorativos
- Contraste: texto 9.7:1, ativo 4.8:1 (AA)

**Lacunas:** sem skip-link, sem focus trap no drawer (outros módulos têm).

---

## 20. Estados vazios, loading e erro

| Página | Loading | Empty | Error |
|---|---|---|---|
| Início | N/A (dados estáticos) | N/A | ErrorBoundary + "Recarregar" |
| Plano Ação | `loading=true` → skeleton build | Filtros sem resultado | Estado error + mensagem inline |
| Plano Estratégico | Repositório async | "Nenhum indicador" | Toast de erro |
| Consultoria | Skeleton 6 blocos | "Nenhum programa" | Card destructive + "Tentar novamente" |
| Placeholder | — | — | — |

---

## 21. Referência de arquivos

| Papel | Arquivo |
|---|---|
| Escopo do Dono | `src/styles/owner-base44-exact.css` |
| Tokens globais | `src/index.css` |
| Layout shell | `src/components/owner/OwnerLayout.jsx` |
| Sidebar | `src/components/owner/OwnerSidebar.jsx` |
| Sidebar tokens | `src/design-system/sidebar/tokens.ts` |
| Perfil + menu | `src/components/MxSidebarProfileCard.tsx` |
| Topbar | `src/components/owner/OwnerTopbar.jsx` |
| Página Início | `src/pages/owner/OwnerHome.jsx` |
| Componentes Início | `src/components/owner/home/*.jsx` |
| Dados Início | `src/components/owner/home/homeData.js` |
| Plano de Ação | `src/pages/owner/PlanoDeAcao.jsx` |
| Componentes PA | `src/components/owner/actionplan/*.jsx` |
| Plano Estratégico | `src/features/strategic-plan/StrategicPlanWorkspace.tsx` |
| Componentes PE | `src/components/owner/strategic/*.jsx` |
| Consultoria | `src/pages/owner/Consultoria.jsx` |
| Contexto do Dono | `src/components/owner/OwnerContext.jsx` |
| Placeholder | `src/pages/owner/Placeholders.jsx` |
| Botão shadcn | `src/components/ui/button.jsx` |
| Dialog shadcn | `src/components/ui/dialog.jsx` |
| Sheet shadcn | `src/components/ui/sheet.jsx` |
| Select shadcn | `src/components/ui/select.jsx` |

---

## 22. Regras obrigatórias

1. **Nunca escrever classes de sidebar à mão** — usar `SIDEBAR` tokens.
2. **Nunca usar hex em componentes** — usar tokens CSS (`bg-card`, `text-foreground`).
3. **Item ativo nunca em verde sólido** — `bg-primary/10 text-primary`.
4. **Breakpoint da sidebar é `xl` (1280px)** — não `lg`.
5. **Ícone do item ativo permanece cinza** — só texto/fundo mudam.
6. **Ícones decorativos: `aria-hidden="true"`**.
7. **Grid gaps padrão:** `gap-4` (cards), `gap-6` (widgets grandes), `gap-3` (densos).
8. **Card padrão:** `rounded-xl border bg-card p-4 shadow-sm`.
9. **Formulários:** Label + Input/Select/Textarea no padrão shadcn.
10. **Breakpoints:** sm=640, lg=1024, xl=1280 — nunca `md`.
