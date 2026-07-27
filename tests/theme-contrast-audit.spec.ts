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
 * ⚠️ CALIBRATION PENDING — a failure here is NOT yet evidence of a defect.
 *
 * Three rounds of fixes went in — canvas-normalised colour parsing (Chrome
 * returns oklab() for tokens, which a rgb()-only regex read as transparent),
 * walking through body/html, and parsing gradient colour stops (the shell uses
 * bg-gradient-to-br, which paints via background-IMAGE so backgroundColor is
 * transparent). Each fixed a real flaw and the stop parsing now resolves genuine
 * values, but ~34 phantom failures remain, mostly `fg:white on bg:white`.
 *
 * Ground truth, established by screenshot instead: /dashboard renders CORRECTLY
 * in both themes — light sidebar with dark labels, dark sidebar with light
 * labels, readable active pill in both. The measurement is wrong, not the UI.
 *
 * So: do not wire this into a gate, and do not action its output without
 * confirming against a screenshot first. The harness (authenticated session via
 * storageState, both themes, three viewports) is sound and worth keeping; the
 * backdrop resolution needs one more pass, most likely sampling rendered pixels
 * rather than trying to recompute the composite from computed styles.
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
  // Chrome returns MODERN colour syntax (oklab(), color(), lab()) for tokens and
  // opacity-modified utilities. A regex that only understood rgb() read every one
  // of those as transparent, so the background walk fell through to a default and
  // compared a colour against itself — cr exactly 1.0 on perfectly readable text.
  // A canvas normalises ANY CSS colour to rgba.
  const _cv=document.createElement('canvas');_cv.width=_cv.height=1;
  const _cx=_cv.getContext('2d',{willReadFrequently:true});
  const _cache=new Map();
  const parse=c=>{const k=String(c);if(!k||k==='none')return null;if(_cache.has(k))return _cache.get(k);
    let out=null;
    try{_cx.clearRect(0,0,1,1);_cx.fillStyle='#000';_cx.fillStyle=k;
      const resolved=_cx.fillStyle;
      if(typeof resolved==='string'&&resolved.startsWith('#')){const h=resolved.slice(1);
        out={r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:1}}
      else{const m=String(resolved).match(/rgba?\\(([^)]+)\\)/);
        if(m){const p=m[1].split(',').map(parseFloat);out={r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}}}
      // fillStyle drops alpha for some inputs — recover it by painting onto a
      // known backdrop and reading the composited pixel.
      if(out){_cx.clearRect(0,0,1,1);_cx.fillStyle=k;_cx.fillRect(0,0,1,1);
        const d=_cx.getImageData(0,0,1,1).data;out={r:d[0],g:d[1],b:d[2],a:d[3]/255}}
    }catch(e){out=null}
    _cache.set(k,out);return out};
  const over=(f,b)=>({r:f.a*f.r+(1-f.a)*b.r,g:f.a*f.g+(1-f.a)*b.g,b:f.a*f.b+(1-f.a)*b.b,a:1});
  // A gradient paints via background-IMAGE, so backgroundColor reads transparent.
  // The sidebar is bg-gradient-to-br — ignoring that made the walk fall through
  // to white and report white-on-white for perfectly readable nav labels.
  // Every colour stop is returned so the caller can test the WORST one.
  const gradientStops=v=>{ if(!v||v==='none')return [];
    const out=[]; const re=/(#[0-9a-f]{3,8}|rgba?\\([^)]*\\)|oklab\\([^)]*\\)|oklch\\([^)]*\\)|hsla?\\([^)]*\\)|\\b(?:white|black|transparent)\\b)/gi;
    let m; while((m=re.exec(v))){ const c=parse(m[1]); if(c&&c.a>0.02) out.push(c) } return out };

  // All plausible backdrops for the element, composited outward. Usually one.
  const effBgs=el=>{const st=[];let n=el;let branches=[];
    while(n){const cs=getComputedStyle(n);
      const c=parse(cs.backgroundColor); if(c&&c.a>0.02){st.push(c);if(c.a>=0.999)break}
      const stops=gradientStops(cs.backgroundImage);
      if(stops.length){branches=stops;break}
      n=n.parentElement}
    let bases=[];
    if(branches.length) bases=branches;
    else{ let base=null;
      for(const el2 of [document.body, document.documentElement]){const c=parse(getComputedStyle(el2).backgroundColor);if(c&&c.a>=0.999){base=c;break}}
      if(!base){const dark=document.documentElement.classList.contains('dark');base=dark?{r:0,g:0,b:0,a:1}:{r:255,g:255,b:255,a:1}}
      bases=[base]}
    return bases.map(b=>{let acc=b;for(let i=st.length-1;i>=0;i--)acc=over(st[i],acc);return acc})};
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
    // Worst plausible backdrop: if the least-favourable gradient stop passes,
    // every point along the gradient passes.
    const bgs=effBgs(el);
    let bg=bgs[0], cr=Infinity;
    for(const b of bgs){const c=ratio(over(fg,b),b); if(c<cr){cr=c;bg=b}}
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
