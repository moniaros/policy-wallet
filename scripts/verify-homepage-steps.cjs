/* global window, document, process, URL, console */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://localhost:3002';
const out = process.env.EVIDENCE_DIR || '/tmp/pw-homepage-steps-local';
(async () => {
    fs.mkdirSync(out, { recursive: true });
    const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const results = [];
    try {
        for (const [name, width, route, theme] of [
            ['desktop',1440,'/','light'], ['desktop-narrow',1280,'/','light'],
            ['tablet',1024,'/','light'], ['tablet-small',768,'/','light'],
            ['mobile',390,'/','light'], ['small',320,'/','light'],
            ['english',320,'/en','light'], ['dark',1440,'/en','dark'],
        ]) {
            const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', storageState: process.env.PREVIEW_STORAGE_STATE });
            await context.addInitScript(t => window.localStorage.setItem('theme',t),theme);
            const page = await context.newPage();
            const errors = []; page.on('pageerror', e => errors.push(e.message));
            const response = await page.goto(base+route,{waitUntil:'networkidle'});
            assert.equal(response.status(),200);
            const consent = page.getByRole('button', {name: /^(Μόνο απαραίτητα|Necessary only|Essential only)$/i});
            if (await consent.count()) await consent.click();
            const section = page.locator('#how-it-works');
            await section.scrollIntoViewIfNeeded();
            await page.evaluate(() => document.fonts.ready);
            assert.equal(await section.locator('ol > li').count(),4);
            assert.equal(await section.locator('h3').count(),4);
            const links = section.locator('a'); assert.equal(await links.count(),4);
            const measurements = await section.evaluate(el => {
                const items = [...el.querySelectorAll('ol > li')];
                return { background: window.getComputedStyle(el).backgroundColor, columns: window.getComputedStyle(el.querySelector('ol')).gridTemplateColumns.split(' ').length,
                    pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
                    clipped: [...el.querySelectorAll('h2,h3,p,a')].filter(n => n.scrollWidth > n.clientWidth+1 || (window.getComputedStyle(n).overflowY === 'hidden' && n.scrollHeight > n.clientHeight+1)).map(n => n.textContent),
                    boxes: items.map(n => { const r = n.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; }) };
            });
            assert.equal(measurements.background,'rgb(20, 59, 51)');
            assert.equal(measurements.columns,width >=1200 ? 4 : width >=600 ? 2 : 1);
            assert.equal(measurements.pageOverflow,false);
            assert.deepEqual(measurements.clipped,[]);
            assert.deepEqual(errors,[]);
            for (let i=0;i<4;i++) { const a = links.nth(i); const box=await a.boundingBox(); assert(box.width>=44 && box.height>=44); await a.focus(); assert(await a.evaluate(el=>el===document.activeElement)); }
            const hrefs=await links.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
            assert(hrefs[0].includes('/auth/signup?role=policyholder')); assert(hrefs[3].includes('/auth/signup?role=policyholder'));
            await links.nth(1).click(); await page.waitForURL('**#reading-demo'); assert.equal(new URL(page.url()).hash,'#reading-demo');
            assert(await page.locator('#reading-demo').isVisible());
            await links.nth(2).click(); await page.waitForURL('**#difference'); assert.equal(new URL(page.url()).hash,'#difference'); assert(await page.locator('#difference').isVisible());
            await section.scrollIntoViewIfNeeded();
            const accessibility=(await new AxeBuilder({page}).include('#how-it-works').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));
            assert.deepEqual(accessibility,[]);
            if (['desktop','mobile','english','dark'].includes(name)) await section.screenshot({path:`${out}/${name}.png`,style:'.pw-public-header, [role=dialog] { visibility: hidden !important; }'});
            results.push({name,width,route,theme,...measurements,hrefs,accessibility,keyboard:true,anchorDestinations:true});
            console.log(`${name}: passed`); await context.close();
        }
        fs.writeFileSync(`${out}/verification.json`,JSON.stringify({base,results},null,2));
    } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
