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
  v_service_role text;
  v_cron_secret  text;
begin
  select decrypted_secret into v_service_role
  from vault.decrypted_secrets where name = 'mx-service-role-key' limit 1;

  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets where name = 'mx-google-meet-ata-cron-secret' limit 1;

  if v_service_role is null then
    raise exception 'Vault secret ausente: mx-service-role-key';
  end if;

  if v_cron_secret is null then
    raise exception 'Vault secret ausente: mx-google-meet-ata-cron-secret';
  end if;
end $$;

select cron.schedule(
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

-- ROLLBACK (nao executar salvo necessidade):
--   O comando anterior nao tinha header Authorization e por isso estava 100% quebrado.
--   Reverter significa voltar ao estado com falha. Se precisar desativar:
--     select cron.unschedule('mx-google-meet-ata');
--   Para restaurar o agendamento corrigido, reaplique esta migration.
