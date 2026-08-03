-- ============================================================================
-- RLS Regression Matrix — Setup / Fixtures
--
-- These fixtures target the current canonical schema after the 2026 domain
-- rename.  The tables are Portuguese, but their legacy column names remain
-- English (for example lojas.name and vinculos_loja.store_id).
-- ============================================================================

\set ON_ERROR_STOP on
SET search_path = public, pg_catalog;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Supabase local's auth schema is present in CI.  Keep this conditional so the
-- SQL remains usable against a plain PostgreSQL snapshot as well.
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    INSERT INTO auth.users (id, email, instance_id, aud, role, email_confirmed_at)
    VALUES
      ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@test.local',    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now()),
      ('aaaaaaaa-0000-0000-0000-000000000002', 'dono@test.local',     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now()),
      ('aaaaaaaa-0000-0000-0000-000000000003', 'gerente@test.local',  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now()),
      ('aaaaaaaa-0000-0000-0000-000000000004', 'vendedor@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now()),
      ('aaaaaaaa-0000-0000-0000-000000000005', 'outsider@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', now())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END$do$;

INSERT INTO public.lojas (id, name, active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Loja A (fixture)', true),
  ('22222222-2222-2222-2222-222222222222', 'Loja B (fixture)', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, active = EXCLUDED.active;

INSERT INTO public.usuarios (id, role, name, email, active)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'administrador_mx', 'Admin Fixture',    'admin@test.local',    true),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'dono',             'Dono Fixture',     'dono@test.local',     true),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'gerente',          'Gerente Fixture',  'gerente@test.local',  true),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'vendedor',         'Vendedor Fixture', 'vendedor@test.local', true),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'vendedor',         'Outsider Fixture', 'outsider@test.local', true)
ON CONFLICT (id) DO UPDATE
SET role = EXCLUDED.role, name = EXCLUDED.name, email = EXCLUDED.email, active = EXCLUDED.active;

INSERT INTO public.vinculos_loja (user_id, store_id, role, is_active)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'dono',     true),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'gerente',  true),
  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'vendedor', true),
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'vendedor', true),
  ('aaaaaaaa-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'vendedor', true)
ON CONFLICT DO NOTHING;

INSERT INTO public.vendedores_loja (id, store_id, seller_user_id, started_at, is_active)
VALUES
  ('cccccccc-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', CURRENT_DATE, true),
  ('cccccccc-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', CURRENT_DATE, true),
  ('cccccccc-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000005', CURRENT_DATE, true)
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    seller_user_id = EXCLUDED.seller_user_id,
    started_at = EXCLUDED.started_at,
    is_active = EXCLUDED.is_active;

INSERT INTO public.clientes (id, loja_id, seller_user_id, nome, telefone)
VALUES
  ('12111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', 'Cliente Fixture Próprio', '5511999990001'),
  ('12111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', 'Cliente Fixture Compartilhado Aberto', '5511999990002'),
  ('12111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000005', 'Cliente Fixture Compartilhado Fechado', '5511999990003'),
  ('12111111-1111-1111-1111-111111111114', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-0000-0000-0000-000000000005', 'Cliente Fixture Outra Loja', '5511999990004')
ON CONFLICT (id) DO UPDATE
SET loja_id = EXCLUDED.loja_id,
    seller_user_id = EXCLUDED.seller_user_id,
    nome = EXCLUDED.nome,
    telefone = EXCLUDED.telefone;

INSERT INTO public.oportunidades (id, cliente_id, loja_id, seller_user_id, etapa, closed_at)
VALUES
  ('13111111-1111-1111-1111-111111111111', '12111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', 'prospeccao', NULL),
  ('13111111-1111-1111-1111-111111111112', '12111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000004', 'ganho', now())
ON CONFLICT (id) DO UPDATE
SET cliente_id = EXCLUDED.cliente_id,
    loja_id = EXCLUDED.loja_id,
    seller_user_id = EXCLUDED.seller_user_id,
    etapa = EXCLUDED.etapa,
    closed_at = EXCLUDED.closed_at;

INSERT INTO public.lancamentos_diarios (
  id, store_id, seller_user_id, reference_date, metric_scope
)
VALUES (
  'dddddddd-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-0000-0000-0000-000000000004',
  CURRENT_DATE,
  'daily'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.metas (id, store_id, user_id, month, year, target)
VALUES (
  'eeeeeeee-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-0000-0000-0000-000000000004',
  EXTRACT(MONTH FROM CURRENT_DATE)::int,
  EXTRACT(YEAR FROM CURRENT_DATE)::int,
  10000
)
ON CONFLICT (id) DO UPDATE
SET store_id = EXCLUDED.store_id,
    user_id = EXCLUDED.user_id,
    month = EXCLUDED.month,
    year = EXCLUDED.year,
    target = EXCLUDED.target;

INSERT INTO public.logs_auditoria (id, user_id, action, entity, entity_id, details_json)
VALUES (
  'ffffffff-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'setup_fixture',
  'rls_matrix',
  '11111111-1111-1111-1111-111111111111',
  '{"source":"rls-matrix"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.role_assignments_audit (id, user_id, role_name, assigned_by, action)
VALUES (
  'fafafafa-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'gerente',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'fixture'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.veiculos_estoque (id, loja_id, created_by, marca, modelo, status)
VALUES (
  'eeeeeeee-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'Fixture',
  'Estoque',
  'disponivel'
)
ON CONFLICT (id) DO UPDATE
SET loja_id = EXCLUDED.loja_id,
    created_by = EXCLUDED.created_by,
    status = EXCLUDED.status;

-- RLS tests need table privileges in order to reach the policy layer.  The
-- grants are scoped to this ephemeral test database; production access stays
-- governed by the migration-owned grants and RLS policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.lojas,
  public.usuarios,
  public.vinculos_loja,
  public.vendedores_loja,
  public.lancamentos_diarios,
  public.metas,
  public.logs_auditoria,
  public.role_assignments_audit,
  public.veiculos_estoque,
  public.clientes,
  public.oportunidades
TO anon, authenticated;

CREATE SCHEMA IF NOT EXISTS rls_matrix;

CREATE OR REPLACE FUNCTION rls_matrix.assume(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', p_user_id, 'role', 'authenticated')::text,
                     true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

CREATE OR REPLACE FUNCTION rls_matrix.assume_anon()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{}', true);
  EXECUTE 'SET LOCAL ROLE anon';
END;
$$;

-- The matrix runs its assertions as anon/authenticated, so the test-only
-- helper schema must be callable after SET LOCAL ROLE.  These grants do not
-- change any application table or policy privilege.
GRANT USAGE ON SCHEMA rls_matrix TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rls_matrix.assume(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rls_matrix.assume_anon() TO anon, authenticated;
