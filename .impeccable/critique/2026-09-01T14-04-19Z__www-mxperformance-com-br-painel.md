---
target: "https://www.mxperformance.com.br/painel"
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-01T14-04-19Z
slug: www-mxperformance-com-br-painel
---
# Crítica Impeccable — `/painel`

## Design Health Score

| # | Heurística | Nota | Principal questão |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 3/4 | “Tempo real ativo”, horário e “Atualizar” ajudam, mas falta frescor por bloco e carregamento/erro explícito. |
| 2 | Correspondência com o mundo real | 3/4 | Vocabulário operacional adequado, porém PMR e outros termos não são explicados. |
| 3 | Controle e liberdade | 2/4 | Busca e filtros existem; reset, seleção em lote e retorno contextual não ficam claros. |
| 4 | Consistência e padrões | 3/4 | Base visual coerente, mas “Ver”, “Abrir” e “Analisar” não têm taxonomia uniforme. |
| 5 | Prevenção de erros | 2/4 | “Não configurada”, metas zeradas e zeros não distinguem configuração, falha ou resultado real. |
| 6 | Reconhecimento em vez de memorização | 3/4 | Labels ajudam, mas sidebar, siglas e múltiplos módulos exigem memória do domínio. |
| 7 | Flexibilidade e eficiência | 2/4 | Filtros ajudam, mas há muitas ações repetidas linha a linha e não há evidência de lote/atalhos. |
| 8 | Estética e minimalismo | 2/4 | Visual limpo, porém sidebar, tabela extensa e governança fragmentada competem pela atenção. |
| 9 | Recuperação de erros | 2/4 | Bloqueios são apontados, mas não há caminho claro para corrigir, atribuir ou concluir cada um. |
| 10 | Ajuda e documentação | 1/4 | Faltam legenda, definição de KPI, critérios críticos e ajuda contextual. |
| **Total** |  | **23/40** | **Aceitável, mas exige melhoria significativa antes de ficar realmente eficiente.** |

## Veredito de especificidade

**Média: semanticamente específica, visualmente intercambiável.**

O conteúdo é claramente MX — Consultor MX, consultoria, lojas automotivas, governança, metas, vendas e disciplina. Porém a composição — sidebar extensa, canvas cinza, cards brancos, KPIs, tabela e acento verde — poderia ser reaproveitada em outro CRM B2B quase sem mudanças. A personalidade da metodologia aparece mais nos rótulos e dados do que na estrutura da experiência.

O detector não produziu achados: para URLs, o CLI foi corretamente pulado; o Assessment B conseguiu apenas o preflight de mutação, mas não executou `detect.js`. Portanto, **não há overlay disponível e “0 achados” não significa que a tela esteja limpa**. Fallback: `preflight-only / detector-not-run`.

## Impressão geral

O painel transmite seriedade, legibilidade e controle. O problema central é comunicar uma crise ampla — **47 lojas críticas, 1 venda, 0,1% de atingimento e 47 prioridades** — sem converter esse volume em uma sequência clara de decisões. A maior oportunidade é transformar o cockpit de um inventário de problemas em uma fila priorizada de ações.

## O que funciona

1. A semântica operacional é forte: “Lojas ativas”, “Vendas”, “Atingimento”, “Prioridades” e “Governança da carteira” refletem tarefas reais.
2. A estrutura inicial é escaneável: KPIs no topo, filtros antes da tabela, cabeçalhos ordenáveis e ações por loja.
3. “Tempo real ativo”, horário da atualização, contagens e status dão uma base inicial de confiança.

## Problemas prioritários

### [P1] Crise sem triagem operacional

- **Evidência:** 47 prioridades e várias linhas marcadas como `Crítico`, com ações equivalentes `Analisar`.
- **Por que importa:** a urgência perde hierarquia; o consultor precisa interpretar a lista antes de saber por onde começar.
- **Correção:** exibir uma fila ranqueada por impacto, prazo e responsável, com somente 3–5 decisões mais urgentes; deixar a tabela completa como exploração secundária.
- **Comando sugerido:** `$impeccable distill`.

