#!/bin/bash
# Anonymous production smoke for PW-PROVENANCE-01 W4-01 (schema Art. 30 tags, generated ROPA, guard).
# The item has no runtime surface: the smoke proves the deploy that carries it is live and that the
# public product is unchanged by it (the tags are `///` comments; the generator and guard run at
# build/test time only). Re-runnable; writes nothing.
#
#   bash docs/evidence/provenance-w4-01/prod-smoke.sh
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
echo "--- ROPA is a repository document, not a route (proxy.ts sends unknown paths to signin: expected 307 or 404, never 200 or 500):"
curl -s -o /dev/null -w '%{http_code} /docs/compliance/ROPA.md\n' -A "pw-smoke" "$H/docs/compliance/ROPA.md"
