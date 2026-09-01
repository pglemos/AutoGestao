---
target: "https://mxperformance.vercel.app/clientes?tab=governanca"
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-09-01T14-52-31Z
slug: mxperformance-vercel-app-clientes
---
# Critique Impeccable — Clientes / Governança

## Veredito de especificidade

Média (3/5). A nomenclatura é própria da MX — “Consultor MX”, “Bloqueios de Ativação”, “Governança” —, mas a solução visual ainda é intercambiável com um SaaS administrativo: sidebar, KPIs, abas e tabela. A metodologia MX (PPA, PMR, funil 20/60/33, rituais e benchmarks) não aparece na decisão operacional da tela.

## Design Health Score

| # | Heurística | Score | Principal achado |
|---|---|---:|---|
| 1 | Visibilidade do estado | 2/4 | Contadores e aba ativa existem, mas faltam última atualização e feedback observável das ações. |
| 2 | Correspondência com o mundo real | 3/4 | Vocabulário operacional é adequado, porém há termos e motivos pouco explicados. |
| 3 | Controle e liberdade | 2/4 | Há navegação, filtros por cartões e menus, mas sem desfazer/limpar estado de forma robusta. |
| 4 | Consistência e padrões | 3/4 | Base visual coesa; diagnósticos e estados têm apresentação desigual. |
| 5 | Prevenção de erros | 2/4 | Bloqueios aparecem, mas pré-condições de Reativar e Atribuir Consultor não ficam claras na linha. |
| 6 | Reconhecimento em vez de lembrança | 3/4 | Rótulos e cabeçalhos são reconhecíveis; faltam definições, busca e ordenação. |
| 7 | Flexibilidade e eficiência | 2/4 | Sem busca, ordenação, ações em massa ou atalhos evidentes. |
| 8 | Estética e minimalismo | 3/4 | Desktop limpo; mobile acumula cartões e tabela horizontal extensa. |
| 9 | Diagnóstico e recuperação de erros | 2/4 | Existem CTAs corretivos, mas não há recuperação ou explicação contextual suficiente. |
| 10 | Ajuda e documentação | 1/4 | Não há ajuda contextual para governança, módulos ou critérios de bloqueio. |
| **Total** |  | **23/40** | **Aceitável — melhorias significativas necessárias.** |

## Evidência determinística e visual

A rota carregou em Chrome real, já autenticada como Admin geral, sem inserir credenciais. Em 1440x900 foram observados 44 clientes, 34 na aba Governança, 11 unidades na fila e 11 linhas renderizadas. Não houve erro ou warning de console no recorte.

O detector visual para URL não roda via detect.mjs; a regra exige o caminho de navegador. A injeção por tag foi confirmada, mas o script inline não inicializou. O fallback via CDP encontrou 21 anti-patterns, com 12 overlays calculados como visíveis no DOM:

- fonte Inter em 100% do texto;
- texto com gradiente;
- animação de propriedade de layout (transition: height);
- padding apertado;
- elemento posicionado recortado por container com overflow;
- texto funcional subdimensionado.

Inter e gradiente podem ser decisões intencionais; o recorte do elemento pode ser consequência da tabela horizontal. O detector reforça, porém, a densidade mobile e os controles desktop de 36 px. Não há overlay confirmado na aba/painel [Human], portanto não alego que esses destaques estejam visíveis para você.

## Impressão geral

A tela passa sensação de ordem no desktop, mas entrega uma lista de alertas, não ainda um cockpit de governança. O maior ganho seria transformar os números e diagnósticos em uma fila explicável de prioridade, responsável, idade e próxima ação — com contexto MX — e preservar esse contexto no mobile.

## O que funciona

- Taxonomia inicial clara: Sem Consultor MX, Bloqueios de Ativação, Renovações Próximas e Clientes Suspensos.
- Composição desktop legível: cabeçalho, aba ativa, cartões e tabela têm boa separação visual.
- Os cartões são filtros reais: ao selecionar Sem Consultor MX, a fila muda para 6 unidades e aparece Ver todas as pendências.
- Há boa base semântica: main, nav, tablist, tabpanel, cabeçalhos de tabela, skip link e nomes acessíveis nos menus.
- Não houve overflow horizontal no documento raiz; os alvos móveis medidos têm 44 px de altura.

## Problemas prioritários

### [P1] A aba selecionada desaparece no mobile

Em 390x844, a tablist tem 358 px visíveis e 702 px de conteúdo. Governança (34) está selecionada no DOM, mas começa aproximadamente em x=532; na primeira janela só aparecem Carteira 360 e Cadastro e status.

Isso quebra o contexto: a pessoa abriu Governança, mas não vê a aba que confirma onde está.

Correção: rolar automaticamente a aba ativa para a viewport na entrada, ou trocar o conjunto por um seletor compacto em mobile que sempre mostre Governança.

### [P1] A fila não é priorizável

11 unidade(s) requerem atenção não informa severidade, idade do problema, responsável, impacto ou próximo passo. Os quatro cartões têm peso visual semelhante, embora um bloqueio de ativação e uma suspensão não tenham necessariamente a mesma urgência.

Correção: ordenar por severidade/risco e exibir prioridade, responsável, idade, última atividade, próxima ação e prazo. Permitir filtrar pela fila prioritária, não apenas por categoria.

### [P1] As contagens não explicam sua relação