### [P1] Métricas alarmantes sem diagnóstico

- **Evidência:** `1 de 1038 vendas`, `0,1%`, `0 confirmado`, `Não configurada`, `—` e `meta mensal zerada` aparecem no mesmo sistema visual.
- **Por que importa:** não se distingue dado atrasado, configuração ausente, ausência real de vendas ou cálculo incompleto.
- **Correção:** diferenciar “sem dado”, “não configurado” e “zero real”; exibir fonte, timestamp, dias transcorridos e CTA de diagnóstico por KPI.
- **Comando sugerido:** `$impeccable clarify`.

### [P1] Navegação extensa demais para o papel

- **Evidência:** muitos grupos na sidebar — Operação MX, Produto e Metodologia, Plataforma e Governança, Operação comercial e Simulação — além de “Notificações e Age...” truncado.
- **Por que importa:** módulos de baixa frequência competem com o trabalho diário.
- **Correção:** navegação por papel, módulos avançados em níveis secundários, favoritos e atalhos para tarefas recorrentes.
- **Comando sugerido:** `$impeccable layout`.

### [P2] Governança espalhada e duplicada

- **Evidência:** cards de governança, “Carteira de Clientes MX”, “Ações de governança”, “Cadastros pendentes” e “Alertas ativos” aparecem separados.
- **Por que importa:** é necessário cruzar regiões diferentes para entender o mesmo problema.
- **Correção:** unificar em uma fila de exceções com status, responsável, idade do bloqueio e CTA único por item.
- **Comando sugerido:** `$impeccable distill`.

### [P2] Tabela extensa e pouco acionável

- **Evidência:** tabela com 47 lojas, rolagem horizontal, colunas densas e ação repetida.
- **Por que importa:** reduz produtividade na triagem, sobretudo em telas menores.
- **Correção:** agrupar por risco, seleção em lote, coluna da loja fixa, motivo do status e densidade/paginação configurável.
- **Comando sugerido:** `$impeccable adapt`.

## Red flags por persona

**Alex — usuário avançado**

- Não foi observada seleção múltipla, ação em lote, filtros salvos ou atalhos.
- 47 botões `Analisar` impõem custo de clique repetitivo.
- Busca e filtros existem, mas não formam uma fila persistente de trabalho.

**Sam — usuário dependente de acessibilidade**

- A leitura depende fortemente de status cromáticos como `Crítico`, sem legenda observável.
- A tabela densa e horizontal exige esforço adicional em zoom e navegação linear.
- Fluxo completo por teclado, foco visível e anúncio de mudanças não foram testados nesta execução; permanecem riscos de validação, não defeitos confirmados.

**Jordan — primeiro acesso**

- Muitos módulos na sidebar e termos como “Atingimento”, “ritmo ou disciplina crítica”, “Dono Master” e “Não configurada” exigem conhecimento prévio.
- Não há ajuda contextual ou legenda visível no painel inicial.
- Depois de identificar um bloqueio, o próximo passo não é suficientemente explícito.

## Observações menores

- “Período: Mês atual” no cabeçalho e o seletor “Mês” repetem contexto.
- “Ver todos” é genérico; quantidade e destino reduziriam ambiguidade.
- `0 confirmado` e `0` parecem representar estados diferentes sem explicação.
- O truncamento de notificações reduz reconhecimento.
- A repetição de `Crítico` em vermelho não mostra gradação de severidade.
- “Cidade a definir” parece dado incompleto, mas não oferece correção direta.
- A responsividade mobile não foi avaliada nesta crítica.

## Perguntas provocativas

- Se 47 lojas estão críticas, qual é a única decisão que o cockpit deve tornar óbvia nos primeiros 30 segundos?
- “Crítico” representa risco comercial, falha de configuração ou ausência de dados?
- O consultor precisa realmente ver todos os módulos da sidebar ao mesmo tempo?
- O que faria o usuário confiar imediatamente em “1 de 1038 vendas”?
- E se a primeira tela mostrasse “3 decisões para hoje” em vez de 47 linhas equivalentes?
