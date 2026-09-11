#!/bin/bash
# Anonymous production smoke for PW-PROVENANCE-01 W1-01 (citation fields cover the fields the rules read).
# The item changes the extraction prompt and response schema ONLY when EXTRACTION_CITATIONS=1 (the
# citations flag), and the change is which fields the model is asked to cite. No route, page or stored
# shape changes; an anonymous smoke proves only that the deploy carrying the item is live and the public
# product unchanged. What the next extraction cites is visible in acordData.extraction.sources of the
# next analysed policy, stated in RESULT.md. Re-runnable; writes nothing.
#
#   bash docs/evidence/provenance-w1-01/prod-smoke.sh
H=https://www.policywallet.gr
pages="/ /pricing /product/motor /product/health /trust /methodology /status /auth/signin"
for p in $pages; do
  body=$(curl -sL -A "pw-smoke" "$H$p"); code=$(curl -s -o /dev/null -w '%{http_code}' -A "pw-smoke" "$H$p")
  lang=$(grep -oE '<html[^>]*lang="[a-z]+"' <<<"$body" | grep -oE 'lang="[a-z]+"' | head -1)
  title=$(grep -oE '<title>[^<]*' <<<"$body" | sed 's/<title>//' | head -1 | cut -c1-70)
  chars=$(sed -E 's/<[^>]+>//g' <<<"$body" | tr -s '[:space:]' ' ' | wc -c | tr -d ' ')
  internals=$(grep -oiE 'prisma|PrismaClient|__PENDING_EXTRACTION__|E2E ' <<<"$body" | sort -u | tr '\n' ',')
  echo "$code $p $lang chars=$chars title=\"$title\" leaked=[${internals}]"
done
echo "--- authenticated routes redirect anonymously (never 5xx):"
for p in /dashboard /wallet /protection; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -A "pw-smoke" "$H$p"); loc=$(curl -s -o /dev/null -w '%{redirect_url}' -A "pw-smoke" "$H$p")
  echo "$code $p -> $loc"
done
