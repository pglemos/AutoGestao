-- REVERSAL de 20260815120000_add_client_contract_fields.sql
-- Remove os campos de estrutura e contrato do cliente adicionados pelo
-- módulo Administrador MX. Idempotente (DROP ... IF EXISTS).
--
-- Nota: dados gravados nestas colunas serão perdidos. Se houver data de
-- contrato em produção antes do rollback, usar PITR em vez desta reversal.

ALTER TABLE public.clientes_consultoria
  DROP CONSTRAINT IF EXISTS clientes_consultoria_contract_period_check;
ALTER TABLE public.clientes_consultoria
  DROP CONSTRAINT IF EXISTS clientes_consultoria_structure_type_check;

DROP INDEX IF EXISTS idx_clientes_consultoria_implementation_owner;

ALTER TABLE public.clientes_consultoria
  DROP COLUMN IF EXISTS structure_type;
ALTER TABLE public.clientes_consultoria
  DROP COLUMN IF EXISTS business_phase;
ALTER TABLE public.clientes_consultoria
  DROP COLUMN IF EXISTS implementation_owner_id;
ALTER TABLE public.clientes_consultoria
  DROP COLUMN IF EXISTS contract_start_date;
ALTER TABLE public.clientes_consultoria
  DROP COLUMN IF EXISTS contract_end_date;
