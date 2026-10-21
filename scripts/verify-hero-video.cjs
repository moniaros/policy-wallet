/* global process, console, document, navigator, innerWidth, Event, window */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://localhost:3002';
const out = process.env.EVIDENCE_DIR || path.resolve('docs/evidence/hero-video-2026-10-21');
(async () => {
    fs.mkdirSync(out, { recursive: true });
    const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
    const results = [];
    for (const [name, width, route, mode] of [
        ['desktop', 1440, '/', 'play'],
        ['mobile', 390, '/', 'play'],
        ['english-small', 320, '/en', 'play'],
        ['reduced-motion', 390, '/', 'reduce'],
        ['save-data', 390, '/', 'save'],
        ['video-failure', 1440, '/', 'failure'],
        ['no-javascript', 390, '/', 'nojs'],
    ]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference', javaScriptEnabled: mode !== 'nojs', storageState: process.env.PREVIEW_STORAGE_STATE });
        if (mode === 'save') await context.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true, effectiveType: '4g', addEventListener() {}, removeEventListener() {} } }));
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const errors = [], mediaRequests = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('request', r => { if (r.url().includes('/videos/hero-lifestyle.mp4')) mediaRequests.push(r.url()); });
        if (mode === 'failure') await page.route('**/videos/hero-lifestyle.mp4', r => r.abort());
        await page.goto(base + route, { waitUntil: 'networkidle' });
        const consent = page.getByRole('button', { name: /^(Μόνο απαραίτητα|Necessary only)$/i });
        if (mode !== 'nojs' && await consent.isVisible()) await consent.click();
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const poster = page.locator('.pw-hero-film img');
        await poster.evaluate(image => image.decode());
        const row = { name, width, mode, posterLoaded: await poster.evaluate(e => e.naturalWidth > 0) };
        row.layout = await page.evaluate(() => {
            const box = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
            return { hero: box('.pw-public-hero'), media: box('.pw-public-hero-media'), heading: box('.pw-public-hero h1'), background: window.getComputedStyle(document.querySelector('.pw-public-hero')).backgroundColor, foreground: window.getComputedStyle(document.querySelector('.pw-public-hero h1')).color };
        });
        assert.deepEqual(row.layout.media, row.layout.hero, 'Video must cover the entire hero on every viewport');
        assert.equal(row.layout.background, 'rgb(247, 250, 248)');
        assert.equal(row.layout.foreground, 'rgb(20, 59, 51)');
        if (mode === 'play') {
            const video = page.locator('.pw-hero-film video');
            await page.waitForFunction(() => { const v = document.querySelector('.pw-hero-film video'); return v && !v.paused && v.currentTime > 0.1; });
            row.video = await video.evaluate(v => ({ muted: v.muted, loop: v.loop, inline: v.playsInline, width: v.videoWidth, height: v.videoHeight }));
            assert.deepEqual(row.video, { muted: true, loop: true, inline: true, width: 1280, height: 720 });
            const control = await page.locator('.pw-hero-film-control').boundingBox();
            const form = await page.locator('.pw-public-hero form').boundingBox();
            assert.ok(control.width >= 44 && control.height >= 44);
            assert.ok(control.x >= form.x + form.width || control.y >= form.y + form.height, 'Video control must not overlap signup');
            const pauseName = route === '/en' ? 'Pause video' : 'Παύση βίντεο';
            const playName = route === '/en' ? 'Play video' : 'Αναπαραγωγή βίντεο';
            await page.getByRole('button', { name: pauseName, exact: true }).click();
            await page.waitForFunction(() => document.querySelector('.pw-hero-film video').paused);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForTimeout(200);
            assert.equal(await video.evaluate(v => v.paused), true);
            await page.getByRole('button', { name: playName, exact: true }).focus();
            await page.keyboard.press('Enter');
            await page.waitForFunction(() => !document.querySelector('.pw-hero-film video').paused);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForFunction(() => document.querySelector('.pw-hero-film video').paused);
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForFunction(() => !document.querySelector('.pw-hero-film video').paused);
            row.pauseResumeAndOffscreen = true;
            await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
            await page.waitForFunction(() => document.querySelector('.pw-hero-film video').paused);
            await page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
            await page.waitForFunction(() => !document.querySelector('.pw-hero-film video').paused);
            row.simulatedHiddenTab = true;
            if (name === 'desktop' || name === 'mobile') {
                await page.screenshot({ path: path.join(out, name + '.png'), animations: 'disabled', timeout: 15000 });
                row.accessibility = (await new AxeBuilder({ page }).include('.pw-public-hero').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations.map(v => ({ id: v.id, impact: v.impact }));
                assert.equal(row.accessibility.length, 0);
            }
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.waitForFunction(() => !document.querySelector('.pw-hero-film video'));
            row.dynamicReducedMotion = true;
        } else {
            await page.waitForFunction(() => !document.querySelector('.pw-hero-film video'));
            assert.equal(await page.locator('.pw-hero-film-control').count(), 0);
            if (mode !== 'failure') assert.equal(mediaRequests.length, 0);
            row.noVideoDownload = mediaRequests.length === 0;
        }
        assert.equal(errors.length, 0);
        row.errors = errors;
        results.push(row);
        fs.writeFileSync(path.join(out, 'browser-checks.json'), JSON.stringify(results, null, 2));
        console.log(name, 'PASS');
        await context.close();
    }
    await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
