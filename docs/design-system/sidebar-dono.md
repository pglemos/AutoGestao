# Sidebar do Módulo do Dono — especificação completa

Estado em produção (`https://www.mxperformance.com.br/dono`), deploy `jtliqqy52`, medido em runtime
com `getComputedStyle` em 1440×900, 768×1024 e 375×812.

**Arquivos**

| Papel | Arquivo |
|---|---|
| Sidebar (marca, navegação, CTA, rodapé) | `src/components/owner/OwnerSidebar.jsx` |
| Shell que a posiciona (aside, drawer, overlay) | `src/components/owner/OwnerLayout.jsx` |
| Cartão de perfil + menu de conta | `src/components/MxSidebarProfileCard.tsx` |
| Tokens do escopo `.owner-b44` | `src/styles/owner-base44-exact.css` |
| Botão base (CTA) | `src/components/ui/button.jsx` |
| Avatar | `src/components/atoms/Avatar.tsx` |

---

## 1. Bibliotecas

| Camada | Tecnologia |
|---|---|
| UI | React 19 + React Router 7 (`NavLink`, `useNavigate`) |
| Estilo | Tailwind CSS v4 (`@theme` inline, `--spacing: .25rem`) |
| Primitivas | shadcn/ui sobre Radix (`Button` via `class-variance-authority` + `@radix-ui/react-slot`) |
| Ícones | `lucide-react` |
| Composição de classes | `cn()` = `clsx` + `tailwind-merge` (`src/lib/utils`) |

Sem biblioteca de animação na sidebar (nada de Framer Motion aqui) — só transições CSS.

---

## 2. Identidade visual e tokens

O módulo roda dentro do escopo `.owner-b44`, que redefine os custom properties do shadcn em HSL.
Toda utility (`bg-sidebar`, `text-primary`, `border-border`) resolve a partir daí.

| Token | Valor HSL | Equivalente | Uso |
|---|---|---|---|
| `--sidebar-background` | `0 0% 98%` | `#FAFAFA` | fundo da sidebar |
| `--sidebar-foreground` | `240 5% 26%` | `#3F3F46` | texto dos itens |
| `--sidebar-accent` | `240 5% 96%` | `#F4F4F5` | hover de item |
| `--sidebar-accent-foreground` | `240 6% 10%` | `#18181B` | texto no hover |
| `--sidebar-border` | `220 13% 91%` | `#E5E7EB` | bordas e divisores |
| `--primary` | `152 69% 31%` | `#198653` | ativo, CTA, foco |
| `--primary-foreground` | `0 0% 98%` | `#FAFAFA` | texto sobre o verde |
| `--muted-foreground` | `0 0% 45%` | `#737373` | rótulos de seção, subitens |
| `--background` / `--foreground` | `0 0% 100%` / `0 0% 4%` | `#FFFFFF` / `#0A0A0A` | superfície e texto base |
| `--border` | `0 0% 90%` | `#E5E5E5` | bordas gerais |
| `--destructive` | `0 84% 60%` | `#EF4444` | ação "Sair" |
| `--radius` | `0.625rem` | 10px | base dos raios do shadcn |

Cores fora do escopo de token, escritas direto na classe:

- marca: `text-slate-900` (título) e `text-emerald-700` (rótulo do módulo);
- badge "Em construção": `bg-amber-50` + `text-amber-700`;
- cartão de perfil: `border-gray-100`, `bg-gray-50/60`, hover `border-emerald-100` + `bg-emerald-50/60`,
  avatar `bg-emerald-50` + `text-emerald-600`;
- foco: `ring-emerald-500/30`.

### Estados semânticos

