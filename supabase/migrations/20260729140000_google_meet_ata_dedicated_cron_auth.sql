-- Remove a service-role JWT do transporte interno do cron de atas.
--
-- A Edge Function valida `MX_CRON_SECRET` antes de processar o lote. O valor
-- correspondente ja existe no Vault como `mx-google-meet-ata-cron-secret`;
-- portanto o cron nao precisa transportar uma credencial administrativa.

do $$
declare
  v_has_cron boolean;
  v_has_vault boolean;
  v_has_secret boolean := false;
begin
  select exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) into v_has_cron;

  select exists (
    select 1 from pg_namespace where nspname = 'vault'
  ) into v_has_vault;

  if v_has_vault then
    select exists (
      select 1
      from vault.decrypted_secrets
      where name = 'mx-google-meet-ata-cron-secret'
    ) into v_has_secret;
  end if;

  if not (v_has_cron and v_has_vault and v_has_secret) then
    raise notice
      'Agendamento de mx-google-meet-ata ignorado (pg_cron=%, vault=%, secret=%). Esperado fora de producao.',
      v_has_cron, v_has_vault, v_has_secret;
    return;
  end if;

  perform cron.schedule(
    'mx-google-meet-ata',
    '*/30 * * * *',
    $cron$
      select net.http_post(
        url := 'https://fbhcmzzgwjdgkctlfvbo.supabase.co/functions/v1/google-meet-ata',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-mx-cron-secret', (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'mx-google-meet-ata-cron-secret'
            limit 1
          )
        ),
        body := jsonb_build_object('mode', 'process_due', 'limit', 10),
        timeout_milliseconds := 60000
      );
    $cron$
  );
end $$;

-- DOWN (manual): reaplicar
-- `20260729080000_fix_google_meet_ata_cron_auth.sql` para restaurar o contrato
-- anterior com service-role JWT + `x-mx-cron-secret`.
