-- ============================================================================
-- Grants Guard — invariantes de privilégio (Fase 1.2 / 3.1)
-- Roda sobre o banco efêmero (supabase db reset aplica TODAS as migrations),
-- portanto também prova que a cadeia de migrations converge para o estado
-- de grants esperado (sem depender de produção).
--
-- Falha ANTES das migrations 20260717270000..273000; passa DEPOIS.
-- RLS não cobre TRUNCATE/TRIGGER/REFERENCES nem EXECUTE — este guard fecha
-- o que a matriz de RLS não consegue asseverar.
-- ============================================================================
BEGIN;
SELECT plan(19);

-- 1) anon: zero privilégio em QUALQUER tabela/view de public
SELECT is(
  (SELECT count(*)::int
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon'),
  0,
  'anon: zero privilégios em relações de public'
);

-- 2) authenticated: zero privilégios que burlam RLS (TRUNCATE/TRIGGER/REFERENCES)
SELECT is(
  (SELECT count(*)::int
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'authenticated'
      AND privilege_type IN ('TRUNCATE','TRIGGER','REFERENCES')),
  0,
  'authenticated: zero TRUNCATE/TRIGGER/REFERENCES em public'
);

-- 3) Tabelas canônicas: nenhuma linha de grant para anon
SELECT is(
  (SELECT count(*)::int
     FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon'
      AND table_name IN (
        'clientes','oportunidades','agendamentos','eventos_comerciais',
        'execution_actions','notificacoes','central_execucao_aberturas',
        'carteira_missoes','carteira_missao_itens','carteira_missao_mutations',
        'usuarios','vinculos_loja','lojas')),
  0,
  'anon: zero grant nas tabelas canônicas CRM/Central/Carteira'
);

-- 4) RPCs SECURITY DEFINER de escopo NÃO executáveis por anon
SELECT is(
  (SELECT count(*)::int
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
    WHERE p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND (p.proname LIKE 'central_%' OR p.proname LIKE 'carteira_%'
           OR p.proname LIKE 'vendedor_%' OR p.proname LIKE '%missao%'
           OR p.proname LIKE '%checkin%')),
  0,
  'anon: nenhuma RPC SECURITY DEFINER de escopo executável'
);

-- 5) authenticated PRESERVA DML nas canônicas (app não quebrou)
SELECT ok(
  has_table_privilege('authenticated', 'public.execution_actions', 'SELECT')
  AND has_table_privilege('authenticated', 'public.execution_actions', 'INSERT')
  AND has_table_privilege('authenticated', 'public.execution_actions', 'UPDATE')
  AND has_table_privilege('authenticated', 'public.clientes', 'SELECT'),
  'authenticated: DML preservado nas tabelas canônicas (RLS-governed)'
);

-- 6) Default privileges do owner postgres NÃO reconcedem a anon em tabelas futuras
SELECT is(
  (SELECT count(*)::int
     FROM pg_default_acl d
     CROSS JOIN LATERAL unnest(d.defaclacl) AS acl(item)
    WHERE d.defaclnamespace = 'public'::regnamespace
      AND pg_get_userbyid(d.defaclrole) = 'postgres'
      AND d.defaclobjtype = 'r'
      AND acl.item::text LIKE 'anon=%'),
  0,
  'default privileges (postgres): anon não reconcedido em tabelas futuras'
);

-- 7) RLS predicate helpers are callable by authenticated policies, but not
-- directly by anon.  Keep this explicit list in sync with the migration that
-- owns the post-hardening helper ACLs.
WITH required(signature) AS (
  VALUES
    ('public.can_access_consulting_client(uuid)'),
    ('public.can_access_mx_scope(public.score_scope_type,uuid,uuid)'),
    ('public.check_user_role_in_store(uuid,text[])'),
    ('public.consulting_client_module_enabled(uuid,text)'),
    ('public.current_user_role_code(uuid)'),
    ('public.eh_area_interna_mx(uuid)'),
    ('public.eh_administrador_mx(uuid)'),
    ('public.is_admin()'),
    ('public.is_admin(uuid)'),
    ('public.is_manager_of(uuid)'),
    ('public.is_member_of(uuid)'),
    ('public.is_owner_of(uuid)'),
    ('public.mx_can_read_funnel_metrics(uuid,uuid)'),
    ('public.mx_can_read_score_calculation(uuid)'),
    ('public.mx_can_read_score_scope(public.score_scope_type,uuid)'),
    ('public.normalize_mx_role(text)'),
    ('public.pode_lancar_checkin(uuid,uuid,date,uuid)'),
    ('public.pode_ler_cliente_por_oportunidade(uuid)'),
    ('public.pode_ver_usuario(uuid,uuid)'),
    ('public.tem_papel_loja(uuid,text[],uuid)'),
    ('public.user_has_role(text[],uuid)'),
    ('public.user_is_master_loja(uuid,uuid)')
)
SELECT ok(
  (SELECT bool_and(has_function_privilege('authenticated', signature, 'EXECUTE')) FROM required)
  AND (SELECT bool_and(NOT has_function_privilege('anon', signature, 'EXECUTE')) FROM required),
  'RLS helpers: authenticated executa e anon não executa'
);

