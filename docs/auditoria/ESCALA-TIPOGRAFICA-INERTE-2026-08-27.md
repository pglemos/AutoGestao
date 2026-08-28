# Escala tipográfica semântica não compilada — levantamento

Data: 2026-08-27. Total de usos das 12 utilities inertes: **662** em **119** arquivos de produção.

## Causa

`src/design-system/tokens/semantic.css` não é raiz Tailwind (não tem `@import "tailwindcss"`), então seus blocos `@utility` nunca são compilados. Eles chegam ao CSS publicado como texto cru — `@utility` é at-rule desconhecida e o browser descarta o bloco inteiro.

Verificação: `grep -c "@utility" dist/assets/index-*.css` devolve 12. Os 13 `@utility` de `src/index.css` (que É raiz) compilam normalmente.

## Uso por utility

| Utility | Tamanho pretendido | Usos | Efeito hoje |
|---|---|---|---|
| `text-caption` | 0.75rem | 459 | herda do pai |
| `text-body-sm` | 0.875rem | 141 | herda do pai |
| `text-h3` | 1.5rem | 16 | herda do pai |
| `text-label` | 0.875rem | 11 | herda do pai |
| `text-h2` | 1.875rem | 10 | herda do pai |
| `text-body` | 1rem | 9 | herda do pai |
| `text-h5` | 1.125rem | 6 | herda do pai |
| `text-h4` | 1.25rem | 4 | herda do pai |
| `text-display` | 3rem | 4 | herda do pai |
| `text-h1` | 2.25rem | 1 | herda do pai |
| `text-data` | 0.875rem | 1 | herda do pai |

## Concentração por área

| Área | Usos |
|---|---|
| `src/features/checkin` | 159 |
| `src/features/central-execucao` | 118 |
| `src/features/admin-mx` | 102 |
| `src/features/crm` | 59 |
| `src/features/manager` | 40 |
| `src/pages` | 31 |
| `src/features/ranking` | 30 |
| `src/features/agenda-admin` | 23 |
| `src/features/dashboard-loja` | 16 |
| `src/components/organisms` | 15 |
| `src/features/mentor-comercial` | 15 |
| `src/components/atoms` | 10 |
| `src/features/vendas-loja` | 10 |
| `src/components/molecules` | 9 |
| `src/components` | 8 |
| `src/design-system/sidebar` | 5 |
| `src/features/consulting-journey` | 3 |
| `src/features/gerente-feedback` | 3 |
| `src/features/vendedor-treinamentos` | 2 |
| `src/components/module` | 1 |

## Top 25 arquivos

| Arquivo | Usos |
|---|---|
| `src/features/admin-mx/clientes/PortfolioOverviewTab.tsx` | 50 |
| `src/features/crm/funil-vendedor/FunilVendedorCards.tsx` | 46 |
| `src/features/checkin/sections/CheckinCrmSection.tsx` | 40 |
| `src/features/checkin/sections/CheckinForm.tsx` | 36 |
| `src/features/checkin/sections/CheckinHeader.tsx` | 23 |
| `src/features/central-execucao/modals/NovaAtividadeModal.tsx` | 22 |
| `src/features/checkin/sections/FluxoFechamento.tsx` | 22 |
| `src/features/central-execucao/components/FichaClienteSheet.tsx` | 17 |
| `src/features/central-execucao/components/AtividadeCard.tsx` | 15 |
| `src/features/central-execucao/modals/ResolverAtividadeModal.tsx` | 14 |
| `src/features/central-execucao/tabs/RotinaDiaTab.tsx` | 14 |
| `src/features/checkin/sections/NovoRegistroModal.tsx` | 13 |
| `src/features/checkin/sections/RegularizarFechamentoDrawer.tsx` | 13 |
| `src/features/admin-mx/clientes/OnboardingPortfolioTab.tsx` | 12 |
| `src/features/manager/day-routine/ManagerDayRoutineView.tsx` | 12 |
| `src/features/ranking/components/base44/TabelaRanking.tsx` | 12 |
| `src/features/central-execucao/components/PendenciasDrawer.tsx` | 11 |
| `src/features/mentor-comercial/ui/OportunidadeCard.tsx` | 11 |
| `src/features/vendas-loja/VendasFechadasLoja.tsx` | 10 |
| `src/components/atoms/Typography.tsx` | 9 |
| `src/features/admin-mx/clientes/GovernancaBloqueiosTab.tsx` | 9 |
| `src/features/admin-mx/clientes/InscricoesPendentesPanel.tsx` | 9 |
| `src/features/central-execucao/components/EstadoVazio.tsx` | 9 |
| `src/features/crm/ModoAtaqueView.tsx` | 9 |
| `src/features/agenda-admin/components/AgendaSidebar.tsx` | 8 |

## Correção de uma linha (NÃO aplicada)

Adicionar em `src/index.css`, depois de `@import "tailwindcss"`:

```css
@import "./design-system/tokens/semantic.css";
```

