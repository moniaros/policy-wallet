# H7 — Detecting overlap between two policies (group health vs individual health)

**To:** whoever decides what the gap engine is allowed to assert.
**From:** Product-Truth, GROWTH-HOOKS-01 Track D (GD-02). Written 2026-08-26.
**Status:** proposal. No code written. `lib/gap-detection.ts` untouched (sha256 `69d2c946…1259b859`).

## The question

Hook H7 wants the product to tell someone that their employer group health plan and their
individual health policy overlap. Should the engine detect that?

**Recommendation: no.** Not because it is hard, but because **this exact case was deliberately
removed from a rule that already exists**, for a reason that has not changed. What should
happen instead is three specific things, listed at the end — two of which are corrections to
claims we are already making.

## The fact that decides it

A cross-policy overlap rule already runs in production:
`duplicateCoverageRules()` in `lib/services/gap-engine/portfolio-rules.ts:281`.

It groups active policies by `branchFamilyId | insuredSubject`, where
`insuredSubject()` (`:212`) returns a **plate** for motor, an **address** for home, and
**`null` for everything else** — so health can never form a group. That is not an oversight.
The function's own comment (`:260-280`) says why, and it is worth reading verbatim before
deciding anything:

> This used to group by line of business alone and call any two overlapping policies in a line
> "possible duplicate coverage" … Two motor policies are normally two cars. Two home policies
> are normally two properties … **Two health policies are often two family members, or a group
> scheme plus a private top-up, which are complementary by design.**
>
> So the rule told a two-car household it was paying twice and suggested dropping one, which
> would leave a vehicle uninsured — third-party liability being compulsory, that is the most
> damaging thing this engine could suggest. **The asymmetry is the point: missing a real
> duplicate costs someone a premium, while inventing one can cost them their cover.**

H7 asks to re-add the one case that comment names as complementary by design.

The asymmetry is *worse* on this pair than on the motor pair that caused the original defect.
The action a false health-overlap finding invites is "drop the individual policy". Per the
product's own group-health content (`lib/insurance/content/group-health.ts:36-40`): cover
normally stops when employment ends, and *"if you lean solely on the group plan and seek an
individual one later, your insurability will be assessed then — at the age and health history
you will have at that moment, not today's."* A wrongly-dropped motor policy can be re-bought
tomorrow at the same price. A wrongly-dropped individual health policy may not be re-buyable
at all. **This is the single most irreversible action the product could induce.**

## Where a cross-policy check sits relative to `decideGapsForPolicy`

Nowhere, and that is correct.

`decideGapsForPolicy(policy, acordData)` takes **one** policy. `evaluateGapLogic(policy,
gapDef)` takes one `Policy` row. `getNestedField` walks one `acordData`. There is no seam for a
second policy, and creating one changes the signature of a frozen engine to serve a check that
is not a property of any single document.

The existing answer is already the right architecture: a **pure function over
`PortfolioPolicyFacts[]`**, outside the engine, no DB access, fully testable
(`portfolio-rules.ts:1-13`). Nothing about H7 argues for changing that. If cross-policy work
ever expands, it expands there.

Note the care already taken to avoid a fork: `insuredSubject` and `findSameSubjectOverlap` are
**exported** so the policy page's brief attributes overlaps by the same subject rule the engine
fires on — *"a forked copy is how the brief and the recommendation would come to disagree"*
(`:207-210`). Any new overlap logic inherits that obligation.

## The deterministic / extraction boundary this must respect

Rules decide; the model only describes. For a same-plate overlap that is easy — the plate is a
copied string, and two equal strings is a fact.

For health it is not easy, because **the facts that distinguish waste from design are not
extracted.** `AcordDataSchema.health` (`lib/schemas/acord-data.ts:136-158`) has
`annualLimit`, `roomAndBoardLimit`, `outOfPocketMax`, `hospitalClass`,
`coordinationCentre`, `directBillingAvailable`, `annualCheckupIncluded`, `waitingPeriods[]`,
`outpatientLimit`, `deductiblePerClaim`.

It has **no** per-benefit sub-limit array, **no** "other insurance" / coordination-of-benefits
clause capture, and **no** primary/excess indicator. So any overlap verdict would have to come
from a model reading free text and forming a judgement — which is the deleted-`isDetected`
shape wearing a new name.

## What "overlap" even means operationally — and why reporting it as waste would be a false finding

Two policies covering the same peril is not waste. At least four benign arrangements produce
it:

| Arrangement | Why it looks like overlap | Why it is not waste |
|---|---|---|
| **Coordination of benefits** | both name the same benefit | you exhaust one, the other pays the difference |
| **Excess layer / top-up** | both name hospitalisation | the second attaches above the first's limit |
| **Different limits or classes** | both say "νοσηλεία" | one gets you a Class A room the other does not |
| **Two insured persons** | both are "health policies" on one account | they cover different people |

The repository already publishes the correct account of the first one, on this exact pair.
`lib/guides/content.ts:1464`, in the live `omadiko-symvolaio-ergasias` article:

