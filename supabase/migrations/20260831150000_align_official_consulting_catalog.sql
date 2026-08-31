-- Migration: 20260831150000_align_official_consulting_catalog.sql
-- Alinha o catálogo comercial ao contrato Base44 (PMR Online, PMR Híbrido, PMR Plus, PPA),
-- remapeia clientes ainda presos em chaves legadas e arquiva programas históricos sem contrato.

BEGIN;

INSERT INTO public.programas_visita_consultoria (
  program_key, name, descricao, modalidade, status, versao, total_visits,
  min_presenciais, max_presenciais, active, published_at, evolution_group, modality_variant, usa_plano_estrategico
)
VALUES
  ('pmr_online', 'PMR Online', 'Programa de Maximização de Resultados — 12 encontros, todos online.', 'online', 'publicado', 1, 12, 0, 0, true, now(), 'CONSULTORIA_EVOLUTIVA_PRINCIPAL', 'ONLINE', true),
  ('pmr_hibrido', 'PMR Híbrido', 'Programa de Maximização de Resultados — 12 encontros, de 2 a 9 presenciais.', 'hibrido', 'publicado', 1, 12, 2, 9, true, now(), 'CONSULTORIA_EVOLUTIVA_PRINCIPAL', 'HIBRIDO', true),
  ('pmr_plus', 'PMR Plus', 'Programa avançado com foco financeiro, processos e gestão (9 encontros).', 'presencial', 'publicado', 1, 9, 2, 9, true, now(), 'CONSULTORIA_EVOLUTIVA_PMR_PLUS', 'FLEXIVEL', true),
  ('ppa', 'PPA', 'Programa de Performance Acelerada — 9 encontros, de 2 a 9 presenciais.', 'presencial', 'publicado', 1, 9, 2, 9, true, now(), 'CONSULTORIA_EVOLUTIVA_PPA', 'FLEXIVEL', true)
ON CONFLICT (program_key) DO UPDATE SET
  name = EXCLUDED.name,
  descricao = EXCLUDED.descricao,
  modalidade = EXCLUDED.modalidade,
  total_visits = EXCLUDED.total_visits,
  min_presenciais = EXCLUDED.min_presenciais,
  max_presenciais = EXCLUDED.max_presenciais,
  evolution_group = EXCLUDED.evolution_group,
  modality_variant = EXCLUDED.modality_variant,
  usa_plano_estrategico = true,
  updated_at = now();

-- PMR Online e PMR Híbrido não podem permanecer publicados simultaneamente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.programas_visita_consultoria online
    JOIN public.programas_visita_consultoria hibrido ON hibrido.program_key = 'pmr_hibrido'
    WHERE online.program_key = 'pmr_online'
      AND online.status = 'publicado'
      AND online.active IS TRUE
      AND hibrido.status = 'publicado'
      AND hibrido.active IS TRUE
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.clientes_consultoria
      WHERE program_template_key = 'pmr_online'
        AND lower(coalesce(status, '')) <> 'arquivado'
    ) THEN
      UPDATE public.programas_visita_consultoria
      SET status = 'suspenso_novas_contratacoes', active = false, updated_at = now()
      WHERE program_key = 'pmr_online';
    ELSE
      UPDATE public.programas_visita_consultoria
      SET status = 'suspenso_novas_contratacoes', active = false, updated_at = now()
      WHERE program_key = 'pmr_online';
    END IF;
  END IF;
END $$;

-- Remapeia contratos legados para o catálogo oficial com base na jornada executada.
WITH legacy_clients AS (
  SELECT
    c.id,
    c.program_template_key AS legacy_key,
    coalesce(max(v.visit_number), 0)::integer AS maior_encontro
  FROM public.clientes_consultoria c
  LEFT JOIN public.visitas_consultoria v ON v.client_id = c.id
  WHERE c.program_template_key IN ('pmr_7', 'pmr_9')
    AND lower(coalesce(c.status, '')) <> 'arquivado'
  GROUP BY c.id, c.program_template_key
),
destinos AS (
  SELECT
    id,
    CASE
      WHEN maior_encontro <= 9 THEN 'pmr_plus'
      ELSE 'pmr_hibrido'
    END AS target_key,
    CASE
      WHEN maior_encontro <= 9 THEN 'PMR Plus'
      ELSE 'PMR Híbrido'
    END AS target_name
  FROM legacy_clients
)
UPDATE public.clientes_consultoria c
SET
  program_template_key = d.target_key,
  product_name = d.target_name,
  updated_at = now()
FROM destinos d
WHERE c.id = d.id;

UPDATE public.programas_visita_consultoria legacy
SET status = 'arquivado', active = false, updated_at = now()
WHERE legacy.program_key IN ('pmr_7', 'pmr_9', 'mx_start')
  AND NOT EXISTS (
    SELECT 1
    FROM public.clientes_consultoria cc
    WHERE cc.program_template_key = legacy.program_key
      AND lower(coalesce(cc.status, '')) <> 'arquivado'
  );

COMMIT;

-- DOWN
-- Não reverte remapeamento de clientes legados → catálogo oficial (irreversível sem backup manual).
-- Reativa programas legados arquivados quando não há clientes remanescentes neles.
BEGIN;

UPDATE public.programas_visita_consultoria legacy
SET status = 'publicado', active = true, updated_at = now()
WHERE legacy.program_key IN ('pmr_7', 'pmr_9')
  AND legacy.status = 'arquivado'
  AND NOT EXISTS (
    SELECT 1
    FROM public.clientes_consultoria cc
    WHERE cc.program_template_key = legacy.program_key
      AND lower(coalesce(cc.status, '')) <> 'arquivado'
  );

COMMIT;
