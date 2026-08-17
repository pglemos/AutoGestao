-- Paridade /clientes com o Base44 — lifecycle e aprovação de autocadastro.
--
-- Este arquivo documenta/regista o esquema que já está aplicado no banco
-- (aplicado via _sql_runner durante a paridade). Versão não registrada no
-- ledger, usada para reprodutibilidade de um reset a partir das migrations.
-- Tudo idempotente: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.

-- ---------------------------------------------------------------------------
-- 1. clientes_consultoria — colunas de lifecycle de paridade
-- ---------------------------------------------------------------------------
ALTER TABLE public.clientes_consultoria
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_activation_at date;

COMMENT ON COLUMN public.clientes_consultoria.suspended_at IS
  'Data em que o cliente foi suspenso (status derivado: suspenso).';
COMMENT ON COLUMN public.clientes_consultoria.suspended_reason IS
  'Motivo registrado na suspensão do cliente.';
COMMENT ON COLUMN public.clientes_consultoria.activated_at IS
  'Data em que o cliente foi efetivamente ativado.';
COMMENT ON COLUMN public.clientes_consultoria.scheduled_activation_at IS
  'Data prevista de ativação agendada (sem ativar imediatamente).';

-- ---------------------------------------------------------------------------
-- 2. inscricoes_autocadastro_cliente — cadastros recebidos aguardando aprovação
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inscricoes_autocadastro_cliente (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES public.clientes_consultoria(id) ON DELETE CASCADE,
  link_id             uuid REFERENCES public.links_autocadastro_cliente(id) ON DELETE SET NULL,
  nome                text NOT NULL CHECK (length(trim(nome)) > 0),
  email               text NOT NULL,
  telefone            text,
  loja_id             uuid,
  funcao_declarada    text,
  data_nascimento     date,
  status              text NOT NULL DEFAULT 'aguardando'
                      CHECK (status IN ('aguardando', 'aprovado', 'devolvido', 'rejeitado', 'mesclado')),
  loja_aprovada_id    uuid,
  papeis_aprovados    jsonb NOT NULL DEFAULT '[]'::jsonb,
  visao_padrao        text,
  equipe_aprovada     text,
  motivo_devolucao    text,
  motivo_rejeicao     text,
  merged_into_id      uuid REFERENCES public.inscricoes_autocadastro_cliente(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  reviewed_by         uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscricoes_autocadastro_client
  ON public.inscricoes_autocadastro_cliente (client_id, status);

ALTER TABLE public.inscricoes_autocadastro_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inscricoes_autocadastro_interna_select ON public.inscricoes_autocadastro_cliente;
CREATE POLICY inscricoes_autocadastro_interna_select
  ON public.inscricoes_autocadastro_cliente FOR SELECT TO authenticated
  USING (public.eh_area_interna_mx());

DROP POLICY IF EXISTS inscricoes_autocadastro_interna_write ON public.inscricoes_autocadastro_cliente;
CREATE POLICY inscricoes_autocadastro_interna_write
  ON public.inscricoes_autocadastro_cliente FOR ALL TO authenticated
  USING (public.eh_area_interna_mx()) WITH CHECK (public.eh_area_interna_mx());

REVOKE ALL ON public.inscricoes_autocadastro_cliente FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inscricoes_autocadastro_cliente TO authenticated;

COMMENT ON TABLE public.inscricoes_autocadastro_cliente IS
  'Inscrições de autocadastro aguardando validação MX; só a aprovação concede acesso.';