> Όταν έχετε δύο πηγές κάλυψης, η σειρά έχει σημασία: συνήθως εξαντλείτε πρώτα το ομαδικό και
> το ατομικό καλύπτει τη διαφορά — με το ποσό του ομαδικού να μετρά έναντι της απαλλαγής, αν
> το προβλέπουν οι όροι.

**A finding that says "you are paying twice" over a coordinated pair contradicts our own
published guide on our own domain.** That is worse than silence twice over: it is wrong, and
it is visibly inconsistent with the thing we tell people to read.

## The leaving-employment cliff belongs in the obligation calendar, not the gap engine

The cliff — cover ends the day employment does — is a **time** property, not a coverage
property. The gap engine reasons about what a document says; the employment end date is not in
the document and never will be.

What *is* in the document, sometimes, is the **conversion right and its deadline**
(`group-health.ts:39`: *"where it exists, it is written in the document and it has a date"*).
That is precisely an `acordData.conditions[]` entry with `kind: documentation | reporting` and
a `dueBy` — which already flows through `complianceObligations()`
(`lib/insurance/policy-conditions.ts:170`) into
`lib/services/compliance/obligation-scan.ts` and out as an `obligation_due` notification.

So: **route the cliff to the existing calendar.** `QUEUE-GROWTH.md` GC-08 already forbids
building a second one.

Two honest caveats. First, **0 of 52 dev policies carry a non-empty `conditions[]`** (measured
2026-08-26; prod: 1 of 4), so that path is untested against real group-health certificates.
Second, `group_health` has no lob-pack, so nothing instructs the extractor to look for the
conversion deadline. Both are cheap to fix and neither needs an engine change.

## Storage and provenance: what a two-policy finding would even reference

This is the genuinely unsolved part, and it is worth fixing **whether or not health overlap
ever ships**.

- `GapInstance` has **one** nullable `policyId` plus a `userId` (`prisma/schema.prisma:523`).
  A finding about a *pair* has no natural row.
- `GapDefinition.scope` is already `'document' | 'portfolio'` (`:482`) — and **0 of 29 active
  definitions in either database use anything but `document`** (verified 2026-08-26). The
  column exists and nothing has ever used it.
- Portfolio findings today become `RecommendationInstance` rows with **`gapInstanceId: null`**
  (`lib/services/gap-engine/index.ts:466-472`). `RecommendationInstance` has a `ruleId`, but
  **no `ruleInputs` and no `engineVersion`** (`:1716-1746`).

So a cross-policy finding today **cannot be re-derived**. It records that
`duplicate_coverage_motor` fired; it does not record which two policies, on what subject, over
which date window. That is a provenance regression against the standard
`insured_value_above_declared` set for itself — *"a finding a human cannot re-derive is an
assertion, not an analysis"* (schema comment, `GapInstance.ruleId`).

The cheap, reversible fix is not a schema redesign: **record the operands.** Give portfolio
findings a `ruleInputs`-equivalent carrying both policy ids, the subject key, and the
overlapping date window, plus the engine version. That is the same lesson `value_drift` learned
when it stored the computed `driftPct` beside its two operands.

## The claims we are already making

CLAUDE.md: *never publish a public claim the code does not support.* Four live surfaces claim
more than `duplicateCoverageRules` delivers, and one of them is a **paid** promise:

| Surface | Claim | Supported? |
|---|---|---|
| `lib/product/catalog.tsx:153-154` (group-health product card) | «Με το Family, σταματάτε να πληρώνετε δύο φορές για το ίδιο πράγμα. Χαρτογραφήστε τα κενά ανάμεσα σε εταιρικό και ατομικό.» | **No.** Health can never group — `insuredSubject()` returns `null`. This card names the exact pair the engine refuses to evaluate. |
| `lib/guides/content.ts:1852-1853` (published article `diaxeirisi-asfalistirion-se-ena-simeio`) | "…and overlaps where you pay twice for the same risk", on the Family plan | Only for same plate / same address. |
| `lib/seo/marketing-pages.ts:250` | "detect overlaps with AI. For HR and employees." | Same. |
| `lib/monetization/upgrade-copy.{en,el}.ts` — trigger `duplicate_coverage_detection` | "Unlock duplicate-coverage detection" · success: "Duplicate-coverage detection is available." · CTA: **"See the overlaps"** | Only for same plate / same address, and the gate is Pro. |

`tests/unit/feature-gate-reachability.test.ts:15` allowlists `duplicate_coverage_detection` as
`KNOWN_UNGATED` on the grounds that *"the capability is real"*. That is true for motor and
home. It is not true for the employer-vs-personal pairing the sales copy attaches to it. The
guard is doing its job; the allowlist entry's justification is narrower than the copy it
protects.

The first row is the one to fix. It is a product page for the branch this hook is about, and
it promises the one thing the engine deliberately will not do.

## Cost

