-- Encontro fora do contrato (acompanhamento extra).
--
-- Seis clientes têm mais encontros registrados do que qualquer produto do
-- catálogo comporta — Espíndola 17, Gandini 14, e outros quatro com 13 —
-- concentrados em acompanhamentos mensais além do programa contratado.
--
-- Isso não é erro de dado nem produto errado: é execução adicional. O que
-- faltava era como registrar. Marcando o encontro como extra, o contrato
-- continua sendo N encontros, o extra permanece visível na jornada e o
-- indicador de "jornada além do contratado" volta a apontar problema de
-- verdade em vez de acusar trabalho legítimo.

ALTER TABLE public.visitas_consultoria
  ADD COLUMN IF NOT EXISTS fora_do_contrato boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.visitas_consultoria.fora_do_contrato IS
  'Encontro adicional ao programa contratado (acompanhamento extra, cortesia, repactuação).';

CREATE INDEX IF NOT EXISTS idx_visitas_fora_do_contrato
  ON public.visitas_consultoria (client_id)
  WHERE fora_do_contrato;

-- A contagem contratual ignora os extras.
CREATE OR REPLACE VIEW public.vw_jornada_alem_do_contratado AS
SELECT
  c.id                AS client_id,
  c.name              AS client_name,
  c.program_template_key,
  p.total_visits      AS contratadas,
  max(v.visit_number) AS maior_encontro,
  count(v.id)         AS encontros_registrados
FROM public.clientes_consultoria c
JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
JOIN public.visitas_consultoria v ON v.client_id = c.id AND NOT v.fora_do_contrato
GROUP BY c.id, c.name, c.program_template_key, p.total_visits
HAVING max(v.visit_number) > p.total_visits;

-- O saldo presencial também passa a considerar só o que é contratual.
CREATE OR REPLACE FUNCTION public.saldo_presencial_cliente(p_client_id uuid)
RETURNS TABLE (contratadas integer, minimas integer, usadas integer, disponiveis integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.max_presenciais,
    p.min_presenciais,
    count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial')::integer,
    CASE
      WHEN p.max_presenciais IS NULL THEN NULL
      ELSE p.max_presenciais - count(v.id) FILTER (WHERE lower(coalesce(v.modality, '')) = 'presencial')::integer
    END
  FROM public.clientes_consultoria c
  JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
  LEFT JOIN public.visitas_consultoria v ON v.client_id = c.id AND NOT v.fora_do_contrato
  WHERE c.id = p_client_id
  GROUP BY p.max_presenciais, p.min_presenciais;
$$;

-- E o limite de presencial não conta encontro extra.
CREATE OR REPLACE FUNCTION public.validar_saldo_presencial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_max integer;
  v_usadas integer;
BEGIN
  IF lower(coalesce(NEW.modality, '')) <> 'presencial' OR NEW.fora_do_contrato THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND lower(coalesce(OLD.modality, '')) = 'presencial' AND NOT OLD.fora_do_contrato THEN
    RETURN NEW;
  END IF;

  SELECT p.max_presenciais INTO v_max
    FROM public.clientes_consultoria c
    JOIN public.programas_visita_consultoria p ON p.program_key = c.program_template_key
   WHERE c.id = NEW.client_id;

  IF v_max IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_usadas
    FROM public.visitas_consultoria v
   WHERE v.client_id = NEW.client_id
     AND lower(coalesce(v.modality, '')) = 'presencial'
     AND NOT v.fora_do_contrato
     AND v.id <> NEW.id;

  IF v_usadas >= v_max THEN
    RAISE EXCEPTION 'Saldo presencial esgotado: o produto permite % encontro(s) presencial(is) e já há % marcado(s). Marque o encontro como fora do contrato se for adicional.', v_max, v_usadas
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;
