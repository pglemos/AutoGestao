-- CRÍTICO — auditoria de 2026-07-24.
--
-- A policy RLS `usuarios_update` permite `id = auth.uid() OR eh_administrador_mx()`,
-- ou seja, qualquer usuário pode dar UPDATE na PRÓPRIA linha via PostgREST direto.
-- RLS só filtra QUAIS LINHAS, nunca QUAIS COLUNAS — e `authenticated` tinha grant
-- de UPDATE em TODAS as 13 colunas de public.usuarios, incluindo `role`, `role_id`,
-- `active` e `must_change_password`.
--
-- Resultado: qualquer conta autenticada (até um vendedor recém-cadastrado) podia
-- mandar um PATCH em /rest/v1/usuarios?id=eq.<seu-proprio-id> com
-- {"role":"administrador_geral","active":true} e se auto-promover a admin master,
-- contornando toda checagem de papel do app (frontend, Edge Functions, tudo).
--
-- Confirmado que nenhum código do app depende do UPDATE direto na tabela — todo
-- self-service de perfil já passa por `update_my_profile` (SECURITY DEFINER,
-- só toca name/phone/avatar_url, independe de grant de tabela). Revogar o UPDATE
-- direto não quebra nenhum fluxo existente.

BEGIN;

REVOKE UPDATE ON public.usuarios FROM authenticated;

COMMIT;
