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
check('login admin MX', !page.url().includes('/login'))

async function clicarNoMain(texto, prefixo=false){
  const ok = await page.evaluate(([texto, prefixo])=>{
    const main=document.querySelector('main'); if(!main) return false
    const el=[...main.querySelectorAll('button,a')].find(b=>{
      const t=b.textContent.trim(); return prefixo ? t.startsWith(texto) : t===texto
    })
    if(!el) return false
    document.querySelectorAll('[data-e2e]').forEach(x=>x.removeAttribute('data-e2e'))
    el.setAttribute('data-e2e','1'); el.scrollIntoView({block:'center'}); return true
  },[texto,prefixo])
  if(!ok) return false
  await page.click('[data-e2e="1"]'); await page.waitForTimeout(2800)
  return true
}
async function abas(){ return page.evaluate(()=>[...document.querySelectorAll('main [role="tab"]')].map(t=>t.textContent.trim())) }
async function dlg(){ return page.locator('[role="dialog"]').first().innerText().catch(()=>'') }

// 1. /clientes → Visão 360 + abas
errs.length=0
await page.goto(`${BASE}/clientes`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500)
await clicarNoMain('Abrir')
const url=page.url().replace(BASE,''); const a360=await abas()
check('/clientes → Visão 360 pela lista', url.startsWith('/clientes/') && a360.length>=5, `${url.slice(0,30)} abas=${a360.length}`)
let okAbas=true
for(let i=0;i<a360.length;i++){ await page.locator('main [role="tab"]').nth(i).click(); await page.waitForTimeout(2000); const t=await page.locator('main').innerText(); if(!t||t.length<120) okAbas=false }
check('/clientes → 6 abas da Visão 360 carregam', okAbas, `erros=${errs.slice(0,2)}`)

// 2. /equipe → perfil
errs.length=0
await page.goto(`${BASE}/equipe`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500)
await clicarNoMain('Perfil')
const dEquipe=await dlg()
check('/equipe → perfil do consultor', /Programas|Capacidade|Situação|Clientes/i.test(dEquipe), `len=${dEquipe.length} erros=${errs.slice(0,2)}`)
await page.keyboard.press('Escape'); await page.waitForTimeout(700)

// 3. /produtos → drawer 4 abas
errs.length=0
await page.goto(`${BASE}/produtos`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500)
await clicarNoMain('Abrir')
const dProd=await dlg()
check('/produtos → detalhe do produto', /Módulos|Tempos|Plano Estratégico/i.test(dProd), `len=${dProd.length} erros=${errs.slice(0,2)}`)
await page.keyboard.press('Escape'); await page.waitForTimeout(700)

// 4. /indicadores → drawer + abas
errs.length=0
await page.goto(`${BASE}/indicadores`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500)
const aInd=await abas()
await clicarNoMain('Abrir')
const dInd=await dlg()
check('/indicadores → drawer do indicador', dInd.length>60, `abas=${aInd.length} len=${dInd.length} erros=${errs.slice(0,2)}`)
await page.keyboard.press('Escape'); await page.waitForTimeout(700)

// 5. /planos-acao → card do kanban
errs.length=0
await page.goto(`${BASE}/planos-acao`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500)
const aPa=await abas()
const abriu=await clicarNoMain('PA-', true)
const dPa=await dlg()
check('/planos-acao → detalhe do plano', abriu && /Resumo|Execução|Evidências|Histórico/i.test(dPa), `abas=${aPa.length} len=${dPa.length} erros=${errs.slice(0,2)}`)
await page.keyboard.press('Escape'); await page.waitForTimeout(700)

// 6. /consultoria-mx → 5 abas
errs.length=0
await page.goto(`${BASE}/consultoria-mx`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(4500)
const aCmx=await abas()
let okCmx=true
for(let i=0;i<aCmx.length;i++){ await page.locator('main [role="tab"]').nth(i).click(); await page.waitForTimeout(2400); const t=await page.locator('main').innerText(); if(!t||t.length<120) okCmx=false }
check('/consultoria-mx → 5 abas carregam', okCmx && aCmx.length>=5, `abas=[${aCmx.join(', ').slice(0,70)}] erros=${errs.slice(0,2)}`)

await browser.close()
console.log('TOTAL', res.filter(r=>r[1]).length,'/',res.length)
