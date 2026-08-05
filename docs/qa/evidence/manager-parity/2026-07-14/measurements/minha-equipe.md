# Minha Equipe — medições finais

- Data: 2026-07-14
- Ferramenta: Chrome DevTools MCP, sessão autenticada
- Referência: `https://mx-gerente.base44.app/minha-equipe`
- MX local: `http://127.0.0.1:3001/minha-equipe`
- MX produção: `https://mxperformance.vercel.app/minha-equipe`

| Elemento | Base44 | MX local | Resultado |
|---|---:|---:|---|
| viewport desktop | 1440×900 | 1440×900 | igual |
| viewport mobile | 390×844 | 390×844 | igual |
| busca | 176×38 px | 176×38 px | igual |
| select de período | 147×36,5 px | 147×36,5 px | igual |
| fonte do conteúdo | `ui-sans-serif, system-ui, sans-serif` | mesma | igual |
| raio `rounded-xl` | 12 px | 12 px | igual |
| raio `rounded-2xl` | 16 px | 16 px | igual |
| overflow mobile | não observado | scroll width 390 px | passou |

## Diferenças autorizadas ou de dados

- O sidebar escuro e sua largura atual pertencem ao MX e são a exceção visual normativa.
- Base44 possui oito vendedores demo; MX possui cinco registros oficiais não aplicáveis no período. A contagem não foi equalizada com dados fictícios.
- O MX pós-deploy usa a mesma composição Base44: resumo do Kanban sem pill branco legado e aba `Todos` selecionada inicialmente.

## Interações

- Aba `Resultado`: passou e reposicionou os registros.
- Aba `Consistência`: passou e recalculou a coluna exibida.
- Busca `Vendedor MX`: passou e filtrou a massa oficial.
- Estado loading: `aria-busy=true` capturado antes do conteúdo carregado.
- Console: sem erro JavaScript; único warning é `VITE_SENTRY_DSN` ausente, já documentado como SYS-017.
