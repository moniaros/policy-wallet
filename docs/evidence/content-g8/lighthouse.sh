#!/bin/bash
# Lighthouse SEO on the three trust pages (prod), JSON out under the scratchpad.
S=$(dirname "$0"); mkdir -p "$S/lh"
for p in methodology changelog status; do
  npx --yes lighthouse@13.4.1 "https://www.policywallet.gr/$p" --only-categories=seo,accessibility --quiet --chrome-flags="--headless=new --no-sandbox" --output=json --output-path="$S/lh/$p.json" >/dev/null 2>&1
  node -e "const r=require('$S/lh/$p.json');const c=r.categories;const fails=Object.values(r.audits).filter(a=>a.score!==null&&a.score<1&&(c.seo.auditRefs.some(x=>x.id===a.id))).map(a=>a.id);console.log('$p seo='+Math.round(c.seo.score*100)+' a11y='+Math.round(c.accessibility.score*100)+' seo-fails='+JSON.stringify(fails))"
done