Isso faz as 12 utilities passarem a valer de uma vez, em 662 pontos. É mudança visual global: todo texto que hoje herda o tamanho do pai passa a assumir o degrau documentado. Precisa de revisão tela a tela e provavelmente reage nos contratos de tipografia/contraste.

## Alternativa incremental

Mover os 12 blocos `@utility` de `semantic.css` para `src/index.css` tem o mesmo efeito. Migrar um degrau por vez (ex.: só `text-caption`) permite medir o impacto por etapa.

## Correção validada em worktree isolado (NÃO aplicada ao projeto)

Duas edições, nesta ordem:

1. `src/index.css`, após `@import "tw-animate-css";` — adicionar `@import "./design-system/tokens/semantic.css";`
2. `src/main.tsx` — remover `import './design-system/tokens/semantic.css'` (senão o arquivo entra duas vezes e a cópia crua continua no bundle)

Resultado medido com `npx vite build` num worktree limpo:

| | antes | depois |
|---|---|---|
| `@utility` crus no CSS publicado | 12 | **0** |
| `.text-caption` | ausente | `font-size:.75rem;font-weight:400;line-height:1.4` |
| `.text-body-sm` | ausente | `font-size:.875rem;font-weight:400;line-height:1.5` |
| `.text-h3` | ausente | `font-size:1.5rem;font-weight:600;line-height:1.3` |
| tokens `--color-*` de semantic.css | presentes | presentes |

Os tokens de cor continuam carregando pelo `@import` — nada se perde ao tirar o import do `main.tsx`.

## Por que não apliquei

662 pontos passam a mudar de tamanho ao mesmo tempo. `text-caption` sozinho são 459 usos: hoje herdam ~16px do pai e passariam a 12px. É melhoria de conformidade com o design system, mas é mudança visual global e precisa de decisão + revisão tela a tela.

---

## Etapa 1 aplicada: `text-body-sm` (2026-08-27)

Migração de UM degrau, sem ligar os outros 11: o bloco `@utility text-body-sm` saiu de `semantic.css` e entrou em `src/index.css` (a raiz Tailwind). `semantic.css` ficou com um comentário explicando por que o resto ainda não vale.

**Verificação de conflito antes de aplicar:** das 141 strings de classe com `text-body-sm`, apenas 3 tinham outra classe de tamanho — e as 3 são pares responsivos (`text-[12px] ... sm:text-body-sm`, `text-body-sm ... sm:text-[14px]`). Nenhum conflito não qualificado. Os 3 passam a funcionar como escritos.

**Medido no build:**

| | antes | depois |
|---|---|---|
| `@utility` crus no CSS publicado | 12 | 11 |
| `.text-body-sm` | ausente | `font-size:.875rem;font-weight:400;line-height:1.5` |

**Medido no navegador:**

| Caso | antes | depois |
|---|---|---|
| `text-body-sm` dentro de pai 24px | 24px (herdava) | **14px** |
| `text-body-sm` dentro de pai 16px | 16px (herdava) | **14px** |
| `text-[12px] sm:text-body-sm` em 375px | 12px | 12px |
| `text-[12px] sm:text-body-sm` em 1200px | 12px | **14px** |
| `text-caption` (controle) | 16px | 16px — segue morta |

Suíte completa: 4634 pass, 14 fail / 13 errors — **idêntico ao baseline em HEAD**. `tsc` limpo.

**Próximo degrau sugerido:** `text-label` (11 usos) ou `text-h2`/`text-h3` (26 juntos) antes de encostar em `text-caption`, que sozinho são 459 pontos.

---

## Etapa 2 aplicada: `text-label`, `text-h2`, `text-h3` (2026-08-27)

Mesmo procedimento: os três blocos saíram de `semantic.css` para `src/index.css`. Restam **8** degraus inertes.

**Conflito antes de aplicar:** dos 37 usos (label 11, h2 10, h3 16), apenas 1 string tinha duas classes de tamanho — `FluxoFechamento.tsx:362`, par responsivo `text-h3 … sm:text-h2`. Nenhum conflito não qualificado.

**Medido no build:**

| | antes | depois |
|---|---|---|
| `@utility` crus | 11 | **8** |
| `.text-h2` | ausente | `1.875rem / 700 / -.025em` |
| `.text-h3` | ausente | `1.5rem / 600` |
| `.text-label` | ausente | `.875rem / 500` |

**Medido no navegador:**

| Caso | antes | depois |
|---|---|---|
| `<h2 class="text-h2">` | 24px/bold (default do browser) | **30px / 700** |
| `text-h3` em pai 16px | 16px | **24px / 600** |
| `text-label` em pai 24px | 24px | **14px / 500** |
| `text-h3 sm:text-h2` em 375px | herdava | 24px |
| `text-h3 sm:text-h2` em 1200px | herdava | 30px |
| `Typography variant="h2"` | herdava | **30px / 700** |
| `text-caption` (controle) | 24px herdado | 24px — segue morta |

