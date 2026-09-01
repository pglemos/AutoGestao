---
target: "https://www.mxperformance.com.br/consultoria"
total_score: 23
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 4
timestamp: 2026-09-01T02-37-25Z
slug: www-mxperformance-com-br-consultoria
---
# Critique — https://www.mxperformance.com.br/consultoria

## Design Health Score

| # | Heurística | Score | Problema-chave |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 3 | Abas, KPIs, badges e estados de erro são claros; faltam período, última atualização e contagem filtrada. |
| 2 | Correspondência com o mundo real | 3 | A linguagem é do domínio MX; `PMR Plus` e objetivos repetidos não têm contexto suficiente. |
| 3 | Controle e liberdade do usuário | 3 | Há fechar, filtros, abas, navegação e retry; destinos duplicados geram hesitação. |
| 4 | Consistência e padrões | 2 | O visual é coerente, mas os rótulos de destinos equivalentes divergem. |
| 5 | Prevenção de erros | 3 | Filtros e estados vazios são seguros; linhas sem data e truncadas aumentam seleção errada. |
| 6 | Reconhecimento em vez de lembrança | 2 | Controles visíveis ajudam; `Abrir` repetido, datas ausentes e truncamento exigem inferência. |
| 7 | Flexibilidade e eficiência | 1 | Não há busca, filtro de data, ordenação, lote ou atalho operacional para centenas de registros. |
| 8 | Estética e design minimalista | 2 | O desktop é limpo; no mobile há quatro KPIs antes do trabalho e a metodologia tem escolhas demais. |
| 9 | Reconhecimento, diagnóstico e recuperação de erros | 3 | Há retry e estados úteis; faltam confirmação de atualização e contexto de frescor. |
| 10 | Ajuda e documentação | 1 | Não há ajuda contextual para `PMR Plus` nem para diferenciar destinos operacionais. |
| **Total** |  | **23/40** | **Aceitável — melhorias significativas necessárias.** |

## Veredito de especificidade

**Parcialmente específica.** O conteúdo é inequivocamente MX — `Consultor MX`, clientes reais, `Encontro`, `PMR Plus` e `Próximos destinos operacionais`. Porém, o modelo visual/interacional é de um admin SaaS convencional: cards de métricas, barra de filtros, lista plana, modal genérico e CTAs repetidos. O caráter do produto está mais nos dados e no vocabulário do que na priorização do trabalho; trocando os rótulos, a tela poderia ser outro CRM de consultoria.

O detector determinístico não produziu achados: como o alvo é uma URL, o scan CLI foi pulado conforme o playbook. A tentativa de visualização no navegador teve preflight mutável bem-sucedido, mas a injeção de `detect.js` foi bloqueada pela CSP (`blockedURI=http://localhost:8400/detect.js?assessment_b_retry=1`, `effectiveDirective=script-src-elem`, `violatedDirective=script-src-elem`). `window.impeccableDetect` e `window.impeccableScan` ficaram indisponíveis; portanto, isso **não** é um resultado “clean”, e não há contagens, regras ou localizações determinísticas. Nenhum falso positivo foi avaliável.

Evidência visual capturada em 1440×900 e 390×844:

As capturas desktop (1440×900) e mobile (390×844) permanecem na evidência local da execução; este relatório não depende de caminhos absolutos da máquina.

## Impressão geral

A tela transmite controle e acabamento profissional no primeiro olhar, mas não ajuda o consultor a decidir o próximo trabalho. Ela transforma uma operação de centenas de encontros em uma lista longa com dois filtros; o visual calmo mascara uma carga cognitiva alta.

## O que funciona

1. Vocabulário MX e dados operacionais reais conectam a interface à prática de consultoria.
2. Desktop tem boa hierarquia de navegação, espaçamento, badges de status e uso contido de cor.
3. O modal de encontro preserva contexto com `Objetivo`, `Agenda`, `Consultor responsável` e `Entregáveis`; a página não apresentou overflow horizontal no mobile.

## Problemas prioritários

### [P1] Não há triagem prática para 376 encontros

- **Elementos:** `Todos os status`, `Todas as modalidades` e a lista longa; o fluxo chega com `search: ''`.
- **Impacto:** para encontrar cliente, visita, data ou consultor, a rolagem vira o caminho padrão.
- **Correção:** incluir `Buscar cliente, encontro ou consultor`, presets de data (`Hoje`, `Próximos 7 dias`), ordenação por data agendada, agrupamento e contagem de resultados.
- **Comando sugerido:** `$impeccable layout`.

### [P1] Contradição aparente entre cronologia e status

- **Elementos:** `VITRINE · Encontro 1` aparece como `Agendado`, com `Agenda 05/01/2026, 09:00` e `Data efetiva: 29/04/2026, 21:00`, datas passadas em relação à observação de 31/08/2026.
- **Impacto:** a tela pode fazer o consultor confiar em um estado operacional incorreto.
- **Correção:** exibir data/hora na linha, definir período e fuso, derivar status/atraso das datas e mostrar `Atualizado em ...`.
- **Comando sugerido:** `$impeccable clarify`.

