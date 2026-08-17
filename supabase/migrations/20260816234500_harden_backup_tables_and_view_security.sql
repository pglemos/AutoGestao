-- Migration: 20260816234500_harden_backup_tables_and_view_security.sql
-- Description: Enable RLS and restrict access on public backup tables, and recreate vw_jornada_alem_do_contratado with security_invoker = true

-- 1. Security Invoker on vw_jornada_alem_do_contratado (eliminating security_definer_view advisor error)
CREATE OR REPLACE VIEW public.vw_jornada_alem_do_contratado
WITH (security_invoker = true) AS
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

-- 2. Enable RLS on all public backup tables and revoke direct anon/authenticated access
ALTER TABLE IF EXISTS public.backup_program_key_20260816223341 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_program_key_20260816223341 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_modality_20260816225018 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_modality_20260816225018 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_visit_number_20260816230009 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_visit_number_20260816230009 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_visit_number_20260816231826 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_visit_number_20260816231826 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_faxina_visitas_20260816232414 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_faxina_visitas_20260816232414 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_faxina_entregas_20260816232414 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_faxina_entregas_20260816232414 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_faxina_visitas_20260816232456 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_faxina_visitas_20260816232456 FROM anon, authenticated;

ALTER TABLE IF EXISTS public.backup_faxina_entregas_20260816232456 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.backup_faxina_entregas_20260816232456 FROM anon, authenticated;