A tela apresenta 44 clientes, Governança (34), 11 unidades e cartões 6/2/0/5. Os cartões somam 13 ocorrências, enquanto a fila mostra 11 unidades — sinal de sobreposição, mas isso não é explicado. Cidade não informada, CNPJ não informado e sem módulos liberados também aparecem misturados a problemas de ciclo de vida.

Correção: distinguir explicitamente clientes únicos de ocorrências por categoria; adicionar uma definição curta para cada contador; separar qualidade cadastral, bloqueio de ativação e suspensão. Não tratar ausência cadastral como bloqueio real sem deixar a regra explícita.

### [P1] Ação corretiva sem guardrail visível

Reativar e Atribuir Consultor ficam inline, mas a primeira pode alterar estado imediatamente e a segunda leva a outra aba. A linha não mostra pré-condição, impacto, estado de processamento ou resultado. Ações não foram executadas nesta crítica para não alterar dados.

Correção: mostrar pré-condições junto ao CTA, confirmar reativação, desabilitar durante processamento, atualizar contador/fila após sucesso e fornecer confirmação clara com caminho de recuperação. Subir os controles desktop de 36 px para pelo menos 44 px quando forem ações prioritárias.

### [P2] Tabela mobile exige duas rolagens e perde contexto

A região da tabela mede 324 px, mas o conteúdo mede 1043 px. Diagnóstico e Ação Corretiva ficam muito distantes; após arrastar horizontalmente, a identidade do cliente deixa de acompanhar a decisão. Não há uma indicação forte de que existe conteúdo lateral.

Correção: usar uma lista/card responsiva com diagnóstico principal e CTA no mesmo bloco; como alternativa, fixar a primeira coluna, manter cabeçalho/cliente sticky e exibir uma dica visual de rolagem. Reduzir motivos longos a causa + impacto, deixando detalhes em expansão.

## Carga cognitiva

5 de 8 falhas — carga alta.

- Falha: foco único; ações globais competem com a auditoria.
- Falha: chunking; badges, estados e motivos longos se misturam.
- Passa: agrupamento; cartões e tabela estão visualmente agrupados.
- Falha: hierarquia; não existe prioridade, responsável ou prazo.
- Passa: uma coisa por vez; diagnóstico e ação ficam na mesma linha no desktop.
- Falha: poucas escolhas; abas, quatro cartões, ações globais e ações por linha excedem o limite confortável.
- Falha: memória de trabalho; o usuário precisa relacionar 44, 34, 11 e 6/2/0/5.
- Passa: divulgação progressiva; Mais operações e o menu por cliente escondem ações secundárias.

## Jornada emocional

A entrada promete controle: título, total da carteira e cartões de estado aparecem rapidamente. O vale emocional vem em seguida, com vários registros incompletos e motivos crus como INADIPLENCIA E CLIENTE SIMPLESMENTE PAROU DE RESPONDER, sem dizer o que deve ser resolvido primeiro.

O pico potencial está em Atribuir Consultor, Reativar e Ver todas as pendências, mas a tela não fecha o ciclo com responsável, prazo, confirmação de resolução ou última sincronização. No mobile, a tabela fica muito abaixo da primeira janela e a aba ativa não é visível.

## Persona red flags

### Alex — power user

- Não há busca, ordenação, filtros combinados, seleção em massa ou atalhos.
- Precisa percorrer 11 linhas e abrir menus individualmente.
- Ações secundárias ficam em Ações de [cliente], sem rota rápida para operações em lote.

### Sam — acessibilidade

- Há bons landmarks, skip link, semântica de tabs e nomes acessíveis.
- A aba selecionada fica fora da viewport mobile.
- A tabela de 1043 px dentro de 324 px exige rolagem horizontal e separa cliente, diagnóstico e ação.
- Status usam cor como reforço; o texto existe, o que reduz o risco de dependência exclusiva de cor.
- A navegação linear percorre uma sidebar muito extensa e não há ajuda contextual.

### Casey — usuário móvel distraído

- Os quatro cartões empilham antes da fila; a tabela começa aproximadamente em y=1081.
- A ação corretiva fica fora da área inicial e ainda exige rolagem lateral.
- O scroll vertical interno funciona, mas não é evidente que a tela tem uma segunda direção de navegação.
- Os alvos móveis têm 44 px, ponto positivo.

## Observações menores

- Falta última atualização ou fonte temporal dos contadores.
- O filtro selecionado é estado local; não é refletido na URL e se perde ao recarregar.
- Cidade não informada aparece em muitas linhas e deixa de funcionar como sinal prioritário.
- Clientes Suspensos mistura inadimplência, desistência e inatividade.
- unidade(s) e motivos em caixa alta/sem acento passam matéria-prima do banco para a interface.
- O cabeçalho da tabela não acompanha claramente a rolagem vertical longa.
- O badge de notificações 99+ no desktop/9+ no mobile compete visualmente com a tarefa atual.
- Não há ajuda contextual para bloqueio de ativação, módulos liberados ou critérios de renovação.

## Perguntas para considerar

- Se Governança é uma fila de ação, por que a primeira decisão não é o que vence hoje, quem é o dono e qual o próximo passo?
- Qual contrato de contagem explica, em cinco segundos, 44 → 34 → 11 → 6/2/0/5?
- O que faria esta tela parecer inequivocamente MX: referências explícitas a PMR/PPA/rituais/benchmarks ou apenas refinamento visual?
