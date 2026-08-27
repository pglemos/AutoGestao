---
target: "https://www.mxperformance.com.br/classificacao"
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-27T13-57-29Z
slug: www-mxperformance-com-br-classificacao
---
Method: dual-agent (A: design review isolado · B: detector/evidência determinística isolado)

## Design Health Score

| # | Heurística | Nota | Key issue |
|---|---|---|---|
| 1 | Visibilidade do estado | 2 | LastUpdated com `hidden 2xl:inline-flex` (GlobalRankingView.tsx:52) some abaixo de 1536px; StoreRankingView não renderiza refresh que o hook expõe |
| 2 | Sistema ↔ mundo real | 2 | Linha de chegada da Corrida = meta da LOJA (CorridaPeriodo.tsx:121). Ninguém chega |
| 3 | Controle e liberdade | 2 | Dono cai em StoreRankingView sem filtro de unidade; nenhuma linha da tabela é clicável |
| 4 | Consistência e padrões | 1 | 3 headers, 3 loadings, 3 seletores de período na mesma rota; mesmo estado selecionado com cor de texto diferente (GlobalFiltersBar.tsx:50 vs 60) |
| 5 | Prevenção de erro | 2 | `meta: r.meta ?? metaPeriodo` (useStoreRankingPageData.ts:111) fabrica atingimento falso |
| 6 | Reconhecer > lembrar | 3 | `VOCÊ` na pista e "Faltam X para o Nº" funcionam; HelpTooltip só em hover |
| 7 | Flexibilidade | 2 | Tabela sem ordenação e sem busca |
| 8 | Estético e minimalista | 2 | BonificacaoPeriodo = card de 260px que nunca terá dados (linhas 4-7 documentam) |
| 9 | Diagnóstico de erro | 2 | Erro cru em role="alert" sem retry (StoreRankingView.tsx:66) |
| 10 | Ajuda e documentação | 2 | Gerente ótimo (fórmula publicada); vendedor com banner hardcoded afirmando config inexistente |
| **Total** | | **20/40** | **Acceptable — melhoria significativa necessária** |

## Design Specificity Verdict

Parcialmente autoral: uma ideia forte cercada de dois cascos genéricos.

LLM: Corrida do Período e PodioRanking (pedestais de altura real) são design de produto de verdade. Mas a rota renderiza três telas (Ranking.container.tsx:15-17) e só uma tem essa voz. GlobalRankingView e ManagerRankingReference são intercambiáveis com qualquer SaaS. A "tela-padrão do módulo vendedor" usa o header menos canônico dos três (SellerPageHeader/h3 vs PageHeading/h2 no resto do módulo).

Scan determinístico: detect.mjs 0 achados em 33 arquivos (exit 0), confirmado invocando o engine direto. RESSALVA: sonda com anti-padrões óbvios acusou no engine interno mas a CLI imprimiu [] e saiu 0 — sensibilidade da CLI reduzida.

Grep: 2 rgba hardcoded (CorridaPeriodo.tsx:52, PodioRanking.tsx:38), 27 valores arbitrários Tailwind (18 em base44/), 30x text-xs + 4x text-[10px]/[11px]. Zero console.log/TODO, zero botão só-ícone sem aria-label, zero div onClick sem role.
ACHADO EXTRA: `text-mx-nano` usado 76x em src/ (7x no ranking), registrado no twMerge (lib/utils.ts:37), SEM definição CSS (index.css só define micro e tiny). Classe inerte.

Falsos positivos descartados: os 8 h-6/h-7/h-8 são todos não-interativos.

Overlay visual: NÃO EXISTE. Rota atrás de auth, sem dev server. Tudo estático — sem runtime, sem screenshot, sem contraste medido.

## Overall Impression

A tela sabe o que quer ser e não consegue ser em três perfis ao mesmo tempo. A peça boa (Corrida) é a que pior sobrevive ao celular do vendedor. O problema mais grave não é estético: a tela mostra números errados com confiança. Vendedor sem meta é medido contra a meta da loja inteira. Contradiz o princípio nº 1 do produto. Maior oportunidade: consertar a verdade dos dados, depois dar ao vendedor uma ação.

## What's Working

1. Metáfora da corrida é design real (CorridaPeriodo.tsx:62-115) — prevenção de colisão para empates, clamp() para não vazar da pista.
2. Honestidade sobre dado ausente no gerente (ManagerRankingReference.tsx:117) — fórmula publicada, calculateManagerScore retorna null. "Dados que não mentem" no código.
3. RankingAvatar com fallback de iniciais + onError + loading="lazy".

## Priority Issues

