# Runbook Operacional do Mentor Comercial — MX Performance

Este documento especifica os procedimentos operacionais para sustentação, atualização de regras, diagnóstico de ocorrências de observabilidade e execução de rotinas administrativas do Mentor Comercial.

---

## 1. Atualização da Matriz de Regras do Mentor

Quando a planilha mestre de regras do Mentor Comercial for atualizada pelo time de produto ou negócios, a esteira de sincronização de catálogo deve ser executada obrigatoriamente nesta ordem:

```bash
npm run mentor:rules:extract
npm run mentor:rules:validate
npm run mentor:rules:seed
```

Opcionalmente, para garantir que o código fonte não contenha referências a status não catalogados, execute:

```bash
npm run mentor:assert:status-codes
```

### Detalhamento dos Comandos e Saídas Esperadas

#### 1. `npm run mentor:rules:extract`
* **O que faz**: Lê as abas da planilha oficial de regras (localizada em `rules/mentor-comercial/v1/`) e gera os catálogos canônicos em formato JSON na mesma pasta.
* **Saída esperada**: Confirmação da extração das 9 tabelas do catálogo:
  * Canônico de Canais (`channels.json`)
  * Canônico de Status (`statuses.json`)
  * Canônico de Cadências (`cadences.json`)
  * Canônico de Passos de Cadência (`cadence-steps.json`)
  * Canônico de Scripts (`scripts.json`)
  * Canônico de Transições (`transitions.json`)
  * Canônico de Missões de Ataque (`attack-missions.json`)
  * Canônico de Cenários de Aceite (`acceptance-scenarios.json`)
  * Canônico de Integrações (`integrations.json`)

#### 2. `npm run mentor:rules:validate`
* **O que faz**: Analisa a integridade referencial cruzada entre todos os catálogos JSON gerados. Garante que status apontem para cadências e scripts existentes, que transições levem a status válidos e que placeholders sigam a especificação oficial.
* **Significado das classificações de saída**:
  * `ERROR`: Falha grave de integridade estrutural (ex.: status apontando para cadência inexistente, placeholder desconhecido). Bloqueia a execução do seed e interrompe a esteira.
  * `SOURCE_BLOCKER`: Inconsistência originada na própria planilha (referência órfã registrada na lista de exceções conhecidas). Impede o avanço por padrão, a menos que o blocker esteja explicitamente mapeado como exceção de fonte conhecida.
  * `WARN`: Divergências informativas ou avisos de manutenção (ex.: alerta de `stale_blocker`). Não bloqueia a esteira, mas exige atenção do operador.

#### 3. `npm run mentor:rules:seed`
* **O que faz**: Conecta ao banco de dados Supabase e sincroniza a versão validada dos catálogos canônicos nas tabelas do sistema (`mentor_status_definitions`, `mentor_cadences`, `mentor_cadence_steps`, `mentor_scripts`, `mentor_transitions`, `mentor_pending_flags`).
* **Saída esperada**: Relatório de upsert com total de registros inseridos ou atualizados por tabela e confirmação da versão das regras aplicada.

---

## 2. Procedimento para Alerta `stale_blocker`

### O que é o `stale_blocker`
O alerta `stale_blocker` (classificado como `WARN` no validator) ocorre quando o validador identifica que um bloqueio anteriormente registrado na lista `KNOWN_SOURCE_BLOCKERS` (no script de validação) ou `SOURCE_BLOCKED_STATUSES` (na engine de scripts) refere-se a um status que foi corrigido na nova planilha ou que deixou de existir no catálogo.

### Ação Operacional
1. Ao rodar `npm run mentor:rules:validate`, observe quais códigos de status e referências acionaram o aviso de `stale_blocker`.
2. Verifique a planilha atualizada e confirme se a referência de script para aquele status foi devidamente fornecida pela equipe de produto/negócios.
3. Se a inconsistência da fonte foi solucionada na planilha:
   * Abra o script `scripts/mentor-rules-validate.mjs` e remova o status correspondente do objeto `KNOWN_SOURCE_BLOCKERS`.
   * Abra o arquivo `src/features/mentor-comercial/engine/script.ts` e remova a entrada correspondente do objeto `SOURCE_BLOCKED_STATUSES`.
