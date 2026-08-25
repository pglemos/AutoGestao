---
target: "https://mxperformance.vercel.app/lojas/vitrine-tirol"
total_score: 27
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 3
timestamp: 2026-08-25T01-19-56Z
slug: mxperformance-vercel-app-lojas-vitrine-tirol
---
⚠️ DEGRADED: single-context (sub-agents were spawned, but both remained running and were shut down without reports; sequential A/B fallback used)

#### Design Health Score

Surface mode: **Operate** — dashboard autenticado do Admin MX.

| # | Heurística | Score | Achado principal |
|---|---|:---:|---|
| 1 | Visibilidade do status do sistema | **2/4** | Há skeleton, refresh e timestamps, mas “Ainda não atualizado nesta sessão” aparece junto de “Atualizado às 22:10” no acompanhamento diário, sem dizer claramente qual dado cada status representa. |
| 2 | Correspondência com o mundo real | **4/4** | Vocabulário fiel à operação MX: fechamento diário, disciplina, leads, agendamentos, atendimentos, vendas, divergências e diferença entre registrado e declarado. |
| 3 | Controle e liberdade | **3/4** | Troca de unidade, abas, período e refresh são claros; a tabela mobile oferece região focável, mas não há uma alternativa compacta para sair da leitura horizontal. |
| 4 | Consistência e padrões | **3/4** | Tokens, verde MX, Inter, ícones e controles formam um sistema coeso. A semântica de atualização e a duplicação de ações de atualizar quebram um pouco a previsibilidade. |
| 5 | Prevenção de erros | **3/4** | Divergências são destacadas com texto (“Revisar diferenças”), há estados de loading/erro/retry e o filtro de período usa controles nativos. |
| 6 | Reconhecimento em vez de memorização | **3/4** | Títulos, rótulos de tabela, aria-labels e CTAs são bons; o seletor longo de lojas e a tabela larga impõem descoberta por rolagem. |
| 7 | Flexibilidade e eficiência | **2/4** | Há seletor de unidade e intervalo manual, mas não há busca/favoritos para dezenas de lojas nem busca, ordenação ou visão resumida para a tabela de vendedores. |
| 8 | Design estético e minimalista | **2/4** | A composição é limpa isoladamente, porém o dashboard vira uma sequência longa de cards brancos arredondados; no mobile os quatro KPIs empilham e atrasam a ação. |
| 9 | Reconhecer, diagnosticar e recuperar erros | **3/4** | O painel prevê erro de carga com mensagem e “Tentar novamente”; a divergência tem linguagem acionável. Falta uma recuperação mais direta para dados aparentemente desatualizados. |
| 10 | Ajuda e documentação | **2/4** | Há microcopy útil (“O declarado aparece abaixo...”), mas não há ajuda contextual no painel de acompanhamento explicando o próximo passo de uma divergência ou de um fechamento pendente. |
| **Total** |  | **27/40** | **Acceptable — melhorias significativas necessárias para uma operação mais rápida.** |

#### Design Specificity Verdict

**Avaliação de design:** a superfície é claramente feita para a MX, não é uma vitrine genérica de analytics. “Acompanhamento diário da equipe”, disciplina, fechamento e conciliação entre dado real e declarado carregam a metodologia do produto. Os dados reais observados da VITRINE – TIROL — 6 vendedores, 5 fechamentos pendentes, 1 divergência, 10 vendas no período e meta 35 — dão credibilidade imediata.

O ponto fraco é a expressão visual dessa especificidade. A estrutura ainda poderia ser trocada por qualquer dashboard SaaS de operações: header, filtros, cards, tabela, alertas, funil e ranking. O próximo salto não é colocar mais decoração; é fazer a composição declarar com mais força o que o Admin precisa resolver agora.

**Detector determinístico + evidência visual:** como o alvo é uma URL, o detect.mjs de CLI foi corretamente pulado. O detector de navegador encontrou **17 grupos de sinais no desktop 1440×900** e **19 grupos no mobile 390×844**. Os sinais mais frequentes foram nested-cards, layout-transition, clipped-overflow-container, cramped-padding, line-length e overused-font.

Há falsos positivos importantes:

- overused-font é esperado: Inter é a família aprovada nos tokens do MX.
- layout-transition no sidebar/main corresponde à animação estrutural de colapso do shell.
- clipped-overflow-container no shell e na tabela decorre, em parte, do scroll interno intencional.
- Alguns sinais de padding e line length apontam para wrappers off-screen ou textos de tabela, não para uma quebra visível isolada.

