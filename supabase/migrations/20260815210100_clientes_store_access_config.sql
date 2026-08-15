-- Módulo Administrador MX — rota /clientes: lojas, horários de funcionamento,
-- pessoas e acessos, link de autocadastro, configuração por cliente e etapas
-- de onboarding.
--
-- O Base44 guarda esses dados nas entidades Store, StoreOperatingHour,
-- UserProfile, RoleGrant, StoreAssignment, ClientCapabilityConfig e
-- ClientOnboardingStageInstance. No MX, a loja do cliente é a tabela
-- `unidades_cliente_consultoria` (já usada pela Visão 360); aqui ela ganha os
-- campos de cadastro do Base44 (tipo, CNPJ, endereço, fuso, status) e as novas
-- tabelas cobrem horário por dia da semana, pessoas com papéis/lojas, link de
-- autocadastro com validade/limite e a configuração operacional do cliente.
--
-- Valores em minúsculas, seguindo a convenção das tabelas MX (ativo, inativo).

-- ---------------------------------------------------------------------------
-- 1. unidades_cliente_consultoria — campos de cadastro da loja (Base44 Store)
-- ---------------------------------------------------------------------------
ALTER TABLE public.unidades_cliente_consultoria
  ADD COLUMN IF NOT EXISTS store_type text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS internal_code text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_zip text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS working_days text,
  ADD COLUMN IF NOT EXISTS opening_time text,
  ADD COLUMN IF NOT EXISTS closing_time text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS opening_date date,
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.unidades_cliente_consultoria
  DROP CONSTRAINT IF EXISTS unidades_cliente_consultoria_store_type_check;
ALTER TABLE public.unidades_cliente_consultoria
  ADD CONSTRAINT unidades_cliente_consultoria_store_type_check
  CHECK (store_type IS NULL OR store_type IN ('matriz', 'filial'));

ALTER TABLE public.unidades_cliente_consultoria
  DROP CONSTRAINT IF EXISTS unidades_cliente_consultoria_status_check;
ALTER TABLE public.unidades_cliente_consultoria
  ADD CONSTRAINT unidades_cliente_consultoria_status_check
  CHECK (status IN ('ativa', 'inativa'));

COMMENT ON COLUMN public.unidades_cliente_consultoria.store_type IS
  'matriz ou filial — tipo estrutural da loja do cliente.';
COMMENT ON COLUMN public.unidades_cliente_consultoria.status IS
  'ativa ou inativa — situação operacional da loja.';

