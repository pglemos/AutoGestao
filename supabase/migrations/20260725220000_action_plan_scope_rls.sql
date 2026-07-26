-- Reaplica RLS por escopo na tabela canônica; a política histórica era global.

BEGIN;

DROP POLICY IF EXISTS planos_read ON public.planos_acao;
CREATE POLICY planos_read
  ON public.planos_acao
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_mx_scope(scope_type, scope_id)
    OR responsavel_id = auth.uid()
  );

DROP POLICY IF EXISTS planos_write ON public.planos_acao;
CREATE POLICY planos_write
  ON public.planos_acao
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_mx_action_scope(scope_type, scope_id)
  );

DROP POLICY IF EXISTS planos_update ON public.planos_acao;
CREATE POLICY planos_update
  ON public.planos_acao
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_mx_action_scope(scope_type, scope_id)
    OR responsavel_id = auth.uid()
  )
  WITH CHECK (
    public.can_manage_mx_action_scope(scope_type, scope_id)
    OR responsavel_id = auth.uid()
  );

DROP POLICY IF EXISTS planos_delete ON public.planos_acao;
CREATE POLICY planos_delete
  ON public.planos_acao
  FOR DELETE
  TO authenticated
  USING (
    public.can_manage_mx_action_scope(scope_type, scope_id)
    AND public.user_has_role(ARRAY['master', 'admin_mx'])
  );

COMMIT;
