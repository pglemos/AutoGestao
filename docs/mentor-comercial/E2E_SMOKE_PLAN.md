# Plano de Especificações E2E Smoke — Mentor Comercial v1 (TASK 64)

> **Ambiente**: Produção / Staging
> **Rota Canônica**: `/carteira-clientes`
> **Motor**: Determinístico v1 (`src/features/mentor-comercial/engine/`)
> **Objetivo**: Especificar o protocolo de teste de fumaça E2E (End-to-End Smoke Test) para validação pós-deploy do Mentor Comercial, com critérios objetivos de PASS/FAIL, isolamento de segurança para dados de produção e procedimentos explicítos de reversão.

---

## 1. Visão Geral e Protocolos de Segurança

Este documento define **17 especificações detalhadas de teste de fumaça (E2E Smoke)** para verificação do módulo **Mentor Comercial v1**.

### 1.1 Classificação de Risco das Ações
Para garantir a integridade dos dados operacionais e impedir alterações indesejadas em clientes reais durante o teste em produção:
* **Somente Leitura (Read-Only)**: 15 dos 17 itens são estritamente de consulta, navegação, filtragem, análise visual, responsividade e monitoramento de logs/telemetria.
* **Escrita Controlada (Mutation)**: Apenas 2 itens (Itens 8 e 9) realizam mutação de estado no banco de dados.

### 1.2 Protocolo de Fixture Segura
Para os testes com mutação de dados (Itens 8 e 9):
1. **Fixture Exclusiva**: Utilizar **EXCLUSIVAMENTE** a oportunidade sintética de teste dedicada com tag/identificador `[FIXTURE_E2E_SMOKE]` (ID de referência: `00000000-0000-0000-0000-000000000001` ou oportunidade atribuída ao usuário de testes em loja de homologação).
2. **Proibição Absoluta**: É expressamente proibido alterar o status, cadência, responsável ou histórico de qualquer cliente real ativo em produção.
3. **Procedimento de Reversão**: Toda alteração efetuada na fixture durante o teste deve ser imediatamente revertida para seu estado baseline original ao final da verificação.

---

## 2. Matriz Resumo dos 17 Casos de Teste Smoke

| # | Item de Teste | Categoria | Modifica Dados? | Reversão Necessária? | Rota / Contexto |
|---|---|---|---|---|---|
| **01** | Login Vendedor | Autenticação | Não (Leitura) | Não | `/login` |
| **02** | Abrir Mentor | Navegação | Não (Leitura) | Não | `/carteira-clientes` |
| **03** | Carteira Ativa Carrega | Renderização | Não (Leitura) | Não | `/carteira-clientes` |
| **04** | Plano de Ataque Carrega | Renderização | Não (Leitura) | Não | `/carteira-clientes` (Aba Ataque) |
| **05** | Filtros | Interação UI | Não (Leitura) | Não | `/carteira-clientes` |
| **06** | Busca | Interação UI | Não (Leitura) | Não | `/carteira-clientes` |
| **07** | Abrir Ficha | Painel / Modal | Não (Leitura) | Não | `FichaOportunidade` |
| **08** | Atualizar Situação com Fixture Segura | Mutação de Estado | **SIM (Escrita)** | **SIM (Rollback UI/RPC)** | `GuidedStatusUpdate` |
| **09** | Executar Action Segura | Avanço Cadência | **SIM (Escrita)** | **SIM (Rollback Passo)** | `ExecuteNextStepPanel` |
| **10** | Central | Agregação | Não (Leitura) | Não | Central de Ações |
| **11** | Deep Link com Reload | Persistência URL | Não (Leitura) | Não | `/carteira-clientes?oportunidadeId=...` |
| **12** | Score | Motor Determinístico | Não (Leitura) | Não | Detalhes do Score (0-1000) |
| **13** | Prioridade | Motor Determinístico | Não (Leitura) | Não | Ordenação por `priority_index` |
| **14** | Mobile | Responsividade | Não (Leitura) | Não | Viewport ≤ 430px |
| **15** | Ausência de Erro no Console | Estabilidade Frontend | Não (Leitura) | Não | DevTools Console |
| **16** | Ausência de Runtime Error | Integridade React | Não (Leitura) | Não | Error Boundary / App Level |
| **17** | Sentry sem Regressão | Telemetria & Observabilidade | Não (Leitura) | Não | Sentry Dashboard |

