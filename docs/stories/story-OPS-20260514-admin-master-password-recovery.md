# Story OPS-20260514 - Reset Admin Master e Recuperação de Senha

## Status

Done

## Contexto

A Admin Master MX Mariane esqueceu a senha. O acesso precisa ser restaurado com senha provisória `[SENHA_TEMPORARIA_REDACTED]`, troca obrigatória no primeiro login e um fluxo público de "Esqueci minha senha" na tela de login.

## Acceptance Criteria

- [x] Garantir `[EMAIL_REDACTED]` como `administrador_geral`, ativa e confirmada.
- [x] Resetar senha provisória para `[SENHA_TEMPORARIA_REDACTED]` e marcar `must_change_password=true`.
- [x] Adicionar botão "Esqueci minha senha" na tela `/login` preservando o design atual.
- [x] Enviar recovery pelo Supabase Auth com redirect para `/login?recovery=1`.
- [x] Permitir definir nova senha via link de recovery e limpar `must_change_password`.
- [x] Validar fluxo completo com usuário E2E controlado.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run typecheck`.
- [x] Rodar `npm test`.
- [x] Rodar `npm run build`.
- [x] Enviar a recuperação por Edge Function própria usando o Gmail OAuth já configurado, sem depender do mailer padrão sem SMTP.
- [x] Impedir duplicidade de identidade no pré-cadastro por e-mail normalizado e tratar corrida concorrente como orientação de recuperação.
- [x] Validar `/pre-cadastro/lial` em browser real com usuário existente sem criar novo pré-cadastro.

## Dev Agent Record

### Debug Log

- Story criada a partir de requisito operacional direto do usuário.
- Conta `[EMAIL_REDACTED]` validada no live: Auth existe, e-mail confirmado, role `administrador_geral`, active `true`.
- Senha provisória resetada para `[SENHA_TEMPORARIA_REDACTED]` com `must_change_password=true`.
- Implementado fluxo público de recuperação em `/login`: login, solicitação de reset e definição de nova senha por sessão de recovery.
- E2E local `auth-password-recovery.playwright.ts` passou no Chromium.
- Gates locais passaram: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Deploy de produção criado e alias atualizado para `https://mxperformance.vercel.app`.
- E2E live passou contra `https://mxperformance.vercel.app`.
- Login live da Mariane com senha provisória abriu o modal `Segurança MX`; a sessão foi encerrada sem trocar a senha pessoal.
- Incidente 2026-05-17: reset manual reportado para `danieljsvendas@gmail.com` falhava porque a política anterior exigia mínimo 10 caracteres e composição rígida.
- Corrigido `/login?recovery=1` para aceitar tanto recovery por hash (`access_token`/`refresh_token`) quanto por query `code`, limpando tokens da URL após criar sessão.
- Corrigido envio administrativo de redefinição para redirecionar explicitamente para `/login?recovery=1`.
- Criado script operacional seguro `scripts/reset_user_password.ts` com dry-run, validação de mínimo 6 caracteres, geração opcional, atualização Auth + `usuarios.must_change_password=true` e validação de login via anon key.
- Scripts legados de reset/provisionamento passaram a rejeitar senha curta antes de chamar Supabase; `provision_mx_team.ts` não usa mais o fallback previsível para novos Admin Master MX.
- Dry-run do novo script confirmou que `danieljsvendas@gmail.com` pode ser resetado pelo processo operacional seguro.
- Gates locais 2026-05-17 passaram: `bun test src/lib/auth/passwordPolicy.test.ts`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npx playwright test src/test/auth-password-recovery.playwright.ts --project=chromium`.
- Incidente Diego 2026-07-13: Auth estava ativo e confirmado, mas a senha temporária informada não correspondia; o login foi resetado e o fluxo real revelou que o trigger de hardening bloqueava o RPC `complete_password_change`.
- Aplicada no Supabase remoto a migration `20260713130000_allow_controlled_password_change.sql`, liberando somente `true → false` de `must_change_password` dentro do RPC com marcador transacional protegido.
- Criada a migration `20260713150000_server_owned_password_change_challenge.sql` com desafio de troca de senha persistido no servidor, expiração de 10 minutos, consumo único e execução pública revogada; a migration anterior `20260713143000_require_password_update_proof.sql` permanece preservada como histórico já aplicado.
- Frontend atualizado para iniciar o desafio antes de `auth.updateUser()` e concluir a RPC sem argumentos em `useAuthActions` e no fluxo de recovery de `/login`; contrato gerado e teste estático da migration também foram atualizados.
- Migration `20260713150000_server_owned_password_change_challenge.sql` aplicada no Supabase remoto sem erro.
- Smoke remoto de Diego passou: login temporário, rejeição de conclusão sem desafio, rejeição sem `auth.updateUser`, troca válida, limpeza de `must_change_password`, novo login e restauração final da senha temporária com `active=true`.
- Commit `02ef3c96` publicado no `main`; deploy Vercel `dpl_GkjZ3EBQdreMYGkMQJtYgsk1foD7` ficou `READY` e aliasado em `https://mxperformance.vercel.app`; HTTP de `/` e `/login` retornou 200.
- Validação visual no Chrome não foi executada porque a extensão retornou `Browser is not available: extension` nas duas tentativas previstas.
- Incidente 2026-07-14: o Auth aceitava a solicitação de recovery, mas o projeto não tinha SMTP configurado; o frontend mostrava confirmação sem evidência de entrega.
- Criada a Edge Function `request-password-recovery`, que gera o link oficial do Supabase e envia pelo Gmail OAuth live, com resposta genérica e rate limit local por IP/e-mail.
- Criada a migration `20260714165502_prevent_duplicate_email_registrations`, aplicada no remoto, com índices únicos case-insensitive em `usuarios` e em pré-cadastros pendentes por loja.
- `store-pre-registration` passou a rejeitar e-mails já cadastrados com `409 existing_user`, sem atualizar perfil existente nem inserir novo pré-cadastro; o browser dispara a recuperação e mostra CTA para login.
- Smoke remoto de concorrência: duas submissões simultâneas produziram um único usuário/perfil/pré-cadastro e uma resposta `409 existing_user`; os dados temporários foram removidos.
- Smoke de produção via Chromium: `/login?mode=forgot` exibiu a confirmação genérica após chamada real à Edge Function; `/pre-cadastro/lial` carregou LIAL; usuário existente exibiu “Cadastro já existente” e CTA de recuperação, com zero novo pré-cadastro.
- A API do Gmail aceitou o envio de recuperação no smoke controlado; não foi afirmada leitura de inbox real de usuário final.
- Deploy Supabase: `request-password-recovery` versão 1 e `store-pre-registration` versão 52, ambos ativos.
- Deploy Vercel: `dpl_6t9kPSE2XJueRSQ5yohfZLnrgTGx`, `READY`, alias `https://mxperformance.vercel.app`.
- Incidente 2026-07-14: logs confirmaram que o aviso de link recente vinha do endpoint legado `/auth/v1/recover` com `429 over_email_send_rate_limit`, enquanto o fluxo atual usa `request-password-recovery` e retorna `200`.
- Consolidados registros duplicados de pré-cadastro por e-mail/loja, preservando o primeiro registro ativo e rejeitando cópias históricas; criada proteção única para todo registro não rejeitado.
- Função `store-pre-registration` publicada na versão 53; tentativa de pré-cadastro do Bruno retornou `409 existing_user` sem aumentar a contagem de registros.
- Frontend publicado com orientação de recuperação mesmo quando o disparo automático falha e headers `no-store` nas rotas de autenticação para evitar bundle legado em cache.
- Browser limpo em produção confirmou chamada exclusiva à Edge Function `/functions/v1/request-password-recovery` (`200`) e nenhuma chamada a `/auth/v1/recover`.
- Incidente ACERTT em 2026-08-03: Bruno concluiu `auth.updateUser`, mas o perfil `usuarios.active=false` bloqueava `complete_password_change()`; o Login também apagava a razão `inactive` e mostrava “link expirado”.
- Corrigido `src/pages/Login.tsx` para preservar/consumir a razão real antes de limpar o estado de sign-out; o usuário existente foi reconciliado para `active=true`, `must_change_password=false`, role `dono` e vínculo ativo com ACERTT, sem criar duplicata nem trocar a senha novamente.
- Teste estático `src/lib/login-recovery-inactive-state.test.ts` passou 2/2; produção publicada no deployment `dpl_32XFsZQ4NqMk3gDjiWEnPYGJ4Ryp` (`READY`) e `/login?recovery=1` abriu a tela de nova senha sem “link expirado” ou conta inativa.

