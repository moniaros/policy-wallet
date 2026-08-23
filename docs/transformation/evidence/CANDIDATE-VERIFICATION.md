# Candidate-defect verification against HEAD (T-014, in progress)

Every candidate named in the run contract is re-verified against the current tree before any fix
is queued. §5.4 requires refuting honestly in both directions, and D-004 establishes that at least
the dashboard evidence in the contract predates `dd815b3d`.

Verdicts: **CONFIRMED** · **REFUTED** · **DIFFERENT** (real, but not for the stated reason — the
fix location changes) · **PENDING** (needs the Phase 0 surface list or a fixture capture).

Method note: these are **code-confirmed** verdicts from reading the tree. Each still needs a
fixture capture to close, per §5.4. Nothing here is a fixture reproduction yet.

---

## §2.2 — Protection score

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 1 | Score sent by email as a percentage | **CONFIRMED** | `lib/email/templates/weekly-digest.ts:118-126` renders `${data.healthScore}%` under «Βαθμολογία προστασίας»; `engagement-drip.ts:115-118` does the same. |
| 2 | Score-change notification event exists | **CONFIRMED, and broader than stated** | `lib/notifications/templates.ts:57` — `protection_score_changed: ["previousScore", "currentScore", "scoreDelta"]`. An entire event *type* is built on the score, not merely a template that mentions it. Emitted from `lib/notifications/risk-events.ts:191` (`dedupeKey: score:v<n>`). |
| 3 | Score marketed in outbound copy | **CONFIRMED** | `lib/email/templates/churn-prevention.ts:91` — «🎯 Σκορ υγείας κάλυψης σε πραγματικό χρόνο». A retention email advertising the score as a feature. |
| 4 | Verdict label «Καλή κάλυψη» rendered on the dashboard | **REFUTED — already fixed** | `PolicyholderHome.tsx:328` documents its removal; the honest replacement is a factual composition (`factTotalOne`, `factExpiredMany`, …) at `el.ts:1825-1834`, plus explicit "why no number" copy at `el.ts:1836-1837`. |
| 5 | The verdict STRINGS are gone | **CONFIRMED — they are not** | `el.ts:1859-1861` still define `scoreGood: 'Καλή κάλυψη'`, `scoreNeedsImprovement`, `scoreNeedsAttention`. Zero references anywhere in `app/`, `components/` or `lib/`. Dead keys, but they are §2.2-prohibited copy sitting in the bundle: the next component to reach for `t.…scoreGood` reintroduces the violation with no code review flagging it. **Delete the keys**, and let the string-inventory freeze hold the line. |

## §2.4 — Internal tokens, fixture identifiers, untranslated strings

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 6 | «Καλώς ήρθατε πίσω, **E2E**!» in the wallet greeting | **DIFFERENT — fix location changes** | The string itself is clean: `el.ts:180` is `welcomeBack: 'Καλώς ήρθατε πίσω'`. `E2E` is the **user's display name** interpolated into it. So this is not a copy defect and no i18n change fixes it; it is an unfiltered identity value reaching the UI, which is the same class as `__PENDING_EXTRACTION__` and belongs with the identity-scrubbing work, not the string sweep. |
| 7 | English notification bodies in a Greek product | **DIFFERENT — partially fixed, and the patch is the defect** | The English prose is real: `lib/events/catalog.ts:167` "AI extraction read the policy successfully", `lib/notifications/registry.ts:390` "AI extraction finished and the policy is readable" — internal documentation text stored in customer-visible columns. `app/(protected)/activity/actions.ts:131-146` already intercepts it, but **only for `policy_analyzed`, by name**, falling back to `{ en: n.title, el: n.title }` — the raw stored text — for every other event type. This is the "guard scoped to known locations" pattern: correct for one event type, silently wrong for the next one added. The fix must derive from the registry rather than a two-entry hand-written map, and must be applied at composition time so nothing English is ever *stored* in a customer-facing column. Whether the **Ειδοποιήσεις** surface has any equivalent interception at all is **PENDING** T-010. |
| 8 | `in_app` channel chip rendered to customers | **PENDING** | No `in_app` literal found in `components/notifications/` or `app/(protected)/notifications/`. Either already removed or the rendering lives elsewhere. Needs T-010's surface enumeration to close. |

