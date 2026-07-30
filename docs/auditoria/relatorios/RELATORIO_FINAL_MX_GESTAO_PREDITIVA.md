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
- `npm audit --omit=dev` separou o runtime: 2 pacotes high
  (`react-router`/`react-router-dom`) derivados de um único advisory de CSRF em
  RSC Actions (`GHSA-qwww-vcr4-c8h2`). Esta SPA Vite usa `BrowserRouter` e não
  possui RSC, Server Actions, SSR nem action handlers do React Router.
- Foi testado o downgrade para 7.11.0, fora desse advisory, mas ele introduziu
  advisories aplicáveis à SPA, incluindo open redirect/XSS em
  `<Link>`/`useNavigate` e DoS de route matching. O downgrade foi revertido e
  7.18.2 foi preservado.
- Os outros 46 alertas estão na árvore de desenvolvimento; os 40 high se
  concentram em Storybook, Vercel CLI, ESLint, Workbox e `xlsx` legado de
  importadores CLI. Eles não entram no bundle publicado, mas continuam dívida
  de supply chain e não foram declarados corrigidos.

### Acessibilidade

- Backdrops deixaram de depender de elemento estático interativo; o drawer de
  regularização usa botão semântico dedicado para fechar.
- Removida diretiva ESLint sem efeito.
- Resultado: ESLint de 5 warnings para 0.

### Autorização de pré-cadastro

- A auditoria das Edge Functions com `verify_jwt=false` encontrou um P0 em
  `store-pre-registration`: o endpoint público adotava uma identidade existente
  apenas no Auth e redefinia sua senha com `service_role`.
- O mesmo endpoint também podia reativar perfil e vínculo previamente
  desativados sem decisão do Admin MX.
- Os dois caminhos foram removidos. Identidades existentes agora seguem para
  recuperação de senha e ajuste administrativo, sem reset nem reativação pelo
  endpoint público.
- Contrato regressivo: 3 testes, 9 asserts e zero falhas.
- `deno check supabase/functions/store-pre-registration/index.ts` retornou 0.

## 4. Evidências atuais

| Gate | Resultado | Código |
|---|---:|---:|
| `npm run lint` | 842 arquivos de tokens; 61 z-index; 0 warnings | 0 |
| `npm run typecheck` | 4 pass / 0 fail + TypeScript | 0 |
| `npm test` | 1.686 pass / 0 fail / 13.896 expects | 0 |
| `npm run build` | 5.123 módulos transformados | 0 |
| `npm run check:bundle-size` | 1.857,80/1.860 KB gzip | 0 |
| `npm audit` inicial | 51 total; 1 crítica | 1 |
| `npm audit` após correção | 48 total; 0 crítica | 1 |

O código 1 de `npm audit` permanece. O advisory high do runtime foi aceito
explicitamente por ausência comprovada da superfície RSC; a árvore de
desenvolvimento ainda exige upgrades maiores e esse gate agregado continua
bloqueado.

Execuções intermediárias tiveram contagens menores enquanto testes eram
adicionados. A linha canônica acima corresponde à regressão final desta
worktree: 1.686 testes e 13.896 asserts.

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
- O histórico remoto e esta branch agora contêm 327 migrations, até
  `20260729130000`; a comparação read-only confirmou `remote_only_count=0`.
  As cinco migrations de observabilidade já aplicadas remotamente foram
  incorporadas ao Git por cherry-pick, sem reaplicação no banco.
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

- Consulta atual via API oficial, somente GET, confirmou a organização
  `synvolt` e os projetos `mx-performance-frontend`, `mx-performance-edge` e
  `mx-performance-health`.
- Nas últimas 24 horas há um único issue não resolvido em `production` no
  frontend. É o erro controlado de smoke, com três ocorrências totais e uma no
  ambiente de produção; o evento traz `mx.smoke=producao`, rota `/login` e
  release `8ea36206…`.
- O stack foi resolvido pelo source map para
  `src/lib/observability/sanitize.ts`, comprovando simbolização da release
  publicada.
- Edge e Health retornaram zero issues não resolvidos nas últimas 24 horas.
- A release da branch desta story, seu preview e um novo evento controlado
  permanecem pendentes; a evidência acima comprova o circuito atual de
  produção, não o código ainda não publicado desta branch.

## 9. Matriz de perfis

