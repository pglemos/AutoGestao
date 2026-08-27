---
target: "https://www.mxperformance.com.br/classificacao"
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-08-27T18-37-44Z
slug: www-mxperformance-com-br-classificacao
---
Method: dual-agent (A: design review isolado · B: detector isolado)

Segunda passada, após as correções da primeira. Rota atrás de auth: nenhum overlay de browser nesta passada.

## Design Health Score — 24/40 (antes 20/40)

| # | Heurística | Antes | Agora | Key issue |
|---|---|---|---|---|
| 1 | Visibilidade do estado | 2 | 3 | RankingSkeleton variant="store" desenha stats+lista; a tela entrega pódio+pista+tabela — o esqueleto mente sobre o layout |
| 2 | Match com o mundo real | 2 | 4 | "Largada (0 vendas)", "Sua meta", pluralização correta |
| 3 | Controle e liberdade | 2 | 2 | Gerente tem input type=month E abas Mensal/Anual juntos (ManagerRankingReference.tsx:62); "Anual + março/2026" não tem significado definido |
| 4 | Consistência | 1 | 1 | Três headers (SellerPageHeader/MxModuleHeader/PageHeading), três estilos de aba, três tratamentos de erro. SellerProfileModal é bg-gray-900 num app claro |
| 5 | Prevenção de erro | 2 | 3 | atingimento === null não vira 0; selo parou de acusar quem não tem meta |
| 6 | Reconhecer > lembrar | 3 | 3 | HelpTooltip por coluna é excelente; fórmula 50/25/25 só no subtítulo, não onde a Pontuação é lida |
| 7 | Flexibilidade | 2 | 2 | Nenhuma view lembra período/unidade entre sessões |
| 8 | Estética/minimalismo | 2 | 1 | Gerente: 4 controles + 2 abas + 4 destaques + pódio + tabela de 9 colunas na mesma dobra |
| 9 | Recuperação de erro | 2 | 2 | Store tem retry; Global e Manager mostram faixa vermelha sem saída, com handleRefresh disponível |
| 10 | Ajuda | 2 | 3 | Tooltips + "Fórmula provisória aguardando decisão do Dono" |
| **Total** | | **20/40** | **24/40** | **Acceptable** |

## Design Specificity Verdict

Parcialmente autoral — 6/10. CorridaPeriodo e PodioRanking são linguagem de arena comercial, não dashboard SaaS. Mas essa autoria só existe na view do vendedor; GlobalRankingView e ManagerRankingReference são cards+tabela+filtros intercambiáveis. Três sistemas de header e três idiomas de filtro na mesma rota — em modo Operate, o defeito estruturante.

Detector: exit 0, zero achados em src/features/ranking e src/components/Layout.tsx. tsc exit 0. Ranking 29 pass / 0 fail.
Fatos verificados: --color-medal-bronze definido (index.css:168-169) e usado; RankedVendedor.meta e .atingimento são number | null; text-mx-nano continua sem definição CSS com 76 usos em src/ (task separada aberta); LiveFloor confirmado órfão de produção (mantido: contratos em src/test/ o referenciam por caminho).

## P0 encontrados nesta passada — AMBOS JÁ CORRIGIDOS depois do run

[P0] A pista mentia no celular. Com 8 corredores e minGap de 32px numa pista de ~285px, a separação consumia todo o espaço e as posições paravam de representar vendas — viravam fila de espaços iguais. Corrigido: selecionarCorredores() limita a pista a 4 no compacto (líder + você + vizinhos diretos), com legenda dizendo quantos ficaram na tabela. Medido em 375px: 0 sobreposições de etiqueta, 0 de avatar, 1 linha de avatares, nada fora do card.

[P0] Linha clicável sem teclado. <tr onClick> + cursor-pointer sem equivalente de teclado. Corrigido: onClick e cursor-pointer removidos do <tr>; o botão do nome é o único alvo. Medido: 0 linhas com cursor:pointer, 0 tr[onclick], 8 botões.

Defeito colateral também corrigido: quem não recebia etiqueta tinha a coluna encolhida e o avatar subia, desalinhando a fileira. Agora a etiqueta ocupa o espaço com `invisible` + aria-hidden.

## Priority issues abertos

[P1] Três design systems na mesma rota — SellerPageHeader (Store:44) / MxModuleHeader (Global:39) / PageHeading (Manager:56). Fix: padronizar em PageHeading e extrair um RankingPeriodTabs único a partir de StoreRankingView.tsx:50-66, reusado em Manager:63-67.

[P1] SellerProfileModal inventa números — Volume, Ritmo × 10, Visitas × 5 com multiplicadores mágicos (SellerProfileModal.tsx:34-37) e "Nível {atingimento/10}" (:98), num painel escuro que quebra o tom do app (:53). Fix: trocar o radar por 4 métricas cruas rotuladas, já presentes em :129-146, e alinhar ao tema claro.

[P2] Erro sem saída em duas das três views — GlobalRankingView.tsx:84-88 e ManagerRankingReference.tsx:87 mostram o erro sem retry, com data.handleRefresh disponível. Fix: replicar o bloco de StoreRankingView.tsx:106-119.

[P2] Gerente: "Anual" + seletor de mês coexistem sem significado definido (ManagerRankingReference.tsx:62-67).

[P3] Nenhuma view lembra período/unidade/critério entre sessões.

## Cognitive load — falham: single focus (Manager), grouping (Global: "Ocultar lojas" no header, longe dos filtros que ele altera), hierarquia visual (Manager), ≤4 opções (Manager), working memory (trocar o critério reordena a tabela mas não os destaques nem o pódio), progressive disclosure (tabela do vendedor 7 colunas atrás de scroll horizontal, sem versão em cartão).

## Persona red flags

Vendedor: a resposta que ele quer ("subi ou caí?") está depois de 4 abas + select + refresh; no mobile SuaPosicao cai abaixo do pódio dos outros. Não há indicador de variação (subiu/caiu desde ontem) — só posição absoluta.
Gerente: não consegue responder "com quem eu falo hoje". O "—" de rotina aparece igual para "sem snapshot" e para "não executou". Os 4 destaques premiam só o topo; zero visibilidade de risco.
Dono multi-loja: cai em StoreRankingView (Container:17), a tela do vendedor, com SuaPosicao suprimido — pódio de uma loja só, para quem tem N lojas.

## Minor observations

- SuaPosicao.tsx:30: (posicao || 2) - 1 vira "para o 1º lugar" silenciosamente se posicao for 0.
- PodioRanking.tsx:24-31: pedestal vazio com número cinza e sem texto — parece bug, não estado.
- GlobalRankingView.tsx:67-70: contador "N no ranking" tem borda, sombra e altura de botão mas não é clicável.
- ManagerRankingReference.tsx:118: linha única de ~1.100 caracteres com a tabela inteira inline.
- TabelaRanking.tsx: empty state renderizado depois do <table>, dentro do ScrollableRegion — cabeçalho vazio acima da mensagem.

## Questions to Consider

1. Se a metodologia é expor a posição, por que o gerente não vê nada acionável sobre quem está exposto?
2. Por que "Anual" e um seletor de mês coexistem na view do gerente?
3. A CorridaPeriodo é a única coisa autoral da rota. Por que não existe para o gerente e para o dono?
