# Oportunidades com valor fora de faixa — 27 registros

Levantado em 2026-08-27, durante a auditoria do módulo Gerente.

Todas as oportunidades com `valor_negociado` acima de R$ 10.000.000. O padrão é
consistente: **três zeros a mais**. Dividido por mil, cada valor cai numa faixa
plausível para o veículo da linha.

> **Resolvido em 2026-08-27.** Os 27 foram corrigidos: 25 pela divisão por mil,
> a GWM HAVAL H6 da IMPÉRIO para R$ 189.900 (erro de cem vezes, não de mil) e a
> duplicata da MX CONSULTORIA alinhada ao registro gêmeo. O antes/depois de cada
> linha está em `data_correction_audit` (27 registros). Nenhuma oportunidade
> acima de R$ 10 milhões restou, e o CHECK de teto foi validado.

## Impacto

- **15 lojas de clientes** afetadas (a 16ª é a MX CONSULTORIA, interna).
- **15 registros estão como `ganho`**, ou seja, contam como venda realizada e
  entram em faturamento, ticket médio e base de comissão.
- Concentração em julho e agosto de 2026.

## Lista

| id | Loja | Cliente | Veículo | Etapa | Competência | Valor atual | Sugerido (÷1000) | Nota |
|---|---|---|---|---|---|---|---|---|
| `0be4a0f8` | SALIM | JAF CONSTRUCOES LTDA | X4 | ganho | 2026-08-12 | R$ 228.000.000,00 | **R$ 228.000,00** | ok |
| `5153ca62` | NERIS & ANTUNES AUTOMOVEIS LTDA | FELIPE FRONTIER | FRONTIER 2023 | ganho | 2026-08-10 | R$ 199.900.000,00 | **R$ 199.900,00** | ok |
| `6751af3b` | RK2 | JAUBAS | CIVIC TOURING 2021 | negociacao | 2026-08-06 | R$ 159.900.000,00 | **R$ 159.900,00** | ok |
| `3ce8cda4` | SALIM | BRENDON BRONCO | BRONCO | apresentacao | 2026-08-12 | R$ 149.990.000,00 | **R$ 149.990,00** | ok |
| `66e69075` | SALIM | FERNANDA XAVIER | BRONCO 2021 | ganho | 2026-08-12 | R$ 149.990.000,00 | **R$ 149.990,00** | ok |
| `1cd0cc6a` | AG AUTOMÓVEIS | ANDRÉ | FASTBACK | prospeccao | 2026-08-07 | R$ 130.000.000,00 | **R$ 130.000,00** | ok |
| `3d65dc18` | ANDRÉ CAR | WEMERSON | S10 | negociacao | 2026-08-18 | R$ 126.800.000,00 | **R$ 126.800,00** | ok |
| `94231678` | BROTHERS CAR | MARQUINHO | CRETA | ganho | 2026-08-10 | R$ 125.900.000,00 | **R$ 125.900,00** | ok |
| `03b06cb8` | ANDRÉ CAR | REGINALDO | COROLLA | ganho | 2026-08-20 | R$ 124.800.000,00 | **R$ 124.800,00** | ok |
| `0da7d8c2` | SALIM | TULIO MACÊDO | CRETA | fechamento | 2026-08-12 | R$ 119.990.000,00 | **R$ 119.990,00** | ok |
| `b4171306` | ANDRÉ CAR | THIAGO | X1 | ganho | 2026-08-22 | R$ 119.800.000,00 | **R$ 119.800,00** | ok |
| `0c41b14f` | BROTHERS CAR | PAULO | NIVUS | ganho | 2026-08-11 | R$ 117.900.000,00 | **R$ 117.900,00** | ok |
| `7d77983d` | ANDRÉ CAR | MARCO | NIVUS | ganho | 2026-08-14 | R$ 116.500.000,00 | **R$ 116.500,00** | ok |
| `acb1d4f0` | TREND AUTO | RENATO | T CROSS | ganho | 2026-07-31 | R$ 111.890.000,00 | **R$ 111.890,00** | ok |
| `24ffcfec` | MX CONSULTORIA | JOSE TESTE | TCROSS | perdido | 2026-08-07 | R$ 110.000.000,00 | **R$ 110.000,00** | ok *(já tratado)* |
| `0fdbe9de` | BROTHERS CAR | MAIARA | CITY | ganho | 2026-08-10 | R$ 107.900.000,00 | **R$ 107.900,00** | ok |
| `fd5e2430` | GANDINI | JOSE AUGUSTO DE ASSIS | T-CROSS 1.4 250 TSI HIGHLINE 2021 | ganho | 2026-08-11 | R$ 105.900.000,00 | **R$ 105.900,00** | ok |
| `e427b8c2` | LM VEÍCULOS | OTAVIO | CIVIC G10 2017 A 2020 | negociacao | 2026-08-12 | R$ 100.000.000,00 | **R$ 100.000,00** | ok |
| `ffd15315` | AG AUTOMÓVEIS - 3 PISO | VIVIANE FERNANDES DE SOUZA NASCIMENTO | SPIN | negociacao | 2026-08-20 | R$ 99.900.000,00 | **R$ 99.900,00** | ok |
| `28ca29ac` | AUTO UP | RONALD MAX | COROLLA XEI 2.0 2019 | negociacao | 2026-08-07 | R$ 99.900.000,00 | **R$ 99.900,00** | ok |
| `f86ba738` | AG AUTOMÓVEIS | JOÃO COROLLA | COROLLA | apresentacao | 2026-08-16 | R$ 91.900.000,00 | **R$ 91.900,00** | ok |
| `d65d950a` | TREND AUTO | JOSE DUTRA | HB20 | ganho | 2026-08-03 | R$ 79.890.000,00 | **R$ 79.890,00** | ok |
| `50c0ee02` | LIAL | ANA PAULA | HB20 COMFORT PLUS | ganho | 2026-08-13 | R$ 74.900.000,00 | **R$ 74.900,00** | ok |
| `baac2b1e` | PISCAR VEÍCULOS - SHOPPING 3 PISO | LEANDRO FERREIRA | ARGO 2025 | ganho | 2026-08-06 | R$ 74.900.000,00 | **R$ 74.900,00** | ok |
| `fd16b39a` | AUTO UP | EVELYN ABRANTES | COBALT LTZ 2020 | apresentacao | 2026-08-07 | R$ 67.900.000,00 | **R$ 67.900,00** | ok |
| `0028a48c` | NERIS & ANTUNES AUTOMOVEIS LTDA | NENE MOTOS | MONTANA 2016 | ganho | 2026-08-14 | R$ 49.900.000,00 | **R$ 49.900,00** | ok |
| `4e52fa08` | IMPÉRIO | RUDY | GWM HAVAL H6 2025 | negociacao | 2026-08-17 | R$ 18.990.000,00 | **R$ 18.990,00** | ok |
## Como validar antes de corrigir

