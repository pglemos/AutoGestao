---
target: "https://www.mxperformance.com.br/clientes"
total_score: 22
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-08-25T16-42-06Z
slug: eatures-admin-mx-clientes-portfoliooverviewtab-tsx
---
# Crítica da página /clientes

## Veredito de especificidade do design

3/5 — a lógica é própria da MX, mas a composição visual ainda parece um CRM administrativo genérico. A tela preserva corretamente a verdade do produto: cliente pode ser loja única ou matriz com filiais, e consultoria fica separada do resultado comercial. Porém, a combinação cabeçalho + abas + seis cartões + filtros + tabela densa é intercambiável com muitos sistemas de gestão.

## Pontuação das heurísticas de Nielsen

| Nº | Heurística | Nota | Principal problema |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 2/4 | Há carregamento, atualização e tentativa novamente, mas o progresso agregado aparece sempre em verde e a atualização dos dados não informa claramente a data/hora da última sincronização. |
| 2 | Correspondência com o mundo real | 3/4 | Matriz, filial, loja única, vendas e jornada consultiva falam com a operação; ainda há ambiguidade entre período curto e meta mensal, além de termos como Workspace e onboarding. |
| 3 | Controle e liberdade do usuário | 3/4 | Filtros, limpeza, abas, tabela/cards e retry ajudam; filtros e visualização não são preservados e não existe desfazer para ações operacionais. |
| 4 | Consistência e padrões | 2/4 | O sistema visual MX é coerente, mas a tabela e os cards mostram conjuntos diferentes de informações e há dois botões de atualização muito próximos. |
| 5 | Prevenção de erros | 2/4 | Datas personalizadas são validadas, mas aparecem zeradas antes do preenchimento; ações de suspensão/arquivamento ficam no mesmo menu das ações rotineiras. |
| 6 | Reconhecimento em vez de memorização | 3/4 | Labels, progressbars e badges são bons; a densidade, a ação truncada e as abas parcialmente ocultas exigem inferência e inspeção. |
| 7 | Flexibilidade e eficiência | 2/4 | Há busca, filtros e períodos, mas não há seleção em lote, atalhos, favoritos ou visão persistida para triagem recorrente. |
| 8 | Design estético e minimalista | 2/4 | Visual limpo no desktop, mas seis cartões, muitos controles e sete colunas competem com a fila que deveria orientar a próxima ação. |
| 9 | Reconhecer, diagnosticar e recuperar erros | 2/4 | Existe retry, porém erros do backend podem chegar crus ao usuário, os dados anteriores são apagados em falha e o modal de pendências tem texto de interpolação literal. |
| 10 | Ajuda e documentação | 1/4 | Não há ajuda contextual para explicar cartões sobrepostos, meta mensal, períodos curtos ou a diferença entre progresso comercial e consultivo. |
| **Total** |  | **22/40** | **Aceitável — precisa de melhorias significativas antes de ficar realmente claro.** |

## Carga cognitiva

7 de 8 verificações falham — carga alta.

- Falha em foco único: o usuário precisa atravessar resumo de carteira, abas, cartões de ciclo de vida, busca, três filtros, alternador de visão, filtro de vendas, quatro KPIs e só depois chega à fila.
- Falha em agrupamento em blocos pequenos: seis cartões e sete colunas excedem a leitura rápida de até quatro itens por grupo.
- Falha em hierarquia visual: a página dá o mesmo destaque a cadastro, governança, consultoria e triagem comercial.
- Falha em uma decisão por vez: ações de criação, atualização, período, filtros e visão ficam disponíveis simultaneamente.
- Falha em escolhas mínimas: há muitas decisões antes de abrir o primeiro cliente.
- Falha de memória de trabalho: o usuário precisa lembrar se um número é de vendas do período, meta do mês, presença de hoje ou jornada consultiva.
- Falha em divulgação progressiva: quase tudo aparece antes da primeira linha útil.

O único ponto que passa é o agrupamento semântico: a faixa de vendas/meta e a coluna de consultoria deixam explícito que os dois acompanhamentos são diferentes.

## Jornada emocional

