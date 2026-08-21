-- "Vincular Aula da Universidade MX" (encontro/ContentTab) sempre falhava
-- com FK violation: learning_content_id apontava para universidade_aulas,
-- tabela vazia em produção (0 linhas). A jornada real da Universidade MX
-- vive em `treinamentos` — mesma tabela que a tela do vendedor usa (ver
-- listarTreinamentosVendedor) — que tem 14 aulas ativas. O código de
-- aplicação já foi corrigido para ler de lá; falta a FK acompanhar.

BEGIN;

ALTER TABLE public.conteudo_referencia_encontro
  DROP CONSTRAINT IF EXISTS conteudo_referencia_encontro_learning_content_id_fkey;

ALTER TABLE public.conteudo_referencia_encontro
  ADD CONSTRAINT conteudo_referencia_encontro_learning_content_id_fkey
  FOREIGN KEY (learning_content_id) REFERENCES public.treinamentos(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.conteudo_referencia_encontro.learning_content_id IS
  'Referencia treinamentos.id quando content_type = UNIVERSITY_LESSON (aula vinculada da Universidade MX).';

COMMIT;
