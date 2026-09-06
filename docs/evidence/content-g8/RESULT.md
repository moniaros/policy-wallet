# PW-CONTENT-01 Goal 8 — production smoke after PR #308 (NEW-UI `3c287313`)

Deploy run 34038640338 finished 2026-09-06 14:19:54Z. Smoke run 14:20–14:35Z. Scripts in this directory
(`prod-smoke.sh` anonymous, `lighthouse.sh`); Lighthouse summaries in `lighthouse-*.json`.

## Anonymous (curl, no session)

| Path | HTTP | canonical | title | vocabulary hits (context) |
|---|---|---|---|---|
| /methodology | 200 | self | Μεθοδολογία — πώς αποφασίζεται ένα εύρημα | «Δεν δίνουμε βαθμολογία προστασίας…» — a negation, in the «Τι δεν κάνουμε» section |
| /changelog | 200 | self | Τι άλλαξε — ημερολόγιο αλλαγών | «τέλος ο δείκτης σχέσης» / «Ο “δείκτης σχέσης” του συμβούλου αφαιρέθηκε» — the removal entry itself |
| /status | 200 | self | Κατάσταση υπηρεσίας | none |
| /en/methodology | 200 | self | Methodology — how a finding is decided | "We do not give a protection score…" — negation |
| /en/changelog | 200 | self | What changed — changelog | none |
| /en/status | 200 | self | Service status | none |
| /terms, /en/terms | 200 | self | Όροι Χρήσης / Terms of Service | none |

- `sitemap.xml` lists all six trust routes.
- The top changelog entry is #308's («Μία γλώσσα ανά αίτημα, νέες παραπομπές, τέλος ο δείκτης σχέσης»).
- Digits rendered on /en/methodology after hydration: 29, 8, 31, 23, 8, 21, 256 — the catalogue size, branches with checks, branch total, branches without checks, under-review requirements, and «SHA-256»; all from `PUBLIC_COUNTS` (guard `no-fabricated-public-count`).
- **Known, pre-existing, not a regression:** the server HTML of every `/en/*` page carries `<html lang="el">`; an inline script in the root layout stamps `en` before first paint (documented in `app/layout.tsx`: the complete fix is per-locale root layouts). Post-hydration on /en/methodology: `lang="en"`, `data-locale="en-GB"`, no horizontal scroll at 1352px.

## Lighthouse 13.4.1 (headless Chrome, production)

| Page | SEO | Accessibility | failing audits |
|---|---|---|---|
| /methodology | 100 | 100 | none |
| /changelog | 100 | 100 | none |
| /status | 100 | 100 | none |

## Agent-side (the owner's agent session in the Chrome profile; preference `el`)

| Page | `<html lang>` / `data-locale` | checked | result |
|---|---|---|---|
| /insights | el / el-GR | citation element, score vocabulary, horizontal scroll | 0 citations (this book has no classified live finding — production carries one live finding, under review), 0 vocabulary hits, no h-scroll |
| /dashboard/agent | el / el-GR | «μέσος δείκτης», «δείκτης υγείας/σχέσης/προστασίας», «βαθμολογία», «/100», "health" | 0 hits |
| /customers | el | column headers, «υγεία σχέσης» / «δείκτης σχέσης» / "health" | headers: Πελάτης · Ασφαλιστήρια · Επόμενη Ανανέωση · Κενά · Συναίνεση AI · Τελευταία Δραστηριότητα · Προτεινόμενη Ενέργεια — no health column; 0 hits |

## Sentry (org `policywallet`)

Unresolved issues sorted by first-seen at 14:33Z: the newest group is POLICYWALLET-8 (Hydration Error, first seen 2026-09-05, last seen ~00:30Z on 2026-09-06) — **no group first seen after the deploy** in the first 15 minutes. Server traces are 10 % sampled; a short window is weak evidence, recorded as such.

## Not run

- **Policyholder smoke (8.2, B2C):** no policyholder session exists in the browser profile and the agent does not sign in with credentials (`docs/content/BLOCKED.md` BL-C2).
- **Goal 8.1 (seeded `example.com` accounts):** nothing to remove — Step 0 H16 established they do not exist in production. No production write was made in this series.