A entrada transmite segurança: shell Admin MX consistente, título claro, contagem da carteira e linguagem operacional. A confiança cai quando a fila fica abaixo de uma pilha alta de controles e quando a coluna “Próxima ação” aparece truncada como “Definir Dono...”. No celular, a pessoa vê resumo e controles, mas não vê nenhum cliente na primeira tela. O pico negativo ocorre em estados de erro: texto técnico, dados zerados ou um marcador de interpolação literal no título de impeditivos fazem o sistema parecer menos confiável justamente na ativação de uma loja.

## O que está funcionando

- A regra de negócio matriz + filiais está visível: a produção real mostrou exemplos como “Loja única · matriz” e “Matriz + 2 filiais”, incluindo vendas por unidade.
- Consultoria e vendas estão separadas corretamente: a tabela tem as colunas “Meta mensal / progresso” e “Consultoria”, e a faixa declara que o comercial é separado da jornada consultiva.
- O período inicial está correto: “Este mês” vem selecionado, e a tela oferece Hoje, Esta semana, Últimos 15 dias, Este mês e Data personalizada.
- A base visual é consistente no desktop: tipografia, bordas, verde MX, controles rotulados e progressbars formam um sistema reconhecível.

## Problemas prioritários

### [P1] Próxima ação truncada e ausente nos cards

Por que importa: a página promete orientar a operação, mas a informação que diz o que fazer em seguida é a menor coluna. No desktop autenticado, a primeira linha apareceu como “Definir Dono...”. No código, a coluna recebe apenas 6% em PortfolioOverviewTab.tsx:541 e o texto é limitado a uma linha em PortfolioOverviewTab.tsx:696. A visão Cards, por sua vez, não renderiza nextAction nem pendências.

Correção: aumentar a largura mínima da coluna, permitir duas linhas, exibir o bloqueio principal e manter próxima ação + pendências também nos cards. O texto deve priorizar a ação operacional, não apenas o status.

Comando sugerido: $impeccable layout e $impeccable clarify.

### [P1] Meta e progresso não deixam claro o que acontece em Hoje e Esta semana

Por que importa: o KPI agregado usa sempre texto verde em PortfolioOverviewTab.tsx:416, enquanto cada linha usa alerta abaixo da meta em PortfolioOverviewTab.tsx:637-639. Além disso, o cálculo usa a meta mensal em clientSales.ts:161-163 mesmo quando o usuário escolhe Hoje, Esta semana ou Últimos 15 dias. Isso pode fazer 21,7% parecer um estado positivo ou fazer o usuário comparar uma janela curta com um alvo que não foi ajustado para ela.

Correção: escrever explicitamente “vendas no período / meta mensal” e usar cor de status coerente no agregado. Se a intenção for acompanhar ritmo, mostrar também “ritmo esperado até hoje” ou uma meta proporcional; não misturar os dois conceitos em um único percentual.

Comando sugerido: $impeccable clarify.

### [P1] No celular, a fila fica escondida atrás do resumo e de uma tabela de 900 px

Por que importa: em 390×844, a primeira tela mostrou cabeçalho, ações, abas, título e seis cartões; nenhum cliente apareceu. A tabela foi medida com 900 px de largura, enquanto seu contêiner tinha 322 px visíveis e 902 px de conteúdo horizontal. A primeira linha estava aproximadamente em y=1423. O usuário precisa rolar verticalmente e depois horizontalmente para enxergar as vendas.

Correção: no mobile, priorizar cards operacionais ou uma linha compacta responsiva como visão padrão; reduzir ou recolher os cartões de ciclo de vida; deixar “Cards” acessível antes da fila; manter vendas, meta, progresso, estrutura e próxima ação no mesmo cartão; exibir indicação clara quando houver rolagem horizontal como fallback.

Comando sugerido: $impeccable adapt.

### [P2] Ações demais e sem hierarquia de risco

Por que importa: o cabeçalho oferece Agenda, Atualizar, Cadastro Rápido e Novo Cliente juntos, enquanto cada cliente pode expor cerca de uma dúzia de ações, incluindo suspender e excluir/arquivar. Isso aumenta o tempo de decisão e aproxima ações destrutivas das rotineiras.

