---
target: "https://mxperformance.vercel.app/clientes"
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-09-01T14-48-43Z
slug: mxperformance-vercel-app-clientes
---
### Design Health Score

Modo da superfície: **Operate** — carteira administrativa de uso diário.

| # | Heurística | Nota | Problema principal |
|---|---|---:|---|
| 1 | Visibilidade do estado do sistema | 3/4 | Contadores, período, progresso e estados `0 confirmado`/`Nenhum registro` são claros; a atualização fica menos evidente quando o usuário está muito abaixo na lista. |
| 2 | Correspondência com o mundo real | 3/4 | Matriz, filial, carteira, meta e jornada são linguagem adequada ao MX; `situação canônica` e `presença referente a hoje` ainda pedem tradução. |
| 3 | Controle e liberdade do usuário | 3/4 | Há troca de modo, chips removíveis, limpar filtros e retry; não há desfazer/bulk actions para operações repetitivas. |
| 4 | Consistência e padrões | 3/4 | Tokens e componentes são coesos; a cópia de fase e a hierarquia de status divergem entre tabela e cards. |
| 5 | Prevenção de erros | 3/4 | Selects e distinção entre zero e ausência evitam leituras erradas; a mistura de contadores e ações críticas pouco contextualizadas ainda induz erro. |
| 6 | Reconhecimento em vez de memorização | 3/4 | Labels, filtros, progressos e legenda ajudam; o usuário ainda precisa lembrar o que cada fila e cada aba priorizam. |
| 7 | Flexibilidade e eficiência | 2/4 | Busca e dois modos ajudam, mas faltam seleção em lote, atalhos, views salvas e toolbar persistente para uma carteira de 44 clientes. |
| 8 | Design estético e minimalista | 2/4 | A superfície é limpa, porém a primeira dobra empilha status, fila, legenda, filtros, vendas e ações antes da lista. |
| 9 | Diagnóstico e recuperação de erros | 2/4 | O código prevê `Indisponível` e `Tentar novamente`; na experiência observada não há recuperação contextual próxima de cada dado que falhar. |
| 10 | Ajuda e documentação | 2/4 | A legenda explica vendas e sinais; faltam definições contextuais para termos, colunas e próximos passos. |
| **Total** |  | **26/40** | **Aceitável (65%) — melhorias significativas antes de a experiência ficar realmente confortável.** |

### Veredito de especificidade

**Autoria de produto: forte; linguagem visual: parcialmente intercambiável.**

O resultado é claramente MX: “Carteira 360”, matriz/filiais, vendas oficiais, meta mensal, jornada consultiva, presença e pendências de ativação não seriam copiados intactos para um dashboard genérico. A implementação confirma a intenção: o modo automático usa cards no mobile, tabela no desktop, consolida unidades e mantém comercial separado de consultoria.

Ao mesmo tempo, o invólucro visual ainda poderia ser de qualquer SaaS administrativo: fonte Inter em toda a interface, canvas cinza-claro, cards brancos, bordas suaves, ícones lineares e verde como acento. O próximo salto não é adicionar decoração; é deixar a metodologia MX comandar a hierarquia — primeiro “o que precisa ser feito hoje”, depois contexto, depois o inventário completo.

O detector visual concorda com a parte de densidade e encontrou problemas que a leitura humana não capturaria sozinha: transições em propriedades de layout, containers que podem recortar camadas posicionadas, texto funcional pequeno no mobile e cards aninhados repetidos. Há falsos positivos relevantes: `Inter` é uma decisão global coerente, `nested cards` é em parte uma escolha intencional para separar comercial/jornada, e vários `cramped padding`/`layout-transition` são repetidos por cada linha ou barra de progresso. Não tratar o número bruto como 256 defeitos independentes.

### Impressão geral

A tela tem uma boa base operacional e transmite que há dados reais por trás da carteira. O problema é que ela pede que o usuário compreenda o modelo inteiro antes de agir. Na primeira dobra aparecem quatro estados de conta, três sinais de fila, uma legenda, busca, quatro filtros e um resumo comercial; a ação mais importante de cada cliente só aparece depois, dentro de uma lista muito longa. A maior oportunidade é transformar a página em uma fila de decisão, sem perder a visão 360.

### O que está funcionando

- **Modelo de cliente correto e específico:** matriz + filiais permanecem agrupadas; vendas/meta e consultoria/jornada continuam distinguíveis. Isso evita o erro de transformar cada filial em uma “nova conta”.
- **Semântica comercial honesta:** diferenciar `0 confirmado` de `Nenhum registro` é excelente para dados operacionais e reduz a tentação de interpretar ausência de linha como zero.
- **Adaptação responsiva com escolha real:** a troca Tabela/Cards existe, o mobile prioriza cards e a tabela informa a necessidade de deslizar horizontalmente. Os botões de rodapé dos cards (`Abrir loja`, `Equipe`, `Visão 360`) são alcançáveis e têm alvos confortáveis.

### Problemas prioritários

#### [P1] A fila de decisão está diluída por um painel de indicadores

**Por que importa:** a tela mostra muitos sinais com peso visual parecido, mas não responde rapidamente “qual cliente devo tratar agora?”. `Acompanhar execução`, `Agendar primeiro encontro` e `Definir Dono Master` ficam enterrados nas linhas/cards. A pessoa precisa interpretar o painel e depois procurar a ação.

