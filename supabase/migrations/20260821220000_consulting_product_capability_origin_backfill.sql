-- CONS-20: backfill da origem da matriz para instalações em que 21210000 já foi aplicada.
-- A classificação é conservadora: qualquer divergência do catálogo oficial MX é personalizada.

BEGIN;

WITH official(module_code, menu_code, mandatory, release_stage, visibility, technical_status) AS (
  VALUES
    ('DONO', 'INICIO', true, 'NA_ATIVACAO', 'ATIVO', 'DISPONIVEL'),
    ('DONO', 'ROTINA_DIA', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('DONO', 'PLANO_ESTRATEGICO', false, 'ETAPA_4', 'ATIVO', 'DISPONIVEL'),
    ('DONO', 'PLANO_ACAO', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('DONO', 'CONSULTORIA', true, 'NA_ATIVACAO', 'VISIVEL_BLOQUEADO', 'DISPONIVEL'),
    ('DONO', 'MERCADO', false, 'ETAPA_4', 'EM_BREVE', 'EM_HOMOLOGACAO'),
    ('DONO', 'DEPARTAMENTOS', false, 'ETAPA_4', 'EM_BREVE', 'EM_DESENVOLVIMENTO'),
    ('DONO', 'UNIVERSIDADE_MX', false, 'ETAPA_2', 'ATIVO', 'DISPONIVEL'),
    ('DONO', 'FALAR_CONSULTOR', true, 'NA_ATIVACAO', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'INICIO', true, 'NA_ATIVACAO', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'ROTINA_DIA', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'FECHAMENTO_DIARIO', false, 'ETAPA_2', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'ROTINA_EQUIPE', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'MINHA_EQUIPE', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'META_LOJA', false, 'ETAPA_4', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'MENTOR_GERENCIAL', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'DESENVOLVIMENTO', false, 'ETAPA_3', 'EM_BREVE', 'EM_HOMOLOGACAO'),
    ('GERENTE', 'RANKING', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('GERENTE', 'UNIVERSIDADE_MX', false, 'ETAPA_2', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'INICIO', true, 'NA_ATIVACAO', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'FECHAMENTO_DIARIO', true, 'ETAPA_2', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'ROTINA_DIA', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'MENTOR_COMERCIAL', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'MINHA_META', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'RANKING', false, 'ETAPA_3', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'UNIVERSIDADE_MX', false, 'ETAPA_2', 'ATIVO', 'DISPONIVEL'),
    ('VENDEDOR', 'DESENVOLVIMENTO', false, 'ETAPA_3', 'EM_BREVE', 'EM_HOMOLOGACAO'),
    ('VENDEDOR', 'MEU_PERFIL', true, 'NA_ATIVACAO', 'ATIVO', 'DISPONIVEL')
)
UPDATE public.modulos_produto_consultoria AS item
SET configuration_origin = CASE
  WHEN EXISTS (
    SELECT 1
    FROM official
    WHERE official.module_code = upper(item.module_code)
      AND official.menu_code = upper(item.menu_code)
      AND item.incluido IS TRUE
      AND item.obrigatorio = official.mandatory
      AND item.etapa IS NULL
      AND item.visibilidade = 'dono'
      AND item.release_stage = official.release_stage
      AND item.visibility = official.visibility
      AND item.technical_status = official.technical_status
      AND item.status = 'ATIVO'
  ) THEN 'PADRAO_PRODUTO'
  ELSE 'PERSONALIZADO_PRODUTO'
END;

COMMIT;

-- DOWN
-- Não há reversão segura sem snapshot: a origem é uma classificação histórica.