Os sinais que merecem atenção humana são a repetição de cards dentro de seções e a ausência de uma composição mobile alternativa para a tabela.

#### Overall Impression

É uma tela operacional sólida, legível e visualmente coerente. O Admin entende rapidamente qual unidade está selecionada e encontra as áreas importantes. O maior problema é de priorização: o que precisa de ação hoje — **5 pendências e 1 divergência** — fica depois de filtros, administração da loja e quatro cards de resumo no mobile. Além disso, dois relógios de atualização contam histórias diferentes.

#### What's Working

1. **Especificidade operacional real.** A diferença entre “registrado no sistema” e “informado pelo vendedor”, junto de “Revisar diferenças”, transforma métrica em decisão gerencial.
2. **Sistema visual consistente.** O verde MX, superfícies neutras, ritmo de 4px, Inter e controles arredondados são aplicados de forma coesa; há um único h1 e bons nomes acessíveis nos controles principais.
3. **Boa base de resiliência.** O painel tem skeleton, estados de erro/retry, refresh, região de tabela nomeada e nenhum overflow horizontal no documento; o overflow de 1120px está contido na região da tabela.

#### Priority Issues

- **[P1] Dois status de atualização sem escopo claro**

  **Por que importa:** no mesmo estado aparecem “Última atualização: Ainda não atualizado nesta sessão” no cabeçalho e “Atualizado às 22:10” no acompanhamento diário. O operador não sabe se deve confiar nos dados nem qual botão “Atualizar” atualiza qual conjunto.

  **Fix:** nomear o escopo diretamente — “Performance: ainda não atualizada” e “Acompanhamento diário: atualizado às 22:10” — ou consolidar os dois em um único bloco de sincronização com substatus. Atualizar o status imediatamente após cada fetch e anunciar mudanças com aria-live.

  **Suggested command:** $impeccable clarify

- **[P1] Ação gerencial escondida atrás de uma longa primeira passagem mobile**

  **Por que importa:** em 390×844, o header fixo ocupa 72px, o conteúdo opera em um scroll interno de 8.503px, os quatro KPIs ficam em uma coluna e a tabela só começa depois de filtros, administração e cards de resumo. Casey precisa rolar muito antes de chegar às pendências e divergências que justificam a visita à tela.

  **Fix:** trazer um resumo de ação para o primeiro fold — “5 pendentes · 1 divergência” —, transformar os KPIs em grade 2×2 no mobile e reduzir a altura dos filtros. As ações “Abrir metas”, “Ver ranking” e “Ver equipe” devem aparecer como atalhos junto do resumo, não só depois de toda a preparação.

  **Suggested command:** $impeccable layout + $impeccable adapt

- **[P1] Tabela de vendedores continua desktop no mobile**

  **Por que importa:** a região tem largura interna de **1120px** dentro de uma viewport de **356px**. O usuário vê vendedor/fechamento/leads e precisa descobrir um gesto horizontal para alcançar agendamentos, atendimentos, vendas, conferência e última atividade. O aria-label informa a rolagem, mas não existe uma pista visual equivalente nem uma leitura por linha.

  **Fix:** manter a tabela completa no desktop, mas no mobile trocar cada linha por card/accordion com os campos prioritários e “Ver conciliação”; alternativamente, congelar vendedor + fechamento, incluir um gradiente/seta de “deslize para conferir” e reduzir as colunas secundárias.

  **Suggested command:** $impeccable adapt

- **[P2] Hierarquia achatada pela repetição de cards**

  **Por que importa:** o detector encontrou 13 grupos de nested-cards no mobile. Visualmente, KPIs, alertas, tabela e funil usam a mesma linguagem de contêiner branco + borda + radius; cada seção parece igualmente importante e a página passa a sensação de “pilha de caixas”.

  **Fix:** reservar cards elevados para resumo e alertas; usar bandas de seção, divisores e grids mais planos para tabelas e indicadores. O bloco “Pontos de atenção” pode ser o único painel com tratamento forte, já que é onde a decisão acontece.

  **Suggested command:** $impeccable distill + $impeccable layout