4. Reexecute `npm run mentor:rules:validate` e confirme se o aviso `stale_blocker` desapareceu e se a validação terminou com sucesso.

---

## 3. Procedimento para Evento `transition_not_found` no Sentry

### O que é o `transition_not_found`
No Mentor Comercial, o motor de transições determina o próximo status da oportunidade com base no status atual, família/contexto e no resultado digitado pelo vendedor. Quando um vendedor registra um resultado para o qual não existe nenhuma regra mapeada na aba `06 Transições` (nem por correspondência exata, nem por família/contexto, nem por curinga `Qualquer`), o sistema:
* Não lança exceção em runtime nem interrompe o uso da aplicação.
* Retorna a indicação `requiresManualUpdate: true`, orientando a interface a solicitar "Atualizar situação" ao vendedor.
* Emite um sinal de observabilidade registrado no Sentry/telemetria como `transition_not_found`.

### Ação Operacional
1. No Sentry, abra o evento de telemetria e extraia os metadados do payload:
   * `statusLabel`: Rótulo do status atual da oportunidade.
   * `family`: Família do status.
   * `result`: Texto do resultado informado pelo vendedor.
2. Consulte a equipe comercial/produto para verificar se a combinação `(statusLabel, result)` representa um fluxo de trabalho legítimo da operação.
3. Se a transição for válida e necessária para a operação:
   * Solicite ao proprietário da matriz de regras a inclusão da nova regra de transição na aba `06 Transições` da planilha oficial.
   * Assim que a planilha for atualizada, execute a esteira oficial:
     ```bash
     npm run mentor:rules:extract
     npm run mentor:rules:validate
     npm run mentor:rules:seed
     ```
4. **IMPORTANTE**: Nunca altere o código fonte em `src/features/mentor-comercial/engine/transition.ts` para incluir regras de transição condicionais manuais. Toda regra de transição deve derivar exclusivamente do catálogo canônico.

---

## 4. Execução e Idempotência do Processador Diário (`dailyProcessor`)

### Como Executar
O processador diário é orquestrado via rotina de background (cron/worker diário) chamando a rotina de aplicação por loja (`DailyProcessorInput`), passando a identificação da loja (`storeId`) e o instante atual (`now`).

### Etapas Executadas pelo Processador
Em cada execução por loja, o processador executa deterministicamente as seguintes 10 etapas:
1. Atualização do status de visitas (D-2, D-1 e D0).
2. Ativação de agendamentos de contato futuro cuja data chegou.
3. Identificação de ações vencidas.
4. Criação e atualização de itens na Central de Ações.
5. Recálculo do score de maturidade da oportunidade.
6. Recálculo da prioridade da oportunidade.
7. Recálculo da métrica de Qualidade da Carteira.
8. Encerramento de cadências concluídas.
9. Marcar elegibilidade das oportunidades para o Plano de Ataque.
10. Atualização de status derivados por data.

### Prova de Idempotência
O processador diário é 100% idempotente. A prova dessa garantia reside no mecanismo de chave de idempotência utilizado para a gravação na Central de Ações:
* Cada item gerado para a Central de Ações possui a chave determinística:
  `idempotencyKey = buildCentralActionKey(opportunityId, statusCode, nextActionAt)`
* Quando a rotina é reexecutada múltiplas vezes no mesmo dia para a mesma oportunidade e no mesmo estado, a chave gerada é idêntica.
* O repositório realiza uma operação de `upsert` vinculada a essa chave. Consequentemente, reexecutar a rotina 1, 5 ou 100 vezes produz exatamente o mesmo estado final no banco de dados, sem gerar ações duplicadas, sem duplicar pontos de score e sem multiplicar eventos na Central.

---

## 5. Interpretação dos 5 Status Bloqueados pela Fonte (`SOURCE_BLOCKER`)

Existem 5 códigos de status na matriz v1 cujas referências de script na planilha original são órfãs ou ambíguas:

