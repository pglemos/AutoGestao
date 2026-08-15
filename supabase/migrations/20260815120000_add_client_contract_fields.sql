-- Módulo Administrador MX — campos de estrutura e contrato do cliente.
-- O wizard de cadastro (/clientes/novo) coleta tipo de estrutura, fase
-- empresarial, responsável MX pela implantação e vigência do contrato. Até
-- aqui não havia onde gravar; ficavam só na tela.
--
-- Colunas em clientes_consultoria (e não uma tabela de contrato à parte)
-- porque hoje a relação é 1:1 — um cliente, um contrato vigente. Quando
-- houver histórico de renovação, isso vira tabela própria.

ALTER TABLE public.clientes_consultoria
  ADD COLUMN IF NOT EXISTS structure_type text,
  ADD COLUMN IF NOT EXISTS business_phase text,
  ADD COLUMN IF NOT EXISTS implementation_owner_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date;

ALTER TABLE public.clientes_consultoria
  DROP CONSTRAINT IF EXISTS clientes_consultoria_structure_type_check;

ALTER TABLE public.clientes_consultoria
  ADD CONSTRAINT clientes_consultoria_structure_type_check
  CHECK (structure_type IS NULL OR structure_type IN ('LOJA_UNICA', 'REDE'));

ALTER TABLE public.clientes_consultoria
  DROP CONSTRAINT IF EXISTS clientes_consultoria_contract_period_check;

ALTER TABLE public.clientes_consultoria
  ADD CONSTRAINT clientes_consultoria_contract_period_check
  CHECK (
    contract_start_date IS NULL
    OR contract_end_date IS NULL
    OR contract_end_date >= contract_start_date
  );

CREATE INDEX IF NOT EXISTS idx_clientes_consultoria_implementation_owner
  ON public.clientes_consultoria (implementation_owner_id)
  WHERE implementation_owner_id IS NOT NULL;

COMMENT ON COLUMN public.clientes_consultoria.structure_type IS
  'LOJA_UNICA ou REDE — define se o cliente tem matriz com filiais.';
COMMENT ON COLUMN public.clientes_consultoria.business_phase IS
  'Fase empresarial declarada no cadastro (usada na priorização da jornada).';
COMMENT ON COLUMN public.clientes_consultoria.implementation_owner_id IS
  'Responsável MX pela implantação do cliente.';
COMMENT ON COLUMN public.clientes_consultoria.contract_start_date IS
  'Início da vigência do contrato de consultoria.';
COMMENT ON COLUMN public.clientes_consultoria.contract_end_date IS
  'Fim da vigência do contrato de consultoria.';
