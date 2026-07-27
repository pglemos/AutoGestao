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
-- central. A substituição abaixo preserva integralmente a versão remota da
-- função e altera apenas o gate de autorização e sua mensagem.
DO $$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.admin_create_store(jsonb)'::regprocedure)
    INTO v_definition;

  IF position(
    'IF v_caller_role NOT IN (''administrador_geral'', ''administrador_mx'') THEN'
    IN v_definition
  ) = 0 THEN
    RAISE EXCEPTION 'Gate esperado não encontrado em public.admin_create_store(jsonb).';
  END IF;

  v_definition := replace(
    v_definition,
    'IF v_caller_role NOT IN (''administrador_geral'', ''administrador_mx'') THEN',
    'IF NOT public.eh_area_interna_mx(v_caller_id) THEN'
  );
  v_definition := replace(
    v_definition,
    'Apenas administradores MX podem criar lojas.',
    'Apenas a área interna MX pode criar lojas.'
  );
  EXECUTE v_definition;

  SELECT pg_get_functiondef('public.admin_update_store(uuid,jsonb)'::regprocedure)
    INTO v_definition;

  IF position(
    'IF v_caller_role NOT IN (''administrador_geral'', ''administrador_mx'') THEN'
    IN v_definition
  ) = 0 THEN
    RAISE EXCEPTION 'Gate esperado não encontrado em public.admin_update_store(uuid,jsonb).';
  END IF;

  v_definition := replace(
    v_definition,
    'IF v_caller_role NOT IN (''administrador_geral'', ''administrador_mx'') THEN',
    'IF NOT public.eh_area_interna_mx(v_caller_id) THEN'
  );
  v_definition := replace(
    v_definition,
    'Apenas administradores MX podem editar lojas.',
    'Apenas a área interna MX pode editar lojas.'
  );
  EXECUTE v_definition;
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
  actor_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  store_id uuid REFERENCES public.lojas(id) ON DELETE SET NULL,
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
  'Trilha imutável das mutações globais executadas pelos três perfis internos MX.';

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
-- 4. Remover das publicações apenas as tabelas que não eram publicadas antes desta migração.
-- 5. Manter internal_mx_admin_audit para retenção forense; não descartar histórico.
