# Sumário atual de SECURITY DEFINER

> Snapshot Supabase capturado em `2026-08-09T15:47:14.419Z`, no SHA de origem `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`.
> Checkout que gerou este documento: `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`.
> O snapshot é catalogação de grants e configuração; revisão comportamental por chamador, tenant e perfil continua explícita como pendente.

| Métrica | Valor |
|---|---:|
| Funções públicas | 245 |
| SECURITY DEFINER | 211 |
| Executáveis por anon | 0 |
| Executáveis por authenticated | 155 |
| Executáveis por service_role | 194 |
| Com search_path configurado | 211 |
| Sem search_path configurado | 0 |
| pg_net | `public` |

## Estado

- anon sem EXECUTE nas funções SECURITY DEFINER catalogadas.
- Os grants de authenticated e service_role permanecem classificados por assinatura na matriz atual.
- Não houve revogação em massa baseada apenas no advisor.
- Chamadores de frontend, autorização interna, isolamento de tenant e testes positivos/negativos ainda precisam de evidência por função.
