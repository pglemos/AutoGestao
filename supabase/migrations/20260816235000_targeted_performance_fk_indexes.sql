-- Migration: 20260816235000_targeted_performance_fk_indexes.sql
-- Description: Add targeted indexes on high-traffic foreign keys to optimize query execution and reduce table scans

CREATE INDEX IF NOT EXISTS idx_visitas_consultoria_consultant_id
  ON public.visitas_consultoria (consultant_id);

CREATE INDEX IF NOT EXISTS idx_visitas_consultoria_auxiliary_consultant_id
  ON public.visitas_consultoria (auxiliary_consultant_id)
  WHERE auxiliary_consultant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lancamentos_diarios_user_id
  ON public.lancamentos_diarios (user_id);

CREATE INDEX IF NOT EXISTS idx_pdis_store_id
  ON public.pdis (store_id);

CREATE INDEX IF NOT EXISTS idx_pdis_seller_id
  ON public.pdis (seller_id);

CREATE INDEX IF NOT EXISTS idx_notificacoes_target_store_id
  ON public.notificacoes (target_store_id)
  WHERE target_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consultoria_participantes_encontro_user_id
  ON public.consultoria_participantes_encontro (user_id);