---

## 3. Especificação Detalhada dos 17 Itens de Teste

---

### Item 01: Login Vendedor (`login vendedor`)

* **Tipo**: Somente Leitura (Autenticação padrão).
* **Pré-condição**:
  * Servidor web e API Supabase operacionais em produção.
  * Credenciais válidas de conta com perfil de Vendedor Comercial (ex: `vendedor.smoke@mxgestaopreditiva.com.br`).
  * Navegador aberto na página de login.
* **Passos Exatos**:
  1. Acessar a URL base da aplicação no ambiente de produção: `https://app.mxgestaopreditiva.com.br/login`.
  2. Inserir o e-mail do vendedor no campo de entrada de texto `E-mail`.
  3. Inserir a senha correspondente no campo `Senha`.
  4. Clicar no botão `Entrar` (ou pressionar `Enter`).
* **Evidência Esperada**:
  - Resposta HTTP 200/201 na requisição de autenticação Supabase Auth (`auth/v1/token`).
  - Armazenamento do token de sessão JWT no LocalStorage.
  - Redirecionamento automático para a página inicial com renderização da Sidebar lateral e indicação do vendedor autenticado no perfil.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Autenticação concluída sem erros, usuário redirecionado com sucesso, nome/loja do vendedor exibidos no cabeçalho.
  - **FAIL**: Erro HTTP 401/500, mensagem de credenciais inválidas inesperada, tela branca ou loop de redirecionamento.
* **Classificação e Reversão**:
  - **Somente Leitura**: Não modifica dados de negócios. Nenhuma reversão necessária.

---

### Item 02: Abrir Mentor (`abrir Mentor`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Vendedor logado com sucesso (Item 01 executado).
* **Passos Exatos**:
  1. Clicar no item `Carteira de Clientes` no menu de navegação da Sidebar lateral.
  2. Alternativamente, digitar diretamente no endereço do navegador a rota canônica: `https://app.mxgestaopreditiva.com.br/carteira-clientes`.
* **Evidência Esperada**:
  - A URL do navegador é atualizada exatamente para `/carteira-clientes`.
  - Cabeçalho da página "Carteira de Clientes" renderizado com visual azul-marinho institucional, sem desalinhamentos.
  - Abas principais ("Carteira Ativa", "Plano de Ataque", etc.) visíveis e interativas.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Rota `/carteira-clientes` carrega em menos de 2 segundos, componentes principais do Mentor visíveis.
  - **FAIL**: Erro de rota 404, redirecionamento inesperado, tela de erro do React Router ou congelamento do carregamento.
* **Classificação e Reversão**:
  - **Somente Leitura**: Nenhuma mutação de banco de dados. Sem necessidade de reversão.

---

### Item 03: Carteira Ativa Carrega (`Carteira Ativa carrega`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Navegador na rota `/carteira-clientes`, aba "Carteira Ativa" selecionada.
* **Passos Exatos**:
  1. Selecionar a aba `Carteira Ativa`.
  2. Aguardar o término do indicador de carregamento (spinner/skeleton UI).
  3. Observar a renderização da lista ou grid de oportunidades.
* **Evidência Esperada**:
  - Requisição Supabase SELECT à tabela `oportunidades` finalizada com status HTTP 200.
  - Renderização de cards/linhas com oportunidades ativas pertencentes ao vendedor logado.
  - Cada item da lista exibe: Nome do cliente, Código do status atual (ex: `CAR-C01`), Score do Mentor, Classe de Prioridade e Data da Próxima Ação.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Lista de oportunidades ativas é renderizada com dados reais/sintéticos válidos em até 3 segundos, sem spinners infinitos.
  - **FAIL**: Exibição de spinner de loading permanente, erro de query SQL/RLS, ou cards exibindo `undefined`/`NaN`.
