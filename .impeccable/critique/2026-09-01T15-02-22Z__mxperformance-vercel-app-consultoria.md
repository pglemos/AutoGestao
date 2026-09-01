---
target: "https://mxperformance.vercel.app/consultoria"
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-01T15-02-22Z
slug: mxperformance-vercel-app-consultoria
---
⚠️ DEGRADED: single-context (spawn_agent unavailable in this session)

# Crítica Impeccable — /consultoria

Modo: Operate. Revisão manual autenticada no Chrome real como SynVolt / Admin geral, em 1440×900 e 390×844.

## Design Health Score — 24/40 (Acceptable)

| # | Heurística | Nota | Problema-chave |
|---|---|---:|---|
| 1 | Visibilidade do estado | 3 | Contagens, atualização, loading e erro são claros; o conflito status/data só aparece ao abrir o encontro. |
| 2 | Match com o mundo real | 2 | “Encontro”, consultor e modalidade fazem sentido, mas os cards misturam status com modalidade e “Atrasado” compete com a data efetiva. |
| 3 | Controle e liberdade | 3 | Busca, quatro filtros, limpar filtros, fechamento por Escape e ações contextuais; falta correção/batch direto na fila. |
| 4 | Consistência e padrões | 2 | Primitivos visuais são coerentes, mas “Consultoria”/“Consultoria MX” e a hierarquia h1→h3 criam ruído. |
| 5 | Prevenção de erros | 2 | O banner alerta o conflito, porém não oferece reconciliação e o selo calculado mascara o status persistido. |
| 6 | Reconhecimento em vez de lembrança | 3 | Cada linha traz cliente, encontro, objetivo, consultor, modalidade e agenda; objetivos longos prejudicam a leitura rápida. |
| 7 | Flexibilidade e eficiência | 2 | Há filtros e ordenação, mas 376 itens ficam numa fila plana, sem views salvas, lote ou agrupamento operacional. |
| 8 | Estética e minimalismo | 3 | Desktop limpo e bem espaçado; no mobile, resumo, filtros e toolbar consomem a primeira dobra. |
| 9 | Recuperação de erro | 2 | Retry e erro de ação existem; não há caminho de recuperação para status/data conflitantes. |
| 10 | Ajuda e documentação | 2 | “Próxima ação” ajuda, mas não define precedência de status, cálculo de atraso ou significado das métricas. |
| **Total** |  | **24/40** | **Acceptable — melhorias significativas antes de a operação ficar confortável.** |

## Design Specificity Verdict

Parcialmente autoral — 6/10. O shell MX, os tokens semânticos, o vocabulário de consultoria e a separação Operação/Metodologia dão identidade. Porém a composição central — cards de KPI, filtros, lista plana e modal — poderia ser reutilizada quase sem mudanças em um CRM administrativo genérico. O maior espaço de autoria está em transformar a metodologia MX numa fila de decisão, não apenas numa listagem.

O detector registrou 33 anti-patterns no console. O detalhamento foi dominado por 28 ocorrências de `line-length` nos objetivos, além de `overused-font` (Inter em 100% do texto), `skipped-heading` (h1 “Consultoria” seguido por h3 “Agendados”) e transições de propriedades de layout. `cramped-padding`/`clipped-overflow` pertencem ao shell fixo; `text-occlusion` foi gerado pela própria camada de detector; `nested-cards` no mobile corresponde ao disclosure responsivo. Esses achados foram tratados como falsos positivos ou exceções intencionais, não como backlog.

## Overall Impression

A tela transmite controle e confiança visual no desktop, mas a primeira resposta operacional é ruim: o usuário vê uma fila de 376 encontros, sendo 340 “atrasados”, sem uma divisão clara entre hoje, próximos, backlog e conflitos de dados. A maior oportunidade é converter a tela em um cockpit de triagem: primeiro o que exige decisão, depois o histórico.

## What's Working

- Hierarquia visual limpa: título, métricas, filtros e lista seguem o mesmo sistema MX, com bom uso de espaço e estados semânticos.
- A linha é rica sem depender de hover, e os controles têm nomes acessíveis, skip link, foco visível e alvos de toque adequados.
- O modal contextualiza o encontro e explicita o conflito “data efetiva registrada” versus status “Agendado”, além de indicar uma próxima ação concreta.

## Priority Issues

### [P1] A fila comunica backlog, não prioridade operacional

**Por que importa:** a tela mostra 357 agendados, 15 concluídos, 232 presenciais e 0 não iniciados — dimensões que não formam um funil reconciliável — junto de 340 atrasados. O primeiro registro observado tem agenda em 05/01/2026, data efetiva em 30/04/2026 e status persistido “Agendado”; o selo “Atrasado” só revela a regra calculada. Isso força o Admin a interpretar inconsistências antes de agir e ameaça o princípio “Dados que não mentem”.

**Correção:** definir a precedência canônica entre status, data efetiva e atraso; separar “Atrasados para revisar”, “Hoje”, “Próximos 7 dias”, “Concluídos” e “Cancelados”; mostrar status persistido e estado operacional quando divergirem; oferecer “Revisar status” na própria fila. Reconsiderar os cards para que status e modalidade não pareçam a mesma série.