-- ---------------------------------------------------------------------------
-- 2. horarios_funcionamento_unidade — horário por dia da semana (Base44 StoreOperatingHour)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.horarios_funcionamento_unidade (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id    uuid NOT NULL REFERENCES public.unidades_cliente_consultoria(id) ON DELETE CASCADE,
  day_of_week   text NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  is_open       boolean NOT NULL DEFAULT false,
  opening_time  text CHECK (opening_time IS NULL OR opening_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  closing_time  text CHECK (closing_time IS NULL OR closing_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  status        text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  origin        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Um horário ativo por dia de unidade; o histórico arquivado fica preservado.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_horarios_funcionamento_unidade_dia
  ON public.horarios_funcionamento_unidade (unidade_id, day_of_week)
  WHERE status = 'ativo';

-- ---------------------------------------------------------------------------
-- 3. acessos_cliente_consultoria — pessoas e acessos do cliente (Base44 UserProfile/RoleGrant/StoreAssignment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.acessos_cliente_consultoria (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  nome               text NOT NULL CHECK (length(trim(nome)) > 0),
  email              text NOT NULL,
  telefone           text,
  funcao_declarada   text,
  papeis             jsonb NOT NULL DEFAULT '[]'::jsonb,
  lojas_autorizadas  jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_dono_master     boolean NOT NULL DEFAULT false,
  visao_padrao       text,
  status             text NOT NULL DEFAULT 'em_preparacao' CHECK (status IN ('em_preparacao', 'ativo', 'inativo')),
  created_by         uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acessos_cliente_client
  ON public.acessos_cliente_consultoria (client_id);

-- ---------------------------------------------------------------------------
-- 4. links_autocadastro_cliente — link de autocadastro com validade e limite de usos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.links_autocadastro_cliente (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE CHECK (length(token) >= 8),
  perfil_acesso   text NOT NULL,
  nome_interno    text,
  validade_dias   integer NOT NULL DEFAULT 7 CHECK (validade_dias BETWEEN 1 AND 30),
  limite_usos     integer NOT NULL DEFAULT 10 CHECK (limite_usos BETWEEN 1 AND 100),
  usos_consumidos integer NOT NULL DEFAULT 0 CHECK (usos_consumidos >= 0),
  status          text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'expirado', 'limite_atingido', 'cancelado')),
  created_by      uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_links_autocadastro_client
  ON public.links_autocadastro_cliente (client_id, status);

-- ---------------------------------------------------------------------------
-- 5. configuracoes_cliente_consultoria — configuração operacional por cliente
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes_cliente_consultoria (
  client_id                  uuid PRIMARY KEY REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  tolerancia_fechamento_min  integer NOT NULL DEFAULT 30 CHECK (tolerancia_fechamento_min BETWEEN 0 AND 240),
  limite_vendedores          integer NOT NULL DEFAULT 10 CHECK (limite_vendedores BETWEEN 1 AND 100),
  retencao_snapshots_dias    integer NOT NULL DEFAULT 90 CHECK (retencao_snapshots_dias BETWEEN 1 AND 365),
  canal_critico              text NOT NULL DEFAULT 'whatsapp' CHECK (canal_critico IN ('whatsapp', 'email', 'ambos')),
  canal_atencao              text NOT NULL DEFAULT 'email' CHECK (canal_atencao IN ('whatsapp', 'email', 'ambos')),
  janela_envio               text NOT NULL DEFAULT '08h às 19h',
  updated_by                 uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. clientes_consultoria — etapas de onboarding com continuidade
-- ---------------------------------------------------------------------------
ALTER TABLE public.clientes_consultoria
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 7),
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clientes_consultoria.onboarding_step IS
  'Etapa atual do onboarding do cliente (1..7). Guia o botão "Continuar onboarding".';
COMMENT ON COLUMN public.clientes_consultoria.onboarding_completed IS
  'true quando o onboarding terminou — esconde o botão "Continuar onboarding".';

-- ---------------------------------------------------------------------------
-- RLS: todo o bloco é material interno MX (mesmo padrão das migrations admin)
-- ---------------------------------------------------------------------------
ALTER TABLE public.horarios_funcionamento_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acessos_cliente_consultoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links_autocadastro_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_cliente_consultoria ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'horarios_funcionamento_unidade',
    'acessos_cliente_consultoria',
    'links_autocadastro_cliente',
    'configuracoes_cliente_consultoria'
  ] LOOP
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

REVOKE ALL ON public.horarios_funcionamento_unidade FROM PUBLIC;
REVOKE ALL ON public.acessos_cliente_consultoria FROM PUBLIC;
REVOKE ALL ON public.links_autocadastro_cliente FROM PUBLIC;
REVOKE ALL ON public.configuracoes_cliente_consultoria FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horarios_funcionamento_unidade TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acessos_cliente_consultoria TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.links_autocadastro_cliente TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_cliente_consultoria TO authenticated;

COMMENT ON TABLE public.horarios_funcionamento_unidade IS
  'Horário semanal de funcionamento de uma loja do cliente (um registro por dia).';
COMMENT ON TABLE public.acessos_cliente_consultoria IS
  'Pessoas e acessos do cliente: nome, e-mail, papéis, lojas autorizadas e Dono Master.';
COMMENT ON TABLE public.links_autocadastro_cliente IS
  'Link de autocadastro para a equipe do cliente, com validade em dias e limite de usos.';
COMMENT ON TABLE public.configuracoes_cliente_consultoria IS
  'Configuração operacional por cliente: tolerância de fechamento, limite de vendedores, retenção e canais de notificação.';