* **Classificação e Reversão**:
  - **Somente Leitura**: Operação puramente de consulta. Nenhuma reversão necessária.

---

### Item 04: Plano de Ataque Carrega (`Plano de Ataque carrega`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Navegador na rota `/carteira-clientes`.
* **Passos Exatos**:
  1. Clicar na aba ou seção `Plano de Ataque` (Missões do Dia).
  2. Aguardar o processamento das missões priorizadas pelo motor determinístico.
* **Evidência Esperada**:
  - Renderização dos cards de missões urgentes/prioritárias agrupados de forma clara.
  - Oportunidades ordenadas por urgência e valor de `priority_index` decrescente.
  - Exibição de badges com a razão da priorização (ex: "Contato Atrasado", "Alta Temperatura", "Oportunidade Quente").
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Oportunidades priorizadas apresentadas com justificativa determinística visível e botões de ação rápida operacionais.
  - **FAIL**: Bloco em branco sem tratamento de estado vazio, exceção no console ou cálculo de prioridade falho.
* **Classificação e Reversão**:
  - **Somente Leitura**: Nenhuma escrita efetuada. Sem reversão.

---

### Item 05: Filtros (`filtros`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Lista de oportunidades carregada na Carteira Ativa (Item 03).
* **Passos Exatos**:
  1. Localizar a barra de filtros superiores na interface da Carteira.
  2. Clicar no filtro de `Temperatura` e selecionar a opção `Quente`.
  3. Verificar a redução imediata da lista para exibir apenas itens compatíveis.
  4. Clicar no botão `Limpar Filtros` ou desmarcar a opção selecionada.
* **Evidência Esperada**:
  - Atualização instantânea do estado da lista no frontend (sem recarregar a página inteira).
  - Contador total de oportunidades filtradas ajusta-se para refletir o número de itens exibidos.
  - Ao limpar o filtro, a listagem completa original é prontamente re-exibida.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Filtragem funciona de forma precisa e determinística; remoção dos filtros restaura o estado inicial da lista.
  - **FAIL**: A lista não responde à alteração de filtros, esvazia incorretamente ou dispara exceção JavaScript.
* **Classificação e Reversão**:
  - **Somente Leitura**: Estado mantido apenas em memória de componente frontend. Nenhuma reversão.

---

### Item 06: Busca (`busca`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Lista da Carteira Ativa visível na tela.
* **Passos Exatos**:
  1. Clicar no campo de entrada de texto `Buscar Oportunidade / Cliente`.
  2. Digitar os 4 primeiros caracteres de um nome de cliente existente na base (ex: `"João"` ou `"Silva"`).
  3. Avaliar a resposta da busca em tempo real.
  4. Limpar o texto do campo de busca.
* **Evidência Esperada**:
  - Filtragem em tempo real na lista exibindo apenas os clientes cujo nome ou telefone correspondem ao termo digitado.
  - Suporte correto a busca case-insensitive e acentuação portuguesa (ex: `"João"` localiza `"joao"`).
  - Retorno imediato de todos os itens ao apagar o campo de busca.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Busca filtra os registros exatamente pela chave informada; apagar a busca restaura a lista integralmente.
  - **FAIL**: Travar o navegador por renderização excessiva, omitir resultados válidos ou travar a UI.
* **Classificação e Reversão**:
  - **Somente Leitura**: Nenhuma mutação de banco de dados. Sem reversão.

---

### Item 07: Abrir Ficha (`abrir ficha`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Pelo menos uma oportunidade visível na listagem da Carteira.
* **Passos Exatos**:
  1. Clicar no card de uma oportunidade ou no botão `Ver Ficha` / `Detalhes`.
  2. Aguardar a abertura do modal/drawer `FichaOportunidade`.
