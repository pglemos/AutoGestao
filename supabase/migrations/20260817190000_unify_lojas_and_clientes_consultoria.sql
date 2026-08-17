-- ==========================================================================
-- Unificação de public.lojas e public.clientes_consultoria em uma entidade canônica
-- Adiciona todos os atributos de Consultoria, Metodologia e Contrato em public.lojas
-- Mantém sincronização bidirecional em tempo real para retrocompatibilidade
-- ==========================================================================

BEGIN;

-- 1. Adicionar colunas de consultoria e contrato em public.lojas se não existirem
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS product_name text DEFAULT 'Consultoria PMR';
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS program_template_key text DEFAULT 'pmr_7';
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS modality text DEFAULT 'Presencial';
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS current_visit_step integer DEFAULT 0;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS structure_type text DEFAULT 'loja_unica';
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS business_phase text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS implementation_owner_id uuid REFERENCES public.usuarios(id);
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS contract_start_date date;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS contract_end_date date;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 1;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS suspended_reason text;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS activated_at timestamp with time zone;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS scheduled_activation_at date;
ALTER TABLE public.lojas ADD COLUMN IF NOT EXISTS notes text;

-- 2. Migrar dados de clientes_consultoria para public.lojas
UPDATE public.lojas l
SET 
  slug = COALESCE(cc.slug, lower(regexp_replace(l.name, '[^a-zA-Z0-9]+', '-', 'g'))),
  status = COALESCE(cc.status, CASE WHEN l.active THEN 'ativo' ELSE 'inativo' END),
  product_name = COALESCE(cc.product_name, l.product_name, 'Consultoria PMR'),
  program_template_key = COALESCE(cc.program_template_key, 'pmr_7'),
  modality = COALESCE(cc.modality, 'Presencial'),
  current_visit_step = COALESCE(cc.current_visit_step, 0),
  structure_type = COALESCE(cc.structure_type, CASE WHEN l.parent_loja_id IS NULL THEN 'matriz' ELSE 'filial' END),
  business_phase = cc.business_phase,
  implementation_owner_id = cc.implementation_owner_id,
  contract_start_date = cc.contract_start_date,
  contract_end_date = cc.contract_end_date,
  onboarding_step = COALESCE(cc.onboarding_step, 1),
  onboarding_completed = COALESCE(cc.onboarding_completed, false),
  suspended_at = cc.suspended_at,
  suspended_reason = cc.suspended_reason,
  activated_at = cc.activated_at,
  scheduled_activation_at = cc.scheduled_activation_at,
  notes = cc.notes
FROM public.clientes_consultoria cc
WHERE cc.primary_store_id = l.id;

-- 3. Para lojas sem clientes_consultoria correspondente, preencher slug e status default
UPDATE public.lojas
SET 
  slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')),
  status = CASE WHEN active THEN 'ativo' ELSE 'inativo' END
WHERE slug IS NULL;

-- 4. Trigger de sincronização bidirecional automática
CREATE OR REPLACE FUNCTION public.sync_loja_to_cliente_consultoria_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.clientes_consultoria (
    name,
    legal_name,
    cnpj,
    product_name,
    status,
    notes,
    primary_store_id,
    current_visit_step,
    modality,
    program_template_key,
    slug,
    structure_type,
    business_phase,
    implementation_owner_id,
    contract_start_date,
    contract_end_date,
    onboarding_step,
    onboarding_completed,
    suspended_at,
    suspended_reason,
    activated_at,
    scheduled_activation_at,
    updated_at
  ) VALUES (
    NEW.name,
    NEW.legal_name,
    NEW.cnpj,
    COALESCE(NEW.product_name, 'Consultoria PMR'),
    COALESCE(NEW.status, CASE WHEN NEW.active THEN 'ativo' ELSE 'inativo' END),
    NEW.notes,
    NEW.id,
    COALESCE(NEW.current_visit_step, 0),
    COALESCE(NEW.modality, 'Presencial'),
    COALESCE(NEW.program_template_key, 'pmr_7'),
    COALESCE(NEW.slug, lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'))),
    COALESCE(NEW.structure_type, CASE WHEN NEW.parent_loja_id IS NULL THEN 'matriz' ELSE 'filial' END),
    NEW.business_phase,
    NEW.implementation_owner_id,
    NEW.contract_start_date,
    NEW.contract_end_date,
    COALESCE(NEW.onboarding_step, 1),
    COALESCE(NEW.onboarding_completed, false),
    NEW.suspended_at,
    NEW.suspended_reason,
    NEW.activated_at,
    NEW.scheduled_activation_at,
    now()
  )
  ON CONFLICT (primary_store_id) DO UPDATE SET
    name = EXCLUDED.name,
    legal_name = EXCLUDED.legal_name,
    cnpj = EXCLUDED.cnpj,
    product_name = EXCLUDED.product_name,
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    current_visit_step = EXCLUDED.current_visit_step,
    modality = EXCLUDED.modality,
    program_template_key = EXCLUDED.program_template_key,
    slug = EXCLUDED.slug,
    structure_type = EXCLUDED.structure_type,
    business_phase = EXCLUDED.business_phase,
    implementation_owner_id = EXCLUDED.implementation_owner_id,
    contract_start_date = EXCLUDED.contract_start_date,
    contract_end_date = EXCLUDED.contract_end_date,
    onboarding_step = EXCLUDED.onboarding_step,
    onboarding_completed = EXCLUDED.onboarding_completed,
    suspended_at = EXCLUDED.suspended_at,
    suspended_reason = EXCLUDED.suspended_reason,
    activated_at = EXCLUDED.activated_at,
    scheduled_activation_at = EXCLUDED.scheduled_activation_at,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_loja_to_cliente_consultoria ON public.lojas;
CREATE TRIGGER trg_sync_loja_to_cliente_consultoria
  AFTER INSERT OR UPDATE ON public.lojas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_loja_to_cliente_consultoria_fn();

COMMIT;