[P0] Meta da loja vira meta individual
useStoreRankingPageData.ts:111 (`meta: r.meta ?? metaPeriodo`) + chegada da Corrida = monthly_goal da loja x meses.
Por que importa: vendedor sem meta aparece com ~5% de atingimento, badge vermelho, "Abaixo do esperado" — número fabricado. Viola o princípio central do produto.
Fix: `meta: r.meta ?? null`; `—` + badge neutro quando null; chegada = maior meta individual do grupo ou meta do próprio usuário.
Comando: /impeccable harden

[P0] Banner afirma configuração que não existe
StoreRankingView.tsx:58-64 — "Critério configurado pela loja: Volume de vendas" é string literal; nada consulta metaRules.
Fix: ler individual_goal_mode de metaRules e ocultar sem regra; ou reduzir para "Ordenado por volume de vendas".
Comando: /impeccable clarify

[P1] Modo Operate quebrado — vendedor vê, não compara, não age
StoreRankingView.tsx:28-92: zero CTA, zero linha clicável, zero comparativo. SellerProfileModal e BattleSelector existem e só o MX interno recebe.
Fix: linhas da TabelaRanking abrem SellerProfileModal + CTA no SuaPosicao ("Faltam 2 vendas → Ver meu Plano de Ataque").
Comando: /impeccable shape

[P1] Alvo de toque abaixo do mínimo no único controle da tela
StoreRankingView.tsx:44 — text-[12px] px-3 py-1.5 ≈ 28-30px vs 44px mínimo, sem aria-pressed. Corrida absolute em pista h-14 com spacing fixo 42px: em 375px, dois empatados ocupam 84px, labels max-w-[80px] se sobrepõem.
Fix: min-h-11 px-4 text-sm + aria-pressed + role="tablist"; Corrida com spacing responsivo abaixo de 480px.
Comando: /impeccable adapt

[P2] Contradição de sinal: mesmo número, duas cores opostas
SuaPosicao.tsx:32 pinta atingimento em text-status-success-text sempre, hardcoded. 12% em verde no card e "Abaixo do esperado" em vermelho logo abaixo. Junto: 1º e 3º lugar com o mesmo gradiente (PodioRanking.tsx:7-8), sem token de bronze.
Fix: cor derivada do valor; adicionar --color-medal-bronze.
Comando: /impeccable colorize

## Carga Cognitiva — 2 de 8 passam (alta)

Falham: single focus, hierarquia visual (ouro = bronze), one thing at a time, ≤4 opções (4 pontos violam: header do gerente ~10 controles, chips de loja ilimitados, header global, tabelas 7/9 colunas), working memory (Corrida usa denominador da loja, Tabela o individual), progressive disclosure.

## Persona Red Flags

Vendedor · celular · showroom: Corrida quebra em 375px. Sem LastUpdated/refresh/pull-to-refresh. SuaPosicao some inteiro se ele não está no ranking, sem explicação. Em último lugar: tag verde VOCÊ como holofote na Largada, vermelho na tabela, zero métrica de resgate, zero botão.

Gerente: ~10 controles no header; "Anual" + "2026-03" produz estado sem significado documentado. HelpTooltip por hover em 9 colunas — inútil no tablet. Tabela min-w-[900px] com "Pontuação" (critério de ordenação) na última coluna.

Dono multi-loja: cai em StoreRankingView (Ranking.container.tsx:17) sem o filtro de unidade que o hook já calcula. StoreArenaSelector é exclusivo do MX interno.

## Minor Observations

- SuaPosicao.tsx:18 — ambos os ramos do ternário produzem string idêntica.
- r.position da RPC é descartada; posicao vem de meuIndex+1 sobre ordenação local. Pode discordar de outras telas.
- PodioRanking e CorridaPeriodo recortam primeiro nome de formas diferentes.
- ~260 linhas órfãs: GlobalRankingHeader.tsx, RankingSkeleton.tsx, LiveFloor.tsx sem importador.
- animate-pulse em texto de instrução (StoreArenaSelector.tsx:36).
- ManagerRankingReference.tsx:127 — violet e blue mapeiam para os mesmos tokens.
- text-mx-nano: 76 usos, sem definição CSS.

## Questions to Consider

1. Se /classificacao é a tela-padrão do módulo vendedor, por que é a única com SellerPageHeader/h3?
2. A Corrida foi desenhada para o desktop do gerente ou para o bolso do vendedor?
3. Quem no ranking foi consultado sobre estar no ranking? Por que hideStoreNames protege a loja e não o vendedor com "Abaixo do esperado" público?
4. Um card que documenta que nunca terá dados merece 260px em todo carregamento?