### Completion Notes

- Conta da Mariane pronta para primeiro acesso com senha provisória e troca obrigatória.
- Recovery de senha validado com usuário E2E controlado; não foi afirmada entrega no inbox pessoal da Mariane.
- Processo de reset agora bloqueia apenas senhas com menos de 6 caracteres antes da gravação, evitando falso sucesso operacional.
- Para o caso Daniel, a senha solicitada passa na validação do app por ter 8 caracteres.
- Reset aplicado e validado para `danieljsvendas@gmail.com` com `must_change_password=true`.
- Conta Diego (`[EMAIL_REDACTED]`) ficou ativa, confirmada e apta a acessar com a nova senha definida no fluxo; o perfil persistido está com `must_change_password=false`.
- A conta está persistida com role `consultor_mx`, que é o perfil interno MX existente; nenhuma elevação de privilégio foi feita sem solicitação explícita.

### File List

- `docs/stories/story-OPS-20260514-admin-master-password-recovery.md`
- `scripts/README.md`
- `scripts/provision_mx_team.ts`
- `scripts/reset_admin_single.ts`
- `scripts/reset_passwords.ts`
- `scripts/reset_passwords_v2.ts`
- `scripts/reset_user_password.ts`
- `src/features/configuracoes/components/EditUserModal.tsx`
- `src/features/auth/components/ForcePasswordChange.tsx`
- `src/features/configuracoes/components/tabs/SegurancaTab.tsx`
- `src/features/equipe/components/UserCreationModal.tsx`
- `src/lib/auth/passwordPolicy.ts`
- `src/lib/auth/passwordPolicy.test.ts`
- `src/pages/Login.tsx`
- `src/lib/auth/passwordRecovery.ts`
- `src/pages/StorePreRegistration.tsx`
- `src/test/auth-password-recovery.playwright.ts`
- `src/test/e2e-helpers/supabase-admin.ts`
- `supabase/migrations/20260713130000_allow_controlled_password_change.sql`
- `supabase/migrations/20260713143000_require_password_update_proof.sql`
- `supabase/migrations/20260713150000_server_owned_password_change_challenge.sql`
- `src/lib/auth-password-change-migration.test.ts`
- `src/lib/login-recovery-inactive-state.test.ts`
- `src/hooks/auth/useAuthActions.ts`
- `src/types/database.generated.ts`
- `supabase/functions/request-password-recovery/index.ts`
- `supabase/functions/_shared/email.ts`
- `supabase/functions/store-pre-registration/index.ts`
- `supabase/migrations/20260714165502_prevent_duplicate_email_registrations.sql`
- `supabase/migrations/20260714171640_prevent_duplicate_active_pre_registrations.sql`
- `vercel.json`