| Perfil | Código/contrato | Browser autenticado atual | Estado |
|---|---:|---:|---|
| Dono | shell e contratos verdes | `/home` e `/plano-acao` validados | parcial; demais rotas/viewports pendentes |
| Gerente | shell e contratos verdes | 5 rotas reais validadas | parcial; mutations/estados restantes pendentes |
| Vendedor | shell e contratos verdes | 6 rotas reais validadas | parcial; mutations/estados restantes pendentes |
| Admin MX | credencial fornecida resolveu como Administrador Geral | 5 rotas reais validadas | papel real difere do rótulo informado |
| Administrador Geral | shell e contratos verdes | `/painel`, `/lojas`, `/agenda`, `/configuracoes`, `/auditoria` | parcial |
| Consultor MX | 2 perfis reais encontrados | login funcional bloqueado | conta nominal autentica, mas `usuarios.active` retorna 401/nulo; segunda conta retorna Auth 400 |

Uma reconciliação read-only posterior, sem expor identificadores, confirmou que
os dois perfis têm identidade Auth confirmada e histórico de login. O primeiro
está inativo no perfil; o segundo está ativo e com troca de senha pendente.
Nenhum está banido ou excluído no Auth. Isso descarta criação de duplicata, mas
não autoriza redefinir credencial ou reativar identidade: o caminho seguro
continua sendo recuperação controlada pelo titular ou ação autenticada do Admin
MX sobre a identidade correta, seguida de login e releitura persistida.

### 9.1 Inventário reproduzível de rotas, autorização e dados

O comando `npm run audit:routes-data` analisa o AST de `src/App.tsx`, cruza
rotas protegidas com `ROUTE_ACCESS_RULES` e percorre os consumidores runtime
em `src/`. O resultado versionado está em
`docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md`.

Resultado atual:

- 111 declarações de rota: 103 protegidas e 8 públicas;
- zero rota protegida de folha sem regra canônica ou redirect;
- zero caminho de folha declarado mais de uma vez;
- 127 tabelas, 84 RPCs e 14 Edge Functions referenciadas;
- 247 pares tabela/operação, distinguindo `select`, `insert`, `update`,
  `upsert` e `delete`;
- contrato automatizado garante que a matriz versionada permanece idêntica às
  fontes atuais.

Esse inventário prova cobertura estrutural e rastreabilidade dos consumidores.
Ele não substitui a prova E2E de autorização, mutation e persistência por
perfil, que continua pendente onde indicado.

O CodeRabbit apontou um conflito documental entre uma contagem intermediária e
a contagem canônica de testes; o registro foi corrigido para identificar
explicitamente a execução intermediária. A repetição final foi limitada por
cota por 38 minutos, portanto este bloco permanece em `InProgress`.

## 10. Dívida priorizada

| ID | Gravidade | Problema | Evidência | Próxima correção |
|---|---:|---|---|---|
| AUD-001 | P1 | 40 alertas high na árvore dev; runtime tem 1 advisory RSC sem superfície no produto | `npm audit` e `npm audit --omit=dev` | atualizar Storybook/Vercel/ESLint/Workbox em branch própria; manter prova de ausência de RSC |
| AUD-002 | P1 | Shell ainda possui caminhos paralelos | `AppShell.tsx` | contrato literal + convergência testada |
| AUD-003 | P1 | Browser por perfil não revalidado | sem evidência nova | matriz autenticada completa |
| AUD-004 | P1 | Supabase remoto/RLS parcialmente revalidado | inventário, advisors e 327/327 migrations | backup e matriz remota de papéis ainda bloqueiam mutations |
| AUD-005 | P1 | Sentry da branch ainda não provado | produção atual simboliza smoke; Edge/Health sem issues 24h | gerar evento somente no preview desta branch |
| AUD-006 | P1 | `bundle-budget` remoto falhou | GitHub Actions | reproduzir localmente e corrigir |
| AUD-007 | P2 | Testes contradizem shell único | contratos atuais | consolidar contrato arquitetural |
| AUD-008 | P2 | previews recentes em erro | lista Vercel | inspecionar logs e separar falhas antigas |
| AUD-009 | resolvido local | Drift de migrations remoto/branch | 327/327; `remote_only_count=0` | manter gate de drift em CI |
| AUD-010 | P0 | Backup restaurável não comprovado | `backups: []`, PITR desabilitado | obter snapshot/backup validado antes de mutation |
| AUD-011 | P1 | 59 `SECURITY DEFINER` expostas a `anon` | grants remotos/advisor | classificar e revogar `PUBLIC` com contrato por RPC |
| AUD-012 | P1 | Buckets públicos permitem listagem ampla | policies `SELECT TO public` | desenhar acesso por objeto sem quebrar URLs |
| AUD-013 | P1 | Bundle total excedia o orçamento | gate final 1.857,54/1.860 KB | corrigido sem elevar budget; manter monitoramento |
| AUD-014 | P1 | Override esbuild inicialmente quebrou Vite dev | 2.860 erros no optimizer | corrigido para 0.25.12 e revalidado |
| AUD-015 | P0 | Senha operacional previsível estava versionada | busca inicial: 21 arquivos; busca final literal: zero | corrigido no código; rotacionar contas ainda é obrigatório |
| AUD-016 | P0 | Consultor MX não possui caminho funcional validável | conta nominal autentica, mas leitura de `usuarios.active` retorna 401/nulo; segunda conta falha no Auth 400 | recuperar a conta existente sem duplicar identidade e revalidar |
| AUD-017 | P0 | Endpoint público adotava/resetava identidade Auth órfã e reativava conta desativada | `store-pre-registration` usava `service_role` sem prova de autoridade | corrigido localmente; deploy bloqueado até preview/gates |

