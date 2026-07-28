# Story OWNER-20260728 — Pacote Funcional V2

## Status

In Progress

## Origem

Implementar o pacote `MX_GESTAO_PREDITIVA_FUNCTIONAL_PACKAGE_V2`, preservando a
ordem e os gates definidos em `ROLLOUT.md` e nos manifestos `PHASES/`.

## Critérios de aceitação

- [x] Fase 1 — fundação compartilhada integrada e validada localmente.
- [x] Fase 2 — Plano Estratégico integrado e validado em produção.
- [x] Fase 3 — Plano de Ação integrado e validado em produção.
- [x] Fase 4 — Consultoria integrada e validada em produção.
- [ ] Fase 5 — Cockpit global integrado e validado.
- [ ] Migrations validadas primeiro em branch Supabase de desenvolvimento.
- [ ] Tipos Supabase regenerados após as migrations.
- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` verdes.
- [ ] Previews Vercel `READY` e smoke autenticado dos perfis aplicáveis.
- [ ] Nenhum segredo privilegiado novo versionado.

## Restrições

- Não aplicar migrations pela primeira vez no banco de produção.
- Não avançar uma fase sem os gates da fase anterior.
- Preservar correções posteriores à base auditada pelo pacote.
- Tratar credenciais fornecidas como dados de runtime, sem persistência.

## File List

Os arquivos de cada fase são os manifestos canônicos do pacote:

- `PHASES/01-fundacao-compartilhada.txt`
- `PHASES/02-plano-estrategico.txt`
- `PHASES/03-plano-de-acao.txt`
- `PHASES/04-consultoria.txt`
- `PHASES/05-cockpit-global.txt`

Arquivos de governança adicionados:

- `docs/stories/story-OWNER-20260728-functional-package-v2.md`
