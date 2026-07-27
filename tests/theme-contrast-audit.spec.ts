import { test, expect, type Page } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'

/**
 * Runtime theme audit across the AUTHENTICATED app, both themes, three widths.
 *
 * Static analysis cannot see the defect that actually bites: a colour inherited
 * from an ancestor landing on a descendant whose background did not adapt. Only
 * computed styles reveal it, so this measures real contrast in a real browser.
 *
 * Contrast is alpha-composited against the actually-painted background — a
 * naive walk-up skips translucent surfaces (the header is bg-white/80) and
 * invents failures.
 *
 * Opt-in like the other audit suites: it is a findings tool, not a gate.
 *
 * ⚠️ CALIBRATION PENDING — do not treat a failure here as a defect yet.
 * It currently reports ~32 phantom failures on the sidebar nav labels
 * ("Πορτοφόλι", "Κλάδοι", …) at cr exactly 1.0, i.e. foreground identical to
 * background. A screenshot of /dashboard in dark mode shows those labels
 * rendering correctly, so the reading is wrong, not the UI. The element's whole
 * ancestor chain computes rgba(0,0,0,0) — including body and html — so the
 * composite falls through to a default and compares a colour against itself.
 * The real surface is painted somewhere this walk does not see (likely a
 * pseudo-element or a layer the chain misses).
 *
 * Until that is resolved this file must not be wired into any gate: it would
 * fail the build on healthy UI. It is committed because the harness itself is
 * the valuable part — authenticated session via storageState, both themes, three
 * viewports — and it needs one calibration fix, not a rewrite.
 */
test.skip(!process.env.RUN_UX_AUDIT, 'Theme audit — run with RUN_UX_AUDIT=1')

const PAGES = [
    '/dashboard',
    '/wallet',
    '/coverage-insights',
    '/renewals',
    '/account',
    '/notifications',
    '/tasks',
    '/branches',
]

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
]

/** Injected into the page: returns WCAG-AA failures for visible text. */
const SCAN = `(() => {
  const lum=(r,g,b)=>{const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]};
  const parse=c=>{const m=String(c).match(/rgba?\\(([^)]+)\\)/);if(!m)return null;const p=m[1].split(',').map(parseFloat);return{r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}};
  const over=(f,b)=>({r:f.a*f.r+(1-f.a)*b.r,g:f.a*f.g+(1-f.a)*b.g,b:f.a*f.b+(1-f.a)*b.b,a:1});
  const effBg=el=>{const st=[];let n=el;
    // Walk THROUGH body and html — the app paints its surface on one of them,
    // and stopping early meant every transparent chain fell back to white and
    // compared white-on-white (32 phantom failures on the authenticated tier).
    while(n){const c=parse(getComputedStyle(n).backgroundColor);if(c&&c.a>0.02){st.push(c);if(c.a>=0.999)break}n=n.parentElement}
    let base=null;
    for(const el2 of [document.body, document.documentElement]){const c=parse(getComputedStyle(el2).backgroundColor);if(c&&c.a>=0.999){base=c;break}}
    if(!base){const dark=document.documentElement.classList.contains('dark');base=dark?{r:0,g:0,b:0,a:1}:{r:255,g:255,b:255,a:1}}
    for(let i=st.length-1;i>=0;i--)base=over(st[i],base);return base};
  const ratio=(f,b)=>{const L1=lum(f.r,f.g,f.b),L2=lum(b.r,b.g,b.b);const hi=Math.max(L1,L2),lo=Math.min(L1,L2);return (hi+0.05)/(lo+0.05)};
  const bad=[];
  document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a,button,li,td,th,label,dt,dd').forEach(el=>{
    const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join('').trim();
    if(!txt||txt.length<2)return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none')return;
    // A deliberately dimmed control (disabled) is not a contrast defect.
    const op=parseFloat(cs.opacity); if(op<0.55)return;
    if(el.closest('[disabled],[aria-disabled="true"]'))return;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2)return;
    if(r.bottom<0||r.top>(window.innerHeight*4))return;
    const fg=parse(cs.color); if(!fg||fg.a<0.5)return;
    const bg=effBg(el); const cr=ratio(over(fg,bg),bg);
    const size=parseFloat(cs.fontSize),bold=parseInt(cs.fontWeight)>=700;
    const min=(size>=24||(size>=18.66&&bold))?3:4.5;
    if(cr<min-0.05) bad.push({t:txt.slice(0,40),cr:+cr.toFixed(2),min,fg:cs.color,bg:'rgb('+Math.round(bg.r)+','+Math.round(bg.g)+','+Math.round(bg.b)+')',tag:el.tagName,cls:String(el.className||'').slice(0,80)});
  });
  return bad;
})()`

/**
 * Force the theme deterministically. Adding `.dark` while next-themes' `.light`
 * is still present yields a hybrid the CSS resolves as LIGHT — that reads as a
 * catastrophically broken dark mode and is a pure false positive.
 */
async function setTheme(page: Page, theme: 'light' | 'dark') {
    await page.addInitScript((t) => {
        try {
            window.localStorage.setItem('theme', t)
        } catch {
            /* storage unavailable */
        }
    }, theme)
}

for (const viewport of VIEWPORTS) {
    test.describe(`theme audit — ${viewport.name}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        for (const theme of ['light', 'dark'] as const) {
            test(`${theme} mode has no contrast failures`, async ({ page }) => {
                // Eight routes per test against `npm run dev`, so each first hit
                // pays on-demand compilation. The default 30s budget covers about
                // two of them — this is measurement time, not product latency.
                test.setTimeout(8 * 60_000)
                await setTheme(page, theme)
                const all: Record<string, unknown[]> = {}

                for (const path of PAGES) {
                    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
                    await dismissCookieBanner(page)
                    // Let the theme class settle before measuring.
                    await page.waitForTimeout(700)

                    const applied = await page.evaluate(() => document.documentElement.className)
                    expect(
                        applied.includes('light') && applied.includes('dark'),
                        `hybrid theme state on ${path} — measurement would be meaningless`
                    ).toBe(false)

                    const failures = (await page.evaluate(SCAN)) as unknown[]
                    if (failures.length) all[path] = failures
                }

                const summary = Object.entries(all)
                    .map(([p, f]) => `\n${p} (${f.length}):\n` + f.map((x) => `   ${JSON.stringify(x)}`).join('\n'))
                    .join('')
                expect(summary, `contrast failures in ${theme}/${viewport.name}:${summary}`).toBe('')
            })
        }
    })
}
