# Decisão 01 — não aplicar a unificação de `lojas` e `clientes_consultoria`

**Data:** 2026-08-19
**Migrations em questão:** `20260817190000_unify_lojas_and_clientes_consultoria`, `20260818024500_fix_loja_cliente_sync_trigger`
**Estado:** pendentes, não aplicadas. Permanecem no repositório.

## O que elas fazem
Copiam para `public.lojas` 18 colunas do domínio de consultoria (`program_template_key`, `contract_start_date`, `onboarding_step`, `modality`, `status`, `business_phase`, …) e instalam um trigger `AFTER INSERT OR UPDATE ON public.lojas` que cria ou vincula uma linha em `clientes_consultoria` com `primary_store_id = NEW.id`.

A segunda corrige defeitos reais da primeira: conflito com o índice único parcial `clientes_consultoria_one_active_per_store_uidx`, cópia indevida de `structure_type` entre domínios com vocabulários diferentes (matriz/filial vs LOJA_UNICA/REDE) e exposição da função de trigger como RPC.

## Por que não aplicar
**Nenhuma das duas tem guarda para filial.** O trigger dispara para toda linha de `lojas`, inclusive as que têm `parent_loja_id` preenchido. Cada filial passaria a ter o seu próprio cliente.

Hoje há 61 lojas, das quais 9 são filiais, e 52 clientes. Aplicar isto produziria cerca de 61 clientes — as 9 filiais viram clientes autônomos, com contrato, produto e onboarding próprios.

O dano não é o número. É que `fetchClientOfStore` passaria a resolver uma filial para o cliente **dela**, e não para o cliente da matriz. A consolidação multiunidade — que existe justamente porque cliente ≠ unidade — deixaria de encontrar as filiais, e o consolidado do cliente voltaria a ser o da matriz. Silenciosamente: nenhum erro, só números menores.

Isso também contraria o modelo de origem. No Base44 `ClientAccount` e `Store` são entidades distintas, e `StrategicPlanUnitScope` liga uma à outra. Unificá-las remove a distinção que o plano estratégico, o plano de ação e a jornada de consultoria usam.

## O que seria necessário para aplicar
Uma guarda no início da função de trigger:

```sql
-- Filial não é cliente: o vínculo comercial pertence à matriz.
IF NEW.parent_loja_id IS NOT NULL THEN
  RETURN NEW;
END IF;
```

E uma decisão explícita sobre o que fazer com as 18 colunas duplicadas em `lojas`: se `clientes_consultoria` continua sendo a fonte de verdade do domínio comercial, elas são cache; se passa a ser `lojas`, o caminho inverso precisa ser desenhado. Manter as duas graváveis com sincronização bidirecional é a condição para divergirem.

## Recomendação
Aplicar só depois da guarda de filial e de definir qual lado é fonte de verdade. Enquanto isso, as migrations ficam pendentes — o que já era o estado antes desta sessão.
