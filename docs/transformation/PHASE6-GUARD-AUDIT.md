# Phase 6 guard audit — probe coverage of the guard-named suite

**PW-MOBILE-TRANSFORM-02, Phase 6 · 2026-08-27 · adversarial review**

The brief arrived with a keyword scan: 43 guard-named files, "only 9 with any
probe signal", 34 listed as having none. The scan was treated as an upper
bound and every file was read. The keyword count was wrong in both directions:
several guards carry probes that never use the words "probe" or "red"
(`no-credentials-in-tracked-files` plants the leaked line inline;
`admin-reads-are-audited` plants the mention-vs-use offender), and one guard
that *looked* covered was green over seven live offenders (below).

**Universe rule.** Enumerated from the filesystem, not from the brief's list:
every `tests/unit/*.test.ts(x)` whose name matches
`(^no-|-no-|guard|honesty|single-source|single-path|-never-|unrenderable|-are-|covers-)`
— **45 files** (the brief counted 43 with a slightly different pattern).
`check-i18n-hardcoded.test.ts` and other behavioural suites that guard
invariants without a guard-shaped name are outside this audit's universe by
that rule; the rule is stated so the boundary is checkable.

## Headline numbers

| | count |
|---|---|
| Guard-named files read | **45 of 45** |
| Red-proven before this audit (committed fixture or in-file planted offender) | **9 full + 1 partial** |
| Red-proven **by** this audit (probe added, red demonstrated, restored green) | **+6** |
| Behavioural guards whose assertions are directly on the protected behaviour (self-proving; no scanner to probe) | **12 pure** + 4 carrying an unproven scanner arm |
| Scanners still without a red-proof — **named in §5** | **13 whole guards** + 5 scanner *arms* of otherwise-proven or behavioural files |
| Guards found passing while what they protect was broken | **2** (§3.1, §3.2) |
| Literally vacuous guards (cannot fail at all) | **0 found** |

## 1. Proven red by this audit (defect reintroduced → guard fails naming the offender → restored green)

Priority order was risk, not coverage: privacy sink, GDPR erasure, money
display, false public claims, false trust claim, public pricing promise.

| guard | probe | red demonstrated by |
|---|---|---|
| `filename-never-persisted` | committed fixture `tests/fixtures/guard-probes/filename-persisted-policy-service.ts.txt` — PolicyService.create() **verbatim as it persisted the user's file name** (the ES6-shorthand shape the first matcher missed), plus runtime shapes for all five sinks (Prisma, activity log, logger, Sentry scope, model provider) | blinding the shorthand matcher → probe fails naming `lib/services/policy.service.ts :: fileName,` |
| `erasure-covers-personal-data` | in-file synthetic schema: plain `userId`, a User `@relation` under an exotic FK name (`custodianUserId` — the hole that made eleven B2B models invisible), and a non-personal control | disabling the relation matcher → both derivation probes fail |
| `no-raw-euro-money-interpolation` | in-file probe quoting UpgradeModal.tsx pre-9a91154c (`€{plusPrice}`), plus the template form | narrowing the matcher → template probe **and** the debt ratchet fail |
| `marketing-mock-honesty` | in-file probe quoting AgentWidgets.tsx pre-15e95fa3 verbatim (all four invented clients, scores, the 47-client book) | reverting the suffix fix → «Νικολαΐδης» probe fails |
| `no-fake-biometric-auth-claim` | in-file probe quoting SignupForm.tsx pre-f1821b50 verbatim (the FaceID hint, motion wrapper and all) + tombstone-comment control | crippling the FaceID predicate → probe fails |
| `cta-reassurance-single-source` | in-file probes: the two-export pre-fix shape, a wrong quoted count, the stale one-policy promise | loosening the export regex → probe fails |

Every probe encodes the **authentic** pre-fix source recovered from git
history, not a paraphrase. Every red demo was run, observed failing with the
offender named, and restored; the final suite run is green.

## 2. Already proven before this audit (the keyword scan under-read these)

