-- Marcador de migration aplicada fora do repositório.
--
-- Esta versão consta em `supabase_migrations.schema_migrations` do banco de
-- produção mas nunca existiu como arquivo aqui: não há registro dela em nenhum
-- commit de nenhuma branch. Foi aplicada por fora (editor SQL do dashboard ou
-- ferramenta equivalente), provavelmente durante a unificação de catálogos de
-- 17-18/08/2026.
--
-- O arquivo existe para que o histórico local volte a bater com o remoto e o
-- `supabase db push` deixe de recusar as migrations seguintes. Deliberadamente
-- não executa nada: o efeito dela já está no schema, e adivinhar o conteúdo
-- seria pior que registrar a lacuna.
--
-- Recriar o banco só a partir destes arquivos NÃO reproduz o schema de produção
-- enquanto esta lacuna existir.

SELECT 1;
