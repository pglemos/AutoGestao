# Estouro de cota (cached egress) — diagnóstico e correção para o plano gratuito

**Data:** 2026-08-06 · **Projeto:** `fbhcmzzgwjdgkctlfvbo` (MX GESTAO PREDITIVA)
**Sintoma:** `rest` e `auth` respondendo HTTP 402 — `exceed_cached_egress_quota`. `db` segue `ACTIVE_HEALTHY`.

## 1. Causa raiz medida

Dois buckets **públicos** de avatar guardavam a foto exatamente como saiu da câmera:

| Bucket | Público | Objetos | Total | Média | Maior |
|---|---|---|---|---|---|
| `pre-cadastro-avatares` | sim | 90 | **107 MB** | 1,2 MB | 3,2 MB |
| `perfis_usuario` | sim | 1 | 419 kB | 419 kB | 419 kB |

87 usuários têm `avatar_url` apontando para o bucket público. Bucket público é servido pelo CDN — **toda leitura conta como cached egress**.

O que consumia a cota:

1. **Foto de 1–3 MB para exibir 40 px.** Telas de ranking, live floor, equipe e relatório da manhã listam a equipe inteira: uma carga completa puxava ~105 MB. Cerca de 47 aberturas dessas telas consomem os 5 GB do plano gratuito.
2. **Sem `loading="lazy"`.** O navegador baixava inclusive os avatares fora da tela.
3. **Cache-buster na URL.** `uploadUserAvatar` devolvia `...publicUrl?t=${Date.now()}`, e o caminho já era único por upload — o query param só servia para reduzir a eficácia do cache do CDN.
4. **Nenhum teto no bucket:** aceitava 5 MB por arquivo.

Descartados como causa principal (medidos): banco inteiro tem 64 MB; maior tabela 4,3 MB; cron roda no máximo a cada 30 min; 31 tabelas publicadas no realtime, das quais o app assina 17 — sem assinante não há egress.

## 2. Correções aplicadas

| Correção | Onde | Efeito |
|---|---|---|
| Redução para 256 px / JPEG 0,82 antes do upload | `src/lib/image-downscale.ts`, usado em `uploadUserAvatar` e no pré-cadastro | ~1,2 MB → ~25 KB por avatar |
| `cacheControl` de 1 ano e fim do `?t=` | `src/lib/avatar.ts` | CDN passa a reaproveitar de verdade |
| `loading="lazy"` + `decoding="async"` | atom `Avatar` + 5 pontos que renderizam foto em lista | avatar fora da tela não é baixado |
| Teto de 512 KB e allowlist de MIME nos buckets públicos | migration `20260806120000` (**aplicada**) | upload gordo é recusado pelo servidor |
| Piso de 15 s entre refetches do funil | `team-funnel-realtime.ts` | o realtime novo deixa de reler 6 meses de eventos a cada INSERT |

### Projeção do passivo

| | Hoje | Depois da recompressão |
|---|---|---|
| 91 objetos nos buckets públicos | 107 MB | **~2,3 MB** (−98%) |

## 3. Pendente — precisa do serviço restaurado

O passivo dos 90 arquivos já enviados **ainda não foi recomprimido**: a Storage API está sob a mesma restrição 402.

Script pronto: `scripts/recompress-storage-avatars.mjs`

```bash
npm i -D sharp
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage-avatars.mjs           # simulação
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage-avatars.mjs --apply   # grava
```

Simulação é o padrão; arquivo que não encolher é mantido; erro em um objeto não interrompe os demais.

## 4. Ordem de execução recomendada

1. **Restaurar o serviço** — subir plano ou remover o spend cap no painel. É o único passo que exige o proprietário e é o que destrava tudo.
2. Rodar o script de recompressão (`--apply`).
3. Confirmar o total dos buckets (esperado ~2,3 MB) e a queda no painel de uso.
4. Se quiser voltar ao plano gratuito de forma sustentável, a conta de egress passa a ser dominada por tráfego de API, não por imagem.

## 5. Observação sobre reincidência

O teto de 512 KB no bucket é a garantia de que isto não volta mesmo que alguém suba direto pela API. A redução no cliente é a primeira linha; o teto no servidor é a rede de proteção.
