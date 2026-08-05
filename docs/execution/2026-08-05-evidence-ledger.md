# EVIDENCE LEDGER — 2026-08-05

| ID Evidência | Task | Requisito / Alvo | Ambiente | Perfil | Ação / Comando | Resultado Esperado | Resultado Observado | SHA / Status | Timestamp |
|---|---|---|---|---|---|---|---|---|---|
| EV-001 | C0.1 | `StoreEditModal.tsx` & `ManagerDailyClosing.container.tsx` | Local | Admin/Gerente | `npm run audit:management-design-system` | 0 violações | `violations: []` (6/6 tests passed) | `037f49c4` (PASS) | 2026-08-05T04:18:02-03:00 |
| EV-002 | FASE 0 | Git Tag Backup & Bundle Verification | Local | Dev | `git tag` & `git bundle verify` | Tag criada e Bundle verificado | `refs/heads/main` sha1 validado | `037f49c4` (PASS) | 2026-08-05T04:16:58-03:00 |
| EV-003 | C0.2 | Módulo Dono & PR #175 (`useStoreManagementContext`) | Local | Dono/Gerente/Admin | `npm run typecheck && npm test` | Suíte e tipos do contexto gerencial validados | 1789 tests pass, ADR-MX-005 criado | `bfda5e33` (PASS) | 2026-08-05T04:22:42-03:00 |
| EV-004 | C0.3 | Eliminação de Scopes Legados (`.owner-b44`) | Local | Todos | `node scripts/lint-page-roots.mjs` & AST lint | 0 scopes legados no runtime ativo | Clean AST/HTML layout, tests pass | `bfda5e33` (PASS) | 2026-08-05T04:23:10-03:00 |