## §7.4 — Invented metrics

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 9 | «ΑΣΦΑΛΙΣΤΙΚΟ ΑΠΟΤΥΠΩΜΑ» meaning total annual premium | **REFUTED — already renamed** | No occurrence of `ΑΠΟΤΥΠΩΜΑ` in the `el` bundle. The label is now `totalAnnualPremium: 'Συνολικό ετήσιο ασφάλιστρο'` (`el.ts:1863`) — the plain thing, which is what §7.4 asks for. |

---

## Running tally

- CONFIRMED 13 · REFUTED 8 · DIFFERENT 5 · PENDING 3 — 26 candidates verified
- Of the brief's own candidates, **7 are refuted or reclassified** — a third of everything checked
- Guard failure modes found: **universe** too small (D-005, D-009), **adoption** incomplete (D-007), **assertion** weaker than the invariant (#17)
- **Score-in-outbound sites: 5** (brief said 1; I found 4 by grep; the emitter made 5)

Two of the four refutations/reclassifications would have produced wasted or wrong work if the
contract had been taken at face value: #6 would have been "fixed" in the i18n bundle where the
defect is not, and #9 would have renamed a label that already says the right thing.

## §2.7 — One event, one row

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 10 | Every notification renders twice, once per channel | **CONFIRMED — and it is deliberate, which changes the fix** | `app/(protected)/notifications/page.tsx` renders from `getNotificationData()`, whose query is `app/(protected)/notifications/actions.ts:22` — `findMany({ where: { userId, channel: { not: 'analytics' } } })`. One emission writes one row **per channel** (`orchestrator.ts:354`), so an event delivered to in-app and email returns two rows with identical title, body and timestamp, and `page.tsx:29` passes `channel` straight to the client for rendering. |

The important part is the comment sitting directly above that query:

> *Email and push rows are kept — this is the delivery history, and "we emailed you about this" is
> exactly what it should show.*

So this is **not an oversight**. Someone decided this surface is a delivery log. §2.7 decides the
opposite — "notification lists render events, not delivery records; delivery channel is not
customer-facing information" — and an invariant outranks a local design decision.

That makes this a **reversal, not a repair**, and it has to be handled as one:
- the comment must be rewritten in the same change, or the next reader restores the old behaviour
  on the same reasoning and the defect returns with a rationale attached;
- a separate query at `actions.ts:140-144` already filters `channel: "in_app"` for a different
  consumer, so the two consumers of this table disagree about what a notification *is*. Whichever
  survives, both must end up on one definition;
- grouping uses the base `dedupeKey` per D-002, with rows carrying no `dedupeKey` rendered
  ungrouped rather than merged on a guess.


## §2.5 / §8.3 — Greek length, truncation, and the two global CSS rules

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 11 | `:where(.grid, .flex) > * { min-width: 0 }` ≤430px strips the min-content floor from every flex/grid child | **DIFFERENT — already remediated at the rule level** | `app/globals.css:385`. It is deliberately wrapped in `:where()` for **zero specificity**, with the reason recorded inline: written as a plain selector it beat legitimate `min-w-*` utilities and silently clamped the language toggle's pointer target from 24px back to 21px. `.pw-scroll-strip` (`globals.css:514-530`) then outranks it on purpose — `flex: 0 0 auto; min-width: max-content; white-space: nowrap` — which is the primitive `CLAUDE.md` documents for strips meant to scroll. The blast radius §8.3 asks for is largely already reasoned about and written down. |
| 12 | Global `overflow-wrap: anywhere` on headings breaks brand names mid-word | **CONFIRMED — one caller fixed, the rule still global** | `globals.css:360-370` applies `overflow-wrap: anywhere` to `h1,h2,h3,h4,p,li,dt,dd,figcaption,blockquote`. Exactly one caller has been given a targeted fix: `.pw-kicker` (`globals.css:770-781`) now uses `overflow-wrap: break-word; hyphens: none`. Every other heading and paragraph can still break a brand name mid-word, and §2.5 prohibits that outright. |

The `.pw-kicker` comment cites «ΑΣΦΑΛΙΣΤΙΚ / Ο ΑΠΟΤΥΠΩΜΑ» as its motivating example — the same
invented metric verified as removed in #9 — so that comment is now historical and should say so.

**Fix shape for #12, and it is not "add `break-word` to more selectors".** `anywhere` and
`break-word` differ only in whether an unbreakable word may overflow its line box; neither
protects a brand name specifically, because CSS cannot tell «Interamerican» from a long Greek
compound. The rule to fix is the *default*: prose keeps a breaking rule, and anything that renders
an **identity** — insurer, advisor, product name — goes through a primitive that does not break at
all, matching the §8.1 `policy-identity` component. That is a Phase 3 primitive, so #12's real fix
is `blocked_by` the design system rather than a globals.css edit.


## §2.1 — Severity framing, and where the score notification is actually born

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 13 | «Η προστασία σας μειώθηκε — Το σκορ προστασίας σας πήγε από 83% σε 74%» | **CONFIRMED at source — this is a FIFTH outbound site** | `lib/notifications/risk-events.ts:176-190` emits `protection_score_changed` with title «Η προστασία σας βελτιώθηκε / μειώθηκε» and body ``Το σκορ προστασίας σας πήγε από ${previousScore}% σε ${overallScore}%``. This is the **emitter**; `templates.ts:57` merely declares its vars. The count of score-in-outbound sites is therefore 5, not 4. |
| 14 | Gap notifications carry a severity in the title | **REFUTED** | The `GAP_DETECTED` emission (`risk-events.ts:100-127`) titles «Εντοπίσαμε {n} κενά κάλυψης» and bodies the gap NAMES joined by `·`, with an "and N more" overflow. No severity word, no priority chip, no colour. It names findings and counts them, which is what §2.1 asks for. |
| 15 | `NotificationPriority` = "critical"/"high" is a severity leak | **REFUTED — different concept, same vocabulary** | `lib/notifications/registry.ts:56` types a **delivery** priority that ranks dispatch and interacts with quiet hours. It is never rendered. Confusing it with `GapDefinition` severity would have produced a large, wrong migration across ~15 registry entries. |

### The score notification cannot be tuned into compliance

`risk-events.ts` gates this emission carefully — only past a materiality threshold, and never
against an indeterminate previous score, with a comment explaining that a delta against a number
the customer never saw describes a movement that never happened. That reasoning is sound and it is
the reason the defect looks defensible from inside the file.

It does not survive §2.2, which is absolute: the score "never enters email, push, or any outbound
channel." So the whole emission is **removed**, not thresholded. The materiality logic is worth
preserving only if H-001 decides the score survives at all and some *in-product* surface wants it.

### Consequence for the severity guard

`tests/unit/gap-severity-display-single-source.test.ts` is a genuinely strong guard — it ships its
own failure demonstration ("the matcher fires on a hand-rolled map, and not on a compliant
surface"), caps the debt list at 9 so it can only shrink, and separately requires
`<SeverityCaveat />` wherever a severity word reaches a reader.

Its universe is a `CAVEAT_REQUIRED` list of `components/` and `app/` paths. Per D-005 that is the
question to ask of every guard — but here the answer is **benign**: #14 and #15 establish that no
gap severity reaches an outbound template at all, so there is nothing in `lib/` for it to miss
today. The universe should still be widened when the guard is next touched, because "nothing
reaches outbound today" is a fact about the current code, not an invariant anything enforces.


## §2.6 — Count consistency

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 16 | Wallet stat tiles contradict the dashboard's; "23 − 5 − 5 − 2 = 11, not 13" | **DIFFERENT — the in-surface labelling is already solved; the cross-surface risk is not** | `components/wallet/StatusSummary.tsx` is careful work. Every prop documents exactly what it counts (`attentionCount` = "action_needed + unknown_duration + expired"), the active tile renders its own denominator as a hint (`${activeCount}/${totalPolicies}`), and **three separate exclusion notes** are surfaced to the customer — premium excludes unreadable end dates, other currencies, and policies with no amount recorded, each said out loud rather than silently dropped. |

The brief's arithmetic (`23 − 5 − 5 − 2 = 11, not 13`) appears to subtract **overlapping**
categories: `attentionCount` already contains `expired`, so subtracting both double-counts. That
is the §2.6 case the contract itself anticipates — "where two figures are both correct but count
different things, the defect is the labelling, not the arithmetic" — and this component has
already done the labelling.

**What is NOT solved, and is the real §2.6 exposure:** these counts are computed in
`StatusSummary`'s callers, and the dashboard computes its own separately. Nothing ties the two
together, and with `data-count` appearing three times in the entire product there is no way to
measure whether they agree. The cross-surface comparison is the defect; the in-surface labelling
is not. That makes instrumentation (P1-05 → `INSTRUMENTATION-PLAN.md`) the prerequisite for
proving or disproving this, not a wallet code change.

**Still PENDING a fixture capture.** Everything above is code-confirmed. Whether the rendered
numbers agree across surfaces on one portfolio is exactly the question a capture answers and
reading cannot.


## §2.2 again — the score renders in TWO sanctioned in-product locations, and a guard blesses it

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 17 | "at most one sanctioned in-product location" | **CONFIRMED VIOLATION — and it is *authorised* by the guard** | `tests/unit/score-containment.test.ts` defines `SANCTIONED` as **two** files: `components/dashboard/home/ProtectionStatusHero.tsx` and `components/coverage/ProtectionScoreCard.tsx`. Both render the value — the hero across four honest states behind a disclosure, the card as the "dedicated score surface" with a freshness stamp and methodology. §2.2 says **at most one**. |

This is a **different failure mode from D-005** and worth separating, because the fix is different.

- D-005 was a **universe** gap: the guard's assertion was right, but it walked the wrong directory.
- This is an **assertion** gap: the universe is correct and the guard runs, but what it asserts —
  "the score renders only in files on this list" — is weaker than the invariant, because the list
  has two entries and the invariant permits one.

Neither is a bug in the guard's code. A guard can be well written, run on every commit, enumerate
its universe from the filesystem, and still authorise the thing it is named after. So the Phase 1
review of every §11.2 guard asks **two** questions, not one: *what does it walk*, and *what does it
actually claim*.

Note the sanctioning was deliberate — the comment calls `ProtectionScoreCard` "the dedicated score
surface" — so this is a decision made before this run's invariant existed, not an oversight. It is
therefore a **reversal** like §2.7's, and the comment must be rewritten with the code.

**Secondary finding in the same file:** `ProtectionScoreCard` computes a `scoreColor` from the
value, so the colour is a verdict. Its own source comment says "A 0–100 figure with a colour
verdict and no stated method is exactly…" — the method is now stated, but the colour verdict
remains, and §2.1 requires colour never be the sole carrier of meaning (WCAG 1.4.1). Whatever
H-001 decides, the colour needs a text equivalent or must go.


## §4.3 app shell — two brief-listed defects refuted, two new ones found

Full audit in [`CHROME-AUDIT.md`](./CHROME-AUDIT.md): 18 CONFIRMED, 4 NEEDS CAPTURE. The three
load-bearing verdicts were re-verified independently against the source.

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 18 | Floating «Ν» avatar clipped at the left edge, overlapping content on dashboard, notifications, settings and adviser — "shell chrome overlapping content on every screen, not a per-page bug" | **REFUTED** | The shell's only initials avatar (`UserMenu.tsx:99-101`) is mounted inside `className="hidden lg:block"` at `AppShell.tsx:347`. Below 1024px it is `display:none` — **it has no box in the DOM at 320/390/430**, so it cannot clip or overlap there. |
| 19 | Bottom bar occludes content | **REFUTED — genuinely reserved, not a capture artifact talked away** | `app/globals.css:490` sets `--pw-bottom-nav-h: 5rem`; `:493` sets `.pw-bottom-nav-reserve { padding-bottom: calc(var(--pw-bottom-nav-h) + env(safe-area-inset-bottom, 0px)) }`. The bar's own footprint uses the identical safe-area term, so reservation ≥ bar height. |
| 20 | `AI Insights` in English in the tab bar | **REFUTED** | `t.nav.insightsShort` = «Αναλύσεις», `t.nav.agentShort` = «Σύμβουλος» (`el.ts:99,93`). The whole bottom bar is Greek in both roles. |

**Why #18 matters beyond one bug.** The brief presents it as proof that shell chrome overlaps
content on *every* screen. It reproduces on four screens because it is not app chrome at all: the
dashboard baseline (`docs/evidence/dashboard-mobile/BASELINE.md:106-111`) already recorded it as
DOES NOT REPRODUCE, and commit `fbe845ed` identified a **Next.js DevTools badge** — a dev-only
circular overlay — as the thing being seen. A dev overlay appears identically on every screen,
which is exactly the evidence that made it look like a shell-wide defect. §5.1's settle procedure
hides `nextjs-portal` for precisely this reason.

### Two defects the brief does not contain, both provable from source

| # | Finding | Evidence |
|---|---|---|
| 21 | **`InstallPrompt` paints over the bottom nav on any notched device** | `components/pwa/InstallPrompt.tsx:128` is `fixed bottom-24 … z-40`, and the file contains **zero** occurrences of `safe-area-inset-bottom` (verified by count). `bottom-24` is 96px; the nav occupies `5rem + env(safe-area-inset-bottom)` ≈ 114px on a notched phone. Same `z-40`, later in DOM, so it wins. Overlap ≈18px. |
| 22 | **The drawer scrim does not cover the bottom nav, so a declared modal has live controls behind it** | The scrim (`AppShell.tsx:360`) is DOM-ordered *before* the bottom nav (`:381`) at the same `z-40`. The tab bar therefore stays undimmed **and clickable** while the drawer is open with `role="dialog" aria-modal`. Asymmetric with the header, which is correctly dimmed. |

#22 is the more serious: `aria-modal` tells assistive technology nothing outside the dialog is
reachable, while five tab targets remain operable. That is a correctness defect, not a polish one.

### Tap targets — the failures are all in one place

7 of 12 audited shell controls are under 44×44, and **every one is in the mobile drawer footer or
`InstallPrompt`** — drawer close ≈36×36, logo link ≈40 tall, logout ≈40 tall, `LocaleToggle`
"group" variant ≈30×40 (its sibling "plain" variant already got `min-h-11`; this one was missed),
`ThemeToggle` ≈36×36, `InstallPrompt` dismiss ≈16×16 with no padding at all. The always-visible
chrome — header controls and all five tab targets — is uniformly compliant. So this is one
neglected region, not a systemic shell failure, and the `LocaleToggle` case is another
partial-adoption instance in the D-007 family.


## §4.4.6 settings subtree — "never audited". Audited.

| # | Candidate | Verdict | Evidence |
|---|---|---|---|
| 23 | Privacy & data claims export and deletion workflows "whose executors were unconfirmed" | **REFUTED — both executors are real** | Export: `PrivacySection.tsx:54` calls `POST /api/v1/me/data-export`; the route exists, is `withApiGuard`-wrapped with a rate-limit key, finalises an export and returns a tokenised `download_url` (`route.ts:8,14,61`). Deletion: `deleteAccount()` from `account/actions`, and the UI is honest about what it does — `PrivacySection.tsx:76` comments "Nothing is deleted yet — the request enters a review queue", which is what §2.3 asks of any claim. |
| 24 | Notification preferences can honour the §9 cadence controls | **CONFIRMED GAP — three of four controls missing** | Present: per-group toggles (`NotificationsSection.tsx:57-66`) and quiet hours (`:113-115`). |

### What §9.5 requires versus what exists

§9.5: *"at most one perk or obligation prompt per session; a small monthly ceiling,
user-configurable, with a global off switch honoured everywhere including outbound."*

| control | state |
|---|---|
| quiet hours | **exists** (`QuietHours`) |
| per-group opt-out | **exists**, but see below |
| user-configurable monthly ceiling | **absent** — no frequency or cap control anywhere on the screen |
| global off switch | **absent** — only per-group toggles |

And the per-group toggle is narrower than it appears: `NotificationsSection.tsx:44` reads
preferences with `if (pref.channel === "email")` and `:66` writes with
`toggleNotificationPreference(eventType, "email", next)`. **The screen controls email only.** Push
preferences cannot be set from it at all, while `push` is an implemented channel
(`lib/notifications/channels/index.ts:121` lists `["in_app", "email", "push"]`).

So a customer who turns a group "off" here has turned off email and left push on, with nothing on
screen saying so. That is both a §9.5 readiness gap and, today, a control that does less than its
label implies.

**Consequence:** Phase 4 cannot ship any cadence-controlled mechanic until this screen can express
a ceiling and a global off across every channel. Recorded as a Phase 4 precondition rather than a
Phase 1 defect — except the email-only scoping, which is a mislabelled control now and belongs in
Phase 1.


## §4.4.4 — two B2C surfaces describe the same policy's status with different words

| # | Finding | Verdict | Evidence |
|---|---|---|---|
| 25 | Σύμβουλος and Πορτοφόλι use different status pipelines | **CONFIRMED — a vocabulary divergence, not a clock bug** | `/agent` uses `mapPolicyCardStatus` (`lib/wallet/map-policy-card-status.ts`); the wallet and every card/table/pill use `getPolicyStatusView`. |

The clock half of this was already fixed and fixed well: `mapPolicyCardStatus` existed as two
byte-identical copies computing days by dividing milliseconds, so between 21:00 UTC and Athens
midnight a policy still in force resolved to −1 and rendered "action needed" while the wallet
called it active. It now calls `calendarDaysUntil`, the same Athens-calendar helper everything else
uses. That is not the problem.

The problem is the **vocabulary**. `mapPolicyCardStatus` returns
`'active' | 'expiring_soon' | 'incomplete' | 'action_needed'` — **there is no `expired`.** A lapsed
policy collapses into `action_needed`. `getPolicyStatusView` has a distinct `expired` state, which
`PolicyWallet.tsx` renders as «Έληξε».

So one policy, on one day, reads «Χρειάζεται προσοχή» on Σύμβουλος and «Έληξε» on Πορτοφόλι. Both
are defensible in isolation; together they violate §4.4.4 — "identical facts render identically…
status uses the same primitive on every surface" — and they blur the single most important
distinction on the surface: *this cover has ended* versus *this needs a look*.

**Fix shape:** `/agent` adopts `getPolicyStatusView`, and `mapPolicyCardStatus` is deleted rather
than extended. Adding `expired` to the second vocabulary would leave two pipelines that agree
today and drift again — which is the history this very file records.

**Doc debt:** its comment says it serves "the `/agent` and `/account` summaries"; only `/agent`
uses it now.


## §6.1.8 — the string freeze, as specified, would miss 85 files

| # | Finding | Verdict | Evidence |
|---|---|---|---|
| 26 | "Freeze the inventory so a newly composed string cannot ship unreviewed" | **CONFIRMED GAP — found before the freeze was built, which is the point of Phase 0** | The inventory covers `lib/i18n/translations/` (2,733 keys). **85 files under `app/` and `components/` carry inline `{ el: '…', en: '…' }` copy objects that never enter it.** Top B2C offender: `app/(protected)/agent/AgentClient.tsx` with **56** such pairs — a bottom-tab-bar surface. Others: `CustomerProfileClient.tsx` 22, `QuestionnairesClient.tsx` 15, `upgrade/success/page.tsx` 12, `InsightsClient.tsx` 11. |

This is the D-005 shape applied to a *process* rather than a guard: the freeze would be
exhaustive within too small a universe, and would therefore certify "no new unreviewed Greek
shipped" while a component grew 56 new strings.

Note these are not lint violations. `lint:i18n-changed` targets hardcoded literals and
`el ? '…' : '…'` ternaries; a well-formed `{ el, en }` object is the *approved* escape and the check
passes. So nothing currently flags them, and nothing would.

**Two options for Phase 1, and the second is the honest one:**

- Migrate all 85 files into the bundle first, then freeze. Large, touches out-of-scope surfaces
  (`app/(public)/**` is explicitly out of scope in §12.4), and would balloon Phase 1.
- **Freeze the union.** The inventory and its guard take their universe from *both* the bundle and
  every inline `{ el, en }` pair found by walking `app/` + `components/`. Reviewing a string does not
  require it to live in the bundle; it requires it to be *enumerable*. Migration then becomes
  ordinary tidying rather than a precondition.

Recommend the second. It also means the freeze guard states its universe explicitly, per D-005 —
which is now the third time that rule has changed a design decision in this run.


---

## Root cause of §2.2: two guards, and the seam between them

The obvious question about the score-in-email defect is how it survived, because this repo
already has `tests/unit/score-containment.test.ts` — a guard that enumerates its universe from
the filesystem exactly as `CLAUDE.md` requires, and is well written.

It survived because **two good guards leave a gap that neither owns.**

| guard | universe it scans | invariant it asserts |
|---|---|---|
| `score-containment.test.ts` | `components/` + `app/`, minus `admin`/`agent` | the score VALUE renders only in sanctioned files, and never in a feed title |
| `email-content-honesty.test.ts` | `lib/email/templates/*.ts` | the digest does not claim a score TREND it never computed (`healthScoreChange`, «Σταθερό») |

`score-containment` never looks at `lib/` — confirmed, the string does not appear in the file — and
every outbound template lives in `lib/email/templates/` and `lib/notifications/`. So it is
structurally incapable of seeing the leak.

`email-content-honesty` does scan the templates, but it guards the *trend*, not the *value*. It
deliberately permits `healthScore` to render; its whole subject is that a **change** may not be
claimed.

§2.2 says the score "never enters email, push, or any outbound channel". **No test asserts that
sentence.** The value in email falls precisely between the two universes — one guard has the right
invariant and the wrong universe, the other has the right universe and a narrower invariant.

### What this dictates for Phase 1

§11.1 forbids writing a second guard for a defect class that already has one. So the fix is to
**extend `score-containment.test.ts`'s universe to include `lib/`**, treating outbound templates as
**forbidden** rather than as candidates for the sanctioned list — the sanctioned list is for
in-product surfaces carrying the qualifier, and no outbound message can carry a disclosure the
reader can open.

This also generalises, and the generalisation is worth more than the fix: **a guard's universe is
as much a part of it as its assertion.** Both of these guards would pass forever while the
invariant they exist to protect is violated in a directory neither was pointed at. Every guard in
§11.2 gets its universe stated explicitly and justified against `SURFACES.md`, not inherited from
whichever surface it was written for.
