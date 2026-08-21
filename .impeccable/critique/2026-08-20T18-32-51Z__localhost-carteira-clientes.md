---
target: "http://localhost:3457/carteira-clientes"
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-20T18-32-51Z
slug: localhost-carteira-clientes
---
# Crítica de design — `/carteira-clientes`

Method: dual-agent (A: critique_design_a · B: critique_detector_b)

## Design Health Score

| # | Heurística | Nota | Questão principal |
|---|---|---:|---|
| 1 | Visibilidade do status | 3/4 | Contagens e filtros são claros, mas score e urgência não explicam bem sua causa. |
| 2 | Correspondência com o mundo real | 4/4 | A linguagem de financiamento, visita, proposta e próxima ação é concreta e automotiva. |
| 3 | Controle e liberdade | 3/4 | Navegação e overlays são reversíveis; ações operacionais pesadas têm pouca preparação. |
| 4 | Consistência e padrões | 3/4 | Componentes são coerentes, mas três nomes competem pela identidade da tela. |
| 5 | Prevenção de erros | 2/4 | Campanhas/missões não antecipam claramente alcance e consequências. |
| 6 | Reconhecimento em vez de lembrança | 3/4 | O card contextualiza a ação, mas a explicação do score depende de hover. |
| 7 | Flexibilidade e eficiência | 3/4 | Busca e filtros ajudam, porém faltam fila rápida, ações em lote e atalhos. |
| 8 | Estética e design minimalista | 2/4 | Boa organização, mas títulos, KPIs e cards repetitivos diluem a ação principal. |
| 9 | Recuperação de erros | 2/4 | Há caminhos em que falha de persistência pode fechar o modal sem recuperação orientada. |
| 10 | Ajuda e documentação | 2/4 | O Mentor orienta, mas score, prioridades e missões não têm explicação persistente. |
| **Total** |  | **27/40** | **Bom, com problemas importantes de foco e acessibilidade.** |

## Design Specificity Verdict

**Especificidade funcional alta; especificidade visual média.** “Mentor Comercial”, “Plano de Ataque”, temperatura, situação, objetivo e próximo passo materializam a metodologia MX. A superfície não é um CRM genérico no comportamento. Visualmente, porém, fundo cinza, cards brancos, azul, chips e KPIs ainda seguem uma gramática SaaS intercambiável; a assinatura MX está mais no texto que na composição.

**Avaliação editorial:** o melhor elemento é a sequência “Situação → Objetivo → Mentor recomenda”, porque transforma dado em orientação. O maior desperdício é fazer o vendedor atravessar títulos e seis resumos antes de chegar à primeira oportunidade, especialmente no celular.

**Detector determinístico:** os dois entrypoints retornaram `[]` (0 findings), mas delegam a maior parte do DOM para componentes importados. No browser, o overlay encontrou 5 anti-patterns agregados, 7 ocorrências e 4 regras: `layout-transition`, `clipped-overflow-container`, `cramped-padding` e `overused-font`. São válidas as transições de `width`/`padding`; clipping é apenas risco preventivo, pois não se reproduziu; `cramped-padding` em `display: contents` e fonte única são falsos positivos contextuais.

**Overlay visual:** a injeção funcionou e o console confirmou `[impeccable] 5 anti-patterns found`, mas a aba não pôde ser exposta como `[Human]` por limitação de visibilidade em subagent thread. Não há alegação de overlay visível ao usuário; screenshots, DOM e console serviram como fallback.

## Overall Impression

A tela passa confiança operacional e usa dados reais, mas trata contexto e execução com peso parecido. O salto de qualidade virá de assumir que esta é uma fila de trabalho: “quem devo abordar agora, por quê e qual é o próximo passo?”. Tudo que não acelera essa decisão deve recuar.

## What's Working

1. **Orientação comercial concreta:** os cards conectam situação, objetivo, recomendação e justificativa.
2. **Informação real e acionável:** a sessão mostrou 10 prioridades, 6 compradores e 16 clientes ativos, com veículos e estágios específicos.
3. **Responsividade estrutural correta:** nenhum overflow horizontal em 1440×900 ou 390×844; o card se reorganiza de forma legível.

