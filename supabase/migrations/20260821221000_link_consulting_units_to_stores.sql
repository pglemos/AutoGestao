-- CONS-20: vincula cada unidade da Visão 360 à loja operacional canônica.
-- A coluna é nullable para preservar unidades legadas que não puderam ser
-- desambiguadas automaticamente; novos cadastros exigem o vínculo.

BEGIN;

ALTER TABLE public.unidades_cliente_consultoria
  ADD COLUMN IF NOT EXISTS store_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unidades_cliente_consultoria_store_id_fkey'
      AND conrelid = 'public.unidades_cliente_consultoria'::regclass
  ) THEN
    ALTER TABLE public.unidades_cliente_consultoria
      ADD CONSTRAINT unidades_cliente_consultoria_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES public.lojas(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS unidades_cliente_consultoria_store_id_idx
  ON public.unidades_cliente_consultoria (store_id)
  WHERE store_id IS NOT NULL;

-- A unidade principal é determinada pelo vínculo canônico do cliente, nunca
-- por nome, porque a loja pode ter sido renomeada no cadastro operacional.
UPDATE public.unidades_cliente_consultoria AS unit
SET store_id = client.primary_store_id,
    updated_at = now()
FROM public.clientes_consultoria AS client
WHERE unit.client_id = client.id
  AND unit.is_primary IS TRUE
  AND unit.store_id IS NULL
  AND client.primary_store_id IS NOT NULL;

-- Primeiro tenta CNPJ exato. Só grava quando há uma única filial candidata,
-- evitando transformar uma ambiguidade histórica em vínculo incorreto.
WITH matches AS (
  SELECT
    unit.id AS unit_id,
    child.id AS store_id,
    count(*) OVER (PARTITION BY unit.id) AS candidate_count
  FROM public.unidades_cliente_consultoria AS unit
  JOIN public.clientes_consultoria AS client ON client.id = unit.client_id
  JOIN public.lojas AS child ON child.parent_loja_id = client.primary_store_id
  WHERE unit.store_id IS NULL
    AND unit.is_primary IS NOT TRUE
    AND client.primary_store_id IS NOT NULL
    AND NULLIF(regexp_replace(coalesce(unit.cnpj, ''), '[^0-9]', '', 'g'), '') IS NOT NULL
    AND regexp_replace(coalesce(child.cnpj, ''), '[^0-9]', '', 'g')
      = regexp_replace(unit.cnpj, '[^0-9]', '', 'g')
)
UPDATE public.unidades_cliente_consultoria AS unit
SET store_id = matches.store_id,
    updated_at = now()
FROM matches
WHERE unit.id = matches.unit_id
  AND matches.candidate_count = 1;

-- Depois tenta o nome normalizado, também apenas para correspondência única.
WITH matches AS (
  SELECT
    unit.id AS unit_id,
    child.id AS store_id,
    count(*) OVER (PARTITION BY unit.id) AS candidate_count
  FROM public.unidades_cliente_consultoria AS unit
  JOIN public.clientes_consultoria AS client ON client.id = unit.client_id
  JOIN public.lojas AS child ON child.parent_loja_id = client.primary_store_id
  WHERE unit.store_id IS NULL
    AND unit.is_primary IS NOT TRUE
    AND client.primary_store_id IS NOT NULL
    AND lower(btrim(child.name)) = lower(btrim(unit.name))
)
UPDATE public.unidades_cliente_consultoria AS unit
SET store_id = matches.store_id,
    updated_at = now()
FROM matches
WHERE unit.id = matches.unit_id
  AND matches.candidate_count = 1;

COMMENT ON COLUMN public.unidades_cliente_consultoria.store_id IS
  'Loja operacional canônica em public.lojas; nulo somente para legado não desambiguado.';

COMMIT;

-- DOWN
-- ALTER TABLE public.unidades_cliente_consultoria
--   DROP CONSTRAINT IF EXISTS unidades_cliente_consultoria_store_id_fkey;
-- DROP INDEX IF EXISTS public.unidades_cliente_consultoria_store_id_idx;
-- ALTER TABLE public.unidades_cliente_consultoria DROP COLUMN IF EXISTS store_id;
