BEGIN;

-- Notification subscriptions use Postgres Changes. Keep the publication
-- aligned with the authenticated client hook without duplicating the table.
DO $$
BEGIN
  IF to_regclass('public.notificacoes') IS NULL THEN
    RAISE EXCEPTION 'public.notificacoes is required for notification realtime';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'notificacoes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
  END IF;
END
$$;

COMMIT;