| guard | probe form |
|---|---|
| `policy-authorization-single-path` | committed fixtures `mentions-only-route.ts.txt` / `real-call-route.ts.txt`; lexer proven both directions |
| `policy-sentinels-unrenderable` | committed fixtures (synthetic/real person names, sentinel payloads), each self-checked against gutting |
| `policy-status-display-single-source` | 3 committed fixtures incl. the deleted second pipeline verbatim; stale-exemption ratchet |
| `gap-severity-display-single-source` | committed fixtures + in-file synthetic sources for both matchers **and the wiring** |
| `all-clear-honesty` | committed fixtures (`allclear-*.html.txt`); template registry derived from exports; pinned-debt entries asserted still-red |
| `no-dead-internal-links` | in-file probes: routes deleted by V2-P2-03, every extractor syntax form, out-of-scope controls; `KNOWN_DEAD` shrink-only ratchet |
| `admin-reads-are-audited` | in-file mention-vs-use probe; derived scan over every exported admin function; exemption-staleness ratchet |
| `no-credentials-in-tracked-files` | in-file: the leaked line's structure asserted to fire, placeholders asserted not to; universe = `git ls-files` |
| `no-credentials-in-logged-errors` | runtime-assembled credential payload (deliberately not a tracked fixture — see its header for why); **pinned pre-fix scrubber** proven to pass credentials through |
| `no-overpromise-copy` | **partial** — the seconds-claim regex is proven in both directions in-file; the mail/report/translation arms are unprobed pins |

## 3. Guards found passing while what they protect was broken

### 3.1 `no-raw-euro-money-interpolation` — green over seven live offenders

The matcher knew only the JSX shape `€{expr}`. The template-literal shape
`` `€${expr}` `` — the other way a component builds display text — was
invisible, and it is **live in seven files today**, mostly with
English-style `toFixed(2)` formatting:

```
components/account/TokenUsageCard.tsx        €${pkg.priceEur.toFixed(2)}      ← B2C
components/admin/BillingOpsPanel.tsx         €${amt.toFixed(2)} (×2)
components/agent/MedicScorecard.tsx          €${medic.metrics.valueAtRisk}
app/(protected)/admin/ai/page.tsx            €${n.toFixed(4)}
app/(protected)/admin/dashboard/DashboardClient.tsx  €${metrics.subscriptions.mrr.toFixed(2)}
app/(protected)/admin/plans/page.tsx         €${Number(value)}
app/(protected)/agent/pricing/AgentPricingClient.tsx €${priceFor(plan)}
```

What the guard's name claims: no raw euro interpolation anywhere in the UI.
What it actually checked: no raw euro interpolation *written in one of the two
JSX quoting styles*. Seventh-failure-mode shape: **the check could not see the
state being shipped.**

Disposition: matcher widened; the seven pinned as `KNOWN_RAW_EURO_DEBT`, a
shrink-only ratchet in the guard (each row asserted still-red, so a fix must
delete its row) — the offending files are outside this audit's write
boundary and were deliberately not touched. `TokenUsageCard` is the
customer-facing one and should be fixed first.

A note for the record: this audit initially "verified the tree clean" of the
template shape with BSD `grep '€${'` — which silently matched nothing because
`$` mid-pattern behaves as an anchor there. The guard's own run found the
seven. The lesson of `browser-measurement-traps` generalises: a verification
harness is itself a thing to verify.

### 3.2 `marketing-mock-honesty` — the surname matcher missed a real offender

