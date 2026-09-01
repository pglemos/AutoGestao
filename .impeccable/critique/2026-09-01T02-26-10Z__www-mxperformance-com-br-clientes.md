---
target: "https://www.mxperformance.com.br/clientes"
total_score: 24
max_score: 40
na_heuristics:
p0_count: 2
p1_count: 2
timestamp: 2026-09-01T02-26-10Z
slug: www-mxperformance-com-br-clientes
---
Method: dual-agent (A: Archimedes · B: Franklin)

# Crítica de design — /clientes

## Design Specificity Verdict

**Moderadamente específica.**

A semântica da `Carteira 360` é realmente MX: `Matriz + 2 filiais`, `53 unidades · matriz + filiais`, vendas por unidade, meta mensal, jornada consultiva, equipe, bloqueios e próxima ação. Porém, a visão inicial de `/clientes` ainda parece um SaaS administrativo genérico. O maior diferencial do produto fica escondido em `Mais visões`, enquanto a entrada mostra apenas `Cliente`, `Status`, `Fase`, `Onboarding`, `Responsável` e `Ações`.

O detector CLI não foi executado porque o alvo é uma URL. A tentativa de detector no navegador foi bloqueada pela CSP da página; portanto, não há contagem determinística nem overlay `[Human]` confiável. A revisão usa DOM, screenshots, console e métricas de viewport como fallback.

## Design Health Score

| # | Heurística | Nota | Principal questão |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 3/4 | Período, totais, progresso, contagens, atualização e estados como `Sem meta`, `Em ritmo` e `Suspenso` aparecem. |
| 2 | Correspondência com o mundo real | 2/4 | Matriz, filial e operação automotiva fazem sentido, mas vocabulário de status e dados ausentes são ambíguos. |
| 3 | Controle e liberdade do usuário | 3/4 | Busca, abas, filtros, limpeza, troca tabela/cards e refresh ajudam; as visões mais valiosas ficam secundárias. |
| 4 | Consistência e padrões | 2/4 | Os primitivos visuais são coerentes, mas a lista inicial e a Carteira 360 comunicam modelos de status diferentes; há opções duplicadas de `Daniel`. |
| 5 | Prevenção de erros | 2/4 | Bloqueios aparecem, mas o significado de zero versus não configurado e a relação entre status não são prevenidos nem explicados. |
| 6 | Reconhecimento em vez de memorização | 3/4 | Labels e cabeçalhos são claros; truncamento e tabela horizontal elevam a carga de memória no mobile. |
| 7 | Flexibilidade e eficiência | 3/4 | Busca, filtros, períodos, KPIs e tabela/cards atendem perfis diferentes; não há fila de atenção, ordenação ou visão salva aparente. |
| 8 | Design estético e minimalista | 2/4 | Base limpa e consistente, mas há controles, KPIs e rotas demais competindo com a fila operacional. |
| 9 | Reconhecimento, diagnóstico e recuperação de erros | 3/4 | Estado vazio e limpeza de filtros são bons; loading e recuperação de falhas não foram exercitados completamente. |
| 10 | Ajuda e documentação | 1/4 | Falta uma legenda para atingimento, bloqueios, presença, taxonomia de status e atualização dos dados. |
| **Total** |  | **24/40** | **Base aceitável, mas exige melhorias significativas de clareza operacional.** |

## Overall Impression

A tela é limpa, séria e tecnicamente bem estruturada, mas entra como cadastro quando deveria entrar como torre de controle. O melhor momento é a `Carteira 360`, que finalmente junta matriz, filiais, vendas, meta e consultoria. A maior oportunidade é tornar essa visão a porta de entrada e eliminar a dúvida sobre os números de implantação.

Evidência observada: sessão já autenticada como `Consultor MX`, sem inserção de credenciais; `44 clientes na carteira`; desktop em `1440×900` (também observado em `1710×797`) e mobile em `390×844`.

## What's Working

- **Modelo de negócio forte na Carteira 360:** exemplos como `AG AUTOMÓVEIS — Matriz + 2 filiais — 40 de 102 vendas — 0 de 12 encontros — 17 vendedores — Agendar primeiro encontro` tornam a operação MX compreensível.
- **Separação correta entre comercial e consultoria:** `Vendas, meta e progresso comercial` e `Consultoria` aparecem como blocos/colunas distintos, evitando misturar métricas.
- **Sistema visual legível:** paleta verde/neutra, badges, progress bars, cabeçalhos, regiões nomeadas e controles rotulados dão uma base consistente. O estado vazio com `Nenhum cliente ou loja encontrado`, filtros ativos e `Limpar filtros` é claro.

## Priority Issues

### [P0] Fazer da carteira comercial a porta de entrada

**Por que importa:** a rota inicial esconde vendas, meta, agrupamento de filiais e próxima ação atrás de `Mais visões`. A primeira impressão é de registro administrativo, não de operação orientada a resultado.

**Correção:** abrir `Carteira 360` por padrão. Manter a lista atual como visão secundária, com nome explícito como `Cadastro e status`, e dar destaque ao próximo passo por cliente.

