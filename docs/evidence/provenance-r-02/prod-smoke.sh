#!/bin/bash
# Anonymous production smoke for PW-PROVENANCE-01 R-02 (PITR re-erasure as a daily job).
# The item adds one cron route; with PITR_RESTORE_POINT unset every run records `no_restore_point`. This proves the
# deploy carrying the item is live, the public product unchanged, and the new job route closed to anonymous callers.
# Re-runnable; writes nothing.
#
#   bash docs/evidence/provenance-r-02/prod-smoke.sh
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
echo "--- R-02: the job route refuses an anonymous caller (401/403, never 5xx, never 200):"
for m in GET POST; do code=$(curl -s -o /dev/null -w '%{http_code}' -X $m -A "pw-smoke" "$H/api/v1/jobs/pitr-re-erasure"); echo "$code $m /api/v1/jobs/pitr-re-erasure"; done
