-- Módulo Administrador MX — wizard de plano por cliente + ciclo de vida de sugestões ao dono.
--
-- Dois ajustes no schema existente para fechar o gap do Base44:
--  1. planos_acao ganha os campos do wizard personalizado (participantes,
--     indicador de eficácia e ano de referência) e o checklist ponderado é
--     armazenado na coluna jsonb `checklist` já existente.
--  2. consultor_solucoes ganha o ciclo de vida da sugestão ao dono
--     (pendente → validada → exibida_dono → convertida/descartada) e uma
--     policy de UPDATE restrita à área interna MX.

ALTER TABLE public.planos_acao
  ADD COLUMN IF NOT EXISTS participants text,
  ADD COLUMN IF NOT EXISTS efficacy_indicator text,
  ADD COLUMN IF NOT EXISTS reference_year integer;

ALTER TABLE public.consultor_solucoes
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente_validacao'
    CHECK (status IN ('pendente_validacao', 'validada', 'exibida_dono', 'convertida', 'descartada')),
  ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS shown_to_owner_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_reason text,
  ADD COLUMN IF NOT EXISTS converted_plano_id uuid REFERENCES public.planos_acao(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consultor_solucoes_status
  ON public.consultor_solucoes (status, created_at DESC);

COMMENT ON COLUMN public.consultor_solucoes.status IS
  'Ciclo de vida da sugestão: pendente_validacao → validada → exibida_dono → convertida/descartada.';

-- A tabela só tinha policies de SELECT (true) e INSERT (admin). O fluxo
-- existente já atualiza source_plano_id ao promover; sem UPDATE a escrita
-- era bloqueada pela RLS. Nova policy restringe a área interna MX.
DROP POLICY IF EXISTS consultor_solucoes_update_interna ON public.consultor_solucoes;
CREATE POLICY consultor_solucoes_update_interna
  ON public.consultor_solucoes
  FOR UPDATE TO authenticated
  USING (public.eh_area_interna_mx())
  WITH CHECK (public.eh_area_interna_mx());