- **[P2] Seletor de unidade eficiente para poucas lojas, lento para a rede inteira**

  **Por que importa:** “Selecionar unidade” é um select nativo com dezenas de lojas. No trabalho diário, o Admin precisa reconhecer ou rolar a lista até VITRINE – TIROL; não há busca, recentes ou favoritos.

  **Fix:** usar combobox pesquisável com nome + identificador da loja, últimas unidades acessadas e opção de fixar unidades frequentes. Preserve fallback nativo e teclado.

  **Suggested command:** $impeccable optimize

#### Cognitive Load Assessment

**3 falhas de 8 — carga moderada:**

- **Single focus:** falha; o primeiro percurso mistura seleção de loja, período, administração, acompanhamento diário e performance antes de explicitar a ação mais urgente.
- **Visual hierarchy:** falha; o número de pendências/divergências não domina a entrada da tela.
- **Progressive disclosure:** falha; funil, ranking, alertas e indicadores são renderizados na mesma passagem longa, mesmo quando o Admin só precisa resolver uma divergência.

Chunking, grouping, minimal choices e working memory estão razoavelmente controlados dentro de cada bloco; os grupos são compreensíveis e as decisões locais têm poucas opções.

#### Emotional Journey

- **Entrada:** transmite confiança — o perfil “Admin geral”, a unidade selecionada e os dados reais aparecem imediatamente.
- **Vale:** a atualização conflitante cria dúvida justamente em uma tela de governança de dados.
- **Pico:** “Revisar diferenças” e os cards de “Pontos de atenção” convertem números em ações concretas.
- **Final:** a página continua em funil/ranking sem uma sensação de fechamento (“o que foi resolvido” ou “qual é o próximo ritual”), então a atenção se dispersa.

#### Persona Red Flags

**Alex (Power User / Admin MX):**

- Precisa navegar um select longo para trocar de loja; não há busca, favoritos ou “recentes”.
- A tabela de 8 colunas não oferece busca, ordenação ou ação em lote.
- Os dois botões “Atualizar” e os dois relógios exigem interpretar qual camada está sendo atualizada.
- A página privilegia o percurso vertical completo em vez de um comando rápido para as 5 pendências e 1 divergência.

**Sam (usuário dependente de acessibilidade):**

- A base é boa: h1 único, labels para datas e unidade, tabs nomeadas e região da tabela com nome acessível.
- No mobile, a informação crítica está em uma tabela de 1120px; quem usa teclado/leitor de tela pode acessar a região, mas a experiência exige atravessar muitos campos repetidos antes de encontrar “Revisar diferenças”.
- Os status têm texto (“Não iniciado”, “Revisar diferenças”, “Aguardando fechamento”), então não dependem só de cor — um ponto positivo.

**Casey (usuário mobile interrompido):**

- O header fixo e o scroll interno preservam a navegação, mas o primeiro fold termina ainda dentro do filtro de período.
- Os KPIs empilhados ocupam muita altura e deixam “pendentes” e “divergências” longe do polegar.
- Para conferir a equipe, Casey precisa executar uma segunda rolagem horizontal dentro da rolagem vertical; não há card resumido por vendedor.

#### Minor Observations

- Os controles principais medidos no mobile têm 40px de altura (tabs, select, datas e refresh); 44px daria uma margem de toque melhor para o contexto de loja.
- A mensagem “Fechamento, atividade comercial e comparação entre o registrado no sistema e o informado pelo vendedor” chega a aproximadamente 95 caracteres em uma linha no desktop; pode ser reduzida sem perder precisão.
- O texto “Ver metas” no filtro é acionável, mas parece aplicar o período; “Ir para metas” ou “Abrir metas da unidade” comunica melhor a navegação.
- O painel de acompanhamento tem 6 vendedores reais, mas cinco repetem “aguardando fechamento” em quatro métricas; uma linha resumida por vendedor poderia reduzir ruído.
- O detector marcou Inter e nesting, mas ambos devem ser tratados contra o contexto aprovado do Design System, não como defeitos automáticos.

#### Questions to Consider

1. **Qual é o objetivo dominante desta tela para o Admin MX?** Resolver pendências/divergências primeiro, ou explorar performance completa?
2. **No mobile, a paridade total da tabela é obrigatória?** Ou uma visão de exceções por vendedor atende melhor, deixando a tabela completa para desktop?
3. **O status de sincronização deve ser único e global ou separado por domínio?** A resposta define se devemos consolidar os dois “Atualizar” ou apenas tornar o escopo explícito.