**Comando sugerido:** `$impeccable layout` + `$impeccable clarify`.

### [P0] Criar um modelo canônico de status e contagem

**Por que importa:** a mesma experiência mostrou `Em Implantação 0` nos KPIs, linhas com `Ativo em Implantação` e uma visão secundária `Em Implantação (38)`. Isso pode ser uma sobreposição legítima de eixos, mas a interface parece contraditória e reduz a confiança nos dados.

**Correção:** definir e exibir os eixos separadamente — por exemplo, `situação da conta` versus `fase de implantação` —, usar uma única fonte de contagem e explicar sobreposições na legenda e nos filtros.

**Comando sugerido:** `$impeccable clarify` + `$impeccable harden`.

### [P1] Remover a dependência da tabela larga no mobile

**Por que importa:** em `390×844`, o default mediu um wrapper de aproximadamente `316px` para uma tabela de `861px`; na `Carteira 360`, foi observada uma tabela de cerca de `1040px` em uma região de aproximadamente `322px`. A página não estoura horizontalmente, mas ação, responsável e próxima ação ficam fora da primeira leitura. Cabeçalho e identidade do cliente não ficam presos durante a rolagem.

**Correção:** usar cards operacionais como padrão no mobile ou uma hierarquia responsiva com identidade/ação sticky, colunas prioritárias e ação principal visível sem swipes repetidos.

**Comando sugerido:** `$impeccable adapt`.

### [P1] Reduzir a entropia de filtros, abas e ações

**Por que importa:** cinco abas, seis KPIs clicáveis, três filtros, cinco períodos de venda, menu com cinco ações primárias e mais de 20 destinos na navegação lateral competem antes da primeira tarefa útil.

**Correção:** organizar por trabalhos: `Precisa de ação`, `Resultado comercial`, `Implantação` e `Governança`. Deixar uma ação primária por linha; mover configuração e navegação de baixa frequência para um menu secundário nomeado.

**Comando sugerido:** `$impeccable distill`.

### [P2] Diferenciar zero confirmado, ausência e configuração pendente

**Por que importa:** `0 vendas`, `Sem vendas`, `Meta não configurada`, `Fase não informada`, `0% presença hoje` e `Sem venda registrada` ficam visualmente próximos, embora signifiquem condições diferentes.

**Correção:** usar estados explícitos — `0 confirmado`, `Nenhum registro`, `Não configurado`, `Indisponível` — e uma legenda/tooltip curta. Incluir data ou frescor em métricas como `presença hoje`.

**Comando sugerido:** `$impeccable clarify`.

## Persona Red Flags

### Consultor MX

Precisa triar 44 clientes/53 unidades e agir sobre o gargalo certo.

- `Carteira 360` está escondida.
- Não há ordenação evidente por atenção ou próxima ação.
- A contagem de implantação parece inconsistente.
- No celular, a triagem exige rolagem horizontal.
- `Fase não informada` aparece sem caminho imediato de correção.

### Admin MX / operação de carteira

Precisa criar clientes, atribuir responsáveis, administrar equipe, links, onboarding e governança.

- `Novo Cliente`, `Cadastro Rápido`, `Inscrições & Links` e `Ações` fragmentam o trabalho.
- O filtro de responsável contém opções duplicadas de `Daniel`.
- Ações administrativas e de risco ficam misturadas com ações rotineiras.
- Os números de status são difíceis de reconciliar entre visões.

### Dono ou gerente de grupo de lojas

Precisa entender rapidamente resultado por filial contra a meta.

- Resultados por matriz/filial só aparecem na visão 360 secundária.
- A tabela mobile esconde meta, próxima ação e ações atrás de swipes.
- `Meta não configurada` não aponta claramente o que fazer.
- A tela parece um registro interno, não um cockpit de resultado.

## Minor Observations

- `Notificações e Age...` fica truncado visualmente no menu lateral, embora o label do DOM esteja completo.
- `1 vendas` tem erro de concordância.
- `Sao Paulo` aparece sem acento em `MX CONSULTORIA`.
- Alguns CNPJs aparecem sem formatação, prejudicando a leitura rápida.
- A dependência de cor é razoavelmente compensada por texto e badges, o que é positivo.
- Quatro botões visíveis foram detectados sem texto/label acessível no fallback do navegador; não houve auditoria formal axe.
- A análise foi feita na sessão existente de `Consultor MX`; variantes autenticadas de Admin MX, dono, gerente e vendedor não foram validadas.
- `Data personalizada` não foi concluída; esse estado continua não verificado.

## Questions to Consider

- `/clientes` é um cadastro ou uma torre de controle comercial? Por que a primeira visão não decide isso?
- Se `Ativos` e `Em Implantação` podem se sobrepor, onde essa regra mental é explicada?
- Um consultor no celular consegue encontrar o cliente que exige ação em menos de dez segundos sem rolagem horizontal?
- Qual é a única próxima melhor ação por cliente, e por que tantas rotas aparecem com o mesmo peso?
- Por que o maior diferencial da MX — matriz + filiais + progresso comercial — está escondido atrás de `Mais visões`?