* **Evidência Esperada**:
  - Deslocamento suave e abertura do modal `FichaOportunidade`.
  - Exibição organizada dos blocos de dados: Identificação do Cliente, Status Atual (código e rótulo oficial do catálogo), Histórico de Interações, Script Recomendado e Indicadores de Score/Prioridade.
  - Script determinístico renderizado com placeholders oficiais preenchidos (sem marcadores brutos como `{NOME_CLIENTE}`).
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Modal/drawer abre perfeitamente, exibindo dados completos e consistentes com o banco de dados.
  - **FAIL**: Modal não responde ao clique, abre com campos nulos/vazios, exibe código de status inválido ou quebra o layout.
* **Classificação e Reversão**:
  - **Somente Leitura**: Consulta e renderização visual. Nenhuma reversão.

---

### Item 08: Atualizar Situação com Fixture Segura (`atualizar situação com fixture segura`)

* **Tipo**: **ESCRITA CONTROLADA (MUTATION)**.
* **Pré-condição**:
  * Acesso à Oportunidade Fixture sintética dedicada `[FIXTURE_E2E_SMOKE]` (`id: 00000000-0000-0000-0000-000000000001`).
  * Estado baseline confirmado: `current_status_code = QUAL-01` (Qualificação Inicial).
  * Ficha da oportunidade fixture aberta no componente `GuidedStatusUpdate`.
* **Passos Exatos**:
  1. Na ficha da fixture, clicar na seção `Atualizar Situação` (`GuidedStatusUpdate`).
  2. Selecionar uma situação de destino válida conforme o catálogo de transições (ex: transicionar de `QUAL-01` para `AGEND-01` - Agendamento Solicitado).
  3. Preencher o campo opcional de observação com `"Teste de Fumaça E2E - Validação de Transição"`.
  4. Clicar no botão `Confirmar Transição`.
* **Evidência Esperada**:
  - Requisição Supabase via `applyMentorEvent` retorna HTTP 200/201 sem erros de RLS.
  - A UI é atualizada instantaneamente refletindo o novo código de status `AGEND-01`.
  - A timeline de histórico registra o novo evento com o timestamp atual e autor.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Status da fixture alterado com sucesso no banco e na interface, evento persistido corretamente.
  - **FAIL**: Rejeição de chave estrangeira, código de status não catalogado, erro de permissão RLS ou falha de atualização na UI.
* **Procedimento Explicito de Reversão (Rollback)**:
  1. **Via Interface**: Na mesma ficha da oportunidade fixture, abrir novamente o `GuidedStatusUpdate`, selecionar a transição de retorno para `QUAL-01` e confirmar.
  2. **Via Script de Suporte SQL (Fallback)**: Caso a interface não permita retorno direto, executar a consulta SQL de reversão no Supabase:
     ```sql
     UPDATE oportunidades
     SET current_status_code = 'QUAL-01', mentor_updated_at = NOW()
     WHERE id = '00000000-0000-0000-0000-000000000001';
     ```
  3. **Verificação de Sanidade**: Confirmar que `current_status_code` da fixture retornou exatamente a `QUAL-01`.

---

### Item 09: Executar Action Segura (`executar action segura`)

* **Tipo**: **ESCRITA CONTROLADA (MUTATION)**.
* **Pré-condição**:
  * Oportunidade Fixture `[FIXTURE_E2E_SMOKE]` selecionada e aberta no painel `ExecuteNextStepPanel`.
  * Cadência ativa no passo inicial (`current_cadence_step = 1`).
* **Passos Exatos**:
  1. Inspecionar a recomendação da ação corrente exibida pelo painel `ExecuteNextStepPanel`.
  2. Clicar no botão de execução segura: `Registrar Contato Realizado / Avançar Cadência`.
  3. Confirmar a conclusão no modal de confirmação.