## 11. Rollback

- Código: commits desta story serão isolados sobre `41ec4d39`.
- Dependências: remover `overrides` e restaurar o lockfile do SHA-base.
- Banco: nenhuma mutation de produção executada.
- Deploy: produção atual será registrada antes de qualquer promoção; rollback
  utilizará o deployment READY anterior.

## 12. Pendências bloqueantes

- Inventário completo de rotas e actions.
- Backup e validação remota de migrations/RLS/Auth/Storage/Realtime.
- E2E autenticado dos seis perfis e 13 viewports.
- Preview desta story, evento Sentry controlado e `/api/health`.
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
- Aliases legados como `/home` e `/departamentos/comercial` agora participam
  do cálculo central de rota ativa. A sidebar mantém exatamente um
  `aria-current="page"` mesmo quando o destino canônico é `/dono/*`.
- A matriz autenticada adicional percorreu 16 rotas em quatro viewports:
  64/64 combinações, zero overflow, zero erro de console/página e exatamente
  um item ativo. A superfície real mediu 256 px no desktop, 320 px em tablets
  e 288 px no mobile.
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

### Rotas públicas

O Chrome real percorreu as oito rotas públicas catalogadas. `/`, `/login`,
`/forgot-password`, `/reset-password`, `/privacy` e `/terms` responderam 200
sem erro de console ou falha de rede; `/dono/home` redirecionou para `/login`.
`/pre-cadastro/:storeSlug` foi validada com uma loja ativa derivada somente em
memória: loja carregada, formulário visível, zero erro de console e zero falha
de rede, sem registrar nome ou slug.

A landing `/` não possuía landmark principal. Um teste de componente reproduziu
a ausência, a raiz visual foi alterada de `div` para `main` sem mudança de
classes e a revalidação confirmou exatamente um `main`, um `h1`, zero erro de
console e zero falha de rede.

Axe 4.11.4, com movimento reduzido para estabilizar as transições, reproduziu
violações sérias de ARIA e contraste. As correções removeram o atributo ARIA
proibido, elevaram o contraste de textos da landing com tokens existentes e
ajustaram os textos pequenos de Privacidade/Termos. O teste Playwright passou em
7/7 rotas públicas; o pré-cadastro com loja real também retornou zero violação
séria/crítica.

A matriz responsiva pública percorreu 8 rotas × 13 viewports, totalizando
104/104 combinações. Um overflow móvel da landing foi reproduzido e atribuído
a decorações absolutas do hero/veredito e ao título do rodapé; regras
responsivas mantiveram as decorações dentro do container. A repetição terminou
com um `main`, zero overflow, zero erro de console e zero falha de rede em todas
as combinações.

## 16. Secret scan

- O binário oficial Gitleaks 8.30.1 foi baixado em diretório temporário e teve
  checksum verificado; nenhum binário foi adicionado ao repositório.
- O scan redigido de 2.074 commits encontrou 86 ocorrências históricas: 53
  `generic-api-key`, 15 `jwt`, 15 `supabase-service-role-key-suspicious` e 3
  `private-key`.
- Dez scripts diagnósticos atuais continham JWTs/service-role Supabase reais e
  foram removidos. Eram scripts avulsos não referenciados, imprimiam dados
  sensíveis/PII e continuam recuperáveis pelo histórico Git.
- Após as remoções, o scan do diretório retornou 34 ocorrências: 28 rastreadas
  e 6 no `dist/` ignorado. As seis do build são a chave pública `anon`; as 28
  rastreadas foram revisadas como falsos positivos de exemplos documentais,
  referência a GitHub Secret, checksums de migrations e identificadores PMR.
