---
target: "localhost:3457/pdi"
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-26T16-08-48Z
slug: src-pages-gerentepdi-tsx
---
⚠️ DEGRADED: single-context (Assessment A sub-agent timed out twice; fallback source review; Assessment B completed independently)

Alvo: rota /pdi em http://localhost:3457/pdi, resolvida para src/pages/GerentePDI.tsx.

Limite de confiança: a rota protegida não abriu a superfície PDI nesta sessão. O navegador chegou à tela de login e exibiu quatro avisos de ProtectedRoute por ausência de perfil. Portanto, nenhum comportamento visual ou estado autenticado do PDI é afirmado como observado; os pontos abaixo são separados entre evidência direta e risco inferido da implementação.

## Design Health Score

| # | Heurística | Score | Principal questão |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 2/4 | Há skeleton, spinner e toasts, mas não há evidência de erro/estado de dados da rota; validações ficam fora do campo. |
| 2 | Correspondência com o mundo real | 3/4 | PDI, metas, competências, revisão mensal e protocolo de 45 minutos são específicos da operação MX; bundle/gap ainda exigem tradução. |
| 3 | Controle e liberdade do usuário | 2/4 | Cancelar/voltar/fechar existem, mas não há rascunho, desfazer ou recuperação após fechar a sessão. |
| 4 | Consistência e padrões | 2/4 | Átomos compartilhados ajudam, mas a página mistura ações duplicadas, ícones sem texto visível e estilos locais ad hoc. |
| 5 | Prevenção de erros | 3/4 | Regras fortes para 3 metas por horizonte, 5 ações, lacunas, datas e checklists; a prevenção acontece tarde, ao avançar. |
| 6 | Reconhecimento em vez de lembrança | 2/4 | Barra de etapas, labels e ações sugeridas ajudam; cards e controles repetidos não carregam contexto suficiente. |
| 7 | Flexibilidade e eficiência | 2/4 | Busca e atualização existem, mas não há lote, atalhos, favoritos ou edição rápida. |
| 8 | Design estético e minimalista | 2/4 | A identidade MX aparece, porém a sessão concentra muita densidade operacional e ações repetidas. |
| 9 | Reconhecimento, diagnóstico e recuperação de erros | 2/4 | Mensagens nomeiam a regra, mas toasts não apontam o campo inválido nem garantem foco/retomada. |
| 10 | Ajuda e documentação | 1/4 | Protocolo e frase contextual são bons sinais, mas não há ajuda contextual para escala, lacuna e fluxo de revisão. |
| **Total** |  | **21/40** | **Aceitável (52,5%), provisório e não equivalente a uma inspeção autenticada** |

## Design Specificity Verdict

### Avaliação de design

O esqueleto é claramente MX-específico, não um CRUD genérico: Sessão PDI MX 360º, protocolo individual de 45 minutos, metas em 6/12/24 meses, mapeamento de competências, cinco ações e revisão mensal. Isso cria uma narrativa de método e autoridade para a operação.

O risco é a especificidade ficar escondida dentro de uma grade genérica de cards e de um wizard longo. O card da lista não parece responder rapidamente quem precisa de cobrança; a sessão exige muitas decisões antes de qualquer persistência; e parte do vocabulário pressupõe que o gerente já conheça a metodologia. A validade visual destas observações é limitada porque a autenticação não permitiu abrir /pdi.

### Varredura determinística

O detector de fonte executado em src/pages/GerentePDI.tsx terminou com exit 0 e resultado [], portanto não encontrou anti-patterns determinísticos nesse markup.

A visualização do navegador encontrou somente a tela de login após o redirecionamento: dois grupos de overlay, com regras como wide-tracking no texto auxiliar e um agrupamento de recomendações sobre flat-type-hierarchy, gradient-text, bounce-easing, layout-transition, pulsing-dot, dark-glow e codex-grid-background. Esses achados são falsos positivos para esta crítica do PDI: pertencem ao login, não à superfície GerentePDI. O overlay foi injetado e confirmado no DOM, mas não ficou disponível em uma aba [Human] visível ao usuário.

## Impressão geral

A implementação promete um ritual de desenvolvimento consistente, mas hoje a lista parece otimizada para abrir documentos, não para tomar decisão de gestão. A maior oportunidade é transformar cada card em um resumo de cobrança — progresso, próxima revisão, lacunas e ação pendente — e tornar a sessão retomável. Antes de qualquer conclusão visual, é necessário repetir a rodada com um perfil autenticado.

## O que está funcionando

- A lógica de escopo por papel é explícita: gerente recebe a mensagem da unidade, dono recebe uma visão executiva, e a criação é protegida por capability. Isso reduz o risco de mostrar ações indevidas.
- O wizard traduz o ritual em etapas com intenção clara: preparação, metas, mapeamento e plano de ação. As validações de domínio são melhores que um formulário livre e ajudam a manter o PDI executável.
- Existem estados de carregamento, vazio, sucesso/erro e controles com labels ARIA para busca, atualização, impressão, edição, abertura, selects e ranges. A base de acessibilidade está presente, embora ainda precise de contexto por instância.

## Priority Issues

### [P1] O card não responde à pergunta de gestão

**Por que importa:** em poucos segundos, o gerente precisa saber quem está atrasado, qual a próxima cobrança e qual lacuna é prioritária. O card renderiza nome, status, data e somente o Objetivo 06 Meses; metas de 12/24 meses, progresso, última revisão e ações pendentes só aparecem após abrir outro destino.

