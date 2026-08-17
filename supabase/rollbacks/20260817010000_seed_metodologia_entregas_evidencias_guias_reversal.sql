-- Reversão: remove entregas, evidências e guias semeados das versões metodológicas publicadas v1.0
DO $$
DECLARE
  v_rec record;
BEGIN
  FOR v_rec IN (SELECT id FROM public.versoes_metodologia_produto WHERE status = 'publicado' AND program_key IN ('pmr_online','pmr_hibrido','pmr_plus','ppa')) LOOP
    DELETE FROM public.entregas_encontro WHERE methodology_version_id = v_rec.id;
    DELETE FROM public.evidencias_encontro WHERE methodology_version_id = v_rec.id;
    DELETE FROM public.guia_consultor_encontro WHERE methodology_version_id = v_rec.id;
  END LOOP;
END $$;