The SURNAME suffix list carried plain-tonos `ίδης` only. «Νικολαΐδης Γ.» —
one of the four invented clients the guard's own docstring records, verified
against the pre-fix source at `15e95fa3~1` — ends in dialytika-tonos `ΐδης`
(U+0390) and **did not match**. Had only that class of name been
reintroduced, the guard stayed green. (Its sibling failure was already on the
record: the first version's `\b` matched nothing after any Greek letter.)
Fixed (`ΐδης|ΐδου` added) and pinned by the probe.

## 4. Hardened in passing

- `erasure-covers-personal-data`: the eraser/exporter sources are now
  comment-stripped before matching — a TODO naming `tx.pushDevice.deleteMany`
  no longer counts as erasure (the same mention-vs-use hole
  `admin-reads-are-audited` closed with a lexer). Verified safe first: no
  delegate in either service lives only in a comment, so current results are
  byte-identical.

## 5. Not reached — scanners still without a red-proof, by name

A silent gap reads as coverage; these are the files (and arms) this audit read
and classified but did **not** probe. None was found vacuous; all can fail in
principle. Weaknesses found by reading are noted — unverified by execution.

| guard | universe | noted weaknesses (from reading, not execution) |
|---|---|---|
| `no-raw-lob-in-ui` | glob app+components | attribute-vs-text heuristic is single-line only |
| `no-raw-lob-in-email` | glob lib/email + 1 named file | — |
| `no-raw-lob-in-notifications` | glob actions/routes/services | single-line `message:`/`title:` shapes only |
| `no-raw-lob-branch-match` | glob app/components/lib-services | — |
| `no-english-task-in-greek-copy` | 4 walked roots | `el:` matcher requires **double quotes**; `el: 'Δημιουργία Task'` is invisible |
| `no-hardcoded-aria-label` | glob **components/ only** | `app/**/*.tsx` aria-labels unguarded; line-based, multi-line braced labels unseen |
| `no-scaffold-routes` | existsSync + globs | only-throw regex misses `export async function GET(request…)` handlers |
| `no-server-modules-in-client-bundle` | walked import graph, tripwired | graph walker itself unprobed (a resolver bug fails silent-green; the >50-client-modules tripwire catches only total breakage) |
| `ledger-covers-every-surface` | routes from fs + proxy classifier | `isEnumerated` matcher unprobed |
| `landing-primary-cta-single-source` | **non-recursive** readdir of components/landing | complete today (no subdirs exist); silently loses coverage the day one appears |
| `primary-action-single-source` | globs of public surfaces | retired-literal list is closed-world by nature |
| `protection-score-single-source` (scanner arm) | globs lib/app/components | deduction-ladder regex unprobed (behavioural arm is solid) |
| `i18n-no-hardcoded-full-tree` | delegates to `scripts/check-i18n-hardcoded.js --all` over `git ls-files` | the checker itself ships no probe; a regression in its heuristics is invisible to this test |
| `agent-policy-no-fake-coverage-highlights` | 1 hardcoded file | keyed to the exact old translation keys; the same filler under new keys passes |
| `file-format-single-source` (scanner arm) | globs | hand-list matcher knows two literal shapes; `['jpg','png'].includes(ext)` evades |
| scanner arms of `server-dates-are-athens-pinned`, `identity-values-are-not-guessed`, `no-overpromise-copy` (mail/report arms) | globs | each file's behavioural/premise arms are proven; the tree-scan regexes are not |

## 6. Behavioural guards — no scanner to probe

These assert directly on the protected behaviour with planted adverse inputs,
so the "probe" is the assertion itself; a regression in the subject turns them
red by construction: `ai-guard`, `no-mock-ai-in-production`,
`email-content-honesty`, `premium-currency-honesty`,
`premium-footprint-honesty`, `protection-score-honesty`,
`protection-monitor-honesty`, `share-permission-honesty`,
`life-change-discovery-no-js`, `empty-state-honesty`, `paywall-copy-honesty`,
`compliance-copy-single-source`, and the behavioural arms of
`file-format-single-source`, `server-dates-are-athens-pinned`,
`identity-values-are-not-guessed`.

Two of these earn a caveat: `compliance-copy-single-source` and
`agent-policy-no-fake-coverage-highlights` pin one file each by name — their
universes are as hardcoded as a universe gets, which is tolerable only because
the invariant is itself about one named surface.

## 7. Full classification table

Verdicts: **proven** (red-proof in repo) · **proven·new** (this audit) ·
**behavioural** (self-proving assertions) · **unproven scanner** (reads the
tree, no red-proof) · U-src: fs = enumerated from filesystem/schema/git,
named = hardcoded file list, n/a = no universe (pure behaviour).

| # | guard | probe in repo | U-src | verdict |
|---|---|---|---|---|
| 1 | admin-reads-are-audited | yes (in-file) | fs (derived fns) + named | proven |
| 2 | agent-policy-no-fake-coverage-highlights | no | named (1 file) | unproven scanner |
| 3 | ai-guard | assertions | n/a | behavioural |
| 4 | all-clear-honesty | yes (fixtures+registry) | fs (exports) | proven |
| 5 | compliance-copy-single-source | no | named | behavioural (copy pins) |
| 6 | cta-reassurance-single-source | **yes (new)** | fs | proven·new |
| 7 | email-content-honesty | assertions | fs (templates glob) | behavioural |
| 8 | empty-state-honesty | no | named (translations) | behavioural (copy pins) |
| 9 | erasure-covers-personal-data | **yes (new)** | schema | proven·new |
| 10 | file-format-single-source | assertions | fs + named | behavioural + unproven arm |
| 11 | filename-never-persisted | **yes (new, fixture)** | fs (repo-wide) | proven·new |
| 12 | gap-severity-display-single-source | yes (fixtures+in-file) | fs walk | proven |
| 13 | i18n-no-hardcoded-full-tree | no | fs (via script) | unproven (delegated) |
| 14 | identity-values-are-not-guessed | premise proven | fs | behavioural + unproven arm |
| 15 | landing-primary-cta-single-source | no | fs (non-recursive) | unproven scanner |
| 16 | ledger-covers-every-surface | no | fs + proxy | unproven scanner |
| 17 | life-change-discovery-no-js | assertions | n/a | behavioural |
| 18 | marketing-mock-honesty | **yes (new)** | named (3) + globs | proven·new |
| 19 | no-credentials-in-logged-errors | yes (in-file, runtime-assembled) | named sinks | proven |
| 20 | no-credentials-in-tracked-files | yes (in-file) | git ls-files | proven |
| 21 | no-dead-internal-links | yes (in-file) | fs | proven |
| 22 | no-english-task-in-greek-copy | no | fs (4 roots) | unproven scanner |
| 23 | no-fake-biometric-auth-claim | **yes (new)** | named (2) + globs | proven·new |
| 24 | no-hardcoded-aria-label | no | fs (components only) | unproven scanner |
| 25 | no-mock-ai-in-production | assertions | n/a | behavioural |
| 26 | no-overpromise-copy | partial (in-file) | fs walk + named | proven (1 arm) / unproven (3 arms) |
| 27 | no-raw-euro-money-interpolation | **yes (new)** | fs | proven·new — see §3.1 |
| 28 | no-raw-lob-branch-match | no | fs | unproven scanner |
| 29 | no-raw-lob-in-email | no | fs + named | unproven scanner |
| 30 | no-raw-lob-in-notifications | no | fs | unproven scanner |
| 31 | no-raw-lob-in-ui | no | fs | unproven scanner |
| 32 | no-scaffold-routes | no | fs | unproven scanner |
| 33 | no-server-modules-in-client-bundle | no (tripwires only) | fs graph | unproven scanner |
| 34 | paywall-copy-honesty | premise pin | named | behavioural (copy pins) |
| 35 | policy-authorization-single-path | yes (fixtures) | fs | proven |
| 36 | policy-sentinels-unrenderable | yes (fixtures, self-checked) | fs + DOM | proven |
| 37 | policy-status-display-single-source | yes (fixtures) | fs | proven |
| 38 | premium-currency-honesty | assertions | named pins | behavioural |
| 39 | premium-footprint-honesty | assertions | n/a | behavioural |
| 40 | primary-action-single-source | no | fs | unproven scanner |
| 41 | protection-monitor-honesty | assertions | named pin | behavioural |
| 42 | protection-score-honesty | assertions | n/a | behavioural |
| 43 | protection-score-single-source | assertions | fs | behavioural + unproven arm |
| 44 | server-dates-are-athens-pinned | premise proven | fs | behavioural + unproven arm |
| 45 | share-permission-honesty | assertions | named pins | behavioural |

## 8. What this audit changed, file by file

- `tests/unit/marketing-mock-honesty.test.ts` — SURNAME learns ΐδης/ΐδου; matchers hoisted; pre-fix probe block.
- `tests/unit/no-fake-biometric-auth-claim.test.ts` — matcher extracted (`biometricClaimOffenders`); pre-fix probe block.
- `tests/unit/no-raw-euro-money-interpolation.test.ts` — matcher extracted and widened to `€${…}`; `KNOWN_RAW_EURO_DEBT` shrink-only ratchet over the 7 live offenders; pre-fix probe block.
- `tests/unit/filename-never-persisted.test.ts` — five sink matchers extracted; probe block over the committed fixture + runtime shapes.
- `tests/unit/erasure-covers-personal-data.test.ts` — schema derivation parameterised; `unhandledAfterErasure` extracted; eraser/exporter comment-stripped; synthetic-schema probe block.
- `tests/unit/cta-reassurance-single-source.test.ts` — three matchers hoisted; pre-fix probe block.
- `tests/fixtures/guard-probes/filename-persisted-policy-service.ts.txt` — new committed probe fixture (authentic pre-1057ab7d PolicyService shape).

No file outside `tests/unit/`, `tests/fixtures/guard-probes/` and this
document was written. Nothing was committed.
