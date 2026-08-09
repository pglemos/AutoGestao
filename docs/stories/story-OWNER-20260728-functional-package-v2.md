# Story OWNER-20260728 — Pacote Funcional V2

## Status

Ready for Review — release final e smoke autenticado completo ainda pendentes

## Origem

Implementar o pacote `MX_GESTAO_PREDITIVA_FUNCTIONAL_PACKAGE_V2`, preservando a
ordem e os gates definidos em `ROLLOUT.md` e nos manifestos `PHASES/`.

## Critérios de aceitação

- [x] Fase 1 — fundação compartilhada integrada e validada localmente.
- [x] Fase 2 — Plano Estratégico integrado e validado em produção.
- [x] Fase 3 — Plano de Ação integrado e validado em produção.
- [x] Fase 4 — Consultoria integrada e validada em produção.
- [x] Fase 5 — Cockpit global integrado e validado em produção.
- [x] Migrations aplicadas e relidas no Supabase de produção por autorização do usuário.
- [x] Tipos Supabase regenerados após as migrations.
- [x] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` verdes.
- [x] Contratos focados do pacote e regressões do Dono verdes.
- [ ] Previews Vercel `READY` e smoke autenticado dos perfis aplicáveis.
- [x] Nenhum segredo privilegiado novo versionado.

## Restrições

- Migrations aplicadas diretamente no banco de produção por autorização
  explícita do usuário em 2026-07-28.
- Não avançar uma fase sem os gates da fase anterior.
- Preservar correções posteriores à base auditada pelo pacote.
- Tratar credenciais fornecidas como dados de runtime, sem persistência.

## File List

Os arquivos de cada fase são os manifestos canônicos do pacote:

- `PHASES/01-fundacao-compartilhada.txt`
- `src/pages/owner/PlanoEstrategico.jsx`
- `src/pages/owner/Consultoria.jsx`
- `src/features/strategic-plan/StrategicPlanWorkspace.contract.test.ts`

## Dev Agent Record

### Completion Notes

- Corrigido loop de recarga do Plano Estratégico causado por callback `onUpdated` instável.
- Restaurado o layout anterior da Consultoria do Dono com dados persistidos pelo `useOwnerConsultingProgram`.
- Validado localmente com perfil Dono em desktop e mobile, sem skeleton persistente ou overflow horizontal.

### Change Log

- 2026-07-28: correção de regressão visual e funcional nas rotas `/dono/plano-estrategico` e `/dono/consultoria`.
- `PHASES/02-plano-estrategico.txt`
- `PHASES/03-plano-de-acao.txt`
- `PHASES/04-consultoria.txt`
- `PHASES/05-cockpit-global.txt`

Arquivos de governança adicionados:

- `docs/stories/story-OWNER-20260728-functional-package-v2.md`

## Validação local

- `npm run lint`: verde, sem erros (7 avisos preexistentes).
- `npm run typecheck`: verde.
- `npm test`: 1600/1600 verdes.
- `npm run build`: verde.
- `verify_package_contracts.mjs`: verde.
- Contratos Dono/dados reais/tabela: 22/22 verdes.

## Atualização de execução — 2026-08-09

- `/universidade-mx`, `/rotina` e `/decisoes` do Dono deixaram de encaminhar para placeholders e usam as superfícies canônicas de dados.
- Período trimestral, PDI responsivo, health check server-side e ponte de métricas do Sentry receberam contratos focados.
- Scopes/namespace legados foram removidos do runtime; `audit-owner-b44-graph.mjs --check` encontrou 0 imports retirados.
- Gates locais finais: `npm run lint`, `npm run typecheck`, `npm test` (2.589 testes / 18.131 expectativas), `npm run build`, `npm run check:bundle-size`, `npm run audit:routes-data`, `git diff --check` e `gitleaks` passaram.
- Migrations remotas aplicadas: `20260809143559_revoke_anon_mentor_trigger_execute.sql` e `20260809152358_harden_backup_is_venda_loja_policy.sql`.
- Publicação do SHA final, smoke autenticado completo e provas externas de Sentry/restore/rollback permanecem pendentes; ver `docs/execution/2026-08-09-final-report.md`.

### File List — atualização 2026-08-09

- `src/App.tsx`
- `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.tsx`
- `src/features/owner/OwnerRoutineRoute.tsx`
- `src/features/owner/ownerRepository.js`
- `src/features/owner/lib/ownerAudit.ts`
- `src/features/owner/lib/ownerAuth.ts`
- `src/features/universidade/sections/UniversidadeMx.tsx`
- `src/lib/owner-period.ts`
- `src/lib/observability/sentry.ts`
- `supabase/migrations/20260809143559_revoke_anon_mentor_trigger_execute.sql`
- `supabase/migrations/20260809152358_harden_backup_is_venda_loja_policy.sql`
- `docs/execution/2026-08-09-final-report.md`