-- 8) Forward-only hardening must leave both auxiliary relations present with
-- RLS enabled even when their historical create migrations were skipped.
SELECT ok(
  to_regclass('public.data_correction_audit') IS NOT NULL
  AND to_regclass('public.backup_is_venda_loja_20260805') IS NOT NULL
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.data_correction_audit'))
  AND (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.backup_is_venda_loja_20260805')),
  'auxiliary audit/backup relations exist with RLS enabled'
);

-- 9) The API roles remain unable to reach the auxiliary relations through any
-- effective table privilege, including privileges inherited from PUBLIC.
SELECT ok(
  NOT EXISTS (
    SELECT 1
      FROM (VALUES
        ('anon'::text),
        ('authenticated'::text)
      ) AS roles(role_name)
      CROSS JOIN (VALUES
        ('public.data_correction_audit'::text),
        ('public.backup_is_venda_loja_20260805'::text)
      ) AS relations(relation_name)
      CROSS JOIN (VALUES
        ('SELECT'::text),
        ('INSERT'::text),
        ('UPDATE'::text),
        ('DELETE'::text),
        ('TRUNCATE'::text),
        ('REFERENCES'::text),
        ('TRIGGER'::text)
      ) AS privileges(privilege_name)
     WHERE has_table_privilege(
       roles.role_name,
       relations.relation_name,
       privileges.privilege_name
     )
  ),
  'auxiliary audit/backup relations: anon/authenticated sem grants'
);

-- 10) The operational service role retains the access needed for audit writes
-- and controlled recovery, without reopening the API surface.
SELECT ok(
  has_table_privilege('service_role', 'public.data_correction_audit', 'SELECT')
  AND has_table_privilege('service_role', 'public.data_correction_audit', 'INSERT')
  AND has_table_privilege('service_role', 'public.backup_is_venda_loja_20260805', 'SELECT'),
  'service_role: audit/backup access preserved'
);

-- 11) Policies are explicit, restrictive in effect, and idempotently
-- recreated by the forward-only hardening migration.  Check the catalog
-- expressions because a policy name alone does not prove a deny policy.
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'data_correction_audit'
       AND policyname = 'service_role_manage_data_correction_audit'
       AND roles = ARRAY['service_role']::name[]
       AND permissive = 'PERMISSIVE'
       AND cmd = 'ALL'
       AND qual = 'true'
       AND with_check = 'true'
  )
  AND EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'backup_is_venda_loja_20260805'
       AND policyname = 'deny_api_backup_is_venda_loja_20260805'
       AND roles = ARRAY['anon', 'authenticated']::name[]
       AND permissive = 'PERMISSIVE'
       AND cmd = 'ALL'
       AND qual = 'false'
       AND with_check = 'false'
  ),
  'auxiliary audit/backup policies are explicit'
);

-- 12-19) Policy-layer probes: temporarily grant DML only inside savepoints so
-- the test can exercise the deny policy itself.  The grants roll back before
-- the next role and cannot change the migration-owned ACL state.
SAVEPOINT auxiliary_api_policy_probe_anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.backup_is_venda_loja_20260805
  TO anon, authenticated;
INSERT INTO public.backup_is_venda_loja_20260805 DEFAULT VALUES;
SELECT rls_matrix.assume_anon();
SELECT is(
  (SELECT count(*)::int FROM public.backup_is_venda_loja_20260805),
  0,
  'anon: backup deny policy blocks SELECT'
);
SELECT is(
  rls_matrix.dml_count($$INSERT INTO public.backup_is_venda_loja_20260805 DEFAULT VALUES$$),
  0::bigint,
  'anon: backup deny policy blocks INSERT'
);
SELECT is(
  rls_matrix.dml_count($$UPDATE public.backup_is_venda_loja_20260805 SET id = id$$),
  0::bigint,
  'anon: backup deny policy blocks UPDATE'
);
SELECT is(
  rls_matrix.dml_count($$DELETE FROM public.backup_is_venda_loja_20260805$$),
  0::bigint,
  'anon: backup deny policy blocks DELETE'
);
ROLLBACK TO SAVEPOINT auxiliary_api_policy_probe_anon;
RESET ROLE;

SAVEPOINT auxiliary_api_policy_probe_authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.backup_is_venda_loja_20260805
  TO anon, authenticated;
INSERT INTO public.backup_is_venda_loja_20260805 DEFAULT VALUES;
SELECT rls_matrix.assume('aaaaaaaa-0000-0000-0000-000000000004'::uuid);
SELECT is(
  (SELECT count(*)::int FROM public.backup_is_venda_loja_20260805),
  0,
  'authenticated: backup deny policy blocks SELECT'
);
SELECT is(
  rls_matrix.dml_count($$INSERT INTO public.backup_is_venda_loja_20260805 DEFAULT VALUES$$),
  0::bigint,
  'authenticated: backup deny policy blocks INSERT'
);
SELECT is(
  rls_matrix.dml_count($$UPDATE public.backup_is_venda_loja_20260805 SET id = id$$),
  0::bigint,
  'authenticated: backup deny policy blocks UPDATE'
);
SELECT is(
  rls_matrix.dml_count($$DELETE FROM public.backup_is_venda_loja_20260805$$),
  0::bigint,
  'authenticated: backup deny policy blocks DELETE'
);
ROLLBACK TO SAVEPOINT auxiliary_api_policy_probe_authenticated;
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
