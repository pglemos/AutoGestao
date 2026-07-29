# Relatório de Auditoria — MX Gestão Preditiva

**Data de início:** 2026-07-29
**Estado atual:** PARCIALMENTE CONCLUÍDO
**Branch:** `feat/unified-mx-design-system`
**Base de rollback:** `41ec4d39e165cab013988fab9aef54649b616095`

> Este documento é atualizado durante a execução. “Parcialmente concluído” é
> obrigatório enquanto qualquer gate do prompt mestre permanecer sem prova.

## 1. Resumo executivo

A auditoria foi retomada em uma worktree isolada e limpa. A árvore principal
continha alterações do proprietário e permaneceu intocada. A branch de Design
System contém a `main` atual e 17 commits incrementais.

No baseline de 2026-07-29, a alegação anterior de “App Shell único” não foi
aceita: o runtime ainda selecionava `OwnerShell` para Dono e `Layout` para os
demais perfis. Esse é um registro histórico do estado inicial; a convergência
final está comprovada na seção 14.

## 2. Ambiente

| Item | Valor verificado |
|---|---|
| Sistema | macOS 26.4, Darwin 25.4.0 |
| Arquitetura | arm64 |
| Node do projeto | v24.13.0 |
| npm | 11.6.2 |
| Git | 2.50.1 |
| Playwright | 1.61.1 |
| Vercel CLI do projeto | 50.44.0 |
| Supabase CLI do projeto | 2.110.0 |
| Sentry CLI do projeto | 2.58.5 |
| Framework | React 19 + TypeScript + Vite |
| Diretório isolado | worktree `mx-ds` |

O shell de login selecionava Node 25.9.0, fora do contrato `<25`. Todos os gates
foram repetidos com o caminho explícito do Node 24.

## 3. Alterações realizadas

### Segurança de dependências

- Atualização lockfile de React Router 7.18.1 para 7.18.2.
- Overrides auditáveis:
  - `tar` 7.5.22;
  - `js-yaml` 4.3.0;
  - `esbuild` 0.25.12.
- Resultado: vulnerabilidade crítica removida; total de 51 para 48.
- Não foi usado `npm audit fix --force`.
- O override inicial `esbuild 0.28.1` passou no build, mas quebrou o servidor
  Vite durante a otimização de dependências. Ele foi substituído pela linha
  segura e compatível `0.25.12`; o servidor dev voltou a responder sem erros e
  o audit permaneceu em 48 alertas, 0 críticos.

### Acessibilidade

- Backdrops deixaram de depender de elemento estático interativo; o drawer de
  regularização usa botão semântico dedicado para fechar.
- Removida diretiva ESLint sem efeito.
- Resultado: ESLint de 5 warnings para 0.

## 4. Evidências atuais

| Gate | Resultado | Código |
|---|---:|---:|
| `npm run lint` | 842 arquivos de tokens; 61 z-index; 0 warnings | 0 |
| `npm run typecheck` | 4 pass / 0 fail + TypeScript | 0 |
| `npm test` | 1.668 pass / 0 fail / 13.851 expects | 0 |
| `npm run build` | 5.123 módulos transformados | 0 |
| `npm run check:bundle-size` | 1.857,54/1.860 KB gzip | 0 |
| `npm audit` inicial | 51 total; 1 crítica | 1 |
| `npm audit` após correção | 48 total; 0 crítica | 1 |

O código 1 de `npm audit` permanece porque existem vulnerabilidades altas sem
correção compatível confirmada. Esse gate ainda está bloqueado.

Execuções intermediárias tiveram contagens menores enquanto testes eram
adicionados. A linha canônica acima corresponde à regressão final desta
worktree: 1.668 testes e 13.851 asserts.

## 5. GitHub

- Repositório confirmado: `pglemos/MXGESTAOPREDITIVA`.
- Branch padrão: `main`.
- Sessão oficial autenticada por keyring.
- Execuções recentes incluem gates de RLS, migrations, secrets, a11y e testes.
- Achado: execução recente de `bundle-budget` falhou no SHA observado; deve ser
  reproduzida e corrigida antes de release.

## 6. Supabase

