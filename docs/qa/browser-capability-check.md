# Browser Capability Check — Módulo Gerencial

- Data: 2026-07-14
- Ferramenta usada: Chrome DevTools MCP (sessão Chrome real); fallback Playwright/Chromium também disponível para E2E
- Viewport: 1440×900

## Resultados

| URL | Ação | Resultado | Evidência | Erros |
|---|---|---|---|---|
| `https://mx-gerente.base44.app` | Abrir, obter título/URL, capturar viewport/full-page, localizar botão e clicar | Chrome DevTools MCP abriu a sessão autenticada em `/universidade-mx`; snapshot acessível encontrou os cards reais e o botão `Iniciar` | `docs/qa/evidence/manager-parity/2026-07-14/base44/06-10-universidade-mx-loaded-*` | Nenhum erro de navegação bloqueante |
| `http://127.0.0.1:3001/login` | Abrir, obter título/URL, preencher login autorizado e clicar `ENTRAR` | Título `MX PERFORMANCE`; sessão gerencial autenticada redirecionou para `/home` | `docs/qa/evidence/manager-parity/2026-07-14/mx-local/01-mx-local-authenticated-*` | Nenhum erro bloqueante |
| `http://127.0.0.1:3001/fechamento-diario` | Localizar e clicar `Ver Agenda D+1`, `Cobrar Pendentes` e `Ver Regularizações`; fechar modais | Os três modais reais abriram com conteúdo/filtros/ações; nenhuma gravação foi confirmada | `docs/qa/evidence/manager-parity/2026-07-14/mx-local/03-*` e capturas desta retomada | Nenhum erro de console; requests Supabase HTTP 200 |
| `http://127.0.0.1:3001/rotina-equipe` | Clicar `Ver rotina` e `Cobrar` | Detalhe vazio e modal de cobrança abriram; nenhuma gravação foi confirmada | `docs/qa/evidence/manager-parity/2026-07-14/mx-local/04-*` | Nenhum erro de console; requests Supabase HTTP 200 |
| `http://127.0.0.1:3001/feedbacks-pdis` | Abrir `Novo Feedback`, alternar `PDI` e abrir `Iniciar novo PDI` | Formulário/wizard reais abriram; `Tipo` começa em `Selecione...`; nenhum envio foi confirmado | `docs/qa/evidence/manager-parity/2026-07-14/mx-local/08-*` | Nenhum erro de console; requests Supabase HTTP 200 |
| `https://mx-gerente.base44.app` | Autenticar em memória e capturar estado carregado | Sessão autenticada em `/`, menu gerencial e dados da tela inicial renderizados | `docs/qa/evidence/manager-parity/2026-07-14/base44/01-base44-authenticated-1440x900-viewport.png`; `01-base44-authenticated-1440x900-full-page.png` | Nenhum erro de navegação |
| `https://mxperformance.vercel.app` | Autenticar em memória e capturar estado carregado | Sessão autenticada em `/home`, menu gerencial e dados da tela inicial renderizados | `docs/qa/evidence/manager-parity/2026-07-14/mx-production/01-mx-production-authenticated-1440x900-viewport.png`; `01-mx-production-authenticated-1440x900-full-page.png` | Nenhum erro de navegação |

## Ferramentas que não ficaram disponíveis

- Browser in-app/browser-client: retornou literalmente `No browser is available`.
- Chrome browser-client/extension: retornou literalmente `Browser is not available: extension`.

Chrome DevTools MCP foi usado diretamente com sucesso nesta retomada. O fallback Playwright/Chromium também permite navegar, interagir, inspecionar e capturar as páginas reais. Nenhuma aprovação visual é baseada apenas em código.