**Correção:** tornar a fila operacional a entrada principal: uma ação primária por cliente, ordenação por urgência e um resumo curto de “bloqueio / próxima ação”. Deixe situação da conta e indicadores secundários em uma faixa recolhível ou filtro rápido. Mantenha a visão completa disponível, mas não como pré-requisito para agir.

**Comando sugerido:** `$impeccable distill`.

#### [P1] O caminho mobile é serial demais e perde o contexto dos filtros

**Por que importa:** no mobile a área principal chega a aproximadamente 36.958 px de altura para 44 cards; o primeiro card observado passa de 750 px. Busca e filtros ficam acima da lista e não permanecem acessíveis durante a leitura. Para Casey, uma interrupção significa voltar ao topo para lembrar ou mudar o recorte.

**Correção:** fixar uma toolbar compacta com busca, filtro e contagem no topo da área rolável; permitir recolher detalhes de cada card; mostrar um resumo de uma linha e expandir vendas/jornada/equipe sob demanda. Preservar o modo Cards como padrão mobile, mas evitar que cada registro ocupe uma tela inteira.

**Comando sugerido:** `$impeccable adapt`.

#### [P1] A tabela desktop privilegia completude em vez de leitura rápida

**Por que importa:** são 7 colunas, texto de 12 px, várias badges, progress bars, e-mails e ações dentro de uma linha de aproximadamente 121 px. Isso gera uma grade visual difícil de escanear e torna a comparação entre clientes mais lenta. O detector marcou 143 ocorrências de espaçamento apertado e 3 casos de cards aninhados no estado de tabela.

**Correção:** eleger 4–5 colunas primárias (cliente/risco, próxima ação, vendas/meta, jornada, responsável), reduzir a competição entre badges e abrir consultoria/equipe em drawer ou linha expansível. Dar mais largura e contraste à próxima ação; manter o detalhe completo em Visão 360.

**Comando sugerido:** `$impeccable layout`.

#### [P2] Contadores e estados não têm uma gramática única

**Por que importa:** `Carteira 360 (44)` e `Cadastro e status (44)` parecem contar clientes, enquanto `Governança (34)` parece seguir a mesma regra, mas corresponde ao número de bloqueios. No desktop aparece `Fase não informada`; no card mobile aparece `Não configurada`. A mesma realidade ganha nomes diferentes conforme o modo.

**Correção:** explicitar o denominador no rótulo (`Governança · 34 bloqueios`) e padronizar estado/cópia em tabela, card, filtro e detalhe. Reservar `não configurada` para algo realmente ausente e `não informada` para dado desconhecido.

**Comando sugerido:** `$impeccable clarify`.

#### [P2] Rolagem, recorte e animação ainda ameaçam a confiabilidade percebida

**Por que importa:** o detector encontrou `overflow` com filhos posicionados potencialmente recortados, `transition: width/height`, cards flush na borda do scroller e 44 textos funcionais abaixo do tamanho recomendado no mobile. Menus, tooltips ou textos longos podem ficar cortados justamente perto das ações; transições de layout em uma lista grande podem parecer lentas.

**Correção:** renderizar menus/popovers em portal fora dos containers com `overflow-hidden`, trocar transições de layout por transform/opacity ou animação de grid controlada, elevar texto funcional para pelo menos 13–14 px onde houver leitura contínua e dar uma pista visual de rolagem também às abas horizontais.

**Comando sugerido:** `$impeccable harden`.

### Alertas por persona

**Alex — power user/admin:** consegue buscar e abrir um cliente rapidamente, mas não há seleção em lote, ações batch, atalhos ou views salvas. Para tratar 34 bloqueios, Alex repete a mesma sequência cliente por cliente e precisa voltar ao topo para mudar período/filtros.

**Sam — usuário dependente de acessibilidade:** a tela oferece headings, nomes ARIA e estados pressed úteis. Ainda assim, a tabela de 12 px, a lista linear de muitos controles por cliente e a dependência de rolagem horizontal aumentam o esforço; cores verde/vermelho continuam reforçando estado mesmo quando o texto está distante. O detector encontrou 44 textos funcionais pequenos no mobile.

**Casey — usuário mobile interrompido:** cards e botões têm bom tamanho, mas as ações ficam no fim de cards muito altos; abas e fila exigem deslize; filtros e busca desaparecem ao rolar. A falta de um resumo persistente de filtros/posição torna a retomada frágil.

### Observações menores

- O bloco de ações do cabeçalho (`Novo cliente`, `Cadastro rápido`, `Agenda MX`, `Atualizar`) compete com o título e a fila; no mobile ele quebra em duas linhas e consome bastante da primeira dobra.
- `Mais operações` fica distante da área que explica as operações e tem grande peso visual para uma ação secundária.
- Os quatro estados de conta recebem o mesmo tratamento visual mesmo quando três têm valor zero; o estado ativo domina pouco a leitura apesar de ser o único com 39.
- E-mails e nomes longos truncam; o `title` ajuda no desktop, mas não há equivalente evidente no toque/mobile.
- O número `44` é repetido no cabeçalho, tabs e descrição. Uma única contagem contextual reduziria ruído.

### Perguntas de direção

- E se a primeira dobra mostrasse uma fila priorizada de bloqueios e próxima ação, deixando os 7 indicadores completos sob demanda?
- A carteira precisa abrir como inventário completo ou deveria abrir como “o que o consultor MX precisa resolver hoje”?
- O modo Cards deve ser apenas uma alternativa responsiva ou o formato principal para operação, com a tabela reservada à comparação?