| Estado | Aparência |
|---|---|
| Item ativo | `bg-primary/10` + `text-primary` + `font-semibold`, `aria-current="page"` |
| Item inativo | `text-sidebar-foreground` (#3F3F46), ícone `text-muted-foreground/80` |
| Hover | `bg-sidebar-accent` (#F4F4F5) + `text-sidebar-accent-foreground` |
| Foco visível | anel de 2px `emerald-500/30` (cartão/menu) ou 1px `ring` (CTA) |
| Em construção | badge âmbar; o item continua clicável e leva a uma tela de placeholder |
| Destrutivo | "Sair" em `text-red-600`, hover `bg-red-50` |
| Desabilitado | herdado do `Button`: `disabled:opacity-50` + `pointer-events-none` (não usado hoje) |

---

## 3. Estrutura visual

```
aside (256px, borda direita 1px)
└── div.flex.h-full.flex-col  (bg-sidebar)
    ├── header 54px            marca + botão recolher       [shrink-0, border-b]
    ├── nav   flex-1           4 seções, rolagem vertical    [min-h-0, overflow-y-auto]
    ├── div                    CTA "Falar com Consultor"     [border-t, p-3]
    └── div                    cartão de perfil              [border-t, py-3 px-3]
```

Navegação (4 seções, 12 destinos):

| Seção | Itens |
|---|---|
| GESTÃO | Início · Rotina do Dia* · Central de Decisões* |
| ESTRATÉGIA | Plano Estratégico · Plano de Ação · Consultoria |
| NEGÓCIO | Departamentos (grupo com 7 filhos*) · Mercado* |
| DESENVOLVIMENTO | Universidade MX* |

`*` = badge "Em construção".

---

## 4. Tamanhos e espaçamentos

| Elemento | Medida |
|---|---|
| Sidebar expandida | **256px** (`w-64`) |
| Sidebar recolhida | **64px** (`w-16`) |
| Drawer mobile/tablet | `w-72 max-w-[85vw]`, ≥640px `w-80 max-w-sm` → 320px medidos em 768px |
| Cabeçalho | altura fixa **54px**, `px-4` (recolhido: `px-2`, conteúdo centralizado) |
| Nav | `py-4 px-3` (recolhido `px-2`); seções separadas por `mb-5` (20px) |
| Rótulo de seção | `px-3 pb-1.5` |
| Item | `px-3 py-2`, altura resultante **36px**, `gap-2.5` (10px) |
| Ícone do item | 16×16 (`h-4 w-4`) |
| Subnav | `ml-3 pl-3` com borda esquerda 1px; itens `px-2.5 py-1`, altura 28px, `gap-1.5` |
| Badge | `px-1.5 py-0.5`, 9px, altura 17px |
| CTA | altura **36px** (`h-9`), `px-4 py-2`, `gap-2.5`, largura total |
| Cartão de perfil | `min-h-14` (56px, 58px medidos), `px-3.5 py-2`, `gap-3` |
| Avatar | 40×40 (`size="md"`) |
| Menu de conta | largura = cartão (231px), `p-2`; itens `min-h-11` (44px) |

## 5. Raios

| Elemento | Raio |
|---|---|
| Item de nav / botão de grupo | 8px (`rounded-lg`) |
| Subitem | 6px (`rounded-md`) |
| CTA | 6px (`rounded-md`, padrão do `Button`) |
| Botão recolher | 12px (`rounded-xl`) |
| Cartão de perfil e menu | 16px (`rounded-2xl`) |
| Item do menu | 12px (`rounded-xl`) |
| Badge e avatar | pílula / círculo (`rounded-full`) |

## 6. Sombras e bordas

- Sidebar: **sem sombra**; separação apenas por `border-r` 1px `#E5E7EB`.
- Divisores internos: `border-b` (cabeçalho) e `border-t` (CTA e perfil), mesma cor.
- CTA: `shadow` do shadcn — `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)`.
- Menu de conta: `shadow-xl` — `0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)`, borda `gray-100`.
- Drawer mobile: `shadow-xl`; overlay `bg-black/40`.
- Cartão de perfil: borda 1px `gray-100`, sem sombra.

## 7. Tipografia

Família: stack do sistema (`ui-sans-serif, system-ui, sans-serif…`); base 16px.

| Elemento | Tamanho | Peso | Tratamento |
|---|---|---|---|
| "MX PERFORMANCE" | 13px | 900 | `tracking-tight`, truncado |
| "MÓDULO EXECUTIVO" | 10px | 700 | caixa alta, `tracking-[0.14em]`, emerald-700 |
| Rótulo de seção | 10px | 600 | caixa alta, `tracking-wider` (0.5px), truncado |
| Item | 14px | 500 (ativo: 600) | truncado |
| Subitem | 13px | 400 (ativo: 500) | truncado |
| Badge | 9px | 500 | — |
| CTA | 14px | 500 | — |
| Nome no cartão | 13px | 700 | truncado, `title` com o nome completo |
| Papel no cartão | 11px | 500 | `text-gray-500` |
| Item do menu | 14px | 600 | — |

## 8. Grid e responsividade

A sidebar não usa grid — é flex-column dentro de um shell flex-row (`OwnerLayout`).

| Faixa | Comportamento |
|---|---|
| ≥1280px (`xl`) | `aside` fixo à esquerda, 256px, recolhível para 64px; sem topbar |
| 640–1279px | `aside` **oculto** (`hidden xl:block`); acesso pelo botão ☰ no header mobile; drawer de 320px |
| <640px | mesmo drawer, `w-72` limitado a `85vw`; conteúdo com `pb-[72px]` para não colidir com a bottom nav |

O ponto de corte é `xl` (1280px) — em tablet a navegação já é drawer.

## 9. Ícones

`lucide-react`, 24×24 no viewBox, `stroke-width: 2`, renderizados a 16px na nav e 18px no botão recolher.
Mapa: Início `Home` · Rotina `CalendarDays` · Decisões `ClipboardCheck` · Plano Estratégico `Target` ·
Plano de Ação `ListChecks` · Consultoria/Departamentos `Users`/`LayoutGrid` · Mercado `TrendingUp` ·
Universidade `GraduationCap` · CTA `MessageCircle` · grupo `ChevronDown`/`ChevronRight` ·
recolher `PanelLeftClose`/`PanelLeftOpen` · menu `UserRound`, `Settings`, `Bell`, `LogOut`.
Todos com `aria-hidden="true"`.

## 10. Animações e transições

| Alvo | Transição |
|---|---|
| Largura da sidebar | `transition-[width] duration-300` (300ms) |
| Cor de item, CTA, cartão, itens do menu | `transition-colors` (150ms, easing padrão) |
| Chevron do cartão | `rotate-180` com `transition-transform duration-200` |
| Drawer e overlay | aparecem/somem sem animação (montagem condicional) |
| Grupo Departamentos | expande/colapsa sem animação de altura |

Nenhuma animação de entrada, skeleton ou pulso na sidebar.

## 11. Acessibilidade

- `aside` com `aria-label="Menu principal do Dono"`; drawer é `role="dialog"` com botão "Fechar menu principal".
- Item ativo marcado com `aria-current="page"` (via `NavLink`).
- Grupo: `aria-expanded` + `aria-controls="sidebar-subnav-departments"`; o container tem o `id` correspondente.
- Recolhida: cada item recebe `aria-label` e `title` com o nome, já que o texto some.
- Cartão de perfil: `aria-haspopup="menu"` + `aria-expanded`; menu com `role="menu"` e itens `role="menuitem"`.
- Menu fecha com **Esc** e com clique fora.
- Foco sempre visível (`focus-visible:ring`); ícones decorativos com `aria-hidden`.
- Contraste: texto #3F3F46 sobre #FAFAFA ≈ 9.7:1; ativo #198653 sobre `primary/10` ≈ 4.8:1 — ambos AA.
- Lacunas conhecidas: sem `role="navigation"` explícito além do `<nav>`, sem skip-link para o conteúdo,
  e o drawer do Dono não tem focus trap (o shell dos outros módulos tem).

## 12. Comportamento de cada clique

| Elemento | Ação |
|---|---|
| Logo/marca | nada — não é clicável |
| Botão recolher | alterna 256px ⇄ 64px; oculta marca, rótulos, texto do CTA e dados do perfil; itens passam a centralizados com `title` |
| Item simples (Início, Plano Estratégico, Plano de Ação, Consultoria) | navega via `NavLink`, mantém o shell do Dono; no drawer, fecha o drawer |
| Item com badge (Rotina, Decisões, Mercado, Universidade) | navega para uma tela de placeholder "Esta área será construída na próxima etapa" |
| "Departamentos" | apenas expande/colapsa o grupo — não navega. Aberto por padrão |
| Subitem de Departamentos | navega para a tela do departamento (todas em placeholder hoje) |
| "Falar com Consultor" | não navega: abre o modal `ConsultantRequestModal` via `openConsultantModal(null)`; no drawer, fecha o drawer antes |
| Cartão de perfil | abre o menu de conta (não navega mais direto) |
| → Meu Perfil | vai para `/perfil` |
| → Preferências | vai para `/configuracoes` |
| → Notificações | vai para `/notificacoes` |
| → Sair | encerra a sessão e volta para `/login` |
| ☰ (mobile/tablet) | abre o drawer |
| Overlay ou ✕ | fecha o drawer |

Observação: `/perfil`, `/configuracoes` e `/notificacoes` ficam **fora** de `/dono/*` e são renderizadas
pelo shell universal — a navegação funciona, mas o cabeçalho e os filtros do módulo do Dono não aparecem
nessas telas.

## 13. Estados vazios, filtros, formulários, cards, tabelas e modais

Itens que a sidebar **não** possui, com o equivalente no módulo:

| Item | Onde vive |
|---|---|
| Estado vazio | não existe na sidebar (a navegação é estática). Nas telas: `OwnerPlaceholder` — ícone em quadrado `bg-muted`, título 20px, descrição, pílula âmbar "Esta área será construída na próxima etapa" e botão "Voltar ao Início" |
| Filtros | não ficam na sidebar. Loja e período estão no botão de filtro do cabeçalho da página (`OwnerFilterButton`) |
| Formulários | apenas no modal do consultor e nas telas de plano; a sidebar não tem campos |
| Cards | o cartão de perfil é o único elemento em formato de card |
| Tabelas | nenhuma |
| Modais | a sidebar dispara um: `ConsultantRequestModal` |

---

## 14. Diferenças em relação aos demais módulos

O `MxSidebarShell` (vendedor, gerente, consultoria, Admin MX) usa as mesmas medidas, tipografia,
raios e o mesmo cartão de perfil. Restam três diferenças de comportamento, todas por origem de dados:

1. **Cores por token vs. classe** — o Dono usa `bg-sidebar`/`text-primary` (tokens `.owner-b44`);
   o shell usa `bg-white`/`bg-emerald-50` fixos. O resultado renderizado é equivalente.
2. **CTA "Falar com Consultor"** — existe só no Dono.
3. **Badges de contagem** — o shell exibe contadores dinâmicos (notificações, devolutivas);
   no Dono os badges são estáticos ("Em construção").