| Código de Status | Referência na Planilha | Motivo da Inconsistência na Fonte |
| :--- | :--- | :--- |
| `INT-Q07` | `SCR-REATIVACAO-CAD03-T1` | Aponta para um código de script que não consta na aba de scripts. |
| `INT-N04` | `SCR-DECISAO-01` | Aponta para um código de script inexistente no catálogo. |
| `POR-A04` | `SCR-POS-VISITA-CAD03-T{n}` | Aponta para padrão com placeholder no ID de script não cadastrado. |
| `CAR-C07` | `SCR-TROCA-FUTURA-01` | Aponta para um script inexistente na matriz. |
| `CAR-C08` | `SCR-POSVENDA-01` | Aponta para um script inexistente no catálogo. |

### O que o Vendedor Vê na Interface
* Quando a oportunidade está em um desses 5 status, a interface exibe o indicador `scriptReady = false` e mantém o botão de disparo de mensagem via WhatsApp **desabilitado**.
* É exibida a mensagem de que o script não está disponível para envio automático. Este é exatamente o mesmo tratamento concedido quando um script válido possui uma variável obrigatória ausente.

### O que NÃO Está Quebrado no Sistema
* O Mentor Comercial continua funcionando **perfeitamente** em todas as suas demais atribuições para oportunidades nesses 5 status:
  * Definição e alteração do status da oportunidade.
  * Atribuição de responsável, objetivo comercial e definição do próximo passo.
  * Planejamento e acompanhamento do agendamento de cadência.
  * Cálculo do score de maturidade e da priorização.
  * Geração e exibição de cards na Central de Ações.
  * Avaliação de elegibilidade ao Plano de Ataque.

### Como Resolver
* Esta ocorrência **não é um defeito da implementação do software**. O software está agindo estritamente de acordo com o princípio determinístico.
* A resolução exige que o proprietário da planilha (produto/comercial) defina e cadastre os textos formais desses scripts na aba `05 Scripts`.
* Após a atualização da planilha, rode a esteira `mentor:rules:extract` → `mentor:rules:validate` → `mentor:rules:seed`.
* **NUNCA** crie textos de script arbitrários ou remova a checagem no código fonte para burlar esses bloqueios.

---

## 6. Execução da Reconciliação de Carteira

Para realizar o diagnóstico de integridade entre clientes e oportunidades cadastrados no Supabase sem realizar alterações no banco de dados, execute o relatório de reconciliação:

```bash
npm run mentor:reconcile
```

Para gerar a saída formatada em JSON (ideal para logs automatizados ou parsing):

```bash
npm run mentor:reconcile -- --json
```

### Características do Relatório
* **Somente Leitura**: O script não realiza qualquer modificação, escrita ou exclusão no banco de dados Supabase.
* **Uso**: Utiliza as credenciais de `SUPABASE_SERVICE_ROLE_KEY` definidas no arquivo `.env`.
* **Finalidade**: Identifica oportunidades sem vínculo de cliente, clientes sem oportunidade ativa e suspeitas de duplicidade cadastral por telefone normalizado. Fornece evidências estatísticas para subsidiar tarefas de migração e limpeza de dados.

---

## 7. Diretrizes Invioláveis de Operação (O que NUNCA fazer)

Para preservar a integridade determinística e a segurança jurídica do sistema, os operadores e desenvolvedores devem seguir estritamente as proibições abaixo:

1. **NUNCA inventar scripts ou textos de abordagem**: Todos os scripts de WhatsApp devem derivar exclusivamente do catálogo `mentor_scripts` sincronizado a partir da planilha oficial.
2. **NUNCA mesclar clientes ou oportunidades de forma automatizada**: Identificações de duplicidade trazidas pelo relatório de reconciliação servem apenas como diagnóstico. A unificação de cadastros exige validação prévia para evitar perda de histórico comercial.
3. **NUNCA habilitar etapas de pós-venda, garantia ou entrega sem configuração da loja**: Funcionalidades dependentes do ciclo pós-venda só podem ser ativadas quando a tabela `store_commercial_settings` contiver os parâmetros específicos e autorização expressa da loja.
4. **NUNCA presumir SLAs ou prazos de atendimento**: Todos os horários de retorno, janelas de cadência e prazos de ação devem ser computados rigorosamente pelas funções determinísticas de cadência com base nos offsets do catálogo oficial.