- Projeto correto: `MX GESTAO PREDITIVA`, região `sa-east-1`, PostgreSQL
  17.6.1.063 e estado `ACTIVE_HEALTHY`.
- Inventário remoto: 214 tabelas em `public`, todas com RLS; 8 delas não têm
  policy. Existem 203 funções `SECURITY DEFINER`; 59 são executáveis por
  `anon` e 147 por `authenticated`.
- Security Advisors: 218 achados, sendo 8 `INFO` e 210 `WARN`.
- As tabelas sem policy incluem `ai_model_daily_usage`,
  `carteira_missao_mutations`, `data_correction_audit`,
  `internal_mx_admin_rate_limits`, `password_change_challenges`,
  `password_recovery_attempts` e duas tabelas de backup de migration. RLS sem
  policy nega acesso por padrão, mas a intenção e o acesso operacional ainda
  precisam ser provados.
- Os buckets públicos `perfis_usuario` e `pre-cadastro-avatares` possuem
  policy `SELECT TO public` apenas por `bucket_id`, permitindo listagem ampla
  de objetos. As URLs públicas e o upload por proprietário precisam ser
  preservados ao corrigir a listagem.
- A proteção contra senhas vazadas está desabilitada e `pg_net` está instalado
  em `public`; ambos permanecem pendentes de remediação/configuração.
- A consulta de grants confirmou que o acesso de `anon` vem de `PUBLIC` em
  funções privilegiadas. A migration `20260717273000` já corrige seis RPCs,
  porém o advisor continua apontando 59 funções, incluindo helpers, mutations
  e uma trigger que não deveriam constituir API anônima.
- O histórico remoto contém migrations até `20260729130000`, enquanto esta
  branch termina antes disso. As migrations `20260729120000` e
  `20260729130000` existem em outra branch (`fix/observabilidade-producao`) e
  não em `main`, caracterizando drift Git/banco que deve ser reconciliado antes
  de novo DDL.
- Backup físico: a CLI retornou `backups: []`, `pitr_enabled: false` e
  `walg_enabled: true`. Isso **não comprova backup restaurável**; por segurança,
  nenhuma migration/DDL foi aplicada nesta story.
- Configuração local ainda declara `minimum_password_length = 6` e
  `secure_password_change = false`; a configuração Auth remota precisa ser
  verificada pela API de gestão sem expor segredos.

## 7. Vercel

- Projeto confirmado: `synvolt/mxperformance`.
- Runtime configurado: Node 24.x.
- Há preview recente `Ready` e produção recente `Ready`.
- Há quatro previews recentes em `Error`.
- Nenhum deployment atual é usado como prova desta story até validar o SHA,
  logs, autenticação, rotas e browser.

## 8. Sentry

- Pacotes de runtime e build existem no código.
- A CLI não está instalada.
- Evento controlado, release, source maps, environment e alertas ainda não
  foram provados nesta execução.

## 9. Matriz de perfis

| Perfil | Código/contrato | Browser autenticado atual | Estado |
|---|---:|---:|---|
| Dono | shell e contratos verdes | `/home` e `/plano-acao` validados | parcial; demais rotas/viewports pendentes |
| Gerente | shell e contratos verdes | 5 rotas reais validadas | parcial; mutations/estados restantes pendentes |
| Vendedor | shell e contratos verdes | 6 rotas reais validadas | parcial; mutations/estados restantes pendentes |
| Admin MX | credencial fornecida resolveu como Administrador Geral | 5 rotas reais validadas | papel real difere do rótulo informado |
| Administrador Geral | shell e contratos verdes | `/painel`, `/lojas`, `/agenda`, `/configuracoes`, `/auditoria` | parcial |
| Consultor MX | 2 perfis reais encontrados | login funcional bloqueado | conta nominal autentica, mas `usuarios.active` retorna 401/nulo; segunda conta retorna Auth 400 |

## 10. Dívida priorizada