| Item | Rough |
|---|---|
| Correct the group-health copy + guide sentence + upgrade-trigger copy | **hours** |
| Provenance on portfolio findings (both policy ids, subject, window, engine version) | ~2 days; independently valuable |
| `group_health` lob-pack, incl. conversion deadline → `conditions[].dueBy` | ~2 days; feeds the existing calendar |
| Extraction: per-benefit sub-limits, other-insurance clause, primary/excess flag | ~1–2 weeks, and it is the precondition for everything below |
| An overlap rule that can tell coordination from waste | not costable until the above exists |

## Recommendation

**Do not extend overlap detection to group-vs-individual health.** Do these three:

1. **Correct the claims.** Narrow `lib/product/catalog.tsx` group-health copy,
   `lib/guides/content.ts:1852-1853`, `lib/seo/marketing-pages.ts:250`, and the
   `duplicate_coverage_detection` upgrade copy to describe what runs — the same vehicle or the
   same property insured twice — or to frame overlap as a question the app helps you **ask**
   rather than one it answers. Hours of work; removes a paid promise the code does not keep.
2. **Give portfolio findings provenance.** Both policy ids, the subject key, the date window,
   the engine version, on whatever row carries the finding. Do this regardless of H7.
3. **Route the leaving-employment cliff to the obligation calendar** via the conversion
   deadline as a `conditions[].dueBy` entry, scheduled with the §7.2 calendar owner (GC-08).
   Do not model it as a gap.

**Reopen the question** only when extraction produces per-benefit sub-limits, an "other
insurance" / coordination clause, and a primary-vs-excess indicator — **and** an underwriter
has stated the coordination order Greek group schemes actually follow. Until all four exist,
any overlap verdict on health is the model's opinion with a rule's authority, and the action it
invites is the one the customer cannot undo.

## Uncertainties I did not resolve

- The i18n keys `briefOverlapsLabel` / `briefOverlapFound` exist in both `el.ts` and `en.ts`
  (`:575-576` / `:581-582`) and I found **no component referencing them**. They may be dead, or
  reached by a dynamic key I did not trace. Worth ten minutes before anyone assumes the brief
  already renders overlaps.
- Whether the prod `RecommendationInstance` table currently holds any
  `duplicate_coverage_*` rows. Prod has 4 policies across `health, money, motor` and 0
  `gap_instances`, so probably not — but I did not query the recommendations table.
- Whether Greek group schemes' standard wording actually makes the group primary. The guide
  asserts it; I did not verify the source behind the guide.

---

## Orchestrator verification note (2026-08-26)

The core finding **verifies exactly**, and it is the one that should decide this proposal:
`insuredSubject()` (`lib/services/gap-engine/portfolio-rules.ts`) returns a plate for motor, an
address for home and **`null` for every other line** — health included — and the comment above it
records why the broad version was removed: *"Two health policies are often two family members, or a
group scheme plus a private top-up, which are complementary by design."* Its stated asymmetry is the
whole argument: *"missing a real duplicate costs someone a premium, while inventing one can cost
them their cover."* H7 proposes re-adding a case that was consciously removed.

**One correction to "The claims we are already making" above.** That section calls four surfaces
"live". Checked individually, they are not equivalent, and the strongest one points the other way:

1. **The in-app brief is HONEST and is the pattern to copy, not a defect.**
   `lib/i18n/translations/el.ts:583` renders «Δεν εντοπίστηκε — **ελέγχουμε μόνο για το ίδιο όχημα ή
   την ίδια διεύθυνση** ασφαλισμένα δύο φορές», and `:584` renders «Δεν ελέγχεται για αυτόν τον
   κλάδο». That is the exact scope limitation, stated to the user, plus an explicit
   not-checked-here state. It is "absence of a finding is not reassurance" applied correctly, and it
   is the wording any corrected claim should inherit.

2. **The paid trigger is LOADED, not live.** `lib/monetization/feature-gates.ts:64` states that
   `duplicate_coverage_detection` "stays: the capability is real …, it currently runs for every
   user, and **the gate is simply not applied anywhere**." So the upgrade copy — and its
   «Δες τις επικαλύψεις» CTA — is unreachable and has never been shown. The same comment records
   that `family_portfolio` was **removed** for being precisely this hazard: copy that a single
   `<UpgradePrompt featureKey="…">` would turn into a paid promise for something that does not
   exist.

**Corrected finding, which is still worth acting on:** the risk is **latent, not live**. The
upgrade copy promises «εντοπισμός καλύψεων που επικαλύπτονται μεταξύ ασφαλιστηρίων» — general
cross-policy overlap — while the engine does same-plate / same-address only. One `<UpgradePrompt>`
render makes that a live paid claim the code does not keep. The fix is to **qualify the copy to the
engine's actual scope**, borrowing the brief surface's wording, and it does not require building
anything.

Stated plainly because it changes the recommendation's urgency: nothing here is currently misleading
a user. Something here is one line of JSX away from doing so.
