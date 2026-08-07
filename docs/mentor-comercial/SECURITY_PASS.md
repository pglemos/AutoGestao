# Mentor Comercial — Pass de Segurança (TASK 60 / C03)

**Data da Análise**: 2026-08-07
**Escopo**: Módulo Mentor Comercial (`src/features/mentor-comercial/`), catálogos (`rules/mentor-comercial/`), documentação (`docs/mentor-comercial/`) e migration de banco de dados (`supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql`).

---

## 1. Segredos Versionados no Git

- **Status**: **CONFORME** (Nenhum segredo encontrado)
- **Análise**:
  - Busca exaustiva realizada por padrões de credenciais, chaves de API, JWTs (`eyJ...`), tokens privadas e segredos de serviço nos diretórios do Mentor Comercial:
    - `src/features/mentor-comercial/`
    - `rules/mentor-comercial/`
    - `docs/mentor-comercial/`
    - `supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql`
  - **Resultado**: 0 segredos versionados. O arquivo `.env.example` lista apenas as chaves exigidas sem nenhum valor real atribuído.

---

## 2. Sanitização de PII enviada ao Sentry

- **Arquivo Principal**: [`src/features/mentor-comercial/observability/mentorTelemetry.ts`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/observability/mentorTelemetry.ts)
- **Status**: **PARCIALMENTE CONFORME** (Ponto de Atenção em `payload.error`)

### Análise de Sanitização
- **Filtro de Chaves Sensíveis**: Em `mentorTelemetry.ts:43-49`, a regex `PII_OR_SENSITIVE_KEY` identifica chaves como `name`, `nome`, `phone`, `telefone`, `whatsapp`, `text`, `texto`, `message`, `body`, `token`, `secret`, `password`, `senha`, `email`, `cpf`, `cnpj`.
- **Substituição em Extra**: A função `sanitizeMentorExtra()` (`mentorTelemetry.ts:55-72`) substitui valores de chaves sensíveis por `'[REDACTED]'` e aplica regex de telefone.
- **Substituição de Mensagem**: A função `sanitizeMentorPayload()` (`mentorTelemetry.ts:78-89`) aplica redação a mensagens do payload.

