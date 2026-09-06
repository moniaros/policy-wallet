#!/bin/bash
# Unauthenticated production smoke for PW-CONTENT-01 Goal 8 (trust pages, locale stamp, vocabulary).
H=https://www.policywallet.gr
pages="/methodology /changelog /status /en/methodology /en/changelog /en/status /terms /en/terms"
for p in $pages; do
  body=$(curl -sL -A "pw-smoke" "$H$p"); code=$(curl -s -o /dev/null -w '%{http_code}' -A "pw-smoke" "$H$p")
  lang=$(grep -oE '<html[^>]*lang="[a-z]+"' <<<"$body" | grep -oE 'lang="[a-z]+"' | head -1)
  locale=$(grep -oE 'data-locale="[a-zA-Z-]+"' <<<"$body" | head -1)
  title=$(grep -oE '<title>[^<]*' <<<"$body" | sed 's/<title>//' | head -1 | cut -c1-70)
  robots=$(grep -oE '<meta name="robots" content="[^"]*"' <<<"$body" | head -1 | sed 's/.*content=//')
  canon=$(grep -oE '<link rel="canonical" href="[^"]*"' <<<"$body" | sed 's/.*href=//' | head -1)
  score=$(grep -oiE 'βαθμολογ[ίι]α|σκορ|δείκτης υγείας|health score|protection score|δείκτης σχέσης' <<<"$body" | sort -u | tr '\n' ',')
  echo "$code $p $lang $locale robots=$robots canonical=$canon title=\"$title\" score-vocab=[${score}]"
done
echo "--- sitemap has the trust pages:"; curl -s "$H/sitemap.xml" | grep -oE '<loc>[^<]*(methodology|changelog|status)[^<]*' | sed 's/<loc>//' | tr '\n' ' '; echo
echo "--- changelog top entry (EL):"; curl -sL "$H/changelog" | grep -oE 'Μία γλώσσα ανά αίτημα[^<]{0,60}' | head -1
echo "--- methodology numbers (EL):"; curl -sL "$H/methodology" | grep -oE '[0-9]+ (αυθεντικοί|έλεγχ|κλάδ)[α-ωά-ώ]*' | sort -u | tr '\n' ',' ; echo