| ID | Gravidade | Problema | Evidência | Próxima correção |
|---|---:|---|---|---|
| AUD-001 | P0 | Dependências com 40 alertas altos | `npm audit` | separar runtime/dev, atualizar ferramentas e substituir `xlsx` |
| AUD-002 | P1 | Shell ainda possui caminhos paralelos | `AppShell.tsx` | contrato literal + convergência testada |
| AUD-003 | P1 | Browser por perfil não revalidado | sem evidência nova | matriz autenticada completa |
| AUD-004 | P1 | Supabase remoto/RLS não revalidado | worktree não vinculada | backup, link e matriz remota |
| AUD-005 | P1 | Sentry operacional não provado | CLI ausente | instalar/usar API oficial e gerar evento de preview |
| AUD-006 | P1 | `bundle-budget` remoto falhou | GitHub Actions | reproduzir localmente e corrigir |
| AUD-007 | P2 | Testes contradizem shell único | contratos atuais | consolidar contrato arquitetural |
| AUD-008 | P2 | previews recentes em erro | lista Vercel | inspecionar logs e separar falhas antigas |
| AUD-009 | P0 | Banco remoto está à frente de `main` | migrations remotas `20260729120000`–`130000` | reconciliar Git/SHA/autoridade antes de DDL |
| AUD-010 | P0 | Backup restaurável não comprovado | `backups: []`, PITR desabilitado | obter snapshot/backup validado antes de mutation |
| AUD-011 | P1 | 59 `SECURITY DEFINER` expostas a `anon` | grants remotos/advisor | classificar e revogar `PUBLIC` com contrato por RPC |
| AUD-012 | P1 | Buckets públicos permitem listagem ampla | policies `SELECT TO public` | desenhar acesso por objeto sem quebrar URLs |
| AUD-013 | P1 | Bundle total excedia o orçamento | gate final 1.857,54/1.860 KB | corrigido sem elevar budget; manter monitoramento |
| AUD-014 | P1 | Override esbuild inicialmente quebrou Vite dev | 2.860 erros no optimizer | corrigido para 0.25.12 e revalidado |
| AUD-015 | P0 | Senha operacional previsível estava versionada | busca inicial: 21 arquivos; busca final literal: zero | corrigido no código; rotacionar contas ainda é obrigatório |
| AUD-016 | P0 | Consultor MX não possui caminho funcional validável | conta nominal autentica, mas leitura de `usuarios.active` retorna 401/nulo; segunda conta falha no Auth 400 | recuperar a conta existente sem duplicar identidade e revalidar |

## 11. Rollback

- Código: commits desta story serão isolados sobre `41ec4d39`.
- Dependências: remover `overrides` e restaurar o lockfile do SHA-base.
- Banco: nenhuma mutation de produção executada.
- Deploy: produção atual será registrada antes de qualquer promoção; rollback
  utilizará o deployment READY anterior.

## 12. Pendências bloqueantes

- Inventário completo de rotas e actions.
- Backup e validação remota de migrations/RLS/Auth/Storage/Realtime.
- Reconciliação do drift entre migrations aplicadas no banco e branches Git.
- E2E autenticado dos seis perfis e 13 viewports.
- Preview desta story, Sentry controlado e `/api/health`.
- Correção/aceite explícito das vulnerabilidades altas.
- CI completo, PR, produção, smoke e monitoramento.
- Recuperação da conta Consultor MX existente; não criar identidade duplicada.

## 13. Evidência adicional de CI e bundle

O gate `npm run check:bundle-size` foi reproduzido localmente com Node 24 e
falhou com código 1:

- total: 2.137,15 KB gzip para orçamento de 1.860 KB;
- excesso: 277,15 KB (14,9%);
- maiores chunks: `index` 188,97 KB, `vendor-react` 137,91 KB,
  `vendor-charts` 132,16 KB, `CarteiraClientes` 127,93 KB e `vendor-jspdf`
  125,84 KB;
- `vendor-react`, `vendor-ui` e `vendor-charts` também estão acima de 90% de
  seus limites individuais.

Depois da remoção do ramo ativo `OwnerShell`, o total permaneceu em torno de
2.133 KB gzip. A medição mais recente foi 2.133,06/1.860 KB, ainda 273,06 KB
acima do orçamento.

Uma compilação diagnóstica com `terser` reduziu o total para
2.085,56/1.860 KB, mas ainda falhou por 225,56 KB. Portanto, trocar apenas o
minificador não resolve o gate e não foi tratado como aprovação.