### Apontamento de Segurança (Arquivo:Linha)
- **[`src/features/mentor-comercial/observability/mentorTelemetry.ts:114-115`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/observability/mentorTelemetry.ts#L114-L115)**:
  - Quando a função `captureMentorTelemetry()` recebe um objeto `payload.error` que é uma instância de `Error`, ela executa:
    ```typescript
    if (sanitized.error instanceof Error) {
      Sentry.captureException(sanitized.error)
    }
    ```
  - **Vulnerabilidade Potencial**: Se a mensagem da exceção (`error.message`) ou a stack trace contiver dados pessoais (como o nome de um cliente ou o texto de uma mensagem do WhatsApp capturada durante uma falha de envio/integração), a exceção é repassada diretamente ao SDK do Sentry sem sanitizar a propriedade `message` do erro.
  - **Recomendação**: Sanitizar `error.message` utilizando `redactPiiString()` antes de enviar a exceção via `Sentry.captureException()`.

---

## 3. Uso de Service Role Key no Browser

- **Status**: **CONFORME** (Isolamento Estrito)
- **Análise**:
  - Pesquisa por `SERVICE_ROLE` realizada em todo o código-fonte sob `src/`.
  - **Constatação**: O uso de `SUPABASE_SERVICE_ROLE_KEY` é estritamente restrito a utilitários de suporte e testes automatizados de integração/E2E em ambiente Node.js:
    - [`src/test/manager-day-routine.playwright.ts:38`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/test/manager-day-routine.playwright.ts#L38)
    - [`src/test/security/evidencias-visita.playwright.ts:7`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/test/security/evidencias-visita.playwright.ts#L7)
    - [`src/test/owner-base44-interactions.playwright.ts:9`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/test/owner-base44-interactions.playwright.ts#L9)
    - [`src/test/e2e-helpers/supabase-admin.ts:28`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/test/e2e-helpers/supabase-admin.ts#L28)
    - [`src/test/e2e-helpers/owner-auth.ts:6`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/test/e2e-helpers/owner-auth.ts#L6)
  - **Bundle Client**: NENHUM arquivo do runtime web exposto ao navegador (`src/features/mentor-comercial/` ou `src/lib/`) referencia ou consome `SUPABASE_SERVICE_ROLE_KEY`. Toda interação com Supabase no client utiliza a chave anônima pública e os tokens JWT da sessão do usuário autenticado.

---

## 4. Análise de Queries Cross-Store (Filtros de Escopo)

- **Arquivo Principal**: [`src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts)
- **Status**: **PARCIALMENTE CONFORME** (Dependência Exclusiva do RLS no Client)

### Apontamentos (Arquivo:Linha)
1. **[`src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts:157-174`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L157-L174)** (`loadFacts`):
   - A query para buscar fatos da oportunidade filtra apenas por `id`:
     ```typescript
     this.client.from('oportunidades').select('*').eq('id', ref.opportunityId).maybeSingle()
     ```
   - Embora o RLS no Postgres proteja o acesso cross-store, a query do cliente não inclui explicitamente `.eq('loja_id', ref.storeId)`.
2. **[`src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts:414-422`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L414-L422)** (`removeCentralAction`):
   - A remoção de ações na Central de Execução desativa registros filtrando unicamente por `source_record_id`:
     ```typescript
     this.client.from('execution_actions').update({ active: false }).eq('source_record_id', opportunityId)
     ```
   - Não há validação explícita de `store_id` no trecho da query client.

- **Recomendação**: Adicionar explicitamente os filtros `.eq('loja_id', ref.storeId)` em todas as chamadas do repositório para garantir defesa em profundidade (Defense-in-Depth), evitando confiar exclusivamente na camada RLS do banco de dados.

---

## 5. Confronto RLS: Matrix TS vs. SQL da Migration

- **Matriz de Referência**: [`src/features/mentor-comercial/security/mentorRlsMatrix.ts`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/security/mentorRlsMatrix.ts)
- **SQL Aplicado**: [`supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql)

### Divergências Encontradas

| Tabela | Perfil | Operação na Matrix TS | Permissão no SQL | Divergência / Impacto |
| :--- | :--- | :---: | :---: | :--- |
| **Catálogos Mestre** (`mentor_status_definitions`, `mentor_cadences`, `mentor_cadence_steps`, `mentor_scripts`, `mentor_transitions`) | `admin`, `area_interna_mx` | `insert`, `update`, `delete` = `true` | `GRANT SELECT ON public.%I TO authenticated` (Linha 537); `GRANT ALL ON ... TO service_role` (Linha 552) | **Divergência de GRANT**: A política RLS permite escrita para admin (linhas 436-441), porém a role do banco `authenticated` só recebeu `GRANT SELECT`. Um Admin usando o client SDK receberá erro HTTP 403 / Postgres `42501 permission denied` se tentar alterar um catálogo sem ser via `service_role`. |
| **`mentor_pending_flags`** | `gerente`, `dono`, `admin`, `area_interna_mx` | `delete` = `true` | `GRANT INSERT, UPDATE ON public.mentor_pending_flags TO authenticated` (Linha 544) | **Divergência de DELETE**: A matriz declara permissão de exclusão, mas a migration não concedeu `GRANT DELETE` para a role `authenticated`. |
| **`store_commercial_settings`** | `gerente`, `dono`, `admin`, `area_interna_mx` | `delete` = `true` | `GRANT INSERT, UPDATE ON public.store_commercial_settings TO authenticated` (Linha 544) | **Divergência de DELETE**: A matriz indica que gestores e admins podem excluir configurações da loja, mas o SQL concede apenas `INSERT` e `UPDATE` para `authenticated`. |

---

## 6. Exposição de Dados Sensíveis em Log, URL e Stack Trace

- **Status**: **CONFORME**
- **Análise**:
  - **Console Logs**: Zeradas chamadas a `console.log` com payloads de oportunidades ou clientes em produção no escopo `src/features/mentor-comercial/`.
  - **Sanitização de URLs e Breadcrumbs**: Em [`src/lib/observability/sentry.ts:100-106`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/observability/sentry.ts#L100-L106), a função `beforeBreadcrumb` higieniza parâmetros de URL via `sanitizeUrl()`.
  - **Session Replay**: Configurado com `maskAllText: true` e `maskAllInputs: true` em [`src/lib/observability/sentry.ts:67-68`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/observability/sentry.ts#L67-L68), garantindo que dados exibidos na tela do usuário não sejam gravados em replay.

---

## 7. Variáveis de Ambiente e Exposição ao Client

- **Variáveis com Prefixo público `VITE_` (Lidas no Client)**:
  - `VITE_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_URL` ([`src/lib/supabase.ts:10-11`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/supabase.ts#L10-L11))
  - `VITE_SUPABASE_ANON_KEY` / `VITE_PUBLIC_SUPABASE_ANON_KEY` ([`src/lib/supabase.ts:15-16`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/supabase.ts#L15-L16))
  - `VITE_SENTRY_DSN` ([`src/lib/observability/sentry.ts:38`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/observability/sentry.ts#L38))
  - `VITE_SENTRY_ENVIRONMENT` ([`src/lib/observability/sentry.ts:46`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/observability/sentry.ts#L46))
  - `VITE_SENTRY_TRACES_SAMPLE_RATE` ([`src/lib/observability/sentry.ts:50`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/lib/observability/sentry.ts#L50))
  - `VITE_VAPID_PUBLIC_KEY` ([`src/features/notificacoes/hooks/usePushNotifications.ts:100`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/notificacoes/hooks/usePushNotifications.ts#L100))
  - `VITE_MX_ADMIN_MASTER_EMAILS` ([`src/features/agenda/components/GoogleCalendarStatus.tsx:18`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/agenda/components/GoogleCalendarStatus.tsx#L18))
  - `VITE_ENABLE_DEV_AUTH_BYPASS` ([`src/hooks/auth/authHelpers.ts:57`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/hooks/auth/authHelpers.ts#L57))

- **Variáveis Privadas / Seguras (Protegidas do Bundler)**:
  - `SUPABASE_SERVICE_ROLE_KEY` (usada apenas em ambiente Node.js / E2E)
  - `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY` (servidor/AI)
  - `SENTRY_AUTH_TOKEN` (usada somente no build para upload de sourcemaps pelo Vite)

- **Status**: **CONFORME**. Nenhuma variável sensível ou privada de servidor é importada ou vazada para o pacote final do cliente Vite.