* **Evidência Esperada**:
  - Requisição de mutação finalizada com sucesso.
  - O valor de `current_cadence_step` avança de `1` para `2` no registro da oportunidade fixture.
  - O registro de interações atualiza `last_interaction_at` com o timestamp atual e recalcula a próxima ação (`next_action_at`).
  - Registro de auditoria adicionado à tabela `execution_actions`.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Avanço do passo de cadência gravado no banco, UI exibe o próximo passo agendado corretamente.
  - **FAIL**: Falha ao registrar a execução, cadência travada no mesmo passo ou dados corrompidos.
* **Procedimento Explicito de Reversão (Rollback)**:
  1. **Via Script SQL / RPC**: Executar a restauração do passo inicial da cadência na oportunidade fixture:
     ```sql
     UPDATE oportunidades
     SET current_cadence_step = 1, last_interaction_at = NOW() - INTERVAL '1 day'
     WHERE id = '00000000-0000-0000-0000-000000000001';
     DELETE FROM execution_actions WHERE oportunidade_id = '00000000-0000-0000-0000-000000000001' AND created_at > NOW() - INTERVAL '5 minutes';
     ```
  2. **Verificação de Sanidade**: Confirmar que a fixture retornou ao passo 1 da cadência original.

---

### Item 10: Central (`Central`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Vendedor autenticado no sistema.
* **Passos Exatos**:
  1. Clicar no atalho ou aba `Central de Ações`.
  2. Verificar a lista consolidada de pendências do vendedor logado.
* **Evidência Esperada**:
  - Renderização das ações agrupadas por janela temporal (Atrasadas, Hoje, Próximos Dias).
  - Cada item utiliza a chave determinística gerada por `buildCentralActionKey`.
  - Links de atalho rápido em cada card direcionam para a oportunidade correta.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Central exibe pendências agrupadas corretamente sem duplicidades, botões de atalho operacionais.
  - **FAIL**: Central vazia com pendências existentes, chave de ação nula ou erro de carregamento das missões.
* **Classificação e Reversão**:
  - **Somente Leitura**: Nenhuma escrita efetuada. Sem reversão.

---

### Item 11: Deep Link com Reload (`deep link com reload`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Conhecimento prévio do UUID de uma oportunidade existente (ex: `00000000-0000-0000-0000-000000000001`).
* **Passos Exatos**:
  1. Copiar a URL de deep link contendo o parâmetro da oportunidade:
     `https://app.mxgestaopreditiva.com.br/carteira-clientes?oportunidadeId=00000000-0000-0000-0000-000000000001`
  2. Cole a URL na barra de endereços de uma nova aba e pressione `Enter`.
  3. Em seguida, pressione `F5` / `Ctrl+R` para efetuar um reload completo da página.
* **Evidência Esperada**:
  - A aplicação carrega a rota `/carteira-clientes` e detecta automaticamente o parâmetro `oportunidadeId`.
  - A ficha da oportunidade correspondente abre automaticamente sobre a tela da carteira.
  - Nenhum estado de erro ou perda de parâmetro ocorre durante a recarga.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Ficha da oportunidade aberta automaticamente após a recarga da página com dados corretos.
  - **FAIL**: O parâmetro é ignorado, modal não abre ou o app redireciona para 404/Home.
* **Classificação e Reversão**:
  - **Somente Leitura**: Nenhuma alteração efetuada. Nenhuma reversão.

---

### Item 12: Score (`score`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Ficha de uma oportunidade aberta ou card visível na Carteira.
* **Passos Exatos**:
  1. Localizar o indicador visual do **Score do Mentor** (`mentor_score`).
  2. Clicar no ícone de informação/detalhes do Score para expandir a quebra por pilares (`mentor_score_breakdown`).
  3. Inspecionar as pontuações dos 4 pilares: Engajamento, Perfil, Tempo e Histórico.
* **Evidência Esperada**:
  - A pontuação total de `mentor_score` é um número inteiro válido no intervalo `[0, 1000]`.
  - A classe `mentor_score_class` corresponde exatamente à faixa definida (ex: Ouro, Prata, Bronze).
  - A soma ponderada das pontuações dos pilares bate com o total exibido segundo as constantes de `SCORE_PILLAR_WEIGHTS`.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Score exibido corretamente no intervalo de 0 a 1000, classificação coerente e breakdown completo sem valores nulos.
  - **FAIL**: Score fora do intervalo (ex: <0 ou >1000), presença de `NaN`/`null` ou incoerência na classificação.