**Suggested command:** `$impeccable clarify`

### [P1] A ação primária está escondida depois de abrir o encontro

**Por que importa:** no mobile 390×844, o modal ocupa 342 px de largura e a área rolável interna tem 729 px para 954 px de conteúdo; “Executar encontro” começa abaixo da viewport. O usuário precisa abrir, ler, rolar e só então executar — exatamente o fluxo de maior valor para um consultor em campo.

**Correção:** colocar “Executar encontro” como CTA inline na linha ou em footer sticky do modal mobile; manter Visão 360 e planos como secundários; preservar contexto e conflito no cabeçalho.

**Suggested command:** `$impeccable layout`

### [P2] 376 encontros formam uma lista plana e textual demais

**Por que importa:** a fila alcança dezenas de milhares de pixels e 28 objetivos excedem a largura de leitura recomendada. O padrão de prioridade deixa os primeiros itens parecidos e exige muito scroll para localizar um cliente ou dia.

**Correção:** agrupar por urgência/data e, dentro do grupo, por cliente; limitar objetivo a duas linhas com “Ver objetivo”; exibir progresso/entregáveis como sinal compacto; considerar paginação ou virtualização para a fila completa.

**Suggested command:** `$impeccable distill`

### [P2] Filtros e busca truncam no viewport de 390 px

**Por que importa:** o placeholder termina em “ou c” e rótulos como “Todas as modalidades” são cortados. O controle continua semanticamente nomeado, mas a leitura visual perde confiança e o usuário não sabe exatamente o valor atual sem abrir o select.

**Correção:** usar labels curtos visíveis (“Período”, “Status”, “Modalidade”, “Ordenar”) com valor selecionado separado; encurtar o placeholder; manter uma barra de filtros recolhível/sticky quando a lista rolar.

**Suggested command:** `$impeccable adapt`

### [P2] Arquitetura de informação e semântica ainda se confundem

**Por que importa:** a navegação apresenta “Consultoria” e “Consultoria MX”, enquanto a própria rota alterna Operação e Metodologia; na aba Metodologia, o conteúdo vira “Administração MX / Consultoria MX” com novas subabas. O detector também confirmou h1 seguido de h3, sem h2, reduzindo a previsibilidade estrutural.

**Correção:** nomear explicitamente “Operação da consultoria” e “Configuração da metodologia” (ou estabelecer uma única hierarquia); alinhar sidebar, título, breadcrumbs/tabs e níveis h1/h2/h3.

**Suggested command:** `$impeccable clarify`

## Cognitive Load

5 de 8 itens falham: foco único, chunking, grouping, hierarquia visual e “uma decisão por vez”. A carga é alta: o Admin precisa interpretar quatro métricas de naturezas diferentes, filtrar/ordenar uma fila de 376 itens e abrir um modal com quatro ações. Working memory é parcialmente preservada pelo contexto completo no modal; progressive disclosure funciona em “Resumo da operação” e “Mais ações”, mas chega tarde para a decisão principal.

## Emotional Journey

Entrada calma e profissional; o shell e as métricas passam controle. O vale emocional vem do alerta vermelho “340 atrasados para revisar”, sem um primeiro passo claro. O modal recupera confiança ao explicar o conflito e a próxima ação, mas no celular a CTA fica fora da primeira viewport. O final do fluxo sai da tela para outra rota, sem uma confirmação de conclusão observável nesta superfície.

## Persona Red Flags

**Alex (Power User):** consegue usar teclado e Escape, mas não consegue tratar vários atrasados em lote nem salvar uma view “Hoje/Conflitos”. O caminho recorrente é linha → modal → rolagem → ação, acima do que uma fila de auditoria deveria exigir.

**Sam (Accessibility-Dependent):** labels ARIA, foco e skip link são bons; a quebra h1→h3 ainda prejudica navegação por headings. O sentido de “Atrasado” depende de cor e posição antes de o conflito textual aparecer, e os objetivos longos aumentam o esforço de leitura/zoom.

**Casey (Distracted Mobile User):** não vê o primeiro encontro na primeira dobra; busca e selects truncam; a CTA “Executar encontro” fica abaixo do viewport dentro do modal. O fluxo não está na zona natural do polegar.

## Minor Observations

- “Data efetiva registrada” aparece na linha sem a data efetiva; o usuário só descobre 30/04/2026 no modal.
- “Exibindo 376 de 376” e “340 atrasados” ficam na mesma linha de metadados, em vez de formar uma fila/ação claramente relacionada.
- A aba Metodologia tem ações “Configurar Produto” e “Mais ações” antes do conteúdo; a hierarquia entre configurar, revisar e publicar poderia ser mais explícita.
- A tipografia Inter é consistente, mas não cria uma assinatura visual própria para um produto baseado em metodologia de campo.

## Questions to Consider

1. A primeira tela deve ser “Hoje/Próximos 7 dias”, deixando o backlog atrasado como uma fila secundária, ou o Admin realmente precisa abrir em “Todos”?
2. Uma data efetiva deve fechar automaticamente o encontro, exigir revisão explícita ou bloquear nova execução até a reconciliação?
3. “Consultoria” deve significar operação e “Consultoria MX” configuração, ou a plataforma deve expor uma única identidade de módulo?
