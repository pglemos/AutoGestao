---
target: "https://www.mxperformance.com.br/painel"
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-09-01T17-46-31Z
slug: www-mxperformance-com-br-painel
---
Method: dual-agent (A: revisão de design · B: detector + evidência de browser)

# Crítica Impeccable — /painel (Painel do Consultor)

Modo: Operate. Autenticado como Admin geral em produção, 1440×900 e 390×844.

## Design Health Score — 25/40 (Acceptable)

| # | Heurística | Nota | Problema-chave |
|---|---|---:|---|
| 1 | Visibilidade do estado | 3 | Timestamp e selo de tempo real bons; dois spinners sem skeleton; selo oscila Conectando/Tempo real |
| 2 | Match com o mundo real | 3 | "Cockpit"/"fila de prioridades" são MX; "Escopo carregado"/"Triagem operacional" são jargão interno |
| 3 | Controle e liberdade | 2 | Filtro não persiste; Governança não fecha; fila de exceções sem descartar/adiar |
| 4 | Consistência e padrões | 2 | select nativo ao lado do DS; três rótulos para um destino |
| 5 | Prevenção de erros | 2 | "Atingimento 0.1%" em destaque com 13 de 47 lojas sem meta |
| 6 | Reconhecimento vs lembrança | 3 | Motivo/Próximo passo excelente; chave de leitura colapsada |
| 7 | Flexibilidade e eficiência | 2 | Sem atalhos, sem filtro salvo, sem visão padrão por consultor |
| 8 | Estética e minimalismo | 2 | description concatenada; ~10 linhas antes do primeiro número no mobile |
| 9 | Recuperação de erro | 3 | "Leitura anterior mantida" e retry por seção fortes; erro do Supabase vaza cru |
| 10 | Ajuda e documentação | 3 | "Como ler os estados dos números" existe mas fechado por padrão |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

Parcialmente autoral — 4/10. Autoral: tríade Motivo→Próximo passo→Resultado, selos de Leitura parcial, separação Cockpit/Governança. Intercambiável: toda a grade 4-up de métricas, tipografia, ritmo. Três dos quatro cards apontam para o mesmo destino — existem porque a grade pede quatro.

Detector: exit 0, zero achados em PainelConsultor.tsx, features/admin-mx e features/network-dashboard. Controle sobre src/ inteiro deu 16 achados de Gray text on colored background, todos em src/base44-reference/ (não compila nesta rota). Problemas desta tela são de composição, não de tokens.

Overlays indisponíveis: CSP de produção bloqueia script inline e externo de localhost; bundle do detector (489 KB) não cabe como argumento de CLI. Sem overlay visível.

## Overall Impression

Ideia forte enterrada sob abertura genérica. A fila de prioridades entrega o que o produto promete e chega na terceira dobra, depois de quatro números que competem com peso idêntico. Maior oportunidade: inverter a ordem.

## What's Working

- Tríade Motivo/Próximo passo/Resultado — fecha diagnóstico→ação sem interpretação.
- Degradação honesta: "Leitura anterior mantida", retry por seção, erro-com-dados vs erro-sem-dados.
- Alertas que nomeiam consequência humana ("3 lojas com meta zerada → 12 vendedores veem projeção em 0%").

## Priority Issues

### [P0] O mobile perde a primeira dobra inteira para prosa
Por que importa: a 390×844 o cabeçalho gasta ~330px com a description concatenada (join(' ')); card deslocado com texto cortado à esquerda; primeiro número só após rolar. Princípio 5 (velocidade operacional).
Correção: quebrar description em h1 + linha de contexto; saudação/timestamp em faixa de 12px; promover a fila acima das métricas no mobile.
Suggested command: /impeccable adapt

### [P0] Estado de carregamento é spinner vazio por vários segundos
Por que importa: capturas aos 6s e 10s mostram dois spinners sobre fundo vazio. É a entrada mais frequente da tela mais acessada.
Correção: esqueletos com a forma real (4 cards + 5 linhas); renderizar cockpit sem esperar governança.
Suggested command: /impeccable harden

### [P1] Duas telas moram numa rolagem só
Por que importa: cockpit da rede (diário) e governança da carteira (semanal) na mesma rolagem. Viola Princípio 3.
Correção: abas "Operação" | "Governança (N)" no topo do MxModulePage; padrão Operação.
Suggested command: /impeccable distill

### [P1] O KPI de destaque mente por omissão de escala
Por que importa: "0.1%" em 30px com "Leitura parcial" em 12px, sobre base com 13 de 47 lojas sem meta. Princípio 1 "dados que não mentem".
Correção: com leitura parcial ativa, suprimir o número e exibir "Sem base confiável · 13 de 47 lojas sem meta" + CTA "Configurar metas".
Suggested command: /impeccable clarify

### [P2] Três rótulos para um destino, e filtros com controle nativo cru
Por que importa: quatro links quase homônimos para #network-priorities; selects com chrome do SO ao lado de busca desenhada; picker em roda no iOS.
Correção: rótulo único diferenciado por filtro aplicado ("Ver 13 lojas sem meta"); Select do DS ou segmented control para Período.
Suggested command: /impeccable polish

## Cognitive Load

5 de 8 falham: foco único, hierarquia visual, uma-decisão-por-vez, memória de trabalho, pontos de decisão. Quatro estados de qualidade de dado a manter na cabeça. Três lugares com >4 opções visíveis. "5 mais urgentes de 47" é a decisão certa mas vem por último.

## Emotional Journey

Entrada cordial. Vale 1: carregamento como dois spinners. Vale 2: atingimento 0.1% gera desconfiança, não urgência. Pico: item 1 da fila (GoCars, meta não configurada). Fim: anticlímax em "Carteira de Clientes MX". Pelo pico-fim, a memória é "sistema de cadastro".

## Persona Red Flags

Consultor experiente: nada persiste (useState puro); fila de exceções sem resolver/adiar treina cegueira de alerta; "Ver todas as lojas (47)" perde posição de rolagem.

Primeiro acesso: jargão não definido em lugar visível; lê 0.1% e conclui que a rede está falindo; "loja" e "cliente" trocam de sentido entre as seções.

Acessibilidade: focusElement faz scrollIntoView + focus numa section sem tabindex="-1" — foco abandonado no botão de origem, teclado quebra em silêncio. Quatro links homônimos. Selos Ativo/Rascunho só por cor de baixo contraste.

Mobile distraído: "Atualizar" no topo longe do polegar; "Abrir análise" no canto direito.

## Minor Observations

- "Última leitura do conjunto: ainda não sincronizado." lê mal em português.
- Saudação usa profile.name cru: "Boa tarde, SynVolt" expõe conta técnica como pessoa.
- em_implantacao, em_configuracao e rascunho caem no mesmo cinza.
- recentClients = clients.slice(0, 6) sem ordenação por data.
- Avatar de cliente como inicial em círculo cinza; bandeira da loja seria informação.

## Questions to Consider

1. Se o consultor só pudesse ver uma coisa, seria "47 lojas ativas" ou "GoCars: meta não configurada"?
2. Um cockpit que informa "46 de 47 lojas sem leitura" é cockpit ou relatório de ingestão?
3. Uma fila que não pode chegar a zero é fila ou painel de estado permanente?
4. Por que a mesma composição serve 09:31 e 17:00?