A correção final preservou o minificador oficial e o orçamento de 1.860 KB:

- o frontend deixou de empacotar `xlsx`; o exportador agora gera OOXML
  diretamente e mantém `xlsx` apenas para importadores CLI legados;
- `jsPDF` foi removido e substituído por um escritor PDF 1.4 que incorpora as
  imagens produzidas pelo `html2canvas`;
- `unzip -t` validou o XLSX gerado no Chromium;
- `pdfinfo` validou PDF 1.4, A4, uma página e sem JavaScript;
- gate final: 1.857,54/1.860 KB gzip, código de saída 0.

## 14. App Shell e browser autenticado

- `AppShell.tsx` agora monta somente `Layout` dentro de `AppShellFrame`; não há
  seleção runtime entre `OwnerShell` e `Layout`.
- Dono usa a mesma implementação `MxSidebarShell`, o mesmo drawer e o mesmo
  landmark `main-content`, preservando `OwnerProvider`, modal de consultoria,
  toaster, tokens e navegação executiva.
- O primeiro login real em `/home` expôs ausência do contexto de `Outlet`
  (`setLastUpdated`); o contrato foi movido para `Layout` e revalidado.
- O browser autenticado do Dono em 1.440×900 confirmou: um `main-content`, uma
  sidebar `Menu principal do Dono`, 16 links, 1 grupo expansível, nenhum erro
  de console e nenhuma resposta HTTP finita com status 4xx/5xx.
- A navegação real `Plano de Ação` resolveu para `/plano-acao`, manteve o shell
  único e exibiu o `h1` correto sem erro de console/network.
- Evidência visual:
  `output/playwright/dono-shell-unificado-nav-1440x900.png`.

### Convergência literal dos resíduos

- Removidos do código: `OwnerShell.tsx`, `OwnerLayout.jsx`,
  `OwnerSidebar.jsx` e `OwnerTopbar.jsx`.
- Removidos os seletores runtime `.owner-b44`, `.mx-manager-scope` e
  `.mx-internal-scope`.
- A configuração visual agora usa atributos semânticos da moldura única:
  `data-mx-role`, `data-mx-visual-system` e `data-mx-internal-scope`.
- Browser comprovou os mesmos tokens (`--primary: 152 69% 31%` e
  `--color-mx-action: #059669`) sem nenhuma das classes legadas.

## 15. Matriz responsiva autenticada

Foram executadas 52 combinações: Dono, Gerente, Vendedor e Administrador Geral
em cada um dos 13 viewports obrigatórios (320×568 até 2560×1440).

Em todas as combinações:

- existe exatamente um `main-content`;
- não há overflow horizontal do documento;
- abaixo de 1280 px, sidebar fixa fica oculta e header mobile fica visível;
- a partir de 1280 px, sidebar fica visível e header mobile fica oculto;
- o drawer abriu, recebeu `role="dialog"` e fechou com `Escape` em 320×568.

Também foram capturados os quatro drawers em
`output/playwright/*-drawer-320x568.png`.

## 16. Secret scan

- `gitleaks` não está instalado na worktree; o gate oficial permanece pendente.
- Busca local por padrões de tokens reais GitHub/Supabase/Sentry não encontrou
  os valores fornecidos nesta execução em arquivos do repositório.
- A senha operacional compartilhada estava versionada em 21 arquivos,
  incluindo scripts ativos, scripts legados e documentação.
- Todos os scripts passaram a exigir `MX_E2E_PASSWORD`; geradores e documentos
  deixaram de materializar o valor.
- A busca literal final retornou zero ocorrências e todos os JS/CJS/MJS
  alterados passaram em `node --check`.
- A rotação das contas continua obrigatória porque o segredo foi exposto no
  histórico e nesta conversa.
- Nenhum segredo fornecido nesta conversa foi adicionado pelas mudanças desta
  story.

## 17. Conclusão baseada em evidências

**PARCIALMENTE CONCLUÍDO.** O baseline local, o shell único, a matriz
responsiva de quatro perfis, o saneamento do segredo e o orçamento total do
bundle passaram. Permanecem bloqueantes o Consultor MX, banco/backup, preview,
Sentry, CI remoto e publicação.
