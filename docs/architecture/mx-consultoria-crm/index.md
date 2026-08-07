# Architecture Shard - CRM de Consultoria MX

Fonte completa: `../mx-consultoria-crm-architecture.md`

## Decisao central

Criar um bounded context novo de `consultoria`, com tabelas `consulting_*`, rotas `/consultoria/*` e features em `src/features/consultoria`.

Nao implementar esse modulo dentro de modulos financeiro/estoque legados ou substituindo `stores`.

## Leitura obrigatoria

1. `data-model.md`
2. `integration-plan.md`
3. `../mx-consultoria-crm-brownfield-impact.md`
4. `../../prd/mx-consultoria-crm/requirements.md`
