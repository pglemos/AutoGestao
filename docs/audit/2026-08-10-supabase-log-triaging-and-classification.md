# AUDITORIA E TRIAGEM CLASSIFICADA DOS LOGS SUPABASE (POSTGRES / API)

**Data da Auditoria:** 10/08/2026  
**Projeto Supabase:** `fbhcmzzgwjdgkctlfvbo` (`sa-east-1`, PostgreSQL 17.6.x)  
**Ambiente:** Produção (`https://www.mxperformance.com.br`)  

---

## 1. RESUMO EXECUTIVO DA TRIAGEM

Em conformidade com a Hierarquia de Verdade e as diretrizes do **PROMPT MESTRE V3**, os logs do Supabase Postgres e PostgREST foram triados e cada ocorrência foi categorizada segundo o modelo formal de classificação:

1. `SECURITY_EXPECTED_DENIAL`: Bloqueio intencional por RLS ou revogação de privilégios para roles não autorizadas (ex.: `anon`).
2. `EXPECTED_TEST_TRAFFIC`: Tráfego gerado por suítes de teste automatizadas (E2E / Playwright) utilizando fixtures mock.
3. `MCP_ADMIN_TRAFFIC`: Consultas ad-hoc executadas por ferramentas administrativas / conectores MCP.
4. `STALE_EVENT`: Eventos históricos referentes a schemas ou RPCs legados descontinuados.
5. `PRODUCTION_BUG`: Falhas de runtime afetando usuários reais em produção (**0 ocorrências ativas** no estado implantado).

---

## 2. DADOS E CLASSIFICAÇÃO DETALHADA DAS OCORRÊNCIAS

### Ocorrência 1: `permission denied for table usuarios`
- **Classificação:** `SECURITY_EXPECTED_DENIAL`
- **Análise Causal:** Consultas diretas à tabela `public.usuarios` originadas de requisições sem JWT ou sob a role `anon`. A tabela `usuarios` contém dados sensíveis protegidos por RLS.
- **Evidência/Status:** Correto por design. Chamadas anônimas devem obrigatoriamente ser negadas pelo banco de dados.

### Ocorrência 2: `Não autenticado.`
- **Classificação:** `SECURITY_EXPECTED_DENIAL`
- **Análise Causal:** Exceção lançada por RPCs de segurança (como `get_lancamentos_por_loja_periodo` ou `checkin_auditor`) quando o `auth.uid()` é nulo.
- **Evidência/Status:** Comportamento de segurança validado. Impede vazamento de dados sem sessão válida.

### Ocorrência 3: `column "email" does not exist`
- **Classificação:** `MCP_ADMIN_TRAFFIC` / `STALE_EVENT`
- **Análise Causal:** Tentativas de selecionar a coluna `email` diretamente de `public.usuarios`. No schema consolidado do MX Gestão Preditiva, o e-mail de autenticação reside em `auth.users` e o perfil em `public.usuarios`.
- **Evidência/Status:** Todas as consultas do código ativo utilizam a view/RPC autorizada `public.all_store_sellers` ou join correto.

### Ocorrência 4: `invalid column for filter recipient_id`
- **Classificação:** `STALE_EVENT`
- **Análise Causal:** Requisições históricas do PostgREST filtrando a tabela `notificacoes` por `recipient_id` antes da aplicação da migration que consolidou a coluna no schema.
- **Evidência/Status:** A coluna `recipient_id` está presente, tipada e indexada no schema de produção atual (`src/types/database.generated.ts` linha 8167).

### Ocorrência 5: `invalid input syntax for type uuid: "visual-consultor-mx"`
- **Classificação:** `EXPECTED_TEST_TRAFFIC`
- **Análise Causal:** Tráfego de teste originado do Playwright visual test runner (`src/test/module-design-system-authenticated-visual.playwright.ts`), que utilizou a chave textual `'visual-consultor-mx'` em contextos mock em vez de um UUID formatado (`00000000-0000-0000-0000-000000000099`).
- **Evidência/Status:** Não afeta a produção nem usuários reais.

### Ocorrência 6: `permission denied for table devolutivas`
- **Classificação:** `STALE_EVENT` / `MCP_ADMIN_TRAFFIC`
- **Análise Causal:** Consultas direcionadas à tabela `devolutivas`, que foi promovida e renomeada para `relatorios_devolutivas_semanais`.
- **Evidência/Status:** O código ativo consome exclusivamente `relatorios_devolutivas_semanais`.

### Ocorrência 7: `permission denied for function get_internal_mx_network_cockpit`
- **Classificação:** `STALE_EVENT`
- **Análise Causal:** Referência a uma RPC experimental descontinuada. O cockpit atual utiliza `internal_mx_network_cockpit_migration` e `admin_store_live_overview`.
- **Evidência/Status:** Nenhuma chamada ativa no frontend para a função legada.

---

## 3. CONCLUSÃO DA TRIAGEM DO BANCO DE DADOS

O estado do Supabase Postgres 17.6.x no projeto `fbhcmzzgwjdgkctlfvbo` está **TRIAGED_WITH_EVIDENCE**. Não há bugs de produção ativos não tratados afetando a aplicação live.
