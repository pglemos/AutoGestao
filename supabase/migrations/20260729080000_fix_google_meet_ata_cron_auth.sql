-- Corrige o cron `mx-google-meet-ata`, que falhava com 401 em toda execucao.
--
-- Diagnostico (2026-07-29): o comando agendado enviava apenas `Content-Type` e
-- `x-mx-cron-secret`. Como `google-meet-ata` roda com `verify_jwt = true`, o gateway
-- do Supabase rejeitava a requisicao antes de invocar a funcao, com
-- `UNAUTHORIZED_NO_AUTH_HEADER`. Evidencia: 12 respostas 401 em `net._http_response`
-- nas ultimas 24h. `cron.job_run_details` reportava `succeeded` porque so registra o
-- enfileiramento do `net.http_post`, nao o resultado HTTP.
--
-- Alem disso, o valor de `x-mx-cron-secret` estava literal no comando do cron. Ele foi
-- rotacionado e movido para o Vault (`mx-google-meet-ata-cron-secret`), com o mesmo
-- valor gravado no secret `MX_CRON_SECRET` da Edge Function.
--
-- A defesa em camadas fica: JWT service_role no gateway + segredo compartilhado
-- verificado dentro da funcao (index.ts:141-142). `verify_jwt` permanece `true`.

do $$
declare
  v_has_cron    boolean;
  v_has_vault   boolean;
  v_has_secrets boolean := false;
begin
  -- Bancos efemeros de CI e ambientes locais sobem sem `pg_cron` e sem os segredos do
  -- Vault. Abortar ali quebraria o bootstrap limpo inteiro sem indicar defeito algum,
  -- entao a migration apenas registra e sai. Em producao os dois existem e o
  -- agendamento e aplicado normalmente.
  select exists (select 1 from pg_extension where extname = 'pg_cron') into v_has_cron;
  select exists (select 1 from pg_namespace where nspname = 'vault') into v_has_vault;

  if v_has_vault then
    select
      count(*) filter (where name = 'mx-service-role-key') > 0
      and count(*) filter (where name = 'mx-google-meet-ata-cron-secret') > 0
    into v_has_secrets
    from vault.decrypted_secrets;
  end if;

  if not (v_has_cron and v_has_vault and v_has_secrets) then
    raise notice
      'Agendamento de mx-google-meet-ata ignorado (pg_cron=%, vault=%, secrets=%). Esperado fora de producao.',
      v_has_cron, v_has_vault, v_has_secrets;
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
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'mx-service-role-key' limit 1
        ),
        'x-mx-cron-secret', (
          select decrypted_secret from vault.decrypted_secrets
          where name = 'mx-google-meet-ata-cron-secret' limit 1
        )
      ),
      body := jsonb_build_object('mode', 'process_due', 'limit', 10),
      -- O default de `pg_net` e 5000 ms. A funcao faz chamadas a LLM e ultrapassa esse
      -- limite, o que fazia `net._http_response` gravar timeout sem status_code mesmo
      -- com a funcao respondendo 200. 60s cobre o processamento de um lote de 10.
      timeout_milliseconds := 60000
    );
  $cron$
  );
end $$;

-- ============================================================
-- DOWN
-- ============================================================
-- O comando anterior nao tinha header Authorization e falhava 100% das vezes.
-- Reverter recria o estado quebrado; o DOWN apenas desagenda o job.
-- BEGIN;
-- select cron.unschedule('mx-google-meet-ata');
-- COMMIT;
