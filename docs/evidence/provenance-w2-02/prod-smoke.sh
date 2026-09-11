#!/bin/bash
# Anonymous production smoke for PW-PROVENANCE-01 W2-02 (the evidence floor: a finding below it is disclosed, never published).
# The item changes SIGNED-IN surfaces: /protection gains a disclosed group for findings the document did not
# confirm, classified reads (counts, digest, report, notifications) stop publishing them, and every live finding
# written before W2-01 demotes to that group until its policy is re-analysed. An anonymous smoke proves only that
# the deploy carrying the item is live and the public product unchanged; the signed-in outcome is stated in
# RESULT.md with what could and could not be seen. Re-runnable; writes nothing.
#
#   bash docs/evidence/provenance-w2-02/prod-smoke.sh
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
