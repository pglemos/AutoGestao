-- Corrige a primeira versão da auditoria aplicada antes da revisão do PR.
-- IDs de ator e loja são evidência histórica e não podem ser anulados quando
-- a entidade operacional é excluída definitivamente.

BEGIN;

ALTER TABLE public.internal_mx_admin_audit
  DROP CONSTRAINT IF EXISTS internal_mx_admin_audit_actor_id_fkey;

ALTER TABLE public.internal_mx_admin_audit
  DROP CONSTRAINT IF EXISTS internal_mx_admin_audit_store_id_fkey;

ALTER TABLE public.internal_mx_admin_audit
  ALTER COLUMN actor_id SET NOT NULL;

COMMENT ON COLUMN public.internal_mx_admin_audit.actor_id IS
  'UUID histórico do usuário executor; preservado após exclusão do cadastro.';
COMMENT ON COLUMN public.internal_mx_admin_audit.store_id IS
  'UUID histórico da loja afetada; preservado após exclusão da loja.';

COMMIT;

-- DOWN
-- Não recriar as FKs ON DELETE SET NULL: isso destruiria justamente a
-- evidência que esta migration protege. Rollback funcional mantém as colunas
-- UUID e apenas pode remover os comentários, caso necessário.
