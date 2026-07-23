import { test, expect } from '@playwright/test'
test.use({ storageState: 'playwright/.auth/agent.json' })

/**
 * The agent fixtures carry no renewals/commissions rows, so the real tables
 * render empty states here. The markup half (data-label on every cell, the
 * class on the table) is verified by grep + type-check; this verifies the CSS
 * half — that .pw-stacked-table actually stacks below lg and restores a normal
 * table at lg+ — by measuring a representative table in the real stylesheet.
 */
const TABLE = `
<table class="pw-stacked-table" id="probe">
  <thead><tr><th>Customer</th><th>Premium</th></tr></thead>
  <tbody><tr><td data-label="Customer">Maria K.</td><td data-label="Premium">420 €</td></tr></tbody>
</table>`

async function probe(page: any) {
    return page.evaluate(() => {
        const t = document.getElementById('probe')!
        const thead = t.querySelector('thead') as HTMLElement
        const row = t.querySelector('tbody tr') as HTMLElement
        const cell = t.querySelector('tbody td[data-label]') as HTMLElement
        return {
            theadHidden: getComputedStyle(thead).position === 'absolute',
            rowStacked: getComputedStyle(row).flexDirection === 'column',
            labelShown: getComputedStyle(cell, '::before').content,
        }
    })
}

test('.pw-stacked-table stacks below lg and is a normal table at lg+', async ({ page }) => {
    await page.goto('/renewals')
    await page.waitForLoadState('networkidle')
    await page.evaluate((html) => { document.body.insertAdjacentHTML('beforeend', html) }, TABLE)

    await page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(200)
    const mobile = await probe(page)
    expect(mobile.theadHidden, 'header row still shown on mobile').toBe(true)
    expect(mobile.rowStacked, 'row did not become a stacked card').toBe(true)
    expect(mobile.labelShown, 'cell label not injected').toContain('Customer')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(200)
    const desktop = await probe(page)
    expect(desktop.theadHidden, 'header hidden on desktop').toBe(false)
    expect(desktop.rowStacked, 'row still stacked on desktop').toBe(false)
    expect(desktop.labelShown, 'label leaking onto desktop').not.toContain('Customer')
})