### [P1] Destinos duplicados e espalhados no modal

- **Elementos:** `Dados e jornada 360` / `Visão 360 do cliente`; `Execução do encontro` / `Abrir Consultoria`.
- **Impacto:** rótulos que parecem ações diferentes induzem escolha e dúvida.
- **Correção:** manter uma ação canônica de cliente e uma de encontro; fazer `Executar encontro` ser primária, `Visão 360 do cliente` secundária e mover planos para `Mais ações`.
- **Comando sugerido:** `$impeccable clarify`.

### [P1] A aba Metodologia expõe complexidade demais de uma vez

- **Elementos:** cinco botões no cabeçalho, cinco sub-abas, nove cards, nove CTAs `Abrir` e `Configuração rápida` repetida.
- **Impacto:** fica difícil distinguir configuração, conteúdo, publicação e exceções.
- **Correção:** reduzir o cabeçalho a uma ação primária + menu secundário; agrupar em `Metodologia`, `Conteúdo` e `Publicação`; trocar `Abrir` por CTAs contextuais (`Ver produtos`, `Gerenciar vídeos`) e destacar apenas pendências.
- **Comando sugerido:** `$impeccable distill`.

### [P2] O mobile desperdiça a primeira dobra e trunca o dataset principal

- **Evidência:** cabeçalho de 72px, área de conteúdo de 684px, 88px de folga inferior sem ação visível; o primeiro encontro começa por volta de `y=1222`; linhas exibem `VITRINE ...`, `OTÁVIO L...` e `Planejament...`.
- **Impacto:** o consultor precisa atravessar quatro KPIs e filtros antes de chegar ao trabalho e ainda perde contexto relevante.
- **Correção:** compactar KPIs, trazer os três próximos encontros para cima, manter filtro junto da lista, exibir data/status na linha e remover a folga inferior sem função.
- **Comando sugerido:** `$impeccable adapt`.

## Carga cognitiva

**7 de 8 itens falham — carga alta.**

- **Foco único:** falha; não existe uma próxima ação dominante.
- **Chunking:** falha; a metodologia mostra nove cards e o modal seis destinos.
- **Agrupamento:** passa parcialmente; filtros e metadados estão agrupados, mas a lista não é agrupada por data, urgência ou cliente.
- **Hierarquia visual:** falha; todos os encontros têm peso semelhante.
- **Uma coisa por vez:** falha; o modal mistura contexto, planos, jornada 360 e execução.
- **Escolhas mínimas:** falha; há mais de quatro opções visíveis em vários pontos.
- **Memória de trabalho:** falha; é preciso abrir a linha para descobrir data e depois decidir o destino.
- **Divulgação progressiva:** falha; dataset e categorias aparecem de uma vez.

Pontos com mais de quatro opções: os seis destinos do modal `VITRINE · Encontro 1`; os cinco botões do cabeçalho de Metodologia; as cinco sub-abas; e os nove cards do overview.

## Jornada emocional / peak-end

- **Entrada:** profissional e tranquilizadora; navegação ativa, acento verde e aba selecionada estabelecem controle.
- **Vale:** KPIs `357`, `15`, `232`, `0` não têm período/frescor; depois vem uma lista indiferenciada.
- **Pico:** o modal contextualiza bem objetivo, agenda, responsável e entregáveis.
- **Final:** seis destinos competem, com pares aparentemente duplicados; a ação mais importante não vence visualmente.

## Red flags por persona

### Alex — usuário avançado

- Não consegue fazer busca rápida: faltam busca, data, ordenação, lote e atalhos.
- Precisa percorrer 376 linhas, com descrições longas e truncadas.
- Metodologia exige interpretar cinco ações, cinco abas e nove CTAs genéricos.

### Sam — usuário dependente de acessibilidade

- **Pontos bons:** botões rotulados, `tab`, `combobox`, `dialog` semânticos e link `Pular para o conteúdo`.
- `Abrir` repetido não é autoexplicativo; não há contagem nem feedback claro de resultados após filtrar.
- A ausência de data na linha reduz o contexto, mesmo quando o nome acessível contém bastante texto.

### Casey — usuário mobile distraído

- O dataset só começa por volta de `y=1222`, muito abaixo da primeira tela.
- A rolagem interna esconde a barra e não oferece atalho para o próximo encontro.
- Cliente e objetivo aparecem truncados; a folga inferior de 88px reduz ainda mais o espaço útil.

## Observações menores

- Desktop mostra `25` notificações; mobile mostra `9+`, com precisão inconsistente.
- `Notificações e Age...` é truncado na sidebar desktop.
- `Presencial` usa cor marrom com aparência de alerta embora seja modalidade normal.
- `Data efetiva` aparece depois das ações, apesar de ser informação decisiva.
- Cards de metodologia com valor zero não distinguem “saudável” de “não configurado”.
- O estado vazio `Nenhum encontro encontrado` / `Ajuste os filtros para encontrar outro registro.` é claro e útil.
