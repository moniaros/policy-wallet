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

- CONFIRMED 7 · REFUTED 4 · DIFFERENT 4 · PENDING 2 — 15 of the brief's candidates verified
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