* **Classificação e Reversão**:
  - **Somente Leitura**: Leitura de valores calculados pelo motor. Nenhuma reversão.

---

### Item 13: Prioridade (`prioridade`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Lista da Carteira Ativa ou Plano de Ataque aberta.
* **Passos Exatos**:
  1. Inspecionar a ordenação padrão dos cards de oportunidades na listagem.
  2. Verificar os valores de `priority_index` e `priority_class` em pelo menos 3 cards consecutivos.
  3. Conferir a presença dos pontos de potencial (`POTENTIAL_POINTS`) e urgência (`URGENCY_POINTS`).
* **Evidência Esperada**:
  - As oportunidades estão ordenadas estritamente por `priority_index` de forma decrescente (do maior índice para o menor).
  - Cards com prioridade "Urgente" / "Alta" posicionam-se no topo da fila.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Ordenação por prioridade respeitada rigorosamente em toda a listagem; índices numéricos válidos.
  - **FAIL**: Inversão da ordem de prioridade na exibição, valores zerados por erro de cálculo ou ausência de badges.
* **Classificação e Reversão**:
  - **Somente Leitura**: Nenhuma mutação efetuada. Sem reversão.

---

### Item 14: Mobile (`mobile`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Ferramenta de desenvolvedor do navegador (DevTools) aberta na aba de emulação de dispositivos móveis, configurada para viewport de smartphone (ex: iPhone 14 Pro - 393 x 852 px), ou teste em dispositivo físico.
* **Passos Exatos**:
  1. Acessar a rota `/carteira-clientes` no modo responsivo móvel.
  2. Alternar entre as abas principais usando toques no display.
  3. Abrir a ficha de uma oportunidade e rolar a página verticalmente.
  4. Testar o acionamento dos botões da barra de ações inferior.
* **Evidência Esperada**:
  - Layout totalmente responsivo, sem ocorrência de barra de rolagem horizontal (overflow-x = hidden).
  - Elementos clicáveis possuem área de toque adequada (mínimo 44 x 44 px).
  - O modal/drawer `FichaOportunidade` adapta-se à largura da tela ocupando 100% sem cortar informações.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Interface perfeitamente funcional em telas pequenas, sem quebras visuais, botões inacessíveis ou textos sobrepostos.
  - **FAIL**: Ocorrência de overflow horizontal, botões cortados fora da tela ou sobreposição ilegível de componentes.
* **Classificação e Reversão**:
  - **Somente Leitura**: Verificação visual de layout. Nenhuma reversão.

---

### Item 15: Ausência de Erro no Console (`ausência de erro no console`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: DevTools do navegador aberto na aba `Console`, com o filtro de nível de log configurado para `Errors` ativado durante a execução de todos os itens anteriores (01 a 14).
* **Passos Exatos**:
  1. Navegar por todas as telas e abas do Mentor Comercial.
  2. Executar buscas, filtros e abertura de fichas.
  3. Inspecionar o painel do Console para identificar mensagens em vermelho.
* **Evidência Esperada**:
  - O log do Console permanece limpo de erros graves durante todo o percurso de teste.
  - Ausência de avisos de chaves duplicadas do React (`Warning: Each child in a list should have a unique "key" prop`).
  - Ausência de erros `TypeError`, `Uncaught ReferenceError` ou exceções de rede 4xx/5xx não tratadas.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Zero erros não tratados capturados no console do navegador durante o teste completo.
  - **FAIL**: Registro de qualquer exceção JavaScript não capturada ou erro de runtime no console.
* **Classificação e Reversão**:
  - **Somente Leitura**: Inspeção de logs. Nenhuma reversão.

---