Correção: manter uma ação primária de criação e uma atualização contextual; agrupar o menu da linha em Operação, Configuração e Governança; separar Suspender e Excluir/Arquivar em uma área de risco com confirmação explicativa.

Comando sugerido: $impeccable distill.

### [P2] Mensagens de erro e estados vazios quebram confiança

Por que importa: PendenciasModal.tsx:163 renderiza literalmente um marcador de interpolação no título dos impeditivos; PortfolioOverviewTab.tsx:426 pode mostrar a mensagem crua do backend; e useClientSales.ts:107 substitui os dados anteriores por uma lista vazia quando a consulta falha. O usuário pode interpretar uma falha de rede como “zero vendas”.

Correção: interpolar a contagem de fato, traduzir o erro para linguagem de ação, manter os últimos dados válidos com um aviso de desatualização e substituir “...” por skeleton ou estado de carregamento nomeado.

Comando sugerido: $impeccable harden e $impeccable clarify.

## Alertas por persona

### Alex — usuário experiente

Não há seleção em lote, atalhos ou visão persistida. Para triar 43 clientes, Alex precisa inspecionar linhas individualmente; a ação truncada aumenta ainda mais o tempo. As ações de atualização da carteira e de vendas também duplicam esforço.

### Sam — usuário dependente de acessibilidade

Os nomes acessíveis de tabs, selects, botões e progressbars estão bons na inspeção. Ainda assim, parte do status depende de cor verde/amarela, as abas são roláveis e a tabela exige uma superfície horizontal larga. A informação de abaixo da meta precisa ser expressa por texto e não apenas por cor.

### Casey — usuário móvel distraído

O caminho principal não chega aos clientes na primeira tela. A tabela padrão tem 900 px, e trocar para Cards exige localizar um controle depois de passar pelos filtros. Mesmo nos cards, a próxima ação e os bloqueios não aparecem, retirando justamente a informação de triagem.

## Observações menores

- “Carteira 360 (43)”, “Clientes na carteira (43)” e “Clientes & Lojas MX” repetem o mesmo conceito.
- Os cartões de ciclo de vida parecem categorias, mas seus contadores podem se sobrepor; isso não é explicado.
- “CNPJ: Sem CNPJ” pode ser “CNPJ não informado”.
- O placeholder de busca é longo e perde legibilidade em larguras menores.
- “Admin”, “Workspace”, “Master” e “onboarding” são resíduos de vocabulário misto; a tela está majoritariamente em português, mas ainda não está 100% pt-BR.
- A visão de cards usa fallbacks diferentes para produto e fase em relação à tabela.

## Perguntas provocativas

- A página deve ser primeiro uma fila operacional, um panorama da carteira ou um painel de vendas? Qual dessas tarefas deve vencer a primeira leitura?
- Se “Próxima ação” é a promessa central, por que ela é a menor coluna e desaparece nos cards?
- Em Hoje e Esta semana, a comparação correta é com a meta mensal, com uma meta proporcional ou com os dois indicadores lado a lado?
- Os cartões de ciclo de vida são filtros não exclusivos? Se são, “Sinalizações da carteira” seria mais claro que categorias?
- Qual é o caminho mais rápido para o responsável triar 43 clientes sem abrir cada um?

## Evidência determinística e visual

- Detector Impeccable: saída JSON [] e código de saída 0; nenhum achado determinístico.
- Produção autenticada: URL exata /clientes, sessão Admin geral, desktop 1710×802 e mobile 390×844.
- Desktop: 43 linhas, sete colunas, vendas agregadas 230, meta mensal 1.060, progresso 21,7% e 26/52 unidades com venda.
- Mobile: a tabela permanece com 900 px, seu contêiner mostra 322 px e a primeira linha fica fora da primeira tela.
- O teste de seleção de Data personalizada exibiu corretamente Data inicial e Data final e o aviso de preenchimento; o teste seguinte de Hoje foi inconclusivo porque a conexão do navegador reiniciou.
- Não há overlay visual disponível nesta rodada: a ferramenta do navegador ofereceu avaliação somente leitura e a injeção de detect.js não foi possível. As conclusões visuais acima vêm da captura e do DOM observados, não de overlay.
