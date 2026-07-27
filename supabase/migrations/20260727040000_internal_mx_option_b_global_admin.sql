-- Opção B: Administrador Geral, Administrador MX e Consultor MX compartilham
-- o mesmo contrato administrativo global.
--
-- Segurança preservada:
-- - nenhuma permissão de UPDATE direto em public.usuarios é restaurada;
-- - mutações de identidade continuam em Edge Functions com service_role;
-- - ações privilegiadas são registradas em trilha de auditoria imutável.

BEGIN;

CREATE OR REPLACE FUNCTION public.eh_administrador_mx(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.eh_area_interna_mx(uid)
$$;

CREATE OR REPLACE FUNCTION public.eh_admin_master_mx(uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.eh_area_interna_mx(uid)
$$;

COMMENT ON FUNCTION public.eh_administrador_mx(uuid) IS
  'Opção B: reconhece administrador_geral, administrador_mx e consultor_mx como administradores globais equivalentes.';
COMMENT ON FUNCTION public.eh_admin_master_mx(uuid) IS
  'Compatibilidade legada da Opção B; delega ao contrato da área interna MX sem whitelist por e-mail.';

REVOKE ALL ON FUNCTION public.eh_administrador_mx(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_admin_master_mx(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eh_administrador_mx(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.eh_admin_master_mx(uuid) TO authenticated, service_role;

-- As RPCs de loja tinham listas de papéis locais e ignoravam o contrato
-- central. O patch abaixo aceita tanto o estado legado quanto o estado já
-- migrado, tornando a migration reaplicável sem mascarar implementações
-- desconhecidas.
DO $$
DECLARE
  v_definition text;
  v_old_gate constant text := 'IF v_caller_role NOT IN (''administrador_geral'', ''administrador_mx'') THEN';
  v_new_gate constant text := 'IF NOT public.eh_area_interna_mx(v_caller_id) THEN';
BEGIN
  SELECT pg_get_functiondef('public.admin_create_store(jsonb)'::regprocedure)
    INTO v_definition;

  IF position(v_old_gate IN v_definition) > 0 THEN
    v_definition := replace(v_definition, v_old_gate, v_new_gate);
    v_definition := replace(
      v_definition,
      'Apenas administradores MX podem criar lojas.',
      'Apenas a área interna MX pode criar lojas.'
    );
    EXECUTE v_definition;
  ELSIF position(v_new_gate IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Gate reconhecido não encontrado em public.admin_create_store(jsonb).';
  END IF;

  SELECT pg_get_functiondef('public.admin_update_store(uuid,jsonb)'::regprocedure)
    INTO v_definition;

  IF position(v_old_gate IN v_definition) > 0 THEN
    v_definition := replace(v_definition, v_old_gate, v_new_gate);
    v_definition := replace(
      v_definition,
      'Apenas administradores MX podem editar lojas.',
      'Apenas a área interna MX pode editar lojas.'
    );
    EXECUTE v_definition;
  ELSIF position(v_new_gate IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Gate reconhecido não encontrado em public.admin_update_store(uuid,jsonb).';
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.admin_create_store(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_store(uuid,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_archive_store(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_restore_store(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_store(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_store(uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_archive_store(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_store(uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.internal_mx_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificadores deliberadamente sem FK: a auditoria deve preservar quem
  -- executou a ação e qual loja foi afetada mesmo após hard delete.
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  store_id uuid,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internal_mx_admin_audit_actor_created_idx
  ON public.internal_mx_admin_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS internal_mx_admin_audit_entity_created_idx
  ON public.internal_mx_admin_audit(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS internal_mx_admin_audit_store_created_idx
  ON public.internal_mx_admin_audit(store_id, created_at DESC);

ALTER TABLE public.internal_mx_admin_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_mx_admin_audit_select ON public.internal_mx_admin_audit;
CREATE POLICY internal_mx_admin_audit_select
  ON public.internal_mx_admin_audit
  FOR SELECT TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()));

DROP POLICY IF EXISTS internal_mx_admin_audit_no_direct_write ON public.internal_mx_admin_audit;
CREATE POLICY internal_mx_admin_audit_no_direct_write
  ON public.internal_mx_admin_audit
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.internal_mx_admin_audit FROM PUBLIC, anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.internal_mx_admin_audit FROM authenticated;
GRANT SELECT ON TABLE public.internal_mx_admin_audit TO authenticated;
GRANT ALL ON TABLE public.internal_mx_admin_audit TO service_role;

COMMENT ON TABLE public.internal_mx_admin_audit IS
  'Trilha imutável das mutações globais executadas pelos três perfis internos MX; identificadores são preservados mesmo após exclusões definitivas.';

-- Exclusão definitiva literal da Opção B. A confirmação nominal reduz erro
-- operacional; a função remove primeiro as referências RESTRICT/NO ACTION e a
-- exclusão da loja aciona os CASCADE/SET NULL definidos pelo próprio schema.
CREATE OR REPLACE FUNCTION public.admin_hard_delete_store(
  p_store_id uuid,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_store public.lojas%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR NOT public.eh_area_interna_mx(v_actor_id) THEN
    RAISE EXCEPTION 'Apenas a área interna MX pode excluir lojas definitivamente.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT public.papel_usuario(v_actor_id) INTO v_actor_role;
  SELECT * INTO v_store
  FROM public.lojas
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF coalesce(p_confirmation, '') IS DISTINCT FROM v_store.name THEN
    RAISE EXCEPTION 'A confirmação deve ser exatamente o nome da loja.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.internal_mx_admin_audit (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    store_id,
    before_data,
    after_data,
    metadata
  ) VALUES (
    v_actor_id,
    coalesce(v_actor_role, 'area_interna_mx'),
    'hard_delete',
    'loja',
    v_store.id,
    v_store.id,
    to_jsonb(v_store),
    NULL,
    jsonb_build_object('confirmation', p_confirmation)
  );

  -- Referências configuradas como RESTRICT ou NO ACTION no schema remoto.
  DELETE FROM public.d1_snapshot_items WHERE store_id = p_store_id;
  DELETE FROM public.d1_contact_audit WHERE store_id = p_store_id;
  DELETE FROM public.manager_daily_tasks WHERE store_id = p_store_id;
  DELETE FROM public.manager_lead_conferences WHERE store_id = p_store_id;
  DELETE FROM public.manager_routine_snapshots WHERE store_id = p_store_id;
  DELETE FROM public.seller_routine_snapshots WHERE store_id = p_store_id;
  DELETE FROM public.store_target_plans WHERE store_id = p_store_id;
  DELETE FROM public.solicitacoes_correcao_lancamento WHERE store_id = p_store_id;
  DELETE FROM public.d1_snapshot_batches WHERE store_id = p_store_id;

  DELETE FROM public.lojas WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store.id,
    'store_name', v_store.name,
    'deleted_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hard_delete_store(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_store(uuid,text) TO authenticated, service_role;

-- Habilita as fontes que as telas já assinam e as fontes necessárias ao
-- cockpit global de evolução e progresso. O bloco é idempotente e ignora
-- tabelas ainda não existentes em ambientes defasados.
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'planos_acao',
    'clientes_consultoria',
    'visitas_consultoria',
    'seller_routine_snapshots',
    'manager_routine_snapshots',
    'valores_indicadores_planejamento',
    'score_calculations',
    'score_history'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = v_table
       ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END
$$;

-- Confirma explicitamente que a correção crítica de privilege escalation
-- continua ativa. Mutações administrativas usam Edge Functions, não PostgREST.
REVOKE UPDATE ON public.usuarios FROM authenticated;

COMMIT;

-- DOWN (manual, preservando dados de auditoria):
-- 1. Restaurar eh_administrador_mx para somente administrador_geral/administrador_mx.
-- 2. Restaurar eh_admin_master_mx conforme a política anterior aprovada.
-- 3. Restaurar os gates originais das RPCs admin_create_store/admin_update_store.
-- 4. Revogar e remover admin_hard_delete_store(uuid,text).
-- 5. Remover das publicações apenas as tabelas que não eram publicadas antes desta migração.
-- 6. Manter internal_mx_admin_audit para retenção forense; não descartar histórico.
