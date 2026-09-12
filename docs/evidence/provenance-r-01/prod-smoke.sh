#!/bin/bash
# Anonymous production smoke for PW-PROVENANCE-01 R-01 (passkeys as a second factor, OFF by default).
# With PASSKEYS_ENABLED unset the deploy changes nothing a visitor or a signed-in person can reach: the routes
# refuse, the proxy enforces nothing, the settings block is absent. This proves the deploy is live, the public
# product unchanged, the step-up page reachable (it is how a person gets past the gate) and the passkey routes
# closed to anonymous callers. Re-runnable; writes nothing.
#
#   bash docs/evidence/provenance-r-01/prod-smoke.sh
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
echo "--- R-01: the step-up page renders anonymously (it must, or a signed-in person could never get past the gate):"
code=$(curl -s -o /dev/null -w '%{http_code}' -A "pw-smoke" "$H/auth/step-up?callbackUrl=%2Fwallet"); echo "$code /auth/step-up"
echo "--- R-01: the passkey routes refuse an anonymous caller (401/403, never 5xx, never 200):"
for p in /api/auth/passkeys /api/auth/passkeys/challenge /api/auth/passkeys/options; do
  m=GET; [ "$p" != "/api/auth/passkeys" ] && m=POST
  code=$(curl -s -o /dev/null -w '%{http_code}' -X $m -A "pw-smoke" "$H$p"); echo "$code $m $p"
done