Suíte: 4634 pass, 14 fail / 13 errors — **idêntico ao baseline**. `tsc` limpo.

### Atenção para revisão visual

`PageHeading` renderiza `Typography variant="h2"`, então **o título de toda página que usa `PageHeading` (29 arquivos) passa de herdado para 30px/700 com tracking negativo**. É o degrau documentado assumindo, mas é a mudança mais visível das duas etapas — vale olhar as telas de gestão antes de considerar encerrado.

### Restam inertes (8)

`text-caption` (459 usos), `text-display`, `text-h1`, `text-h4`, `text-h5`, `text-h6`, `text-body`, `text-data`.

---

## Etapa 3 aplicada: `text-caption` (2026-08-27)

O degrau mais usado — 457 strings de classe. Restam **7** inertes.

### Blindagem necessária ANTES de migrar

`Badge` e `Button` embrulham `children` string num `<Typography variant="caption">` interno. Com `text-caption` morta, esse interno herdava o tamanho do wrapper. Vivo, ele passaria a **impor 12px por cima** do tamanho que o wrapper declarou — regressão em **37 pontos**:

- 27 `<Badge className="text-mx-micro">` (9,6px → viraria 12px)
- 4 `<Button className="text-mx-micro">`, 4 `text-sm`, 1 `text-base`, 1 `text-body-sm`

Correção: `text-[length:inherit]` no `className` do Typography interno (`Badge.tsx:35`, `Button.tsx:89` e `:98`), ao lado do `text-inherit tracking-inherit` que já existia para cor e tracking. O tailwind-merge descarta `text-caption` em favor dele, então o wrapper volta a mandar no tamanho — que era o comportamento pretendido o tempo todo.

### Conflito de classe

Das 457 strings, apenas 2 tinham outra classe de tamanho, ambas responsivas. **Zero conflitos diretos.**

### Medido no navegador (após a blindagem)

| Caso | antes | depois |
|---|---|---|
| `text-caption` em pai 24px | 24px | **12px** |
| `<Badge className="text-mx-micro">` | 9,6px | 9,6px (interno 9,6px) — preservado |
| `<Badge>` padrão | 12px | 12px |
| `<Button className="text-sm">` | 14px | 14px (interno 14px) — preservado |
| `<Button>` padrão | 16px | 16px |
| `Typography variant="caption"` | herdava | **12px** |
| `text-body` (controle) | 24px herdado | 24px — segue morta |

Build: `@utility` crus 8 → **7**. `.text-caption{font-size:.75rem;font-weight:400;line-height:1.4}` compilado.

Suíte: 4634 pass, 14 fail / 13 errors — **idêntico ao baseline**. `tsc` e lint limpos.

### Restam inertes (7)

`text-display`, `text-h1`, `text-h4`, `text-h5`, `text-h6`, `text-body`, `text-data`.

---

## Etapa 4 aplicada: os 7 restantes (2026-08-27) — escala completa

`text-display`, `text-h1`, `text-h4`, `text-h5`, `text-h6`, `text-body`, `text-data` movidos para `src/index.css`. **`semantic.css` ficou com 0 blocos `@utility`; o CSS publicado tem 0 `@utility` cru.**

### Conflito resolvido antes de migrar

`src/pages/VendedorAjuda.tsx:40` tinha `text-body text-lg` no mesmo elemento, sem prefixo responsivo. Com `text-body` morta, os 18px do `text-lg` venciam; viva, a ordem no layer decidiria. Removi o `text-body` redundante — o elemento mantém os 18px que já renderizava.

O outro achado (`CheckinCrmSection.tsx:565`, `!text-[16px] … sm:!text-h5`) é par responsivo com `!important`: passa a funcionar como escrito.

### Escala completa medida no navegador (pai em 24px)

| Degrau | Tamanho / peso |
|---|---|
| `text-display` | 48px / 800 |
| `text-h1` | 36px / 700 |
| `text-h2` | 30px / 700 |
| `text-h3` | 24px / 600 |
| `text-h4` | 20px / 600 |
| `text-h5` | 18px / 600 |
| `text-h6` | 16px / 600 |
| `text-body` | 16px / 400 |
| `text-body-sm` | 14px / 400 |
| `text-caption` | 12px / 400 |
| `text-label` | 14px / 500 |
| `text-data` | 14px / 500 + `tnum` |

Nenhum degrau herdando do pai. Suíte: 4634 pass, 14 fail / 13 errors — **idêntico ao baseline** nas 4 etapas. `tsc` e lint limpos.

## Estado final

A escala tipográfica do design system existe em produção pela primeira vez. Nenhuma das 4 etapas mexeu na contagem de falhas da suíte.

**O que continua sem verificação:** as telas autenticadas. Todas as medições foram feitas em harness isolado. Os pontos de maior impacto visual, por volume, são `text-caption` (457) e o título de `PageHeading` (29 páginas, agora 30px/700).
