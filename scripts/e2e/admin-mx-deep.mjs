import { chromium } from 'playwright'
const BASE=process.env.E2E_BASE||'https://www.mxperformance.com.br'; const PWD=process.env.PWD_MX
const res=[]; const check=(n,ok,d='')=>{res.push([n,ok]);console.log(`${ok?'PASS':'FALHA'} · ${n}${d?' · '+d:''}`)}
const browser=await chromium.launch(); const page=await (await browser.newContext({viewport:{width:1500,height:1200}})).newPage()
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,110))})
page.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,110)))
page.on('response',r=>{if(r.status()>=400&&r.url().includes('supabase'))errs.push(`HTTP ${r.status()} ${r.url().split('?')[0].split('/').pop()}`)})
await page.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(2500)
await page.fill('input[type="email"]','synvollt@gmail.com'); await page.fill('input[type="password"]',PWD)
await page.click('button[type="submit"]'); await page.waitForTimeout(8000)

async function clicarNoMain(texto, prefixo=false, dentroDialog=false){
  const ok = await page.evaluate(([texto, prefixo, dentroDialog])=>{
    const raiz = dentroDialog ? document.querySelector('[role="dialog"]') : document.querySelector('main')
    if(!raiz) return false
    const el=[...raiz.querySelectorAll('button,a')].find(b=>{const t=b.textContent.trim(); return prefixo? t.startsWith(texto) : t===texto})
    if(!el) return false
    document.querySelectorAll('[data-e2e]').forEach(x=>x.removeAttribute('data-e2e'))
    el.setAttribute('data-e2e','1'); el.scrollIntoView({block:'center'}); return true
  },[texto,prefixo,dentroDialog])
  if(!ok) return false
  await page.click('[data-e2e="1"]'); await page.waitForTimeout(2600); return true
}
const mainText=()=>page.locator('main').innerText().catch(()=>'')
/** Espera as abas montarem: em produção a primeira carga passa de 5s. */
async function esperarAbas(minimo=1){
  for (let i=0;i<20;i++){
    const n = await page.locator('main [role="tab"]').count()
    if (n>=minimo) return n
    await page.waitForTimeout(1000)
  }
  return 0
}
/**
 * Aba saudável = renderizou conteúdo OU um estado vazio com ação de criação.
 * Sem a segunda condição, uma tabela legitimamente vazia (nenhum modelo de
 * relatório cadastrado ainda) era reportada como falha.
 */
const abaSaudavel=(texto, temCta)=> (texto.length>400 || (temCta && texto.length>200))
const temCtaCriar=()=>page.evaluate(()=>{
  const main=document.querySelector('main'); if(!main) return false
  return [...main.querySelectorAll('button,a')].some(b=>/^(Criar|Novo|Nova|Adicionar)/i.test(b.textContent.trim()))
})
const tabNames=()=>page.evaluate(()=>[...document.querySelectorAll('main [role="tab"]')].map(t=>t.textContent.trim()))

// --- /consultoria-mx: percorre cada aba e mede conteúdo real
await page.goto(`${BASE}/consultoria-mx`,{waitUntil:'domcontentloaded'}); await esperarAbas(2); await page.waitForTimeout(2500)
const abasCmx = await tabNames()
for (let i=0;i<abasCmx.length;i++){
  errs.length=0
  await page.locator('main [role="tab"]').nth(i).click(); await page.waitForTimeout(3200)
  const t = await mainText()
  const cta = await temCtaCriar()
  const vazio = /Nenhum|vazia|Sem registros/i.test(t)
  check(`/consultoria-mx · ${abasCmx[i]}`, abaSaudavel(t, cta) && errs.length===0, `${t.length} chars${vazio?' (estado vazio com CTA)':''} erros=${errs.slice(0,2)}`)
}
// editor de encontro dentro de Metodologia por Produto
errs.length=0
await page.locator('main [role="tab"]').nth(1).click(); await page.waitForTimeout(3000)
const abriuProduto = await clicarNoMain('Configurar') || await clicarNoMain('Abrir') || await clicarNoMain('Editar')
const t2 = await mainText()
check('/consultoria-mx · abre metodologia do produto', abriuProduto && t2.length>500, `erros=${errs.slice(0,2)}`)

// --- /indicadores: aba Metas e realizados
await page.goto(`${BASE}/indicadores`,{waitUntil:'domcontentloaded'}); await esperarAbas(2); await page.waitForTimeout(2500)
const abasInd = await tabNames()
for (let i=0;i<abasInd.length;i++){
  errs.length=0
  await page.locator('main [role="tab"]').nth(i).click(); await page.waitForTimeout(3200)
  const t = await mainText()
  const cta = await temCtaCriar()
  check(`/indicadores · ${abasInd[i]}`, abaSaudavel(t, cta) && errs.length===0, `${t.length} chars erros=${errs.slice(0,2)}`)
}

// --- /planos-acao: abas Sugestões e Aplicações
await page.goto(`${BASE}/planos-acao`,{waitUntil:'domcontentloaded'}); await esperarAbas(2); await page.waitForTimeout(2500)
const abasPa = await tabNames()
for (let i=0;i<abasPa.length;i++){
  errs.length=0
  await page.locator('main [role="tab"]').nth(i).click(); await page.waitForTimeout(3200)
  const t = await mainText()
  const cta = await temCtaCriar()
  check(`/planos-acao · ${abasPa[i]}`, abaSaudavel(t, cta) && errs.length===0, `${t.length} chars erros=${errs.slice(0,2)}`)
}

await browser.close()
console.log('TOTAL', res.filter(r=>r[1]).length,'/',res.length)
