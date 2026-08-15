-- Módulo Administrador MX — edição avançada de usuário da equipe.
--
-- Fecha a paridade da rota /equipe com o Base44 (UserEditModal, 4 abas):
--   1. Dados pessoais  → colunas novas em usuarios (nullable, aditivo).
--   2. Papéis e visões → user_roles ganha is_primary/status/vigência/motivo
--      (bridge canônica de papéis; a escrita passa a ser restrita à área
--      interna MX, e o read permanece self-or-admin).
--   3. Lojas e equipes → vinculos_equipe_loja (StoreAssignment do Base44).
--   4. Acesso e situação → usuarios.active + delegacoes_gerenciais.
--
-- Papel principal (is_primary) tem garantia no banco: no máximo uma
-- concessão ativa principal por usuário (índice único parcial).

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. usuarios — campos pessoais adicionais (todos nullable, sem tocar o resto)
-- ----------------------------------------------------------------------------

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS preferred_name     text,
  ADD COLUMN IF NOT EXISTS birth_date         date,
  ADD COLUMN IF NOT EXISTS declared_function  text,
  ADD COLUMN IF NOT EXISTS entry_date         date,
  ADD COLUMN IF NOT EXISTS notes              text,
  ADD COLUMN IF NOT EXISTS relationship_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_view       text;

COMMENT ON COLUMN public.usuarios.default_view IS
  'Visão padrão ao entrar (DONO/GERENCIAL/VENDEDOR/DEPARTAMENTAL) — Base44 UserProfile.default_view.';

-- ----------------------------------------------------------------------------
-- 2. user_roles — concessão de papel com ciclo de vida e papel principal
-- ----------------------------------------------------------------------------

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS is_primary   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS valid_from   date,
  ADD COLUMN IF NOT EXISTS valid_until  date,
  ADD COLUMN IF NOT EXISTS change_reason text;

-- No máximo um papel principal ativo por usuário.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_roles_primary_per_user
  ON public.user_roles (user_id)
  WHERE is_primary AND status = 'ativo';

-- A escrita na bridge de papéis passa a ser da área interna MX (antes negada
-- para todos); leitura permanece self-or-admin.
DROP POLICY IF EXISTS user_roles_write_interna ON public.user_roles;
CREATE POLICY user_roles_write_interna
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.eh_area_interna_mx())
  WITH CHECK (public.eh_area_interna_mx());

DROP POLICY IF EXISTS user_roles_write_denied ON public.user_roles;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_roles TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. vinculos_equipe_loja — lojas e equipes (Base44 StoreAssignment)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vinculos_equipe_loja (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  loja_id          uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  loja_nome        text NOT NULL CHECK (length(trim(loja_nome)) > 0),
  assignment_type  text NOT NULL DEFAULT 'usuario_operacional'
                   CHECK (assignment_type IN ('responsavel_principal', 'corresponsavel', 'acesso_adicional', 'usuario_operacional', 'substituicao_temporaria')),
  is_primary       boolean NOT NULL DEFAULT false,
  valid_from       date,
  valid_until      date,
  status           text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_vinculos_equipe_loja_user
  ON public.vinculos_equipe_loja (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vinculos_equipe_loja_primary
  ON public.vinculos_equipe_loja (user_id)
  WHERE is_primary AND status = 'ativo';

-- ----------------------------------------------------------------------------
-- 4. delegacoes_gerenciais — delegação com motivo e vigência (Base44 ManagerDelegation)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.delegacoes_gerenciais (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  loja_id         uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  loja_nome       text NOT NULL CHECK (length(trim(loja_nome)) > 0),
  nivel_acesso    text NOT NULL CHECK (length(trim(nivel_acesso)) > 0),
  valid_from      date,
  valid_until     date NOT NULL,
  motivo          text,
  autorizado_por  text,
  status          text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_from IS NULL OR valid_until >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_delegacoes_gerenciais_user
  ON public.delegacoes_gerenciais (user_id, status);

-- ----------------------------------------------------------------------------
-- 5. RLS — as duas tabelas novas seguem o padrão interno MX
-- ----------------------------------------------------------------------------

ALTER TABLE public.vinculos_equipe_loja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegacoes_gerenciais ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['vinculos_equipe_loja', 'delegacoes_gerenciais'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_select ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_select ON public.%I FOR SELECT TO authenticated USING (public.eh_area_interna_mx())',
      t, t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I_interna_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_interna_write ON public.%I FOR ALL TO authenticated USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx())',
      t, t
    );
  END LOOP;
END $$;

REVOKE ALL ON public.vinculos_equipe_loja FROM PUBLIC;
REVOKE ALL ON public.delegacoes_gerenciais FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vinculos_equipe_loja TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delegacoes_gerenciais TO authenticated;

COMMENT ON TABLE public.vinculos_equipe_loja IS
  'Vínculo de usuário da equipe MX a lojas (Base44 StoreAssignment).';
COMMENT ON TABLE public.delegacoes_gerenciais IS
  'Delegação gerencial temporária com motivo e vigência (Base44 ManagerDelegation).';

COMMIT;