## Priority Issues

### [P1] A ação principal fica fora da primeira dobra no mobile

**Por que importa:** em 390×844, nenhum cliente ou botão “Executar” aparece inicialmente; o vendedor precisa rolar antes de começar o trabalho.

**Correção:** condensar cabeçalho/tabs, manter “Prioridade Hoje” como resumo dominante e transformar os demais KPIs em faixa rolável ou disclosure. O primeiro cliente deve aparecer na primeira dobra.

**Comando sugerido:** `$impeccable adapt /carteira-clientes`

### [P1] A tela demora a dizer “faça isto agora”

**Por que importa:** “Carteira de Clientes”, “Carteira Ativa” e “Mentor Comercial” competem; seis KPIs recebem mais área que a primeira oportunidade.

**Correção:** eleger “Mentor Comercial” como identidade funcional, rebaixar o título do shell e ordenar a superfície por uma fila explícita: próximo cliente, motivo da prioridade, ação.

**Comando sugerido:** `$impeccable distill /carteira-clientes`

### [P1] Urgência e score perdem significado por saturação

**Por que importa:** quase todos os clientes aparecem como Alta/Crítica, tornando a prioridade indistinguível e gerando fadiga de alarme. A explicação por `title` não funciona bem no toque.

**Correção:** separar urgência comercial de qualidade de cadastro, mostrar 1–2 motivos de prioridade diretamente e tornar a explicação do score acionável por toque/teclado.

**Comando sugerido:** `$impeccable clarify /carteira-clientes`

### [P1] Acessibilidade básica está incompleta

**Por que importa:** há dois `h1` no mesmo `main`; a busca depende do placeholder e não possui label programático; vários alvos ficam abaixo de 44 px, incluindo “Abrir ficha” com 30 px e busca/filtro com 36 px.

**Correção:** manter um único `h1`, rotular a busca com `label`/`aria-label`, nomear o fechar do drawer e elevar alvos interativos a pelo menos 44×44 px no mobile.

**Comando sugerido:** `$impeccable audit /carteira-clientes`

### [P2] Plano de Ataque mistura criação, exploração e execução

**Por que importa:** formulário de campanha, campanha ativa, faixas, veículos e seis missões aparecem na mesma superfície, criando decisões concorrentes.

**Correção:** mover “Criar campanha” para fluxo secundário, priorizar uma fila de missões e exibir alcance/impacto antes de iniciar.

**Comando sugerido:** `$impeccable distill /carteira-clientes`

## Persona Red Flags

**Vendedor sob pressão no showroom:** precisa atravessar quase todo o primeiro viewport mobile antes da primeira oportunidade; a repetição de Alta/Crítica não o ajuda a escolher; score não é explicável por toque.

**Vendedor novo na metodologia MX:** encontra três nomes para o mesmo contexto; não recebe explicação persistente de score, temperatura, prioridade ou missão; “iniciar ataque” chega antes de um modelo mental simples.

**Vendedor experiente:** não encontra ação em lote, atalho ou “executar próxima prioridade”; precisa comparar muitos cards visualmente parecidos; o drawer oferece cerca de 24 decisões sem prever quantos resultados restarão.

## Minor Observations

- “0 clientes compatívels” tem erro de concordância.
- Duas células de resumo apresentam leve estouro interno de texto no mobile, embora sem overflow global.
- O drawer de filtros tem botão de fechar sem nome acessível no snapshot.
- Transições de `width` e `padding` no shell podem causar custo de layout; prefira transform quando houver animação perceptível.
- Após autenticação, não houve console errors nem requests falhos/HTTP ≥400; só quatro warnings de bootstrap do `ProtectedRoute` antes da sessão estabilizar.

## Questions to Consider

- E se a primeira tela fosse uma fila de execução e os seis resumos fossem contexto secundário?
- Se quase todos são “Críticos”, o score está priorizando ou só descrevendo dívida de dados?
- O fim do dia deve transmitir pressão contínua ou progresso comprovado?