O valor sugerido é aritmético (÷1000), não uma verificação de preço de mercado.
Antes de aplicar, vale conferir com a loja pelo menos as linhas em `ganho`, que
são as que já entraram no resultado do mês.

Dois casos merecem olhar próprio:

- **GWM HAVAL H6 2025 (IMPÉRIO)** — ÷1000 dá R$ 18.990, baixo demais para um
  H6 2025. O valor real pode ser R$ 189.900, com um zero a menos na digitação
  original. Não é o mesmo erro dos outros.
- **X4 (SALIM), R$ 228.000** — o único acima de R$ 200 mil depois da correção.
  Plausível para um BMW X4, mas confirma com a loja.

## Registro já tratado

`24ffcfec` (MX CONSULTORIA, JOSE TESTE / TCROSS) era **duplicata**: o mesmo
vendedor criou às 16:38 com R$ 110.000.000,00 e refez às 17:48 com
R$ 110.000,00 — mesmo cliente, veículo, canal e competência. Corrigir o valor
criaria duas negociações idênticas, então foi marcada como perdida com o motivo
registrado, preservando o rastro.

## Causa

O formulário aceita qualquer valor. Corrigir os 27 resolve o passado; sem uma
validação de faixa no lançamento, o erro volta. A checagem mais simples é
recusar valor de venda acima de um teto configurável por loja — ou ao menos
pedir confirmação explícita acima de R$ 500.000.
