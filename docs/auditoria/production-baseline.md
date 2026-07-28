# Production Baseline

## Ambiente
- Data e hora: 2026-07-27, ~21h (BRT)
- Caminho local: `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`
- Branch local: `main` (limpa; apenas `?? .claude_backup/` não versionado)
- Commit local: `6a117e27`
- Branch remota: `origin/main`
- Commit remoto: `6a117e27`
- Projeto Vercel canônico: `synvolt/mxperformance`
  (`prj_fpYjxc851kMs55GzR6tgQEr7uWUj`)
- A evidência original deste baseline apontava por engano para o projeto manual
  `mx-gestao-preditiva`, que não possuía integração Git e foi removido em
  2026-07-28.
- Domínios canônicos: `mxperformance.vercel.app`, `mxperformance.com.br` e
  `www.mxperformance.com.br`
- Projeto Supabase: `fbhcmzzgwjdgkctlfvbo` (PostgreSQL 17.6)
- Migration mais recente no baseline: `20260727140000_cancelamento_venda_regras_perfil`
  (305 registradas em `supabase_migrations.schema_migrations`; 307 arquivos locais,
  a diferença são os diretórios `_archived` e `_templates`)
- Node: v24.13.0
- Package manager: npm (`package-lock.json`)

## Baseline técnico
| Etapa | Comando | Resultado |
|---|---|---|
| Instalação | `npm ci` | OK |
| Lint | `npm run lint` | OK — 0 erros, 7 warnings |
| Typecheck | `npx tsc --noEmit` | OK — sem erros |
| Testes | `npm test` | OK — 1481 pass / 0 fail (328 arquivos) |
| Build | `npm run build` | OK — `✓ built in 8.00s` |

## Problemas preexistentes
| Problema | Evidência | Dentro do escopo |
|---|---|---|
| 7 warnings de acessibilidade | `RegularizarFechamentoDrawer.tsx:179`, `VendedorTreinamentos.container.tsx:372`, `QuizTreinamento.tsx:43`, `VendedorHome.tsx:204/225` | Não |
| 129 alertas Dependabot no repositório (3 críticos, 68 altos) | Aviso do `git push` | Não |
| `clientes_oportunidades` concede INSERT/UPDATE/DELETE a `authenticated` numa view de leitura | `information_schema.role_table_grants` | Não (registrado para plano separado) |
| Chunks acima de 800 kB (`index`, `OwnerModule`) | saída do `vite build` | Não |

## Nota de ambiente
Os testes falham no worktree se os arquivos `.env` não forem copiados
(`useStores.test.ts` quebra com "Cannot access 'supabase' before initialization").
Copiar `.env` para o worktree antes de rodar a suíte.