### Item 16: Ausência de Runtime Error (`ausência de runtime error`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Aplicação em execução ativa.
* **Passos Exatos**:
  1. Realizar navegação contínua e rápida entre abas do Mentor por 2 minutos.
  2. Abrir e fechar sucessivamente 5 fichas de oportunidades diferentes.
  3. Redimensionar a janela do navegador repetidamente.
* **Evidência Esperada**:
  - A interface responde com fluidez contínua sem travamentos da thread principal (main UI thread).
  - Nenhuma tela de travamento, White Screen of Death (WSOD) ou mensagem de captura do React `ErrorBoundary` ("Algo deu errado").
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Nenhuma interrupção de execução, a aplicação mantém seu estado estável sem travamentos ou crashes.
  - **FAIL**: Exibição da tela de fallback do ErrorBoundary, tela completamente em branco ou travamento definitivo.
* **Classificação e Reversão**:
  - **Somente Leitura**: Teste de robustez de interface. Nenhuma reversão.

---

### Item 17: Sentry sem Regressão (`Sentry sem regressão`)

* **Tipo**: Somente Leitura.
* **Pré-condição**: Acesso ao painel do Sentry (ou plataforma de APM/Crash reporting configurada no projeto `mx-performance`).
* **Passos Exatos**:
  1. Acessar o dashboard do Sentry no projeto de produção.
  2. Aplicar o filtro de ambiente para `production` e selecionar a release do deploy recente do Mentor Comercial v1.
  3. Verificar as seções `Unresolved Issues` e `New Issues Today`.
* **Evidência Esperada**:
  - Zero novos tipos de exceções (`New Issues`) reportados com origem nos arquivos do módulo do Mentor (`src/features/mentor-comercial/`).
  - Taxa de erros (error rate) estável e dentro da linha de base de normalidade da aplicação.
* **Critério Objetivo PASS/FAIL**:
  - **PASS**: Nenhuma regressão de erros ou novas exceções não capturadas registradas no Sentry pós-deploy.
  - **FAIL**: Registro de novas exceções recorrentes vinculadas ao Mentor Comercial no Sentry após a liberação.
* **Classificação e Reversão**:
  - **Somente Leitura**: Análise de telemetria externa. Nenhuma reversão.

---

## 4. Checklist de Execução & Relatório de Aprovação

Para homologação formal do deploy em ambiente de produção, o responsável pelo teste de fumaça deve preencher a tabela abaixo no momento da verificação:

```markdown
### Registro de Validação de Fumaça E2E — Mentor Comercial v1

- **Data da Execução**: ____ / ____ / ________
- **Responsável**: ___________________________________________
- **Ambiente**: [  ] Produção  [  ] Staging / Homologação
- **Resultado Geral**: [  ] APROVADO (PASS)  [  ] REPROVADO (FAIL)

| Item | Descrição | Status (PASS/FAIL) | Observações |
|---|---|---|---|
| 01 | Login Vendedor | _________ | _____________________________________ |
| 02 | Abrir Mentor | _________ | _____________________________________ |
| 03 | Carteira Ativa Carrega | _________ | _____________________________________ |
| 04 | Plano de Ataque Carrega | _________ | _____________________________________ |
| 05 | Filtros | _________ | _____________________________________ |
| 06 | Busca | _________ | _____________________________________ |
| 07 | Abrir Ficha | _________ | _____________________________________ |
| 08 | Atualizar Situação com Fixture | _________ | _____________________________________ |
| 09 | Executar Action Segura | _________ | _____________________________________ |
| 10 | Central | _________ | _____________________________________ |
| 11 | Deep Link com Reload | _________ | _____________________________________ |
| 12 | Score | _________ | _____________________________________ |
| 13 | Prioridade | _________ | _____________________________________ |
| 14 | Mobile | _________ | _____________________________________ |
| 15 | Ausência de Erro no Console | _________ | _____________________________________ |
| 16 | Ausência de Runtime Error | _________ | _____________________________________ |
| 17 | Sentry sem Regressão | _________ | _____________________________________ |
```
