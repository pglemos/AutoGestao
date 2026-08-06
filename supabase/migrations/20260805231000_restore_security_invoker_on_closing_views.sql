-- Restaura `security_invoker = true` nas views recriadas em 20260805223000.
--
-- Causa: `CREATE OR REPLACE VIEW` não preserva reloptions. As três views
-- haviam recebido `security_invoker = true` em 20260717190000 justamente para
-- que a RLS de `lancamentos_diarios` valesse para quem consulta. Ao recriá-las
-- para excluir rascunho, a opção foi perdida e elas voltaram a rodar com os
-- privilégios do dono — ou seja, sem RLS.
--
-- Verificado após 20260805223000: pg_class.reloptions = NULL nas três.
--
-- Impacto real limitado (nenhum código do app lê essas views e `anon` não tem
-- SELECT), mas é exatamente o tipo de brecha que passa despercebida: a próxima
-- tela que usar a view enxergaria a rede inteira.

ALTER VIEW public.view_daily_team_status SET (security_invoker = true);
ALTER VIEW public.view_sem_registro SET (security_invoker = true);
ALTER VIEW public.view_store_daily_production SET (security_invoker = true);

-- DOWN (compensatória, forward-only):
-- ALTER VIEW ... RESET (security_invoker); — não fazer: remover a opção
-- reintroduz a execução com privilégio do dono.
