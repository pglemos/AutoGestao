import { chromium } from 'playwright'
const BASE='https://www.mxperformance.com.br'; const PWD=process.env.PWD_MX
const res=[]; const check=(n,ok,d='')=>{res.push([n,ok]);console.log(`${ok?'PASS':'FALHA'} · ${n}${d?' · '+d:''}`)}
const browser=await chromium.launch(); const page=await (await browser.newContext({viewport:{width:1600,height:1000}})).newPage()
const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120))})
await page.goto(`${BASE}/login`,{waitUntil:'domcontentloaded'})
await page.fill('input[type="email"]','synvollt@gmail.com'); await page.fill('input[type="password"]',PWD)
await page.click('button[type="submit"]'); await page.waitForTimeout(8000)
await page.goto(`${BASE}/clientes/bruno-ve-culos`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(7000)
errs.length=0
const main = await page.locator('main').innerText()
check('Visão 360 abre', main.includes('Checklist de prontidão'), errs.slice(0,2).join(' | '))
check('métricas do cliente', /Prontidão/.test(main) && /Consultores/.test(main))
console.log('  amostra:', main.slice(0,260).replace(/\n+/g,' | '))
for (const [tab, marker] of [['Lojas e unidades','unidade'],['Pessoas e consultores','Contatos'],['Jornada','Jornada de encontros'],['Módulos','Módulos do cliente']]) {
  await page.getByRole('tab',{name:new RegExp(tab,'i')}).click(); await page.waitForTimeout(1800)
  const text = await page.locator('main').innerText()
  check(`aba ${tab}`, new RegExp(marker,'i').test(text) || /Nenhum|Nenhuma/i.test(text))
}
const activateBtn = page.getByRole('button',{name:/Validar e ativar/i})
check('cliente ativo não oferece ativação', (await activateBtn.count())===0)
await page.screenshot({path:'/tmp/e2e-360.png'})
await browser.close()
console.log('TOTAL', res.filter(r=>r[1]).length,'/',res.length)
