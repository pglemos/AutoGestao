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