**Evidência:** src/pages/GerentePDI.tsx:161-219.

**Correção:** adicionar uma linha compacta de progresso, próxima revisão, ações concluídas/total e maior lacuna; usar Abrir PDI como única ação primária. Manter imprimir/editar em menu secundário e tornar o card inteiro navegável com uma única semântica.

**Suggested command:** $impeccable layout

### [P1] A sessão é longa e não é retomável

**Por que importa:** nove metas, competências, cinco ações, datas, impacto, custo e checklists transformam uma conversa interrompida em perda potencial de trabalho. O vendedor/gerente opera entre atendimentos; fechar o modal encerra o estado local sem um rascunho persistido.

**Evidência:** src/features/pdi/WizardPDI.tsx:39-56, 343-372, 374-547, 588-595. A persistência só ocorre em saveSessionBundle no submit; a perda ao fechar é uma inferência direta do estado mantido no componente.

**Correção:** dividir Metas e Plano de Ação em subetapas menores, mostrar contagem de conclusão por etapa, salvar rascunho automaticamente e oferecer Retomar PDI. Manter o rodapé sticky, que é uma boa base para mobile.

**Suggested command:** $impeccable distill

### [P1] Validação crítica fica distante do campo

**Por que importa:** validateMetas, validateMapeamento e validateAcoes retornam toast.error com a regra, mas não marcam o campo, não apontam o primeiro erro nem comunicam uma mensagem contextual junto ao controle. Em um formulário repetitivo, o usuário precisa descobrir qual das nove metas ou cinco ações está incompleta.

**Evidência:** src/features/pdi/WizardPDI.tsx:110-207.

**Correção:** renderizar erro inline por grupo/linha, adicionar aria-describedby e aria-invalid, focar o primeiro campo inválido e preservar a posição/rascunho após a falha. Use o toast apenas como resumo, não como único canal.

**Suggested command:** $impeccable harden

### [P2] Ações e vocabulário competem com a clareza

**Por que importa:** cada card oferece imprimir, editar e abrir, sendo que imprimir e abrir levam ao mesmo destino; no wizard aparecem termos como bundle, gap, Escala Ativa, Vincular Competência (Lacuna) e Compromisso simbólico sem explicação curta. Ícones com aria-label ajudam leitores de tela, mas continuam silenciosos visualmente para quem está aprendendo.

**Evidência:** src/pages/GerentePDI.tsx:207-218; src/features/pdi/WizardPDI.tsx:256-285, 495-577; src/pages/PDIPrint.tsx:213.

**Correção:** escolher linguagem de tarefa: Abrir PDI, Imprimir PDF, Editar plano. Expor uma definição de uma linha para lacuna e escala na etapa em que são usadas; agrupar a ação secundária em menu e remover redundância.

**Suggested command:** $impeccable clarify

## Persona Red Flags

### Alex — usuário avançado

- Não há atalhos de teclado, lote ou atualização rápida; cada pessoa depende de abrir um PDI individualmente.
- A lista oferece vários ícones por card e leva o usuário ao documento para consultar o contexto que deveria estar no resumo.
- O wizard exige quatro etapas e cinco ações detalhadas sem rascunho/retomada, o que aumenta abandono quando a conversa é interrompida.

### Sam — usuário dependente de acessibilidade

- Os cinco ranges de competência repetem aria-label="Nível da competência", sem nome da competência no próprio label; para um leitor de tela, controles equivalentes ficam ambíguos.
- Inputs repetidos usam labels genéricos como Descrição da meta, Competência, Impacto e Custo, sem contexto de horizonte/índice no nome acessível.
- Os selects e textareas do wizard usam outline-none e focam sobretudo por mudança de borda; é necessário verificar indicador de foco visível e anúncio de erro em uma rodada autenticada.

### Casey — usuário móvel e distraído

- O fluxo depende de muitas textareas e seleções manuais; não há sinal de autosave ou retomada se o usuário trocar de aplicativo.
- A ação de criação começa no topo do header e a sessão é extensa; o rodapé sticky ajuda, mas não reduz a carga de cinco ações mais checklists.
- Não há uma alternativa curta baseada em escolhas para substituir toda a digitação de metas e ações.

## Observações menores

- Há classes utilitárias com aparência de typo que podem não produzir estilo: line-clamp-2er em GerentePDI.tsx:194, mb-4er em GerentePDI.tsx:231 e border-b /10 em WizardPDI.tsx:347.
- A busca não tem ação explícita de limpar e não informa contagem de resultados/filtros ativos.
- O estado vazio usa Matriz de Evolução Limpa, uma frase criativa mas ambígua; Nenhum PDI encontrado para este filtro seria mais imediato, seguido de uma ação de criar ou limpar filtro.
- Os resultados de layout sem overflow foram observados apenas na tela de login em 1280×720 e 390×844; não são prova de que o modal PDI esteja correto nesses breakpoints.

## Questions to Consider

- O card de PDI consegue responder em cinco segundos quem precisa de cobrança sem abrir o PDF?
- Nove campos de meta devem aparecer na mesma decisão, ou 6/12/24 meses deveriam ser revelados progressivamente?
- Quando o gerente fecha por acidente, o produto deve perder o trabalho ou oferecer um rascunho retomável?
