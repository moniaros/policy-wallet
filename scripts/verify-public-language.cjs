/* global process, console, document, innerWidth, URL */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://localhost:3002';
const out = process.env.EVIDENCE_DIR || '/tmp/pw-public-language-browser';
const state = process.env.PLAYWRIGHT_STORAGE_STATE;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...(state ? { storageState: state } : {}), reducedMotion: 'reduce' });
  const api = await context.request.get(base + '/sitemap.xml');
  assert.equal(api.status(), 200);
  const paths = [...new Set([...((await api.text()).matchAll(/<loc>(.*?)<\/loc>/g))].map(m => new URL(m[1]).pathname))];
  assert(paths.length > 100, 'Full bilingual public route inventory');
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const results = [], failures = [];
  const shots = new Set(['/', '/product/property', '/product/motor', '/pricing', '/trust', '/terms', '/cookies', '/guides/asfaleia-katoikidiou-ti-exaireitai']);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of paths) {
      const errors = [];
      const onError = e => errors.push(e.message);
      page.on('pageerror', onError);
      try {
        const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const reject = page.getByRole('button', { name: /^(Μόνο απαραίτητα|Necessary Only)$/i });
        if (await reject.isVisible()) await reject.click();
        await page.evaluate(() => document.fonts.ready);
        const box = await page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, h1: document.querySelectorAll('h1').length, text: document.querySelector('main')?.textContent?.length || 0 }));
        const row = { route, width, status: response.status(), ...box, errors };
        if (row.status !== 200 || box.width > width + 1 || box.h1 !== 1 || !box.text || errors.length) failures.push(row);
        results.push(row);
        fs.writeFileSync(path.join(out, "progress.json"), JSON.stringify({ cases: results.length, failures }, null, 2));
        if (results.length % 24 === 0) console.log("Checked", results.length, "cases; failures", failures.length);
        if (shots.has(route)) await page.screenshot({ path: path.join(out, route.replaceAll('/', '_') + '-' + width + '.png'), fullPage: true });
      } catch (error) { failures.push({ route, width, error: error.message }); console.log('Failed', route, width, error.message); }
      page.off('pageerror', onError);
    }
    console.log('Public route sweep complete', width, paths.length);
  }
  // A saved refusal can be reconsidered from both entry points; opening is not consent.
  const consentResults = [];
  for (const route of ['/', '/cookies', '/en/cookies']) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    const before = (await context.cookies()).find(c => c.name === 'pw_cookie_consent')?.value;
    const button = page.getByRole('button', { name: /^(Ρυθμίσεις cookies|Cookie settings)$/i }).first();
    await button.click();
    const reject = page.getByRole('button', { name: /^(Μόνο απαραίτητα|Necessary Only)$/i });
    await reject.waitFor({ state: 'visible' });
    assert.equal((await context.cookies()).find(c => c.name === 'pw_cookie_consent')?.value, before, 'Opening preferences must not change consent');
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await reject.click();
    const cookie = (await context.cookies()).find(c => c.name === 'pw_cookie_consent');
    let value = decodeURIComponent(cookie.value); if (!value.startsWith('{')) value = decodeURIComponent(value);
    const payload = JSON.parse(value);
    assert.deepEqual(payload.categories, { necessary: true, analytics: false, marketing: false });
    consentResults.push({ route, openedWithoutConsentChange: true, rejectionPersisted: true, accessibility: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) });
  }
  // Actual legal content and sources, not just HTTP success.
  await page.goto(base + '/terms', { waitUntil: 'domcontentloaded' });
  assert.match(await page.locator('main').innerText(), /14 ημερολογιακές ημέρες από τη σύναψη/);
  assert.match(await page.locator('main').innerText(), /προηγούμενο ρητό αίτημά σας/);
  assert.match(await page.locator('main').innerText(), /GR-GA-2026\.10\.21/);
  await page.goto(base + '/product/property', { waitUntil: 'domcontentloaded' });
  assert.match(await page.locator('main').innerText(), /2026/);
  const report = { base, checkedAt: new Date().toISOString(), routes: paths.length, cases: results.length, failures, consentResults, results };
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(report, null, 2));
  await browser.close();
  assert.equal(failures.length, 0, JSON.stringify(failures));
  assert.equal(consentResults.flatMap(r => r.accessibility).length, 0, 'Cookie settings accessibility');
  console.log('PASS', results.length, 'public cases; 3 cookie preference journeys/axe scans; legal content checks');
})().catch(error => { console.error(error); process.exit(1); });
