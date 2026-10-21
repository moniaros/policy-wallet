/* global process, __dirname, console, document, innerWidth, localStorage */
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://localhost:3002';
const out = process.env.EVIDENCE_DIR || path.resolve(__dirname, '../docs/evidence/presentation-round2-2026-10-21');
const storageState = process.env.PREVIEW_STORAGE_STATE;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const results = [];
  for (const [route, name, width, dark] of [
    ['/auth/signin', 'signin-el-desktop', 1440, false],
    ['/auth/signin', 'signin-el-mobile', 320, false],
    ['/auth/signin?lang=en', 'signin-en-dark', 390, true],
    ['/auth/signup?role=policyholder&lang=el&email=presentation%40example.com', 'signup-policyholder', 390, false],
    ['/auth/signup?role=agent&lang=en', 'signup-agent', 1440, false],
    ['/auth/signup?role=agent', 'signup-agent-mobile', 320, false],
    ['/auth/forgot-password', 'forgot', 390, false],
    ['/auth/reset-password?lang=en', 'reset', 1440, true],
    ['/auth/signup/confirmation', 'confirmation', 390, false],
    ['/auth/auth-code-error', 'auth-error', 390, false],
    ['/auth/verify-email?lang=en', 'verify-email', 390, false],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, storageState, reducedMotion: 'reduce' });
    await context.addInitScript(d => localStorage.setItem('theme', d ? 'dark' : 'light'), dark);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const res = await page.goto(base + route, { waitUntil: 'networkidle' });
    assert.equal(res.status(), 200, route);
    const consent = page.getByRole('button', { name: /^(Μόνο απαραίτητα|Necessary only)$/i });
    if (await consent.isVisible()) await consent.click();
    assert.equal(await page.locator('h1').count(), 1, route);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route + ' overflow');
    const row = { route, width, dark, title: await page.locator('h1').innerText(), errors };
    if (route.includes('/signin')) {
      assert.equal(await page.locator('#signin-email').getAttribute('autocomplete'), 'username');
      assert.equal(await page.locator('#signin-password').getAttribute('autocomplete'), 'current-password');
      await page.locator('form button[type="submit"]').click();
      assert.equal(await page.locator('#signin-email').getAttribute('aria-invalid'), 'true');
      await page.getByRole('button', { name: /^(Τηλέφωνο|Phone)$/ }).click();
      assert.equal(await page.locator('#signin-phone').count(), 1);
      await page.getByRole('button', { name: 'Email', exact: true }).click();
      await page.getByRole('button', { name: /^(Ξέχασα τον κωδικό μου|Forgot password\??)$/i }).click();
      assert.equal(await page.getByRole('dialog').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      row.validationAndRecovery = true;
    }
    if (route.includes('/signup?')) {
      const agent = route.includes('role=agent');
      assert.match(page.url(), new RegExp('/auth/signup/' + (agent ? 'agent' : 'policyholder')));
      assert.equal(await page.locator('#signup-name').count(), agent ? 1 : 0);
      if (!agent) assert.equal(await page.locator('#signup-email').inputValue(), 'presentation@example.com');
      await page.locator('#signup-password').fill('ExamplePassword1!');
      await page.getByRole('button', { name: /^(Εμφάνιση κωδικού|Show password)$/ }).click();
      assert.equal(await page.locator('#signup-password').getAttribute('type'), 'text');
      await page.getByRole('button', { name: /^(Απόκρυψη κωδικού|Hide password)$/ }).click();
      assert.equal(await page.locator('#signup-password').getAttribute('type'), 'password');
      await page.locator('form button[type="submit"]').click();
      assert.equal(await page.locator('#signup-terms').getAttribute('aria-invalid'), 'true');
      row.rolePrefillValidationAndReveal = true;
    }
    await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    row.accessibility = axe.violations.map(v => ({ id:v.id, nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary})) }));
    assert.equal(errors.length, 0, route + ' runtime errors');
    results.push(row); fs.writeFileSync(path.join(out, 'auth-verification.json'), JSON.stringify(results, null, 2));
    console.log(name, 'PASS', row.accessibility.length ? 'accessibility findings: '+row.accessibility.length : 'axe clear');
    await context.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