- Um segundo scan sobre a cópia dos arquivos rastreados existentes confirmou
  as mesmas 28 ocorrências revisadas, sem JWT/service-role real no estado
  corrente rastreado.
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
- A exposição da `service_role` Supabase é um incidente ativo: a rotação é
  imediata e não depende de preview, backup ou deploy. A documentação oficial
  atual orienta criar uma nova `sb_secret_...`, substituir consumidor por
  consumidor e só então desabilitar a chave JWT legada; as duas famílias
  coexistem durante a migração. Rotacionar diretamente o JWT legado antes da
  substituição quebraria consumidores e a verificação JWT de Edge Functions.
- O inventário por nome/presença confirmou
  `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_SECRET_KEY` na Vercel em
  development/preview/production, nenhuma `service_role` nos secrets do GitHub
  Actions, 17 fontes de Edge Functions e 34 scripts operacionais dependentes do
  nome legado. A chave publishable moderna existe, mas a `anon` legada segue
  habilitada. O ledger individual de responsável, evidência, substituição,
  teste e desativação está em
  `docs/auditoria/matrizes/MATRIZ_ROTACAO_CREDENCIAIS_MX.md`.
- A variável moderna desalinhada na Vercel foi corrigida pela autoridade
  DevOps e uma comparação efêmera confirmou correspondência em development,
  preview e production. O runtime da aplicação ainda consome o nome legado;
  portanto a ação prepara o cutover, mas não encerra a rotação.
- Os clientes Edge administrativos e de sessão foram migrados localmente para
  preferir `SUPABASE_SECRET_KEYS.default` e
  `SUPABASE_PUBLISHABLE_KEYS.default`, mapas JSON gerenciados pela plataforma,
  com fallback legado temporário. A tentativa de criar um secret customizado
  `SUPABASE_SECRET_KEY` foi rejeitada porque `SUPABASE_*` é reservado e não
  produziu alteração remota.
- Permanecem usos legados intencionais em fluxos que tratam a `service_role`
  JWT como Bearer (`google-calendar-sync`, `google-oauth-handler`,
  `google-meet-ata` e `mx-critical-jobs-health`). Eles exigem autenticação
  interna própria e testes negativos antes da desativação do JWT legado.
- A migração local passou em 4 testes do resolver, 16 testes focados,
  typecheck e `deno check --node-modules-dir=auto` nos 11 entrypoints
  alterados. Ainda faltam revisão integral, deploy e smoke de runtime.
- A exceção operacional expira em **2026-07-30 18:00 BRT**. Até o corte, os dez
  consumidores obsoletos foram removidos, novos usos humanos da chave exposta
  ficam bloqueados e os consumidores produtivos remanescentes são classificados
  como expostos. No prazo, devem migrar para chaves secretas separadas por
  backend e ter o legado desabilitado; se isso não ocorrer, os workloads
  afetados devem ser desabilitados e qualquer exceção renovada precisa de
  responsável e expiração menor. Reescrita de histórico é separada e não
  substitui rotação.
- Nenhum segredo fornecido nesta conversa foi adicionado pelas mudanças desta
  story.
- A revisão CodeRabbit mais recente executou e apontou um achado major válido:
  a documentação condicionava indevidamente a rotação ao preview/backup. O
  texto foi corrigido para tratar a exposição como incidente imediato, com
  substituição coordenada e exceção curta.
- A repetição seguinte apontou dois majors válidos: ausência de ledger
  consumidor por consumidor e ausência de gate explícito para Git completo,
  logs, screenshots, caches e artefatos de CI. Ambos foram incorporados; o gate
  permanece pendente até uma nova revisão retornar sem achados.
- A revisão posterior retornou zero achados, mas seu payload comprovou que os
  três arquivos ainda não rastreados não entraram na análise. Após preparar o
  índice com todos os arquivos desta story, a tentativa integral retornou
  `rate_limit` com espera de 40 minutos. Portanto, o parecer parcial não
  autoriza commit e o gate integral continua pendente.

## 17. Conclusão baseada em evidências

**PARCIALMENTE CONCLUÍDO.** O baseline local, o shell único, a matriz
responsiva de quatro perfis, o saneamento do segredo e o orçamento total do
bundle passaram. Migrations estão alinhadas em 327/327, o Sentry atual foi
validado em modo read-only e o P0 do pré-cadastro foi corrigido localmente.
Permanecem bloqueantes o Consultor MX, backup restaurável, advisors de
segurança, preview da branch, CI remoto e publicação.

A regressão local mais recente passou com lint, typecheck, 1.691 testes,
13.903 asserts, build, bundle em 1.853,78/1.860 KB e `git diff --check`. O teste
Playwright/Axe das seis rotas públicas passou 12/12 em Chromium desktop e
mobile; o Dono permanece coberto pelas matrizes autenticadas separadas.
