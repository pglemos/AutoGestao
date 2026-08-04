# Evidence ledger — MX autônomo — 2026-08-04

## EV-BASE-001

- Requisito: trabalhar diretamente na `main` com backup antes de editar.
- Ambiente: checkout local `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`.
- Perfil: não aplicável.
- Rota/objeto: Git repository.
- Viewport: não aplicável.
- Estado exercitado: branch, upstream, working tree e refs remotas.
- Ação: `git fetch --all --prune`, `git checkout main`, `git pull --ff-only origin main`, `git ls-remote origin refs/heads/main`.
- Resultado esperado: `main` atualizada sem perda de arquivos.
- Resultado observado: local e remoto em `11a9465f253ce8f96052db70c9171b14425e9d4e`; apenas `mx-v3-csv-VzMBNx/` não rastreado.
- SHA: `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Deployment: não aplicável.
- Timestamp: `2026-08-04T05:31:59-03:00`.
- Artefato: saída do terminal e diretório preservado.
- Conclusão permitida: baseline Git comprovada; não prova release ou produção.

## EV-BASE-002

- Requisito: backup Git anotado e bundle completo verificável.
- Ambiente: checkout local.
- Perfil/rota/viewport: não aplicável.
- Estado exercitado: tag e bundle.
- Ação: `git show pre-main-autonomous-20260804-051820` e `git bundle verify /Users/pedroguilherme/PROJETOS/MXGESTAOPREDITIVA-pre-main-autonomous-20260804-051820.bundle`.
- Resultado esperado: tag aponta para o SHA inicial e bundle contém história completa.
- Resultado observado: tag anotada aponta para `11a9465f...`; bundle validado como história completa.
- SHA: `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Deployment: não aplicável.
- Timestamp: `2026-08-04T05:31:59-03:00`.
- Artefato: tag e bundle locais.
- Conclusão permitida: backup comprovado; não prova restauração de Supabase.

## EV-CTRL-001

- Requisito: nove arquivos de controle versionados sem placeholders secretos.
- Ambiente: checkout local.
- Perfil/rota/viewport: não aplicável.
- Estado exercitado: criação inicial dos artefatos.
- Ação: patch dos arquivos em `docs/execution/`.
- Resultado esperado: todos os arquivos existem com estados explícitos.
- Resultado observado: a criação está em andamento; o commit e a revisão ainda não foram executados.
- SHA: `11a9465f253ce8f96052db70c9171b14425e9d4e` antes do commit.
- Deployment: pendente.
- Timestamp: `2026-08-04T05:31:59-03:00`.
- Artefato: este ledger e os nove documentos relacionados.
- Conclusão permitida: controle local em andamento; não permite declarar task concluída.

## EV-GERENTE-001

- Requisito: zero warnings de dimensão no gráfico do Gerente.
- Ambiente: produção e local, a revalidar.
- Perfil: Gerente.
- Rota/objeto: `ManagerSellerParityHomeCanonical.tsx` / `AppointmentsChart`.
- Viewport: matriz completa a revalidar.
- Estado exercitado: carregamento inicial e gráfico com dados reais.
- Ação: pendente — reproduzir warning, executar teste RED, corrigir e validar.
- Resultado esperado/observado: ainda não executado nesta rodada.
- SHA/deployment/timestamp: pendentes.
- Artefato: screenshot, console e teste focado serão anexados quando produzidos.
- Conclusão permitida: nenhuma até prova GREEN e produção.

## EV-BASE-003

- Requisito: revalidar Git/branches sem deletar nem reescrever histórico.
- Ambiente: checkout local `/Users/pedroguilherme/PROJETOS/MX GESTAO PREDITIVA`.
- Perfil: não aplicável.
- Rota/objeto: Git repository.
- Viewport: não aplicável.
- Estado exercitado: HEAD atual, remote refs e inventário de branches.
- Ação: `git fetch --all --prune`, `git rev-parse HEAD`, `git branch -r | wc -l`, `git branch -a --verbose --no-abbrev`.
- Resultado esperado: `main` alinhada e branches inventariadas sem deleção.
- Resultado observado: `HEAD=9fdd484f1eb0c79c11cba98bac91eca2502ee799`; `branches-remote-count=24`; nenhuma deleção executada.
- SHA: `9fdd484f1eb0c79c11cba98bac91eca2502ee799`.
- Deployment: não aplicável.
- Timestamp: `2026-08-04T05:51:39-03:00`.
- Artefato: saída do terminal e inventário de branches.
- Conclusão permitida: branches revalidadas; não há branch deletion nesta rodada.

## EV-BASE-004

- Requisito: revalidar acessos sem imprimir segredos.
- Ambiente: CLI local.
- Perfil: não aplicável.
- Rota/objeto: Vercel CLI e Supabase CLI.
- Viewport: não aplicável.
- Estado exercitado: autenticação de CLI e listagem de projetos.
- Ação: `vercel whoami`; `supabase projects list`.
- Resultado esperado: acesso disponível sem exposição de credenciais.
- Resultado observado: `vercel whoami` retornou `synvolt`; `supabase projects list` retornou a lista de projetos e indicou apenas a ausência de link local do projeto.
- SHA: `9fdd484f1eb0c79c11cba98bac91eca2502ee799`.
- Deployment: não aplicável.
- Timestamp: `2026-08-04T05:51:39-03:00`.
- Artefato: saída de CLI.
- Conclusão permitida: acesso revalidado onde disponível; comandos escopados do Supabase seguem fora deste diretório.

## EV-BASE-005

- Requisito: revalidar produção e marcar a diferença entre alias público e deployment READY.
- Ambiente: produção Vercel.
- Perfil: não aplicável.
- Rota/objeto: `mxperformance.vercel.app/api/health` e `mxperformance-fd1gtgmfg-synvolt.vercel.app/api/health`.
- Viewport: não aplicável.
- Estado exercitado: health checks HTTP 200 e inspeção do deployment READY.
- Ação: `vercel list --non-interactive --status READY --format json`; `vercel inspect mxperformance.vercel.app --format json`; `vercel inspect mxperformance-fd1gtgmfg-synvolt.vercel.app --format json`; `curl -sS` aos dois endpoints `/api/health`.
- Resultado esperado: produção atual revalidada com status claro.
- Resultado observado: deployment READY mais recente `mxperformance-fd1gtgmfg-synvolt.vercel.app`; alias público ainda serviu `release":"1b99c0ab82618038fa0826557e7b8762e6247b2b"`; deployment READY mais recente serviu `release":"11a9465f253ce8f96052db70c9171b14425e9d4e"`; ambos responderam 200.
- SHA: `1b99c0ab82618038fa0826557e7b8762e6247b2b` e `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Deployment: `mxperformance.vercel.app`, `mxperformance-fd1gtgmfg-synvolt.vercel.app`.
- Timestamp: `2026-08-04T05:51:39-03:00`.
- Artefato: JSON do Vercel CLI e corpo HTTP de `/api/health`.
- Conclusão permitida: produção revalidada; mismatch de alias documentado, não corrigido nesta rodada.
