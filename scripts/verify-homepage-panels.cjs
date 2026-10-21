/* global window, document, process, URL, console */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:3002';
const out = process.env.EVIDENCE_DIR || '/tmp/pw-homepage-five-local';
const sections = ['reading-demo','solutions','insurance-categories','learn','difference'];
(async () => {
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 try {
  for(const [name,width,route,theme] of [['desktop',1440,'/','light'],['tablet',1024,'/','light'],['tablet-small',768,'/','light'],['mobile',390,'/','light'],['small',320,'/','light'],['english',320,'/en','light'],['dark',1440,'/en','dark']]) {
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',storageState:process.env.PREVIEW_STORAGE_STATE});
   await context.addInitScript(t=>window.localStorage.setItem('theme',t),theme);
   const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
   assert.equal((await page.goto(base+route,{waitUntil:'networkidle'})).status(),200);
   const consent=page.getByRole('button',{name:/^(Μόνο απαραίτητα|Necessary only|Essential only)$/i}); if(await consent.count())await consent.click();
   assert.equal(await page.locator('h1').count(),1);
   const evidence=[];
   for(const id of sections) {
    const section=page.locator('#'+id); await section.scrollIntoViewIfNeeded(); await page.evaluate(()=>document.fonts.ready);await section.locator('img').evaluateAll(async imgs=>Promise.all(imgs.map(img=>img.decode())));
    if(id==='solutions') {await section.locator('[data-app-preview="wallet"] [inert]').waitFor();await section.locator('[data-app-preview="agent"] [inert]').waitFor();assert.equal(await section.locator('article').count(),2);}
    if(id==='insurance-categories') {assert.equal(await section.locator('h3').count(),4);await section.locator('img').evaluateAll(async imgs=>Promise.all(imgs.map(img=>img.decode())));}
    if(id==='reading-demo') {
     const tabs=section.getByRole('tab');assert.equal(await tabs.count(),3);
     await tabs.first().focus();await page.keyboard.press('End');assert.equal(await tabs.last().getAttribute('aria-selected'),'true');
     await page.keyboard.press('ArrowRight');assert.equal(await tabs.first().getAttribute('aria-selected'),'true');
     const sources=[];for(let i=0;i<3;i++){await tabs.nth(i).click();assert.equal(await section.getByRole('tabpanel').locator('li').count(),8);sources.push(await section.getByRole('tabpanel').locator('li').first().innerText());assert.equal(await tabs.nth(i).getAttribute('aria-controls'),await section.getByRole('tabpanel').getAttribute('id'));}assert.equal(new Set(sources).size,3);
     await tabs.first().click();const replay=section.getByRole('button');await replay.click();assert.equal(await section.getByRole('tabpanel').locator('li').count(),8);
    }
    const metrics=await section.evaluate(el=>({
     pageOverflow:document.documentElement.scrollWidth>window.innerWidth,
     clipped:[...el.querySelectorAll('h2,h3,p,a')].filter(n=>!n.closest('[inert]') && !n.classList.contains('sr-only') && n.getBoundingClientRect().width>0 && (n.scrollWidth>n.clientWidth+1 || (window.getComputedStyle(n).overflowY==='hidden'&&n.scrollHeight>n.clientHeight+1))).map(n=>n.textContent),
     links:[...el.querySelectorAll('a')].filter(n=>!n.closest('[inert]')).map(n=>n.getAttribute('href')),
     images:[...el.querySelectorAll('img')].map(img=>({loaded:img.complete&&img.naturalWidth>0,width:img.naturalWidth})),
    }));
    assert.equal(metrics.pageOverflow,false,id);assert.deepEqual(metrics.clipped,[],id);assert(metrics.images.every(img=>img.loaded),id);
    const violations=(await new AxeBuilder({page}).include('#'+id).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
    assert.deepEqual(violations,[],id);
    if(['desktop','mobile','english','dark'].includes(name))await section.screenshot({path:`${out}/${name}-${id}.png`,style:'.pw-public-header,[role=dialog]{visibility:hidden!important;}'});
    evidence.push({id,...metrics,violations});
   }
   const summary=page.locator('#difference summary');await summary.focus();await page.keyboard.press('Enter');assert(await page.locator('#difference table').isVisible());await page.keyboard.press('Enter');
   assert.deepEqual(errors,[]);results.push({name,width,route,theme,evidence,errors,keyboard:true});console.log(`${name}: passed`);await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:900},javaScriptEnabled:false,storageState:process.env.PREVIEW_STORAGE_STATE});const page=await context.newPage();await page.goto(base);assert.equal(await page.locator('#solutions [role=img]').count(),2);assert(await page.locator('#solutions [role=img]').first().innerText());assert.equal(await page.locator('#reading-demo [role=tabpanel] li').count(),8);await context.close();
  const motionContext=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',storageState:process.env.PREVIEW_STORAGE_STATE});const motionPage=await motionContext.newPage();await motionPage.goto(base,{waitUntil:'networkidle'});const consent=motionPage.getByRole('button',{name:/^(Μόνο απαραίτητα|Necessary only|Essential only)$/i});if(await consent.count())await consent.click();const demo=motionPage.locator('#reading-demo');await demo.getByRole('tab').first().focus();await motionPage.keyboard.press('Tab');assert(await demo.getByRole('button').evaluate(el=>el===document.activeElement));await motionPage.keyboard.press('Enter');await motionPage.waitForFunction(()=>document.querySelectorAll('#reading-demo [role=tabpanel] li').length===4);await motionPage.waitForFunction(()=>document.querySelectorAll('#reading-demo [role=tabpanel] li').length===8);await motionContext.close();
  const linkContext=await browser.newContext({storageState:process.env.PREVIEW_STORAGE_STATE});const linkPage=await linkContext.newPage();const destinations=[];
  for(const prefix of ['','/en'])for(const path of ['/product/motor','/product/property','/product/health','/product/business','/product','/guides','/lexiko','/trust#documents','/trust#ai','/privacy','/solutions/agents']){
   await linkPage.goto('about:blank');const response=await linkPage.goto(base+prefix+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);assert.equal(new URL(linkPage.url()).pathname,prefix+path.split('#')[0]);assert(await linkPage.locator('main h1').count(),path);if(path.includes('#'))assert.equal(await linkPage.locator('#'+path.split('#')[1]).count(),1);destinations.push(prefix+path);
  }
  await linkContext.close();fs.writeFileSync(`${out}/verification.json`,JSON.stringify({base,results,noJs:true,normalMotionReplay:true,destinations},null,2));console.log('No-JS fallback and all 22 destinations: passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
