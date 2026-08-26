# HALTS — PW-MOBILE-TRANSFORM-01

Questions only the human may answer (§12.1) and items blocked under §12.2.
A halt blocks the listed items, not the run, unless marked `blocks: RUN`.

**Open: 4** (H-005, H-006, H-007, **H-008 — live customer-facing falsehood**). **Answered: 3** (H-001 = C, H-002 = B, H-004 = B). §12.1.6 (price intelligence) waits for the Phase 2 specs.

---

## H-001 — Should the protection score exist at all?

date: 2026-08-23
raised_by: Product-Truth (Opus 5)
blocks: the *final* disposition of the score. Does **not** block Phase 1's removal of the score
from outbound, which §12.1 states explicitly is not a decision.
status: **ANSWERED 2026-08-23 — option C**

### What §12.1.1 asks for: what the score returns in each broken state

`provisionalProtectionScore(policyCount, gapSeverities)`
(`lib/services/gap-engine/protection-score.ts`):

```
if (policyCount === 0) return null
const penalty = gapSeverities.reduce((sum, sev) => sum + (weight[sev] ?? 0), 0)
return Math.max(0, Math.min(100, 100 - penalty))
```

| portfolio state | `openGaps` | score returned | what the customer is told |
|---|---|---|---|
| empty — 0 policies | `[]` | **`null`** | «—». Honest. This is the case someone thought about. |
| policies, **never analysed** | `[]` | **100** | «Βαθμολογία προστασίας 100%» + green 0-gaps tile |
| **all expired** | `[]` | **100** | same — to someone with no cover at all |
| analyses **failed** | `[]` | **100** | same — to someone whose documents could not be read |

**Three of the four broken states return the same number, and it is the best possible one.**

### What that actually renders — measured, not reasoned

`tests/measure/outbound-inventory.test.ts` renders each template to text in `el` for a portfolio of
three policies with nothing analysed. Verbatim output:

> **drip, day 7** — «3 Ασφαλιστήρια · **100% Βαθμολογία προστασίας** · Προσωρινή εκτίμηση · **0
> Κενά κάλυψης**»
>
> **weekly digest** — «Ακολουθεί η σύνοψη της εβδομάδας σας. **100% Βαθμολογία προστασίας** ·
> Προσωρινή εκτίμηση»

Three policies, a perfect score, zero gaps — to someone whose documents have never been read. The
«Προσωρινή εκτίμηση» qualifier is present and does not help: it says the number is provisional, not
that **no analysis has happened at all**, which is the fact that matters.

Two independent reasons, both structural rather than incidental:

1. **"Nothing to score" is implemented as `policyCount === 0`.** The honest predicate is "nothing
   *analysed*". The empty portfolio is caught; the unanalysed one — which every new customer
   passes through — is not.
2. **The all-expired case cannot be caught by that filter even in principle.**
   `engagement-drip.service.ts:152` selects `where: { status: "active" }`, and **nothing in the
   codebase ever writes `status: 'expired'`** — expiry is derived at render time by
   `resolvePolicyLifecycle`. So the column reads "active" forever and an entirely lapsed portfolio
   counts as fully covered. `lib/policy-status.ts:3-17` already documents this exact class and
   prescribes `NON_LIVE_POLICY_STATUSES`; the fix reached three services and missed this one —
   see D-007. Note it is wrong in *both* directions: it also drops in-force policies stored as
   `expiring_soon`, so the denominator is understated at the same time as expired cover is
   counted as live.

A related inconsistency: `openGaps` is queried across **all** the user's policies while
`policyCount` counts only "active" ones, so the numerator and denominator disagree about which
portfolio is being scored.

### Why this is a decision and not a fix

Phase 1 removes the score from outbound regardless — that is settled. What is not settled is
whether an in-product score survives at all, because the evidence above is not "the score has a
bug". It is that the score's *basis* is unstated, and every state where the basis is absent
resolves to the most reassuring possible answer. Making it honest means it renders in **fewer**
states than it currently does, and in the states customers most need something, it renders
nothing.

### Options

- **A — Remove it entirely.** Replace with the factual composition the dashboard already uses
  (`factTotalMany`, `factExpiredMany`, `factNeverAnalysedMany` at `el.ts:1825-1834`) — counts of
  things the wallet contains, none of which can be wrong the way a score can.
  *Consequence:* `churn-prevention.ts:91` advertises the score as a feature and becomes a false
  claim; the marketing copy must move with it. Loses a number some customers like.
- **B — Keep behind a disclosure, gated on a stated basis.** Renders only when a stated
  proportion of the portfolio has actually been analysed and is in force; otherwise renders the
  reason it cannot. Requires `scoreSupport()`-style plumbing on every render site and a truthful
  `status` derivation everywhere.
  *Consequence:* most work; keeps a metric §2.1 still calls unvalidated pending underwriter review.
- **C — Replace with factual composition in-product, remove from outbound.** The dashboard has
  already done exactly this and it measurably worked (STATUS.md: 6 sections, 0 count-consistency
  failures). Extend that treatment to the remaining surfaces and delete the number.

### Recommendation — **C**

It is the only option whose hardest case is already shipped and measured. The dashboard replaced
this verdict with counts and got better on every metric; the honest version of B renders nothing
in precisely the states A and C render something useful ("5 δεν έχουν αναλυθεί" is more actionable
than a suppressed score). C also makes `provisionalProtectionScore` deletable rather than
needing a basis-tracking rewrite it has never had.

**Whichever is chosen, three things are Phase 1 and proceed now without this answer:**
the score leaves all five outbound sites; the green/amber gap tile gets a text equivalent
(WCAG 1.4.1) whatever colours it keeps; and the two missed `status: "active"` reads adopt
`NON_LIVE_POLICY_STATUSES` (D-007), because "expired policies count as live cover, and
expiring-soon ones do not count at all" is wrong under every option above.

answer: **C — factual composition in-product, score removed from outbound.**
Given by the owner, 2026-08-23, in response to this halt's options and recommendation.

### What C means concretely, so the decision cannot be reinterpreted later

**The protection score is removed from the product. All of it.** Not gated, not disclosed, not
kept behind a threshold — replaced by counts of things the wallet actually contains, which is what
the dashboard already ships (`factTotalMany`, `factExpiredMany`, `factNeverAnalysedMany`,
`el.ts:1825-1834`) and what measurably improved every metric on that surface.

In scope as a direct consequence:
- **Both** in-product render sites go: `components/dashboard/home/ProtectionStatusHero.tsx` and
  `components/coverage/ProtectionScoreCard.tsx`. This resolves candidate #17 — §2.2 permits at most
  one sanctioned location and the guard authorised two; the answer is now zero.
- All five outbound sites go (this was already Phase 1 and never depended on the answer).
- `scoreColor`'s colour verdict goes with the card, so the WCAG 1.4.1 finding resolves by deletion
  rather than by adding a text equivalent.
- The methodology / limits / not-advice block goes with it — it exists to qualify a number that
  will no longer render.
- `churn-prevention.ts:91,97` advertises the score as a product feature and becomes a false claim.
  It must be removed in the same change, not left for later.
- `score-containment.test.ts`'s `SANCTIONED` set becomes **empty**, and the guard asserts the score
  value renders nowhere — which is a far stronger and simpler assertion than the allowlist it
  replaces.

**Explicitly NOT in scope**, per §0.10 and D-006: the score's *arithmetic*.
`calculateProtectionScore` and `provisionalProtectionScore` are not deleted in Phase 1. They may
still have non-rendering callers (trend storage, agent-side surfaces which are §12.4 out of scope),
so removal is by render site first; dead-code removal follows only once a sweep proves no caller
remains. **Deleting a function that an out-of-scope agent surface still calls would breach §12.4.**

`provisionalProtectionScore`'s honesty bug (returns 100 for an unanalysed portfolio) is still fixed
in P1-02 rather than waved away as "about to be deleted" — the agent-side callers are out of scope
for deletion but not immune to the defect.

### Ledger consequence
Rows D-02, D-04, A-01 and A-04 move from `PENDING H-001` to **REMOVE**. That is four capabilities
deleted, and it is the largest deliberate capability removal in the run — recorded as such rather
than absorbed quietly.

---

## H-002 — Send-side notification policy: what replaces what Phase 1 removes?

date: 2026-08-23
raised_by: Product-Truth (Opus 5)
blocks: nothing currently queued.
status: **ANSWERED 2026-08-23 — option B**

### Why now
§12.1.2 reserves this for a human and said it needs the outbound-copy inventory. That inventory now
exists (`evidence/outbound/INVENTORY.md` + `METRICS.md`, measured).

### What Phase 1 is about to delete from the outbound channel

| template / emitter | what goes | what remains |
|---|---|---|
| `risk-events.ts:176-190` | the whole `protection_score_changed` event type | — nothing replaces it |
| `weekly-digest.ts:118-126` | the score block | renewals list, gap count, unread messages |
| `engagement-drip.ts:115-118` | the score stat tile | policy count, gap count |
| `churn-prevention.ts:91,97` | the score as an advertised feature | the rest of the win-back copy |

After Phase 1, the digest and drip still send — they just say less. **No decision is needed for the
run to proceed.** The question is whether that residue is the right outbound policy.

### The question, precisely
Which events warrant reaching a Greek policyholder *outside the app at all*, at what cadence, and
with what digest rule? §2.8 already constrains the answer: every outbound message must trace to a
dated real-world event, so "we ran an analysis" and "your score moved" are excluded by invariant,
not by preference.

Candidates that survive §2.8 on their face — a renewal date approaching, a policy lapsing, cover
lost on a risk, a document a person actually needs to read, an adviser action, a share granted or
revoked. Candidates that do not — anything describing an internal pipeline state.

### Options
- **A — renewals and lapses only.** The two things with a real deadline and a real consequence.
  Smallest, hardest to get wrong, and closest to what §9.5 means by "a prompt earns an outbound
  message only where it has a real, dated deadline."
- **B — A, plus a monthly digest** of what changed in the customer's own data, sent only when
  something actually changed (§9.3's discipline applied to email).
- **C — status quo minus the score:** keep the weekly digest, the drip and the churn sequence at
  current cadence with the score stripped out.

**Recommendation: B.** A is defensible but gives up the one honest recurring touch; C keeps a weekly
cadence that §9.1 argues directly against — an insurance wallet has no weekly event stream, and
manufacturing one is what produced the score email in the first place. B's "only when something
changed" rule is the part that must survive whichever option is chosen.

**Dependency worth stating:** B and C both require the §9.5 cadence controls, which do not exist —
no monthly ceiling, no global off switch, and the preferences screen currently writes `email` only
while push is live (P1-09). Choosing B or C commits to building those first.

answer: **B — renewals and lapses, plus a monthly digest sent only when something actually changed.**
Given by the owner, 2026-08-23.

### What B commits to

**Outbound is reduced to two kinds of message.**

1. **Deadline-bearing events** — a renewal approaching, a policy lapsing, cover lost on a risk.
   These earn an outbound message because they have a date and a consequence, which is exactly the
   test §9.5 sets: "a prompt earns an outbound message only where it has a real, dated deadline."
2. **A monthly digest of the customer's own data — sent only when something changed.** The weekly
   cadence is retired. §9.1's argument is the reason: an insurance wallet has no weekly event
   stream, and manufacturing one is what produced the score email this run is deleting.

**«Τίποτα δεν άλλαξε» is not sent.** §9.3 says that message is trust-building *in-product*, where
the customer chose to look. As an email it is an interruption reporting nothing, which is the
failure mode B exists to avoid. **Silence is the correct outbound behaviour for a quiet month.**

### What this makes mandatory rather than optional

B depends on the §9.5 cadence controls, and **none of the three exist**:
- a user-configurable monthly ceiling — absent
- a global off switch honoured in outbound — absent
- per-channel preference control — the settings screen writes `channel: "email"` only, while
  `push` is a live channel (candidate #24, queued P1-09)

So B is not merely a content decision; it commits the run to building those controls. They move
from "Phase 4 precondition" to **a Phase 1 dependency of the send-side change**, because a monthly
digest with no ceiling and no off switch is a worse product than the weekly one it replaces.

### Sequencing consequence
The digest cadence change does **not** ship before the controls do. Phase 1 removes the score from
the existing templates (already queued, no dependency); the cadence change and the monthly digest
land only after P1-09 and the ceiling/off-switch work. Recorded so a later pass cannot ship the
cadence half alone and call B done.

### Out of scope, unchanged
§12.4 puts notification **dispatch** logic — whether a message fires, to which channel, at what
cadence — out of scope for this run. B decides the *policy*; implementing the dispatch-side cadence
change is a separate piece of work that this run specifies rather than performs. Phase 1 still only
removes.

---

## H-004 — Public content now advertises a feature that no longer exists

date: 2026-08-23
raised_by: Adversarial Reviewer, from P1-01's out-of-scope findings
blocks: nothing.
status: **ANSWERED 2026-08-23 — option B (as recommended)**

P1-01 removed the protection score from the product. Three files still describe it to the public:

| file | claim |
|---|---|
| `lib/guides/content.ts` | 4 mentions, including "calculates your Protection Score" presented as a **Family-plan feature** |
| `lib/glossary/content.ts` | a whole entry, «Τι είναι το Σκορ Προστασίας;» |
| `lib/legal/legal-content.ts:641` | "protection scores" inside the AI disclaimer |

These are **prose**, not value renders, so `score-containment` cannot see them — it matches
identifiers and interpolations, and correctly so. A guard that also matched prose would fire on
every legitimate discussion of the concept.

**Why this is a halt rather than an item.** §12.4 puts the public marketing site out of scope and
says to stop and report rather than reach across the boundary. But the standing rule against
publishing unsupported public claims is absolute, and the guides entry is worse than stale copy: it
advertises the score as a **reason to buy the Family plan**. That is a purchase inducement for a
feature that no longer exists.

The legal one cuts the other way and should NOT simply be deleted: an AI disclaimer that mentions
scores is over-disclosure, not mis-selling, and removing wording from a compliance surface is a
§12.2 legal-surface change regardless of scope.

### Options
- **A — fix all three now**, treating it as a defect the run created. Crosses §12.4.
- **B — fix the guides plan-claim only** (the purchase inducement), leave glossary and legal for
  their own tracks. Smallest crossing, addresses the part that is actually a false claim to a buyer.
- **C — file all three to `docs/STATUS.md` as launch-blocking debt** and touch nothing.

**Recommendation: B**, with the legal wording routed to the DPO track and the glossary entry
rewritten rather than deleted (the concept still deserves an explanation; the product just no longer
computes it).

**This is time-sensitive in a way the other halts are not** — the guides and glossary are live
public pages, and the pricing surface reads from them.

answer: **B — fix the guides plan-claim, rewrite the glossary, route legal to the DPO track.**
Given by the owner, 2026-08-23. **This is an explicit authorisation to cross §12.4** for these
files only; the public marketing site otherwise remains out of scope.

### Done

**`lib/guides/content.ts` — the purchase inducement is gone.** Two prose claims removed in both
languages: "on the Family plan … calculates your Protection Score" and "Out of that comes the 0–100
Protection Score, with its methodology written out inside the app". What replaced the second is the
truth — each finding appears individually with its reasoning and a pointer to the customer's own
document. The two `related` links to the glossary stay, because B rewrites that entry rather than
deleting it.

**`lib/glossary/content.ts` — rewritten, not deleted.** The concept is real and readers meet it in
other services, so the entry now explains what a protection score is, states that PolicyWallet no
longer calculates one, and says why in plain terms: *a 0–100 number could not distinguish "we found
no problem" from "we could not look" — a portfolio that had never been analysed scored the same as
one that had been checked and was fine.* It closes by telling readers what to ask of anyone else's
score: does it measure the breadth of cover held, or whether that cover is enough? Only the first is
computable from documents.

Deleting the entry would have been easier and worse — the term is a real insurance-literacy term,
and a product that removed a metric for honesty reasons should be able to say so.

**`lib/legal/legal-content.ts:641` — untouched, routed to the DPO track.** The AI disclaimer
mentioning "protection scores" is now over-disclosure rather than mis-selling, and editing wording
on a compliance surface is a §12.2 change regardless of who authorised the §12.4 crossing. Recorded
in `docs/STATUS.md` for that track.

Gate after: tsc, lint, i18n, utf8 clean; 5076/5076 tests.


---

## H-005 — ANSWERED 2026-08-25: **no, it should not exist.** Removed.

The owner's decision. «Πόσο καλά σας γνωρίζουμε» is gone from the risk lens: the 0-100 index, the
band verdict («Καλή εικόνα» / «Μερική εικόνα» / «Περιορισμένη εικόνα» / «Άγνωστη»), the `BAND_TONE`
colour map, and the eight component percentages with their progress bars.

**Deleted whole rather than de-verdicted.** Keeping the components would have kept the score in
pieces — eight percentages *is* the index, distributed. `whyItMatters` went with it; its copy reads
"…for THIS to mean anything yet", prose about a number that is no longer there.

**What survives is the one part that was never a score.** `nextAction` — «Απαντήστε σε μερικές ακόμη
ερωτήσεις για την κατάστασή σας» — tells someone what to do without ranking them for not having done
it. Its card now renders only when there is an action, because removing the score would otherwise
have left an empty bordered box where a finding goes.

Guards moved with it: `protection-surface-ledger`'s R-04 asserted the metric RENDERED and now asserts
it does not; `solid-panel-contrast`'s band-tone check guarded a contrast ratio on a thing that no
longer exists and now enforces the decision instead — a check for absence cannot pass vacuously,
where "if it exists it must clear 4.5:1" would pass loudest when the file is empty.

---

### Original halt as raised

## H-005 (accessibility half, fixed earlier)

**2026-08-25.** V2-P1-03 and V2-P1-08 were queued together as "remove the verdict «Καλή εικόνα» and
fix the amber label failing at 3.20:1". They are not the same kind of thing, so they are no longer
queued together.

**Fixed, because it is not a decision.** `BAND_TONE.fair` was `text-amber-600` — **3.20:1 on white,
measured on /insights/risk-profile at all three widths**. The tone is worn by two elements: the
`text-3xl font-bold` index, which is large text at a 3:1 floor and passed, and the `text-sm`
band label beside it, which is normal text at 4.5:1 and did not. `amber-700` is 5.03:1 and clears
both. Whatever H-005 decides, a rendered label has to be readable. I checked **every** band rather
than the one the fixture happened to hit: strong (`--primary`) 6.51:1, thin (red-600) 4.77:1,
unknown (muted) already guarded. Only `fair` failed. Pinned in `solid-panel-contrast.test.ts`.

**NOT done, and deliberately.** I did not remove «Καλή εικόνα». Two reasons:

1. **The wording is defensible as written.** All four labels — «Καλή / Μερική / Περιορισμένη εικόνα»,
   «Άγνωστη» — describe *how complete our picture of you is*, under a kicker that says exactly that:
   «Πόσο καλά σας γνωρίζουμε». That is a description of data completeness, not a risk verdict about
   the customer's protection, and the never-assessed case already lands on «Άγνωστη» rather than on a
   reassurance. It is not the §2.1 shape.
2. **Removing the word would not settle §2.4 anyway.** The objection in §2.4 is that a *second score*
   exists beside the protection score. Deleting the label while keeping the number leaves two scores
   and answers nothing.

So H-005 stays open as what it actually is: **should this metric exist at all.** That is a product
decision, H-001's precedent covers score #1 and not this one, and choosing for you would be choosing
the irreversible direction. Nothing is blocked on it — the surface is honest and legible today.

---

### Original halt as raised

## H-005 — Should the second score («Πόσο καλά σας γνωρίζουμε») exist?

date: 2026-08-24 · raised_by: Product-Truth (Opus 5)
blocks: **V2-P1-03 only.** Removing the *verdict* is Phase 1 and proceeds without you; whether the
**metric** survives is §12.1.2 and is yours.
status: **open**

### What it renders today

`components/risk-dna/RiskIntelligenceView.tsx:123-131` — the first card on the surface:

| element | code |
|---|---|
| kicker «ΠΟΣΟ ΚΑΛΑ ΣΑΣ ΓΝΩΡΙΖΟΥΜΕ» | `:123`, `.pw-kicker` (CSS-uppercased — a literal grep misses it) |
| the number, **`text-3xl font-bold`** — the largest element in the card | `:128-130` |
| a verdict beside it | `:104-111` — «Καλή εικόνα» / «Μερική εικόνα» / «Περιορισμένη εικόνα» / «Άγνωστη» |
| colour by band | `BAND_TONE[health.band]` on **both** number and label |

**What it already gets right,** and should survive whatever you decide: `health.index === null`
renders **«—», not 0**, and the unknown band says «Άγνωστη». That is §2.5 done correctly, and it is
better than the protection score managed before P1-01.

### Why it breaches §2.4 regardless

It is a **second headline number with a verdict**, on a product that has just removed its first one
(H-001 = C). «Καλή εικόνα» is a judgement about *the product's own knowledge*, rendered in the
grammar of a judgement about *the customer*. Colour is a carrier on both elements.

And there is a specific dishonesty the fixture exposed: for a household the product knows nothing
about — income null, dependants unset — `protectionScore` returned **94 with `indeterminate: true`**
while the health index correctly returned `null`/unknown. Two metrics describing the same emptiness
disagree, and the more confident one is wrong.

### Options

- **A — remove the metric entirely.** Simplest, consistent with H-001 = C. Loses a genuinely useful
  internal signal.
- **B — keep the number, remove the verdict and the colour.** A bare figure under a plain kicker.
  Cheapest, but a 0-100 number at `text-3xl` still reads as a grade whatever the label says.
- **C — express it as plain facts, not a score.** «Ξέρουμε 3 περιουσιακά στοιχεία και 2 εξαρτώμενα
  μέλη· δεν ξέρουμε το εισόδημά σας.» — §2.4's own suggested wording. Same information, no grade,
  and it tells the customer *what to fix* rather than how they rate.

**Recommendation: C.** It is the treatment that worked on the dashboard for H-001, it converts
telemetry into an actionable prompt, and it is the only option where the "unknown" case is as
legible as the "known" one. B keeps the artefact that makes the surface feel like a report card.

answer: *(awaiting)*

---

## H-006 — ANSWERED 2026-08-25: proceed, with the disclosure. Implemented.

The owner's decision: do not gate on IDD Art. 20 analysis; state plainly that AI output is **not
professional advice** and that the customer should take important decisions to **their agent**.

Implemented as coverage, not as a sentence written once. The disclosure now denies *professional*
advice (it previously denied only legal and insurance advice) and names the adviser rather than "a
licensed professional".

`tests/unit/ai-output-carries-the-disclosure.test.ts` enumerates every B2C file rendering
model-written prose — `aiExplanation`, `aiSuggestion`, `coverageSummary`, `aiAnswer` — and walks the
**import graph in both directions**, because the unit is the page a reader sees, not the component: a
page is covered by what it renders, a component by the pages that mount it.

It found **nine** surfaces with no disclosure anywhere near them, including the **policy detail
page** — which renders «Το ασφαλιστήριό σας σε απλά ελληνικά», the most-read AI prose in the
product. All fixed.

**The guard's own limit, found by probing it and stated rather than hidden:** importing
`AiDisclaimer` is not rendering it. Stripping the disclosure from `PolicyDetailsClientView` left the
closure check green, because that page also imports `RecommendationCards`, which carries its own. So
the closure check catches a surface with nothing near it, and a short list of surfaces *where the
prose is the point* must carry the disclosure in their own source. Probed both ways.

---

### Original halt as raised

## H-006 — The AI advisor's advice boundary (IDD Art. 20)

date: 2026-08-24 · raised_by: Product-Truth (Opus 5)
blocks: **§8 implementation only.** Comprehension and the demands-and-needs record can be specified
now; nothing ships until this is answered.
status: **open**

### The question
§8.2 draws the line at: document **comprehension** and a **demands-and-needs record** are
supportable; output stating what cover a customer *should* buy, what limit or deductible they
*should* hold, or that a contract is *suitable*, is a personal recommendation under IDD Article 20
and engages the demands-and-needs regime supervised by the Τράπεζα της Ελλάδος.

I cannot decide where that line sits in Greek law, and neither should the run.

### What I need decided
1. Is a **factual comparison** — "your stated requirement is X, your current policy says Y" —
   inside the line, given it does not conclude in an instruction to act?
2. May the record be **routed to a human intermediary** who makes the recommendation, and does that
   routing itself constitute intermediation?
3. What disclosure must appear on every AI output, and in what register?

### Why it is worth resolving rather than avoiding
A completed demands-and-needs record is **exactly what an intermediary needs and rarely has**. The
regulatory constraint, answered, becomes the product's asset rather than its ceiling.

**Recommendation:** build comprehension first — it is the bulk of the value, carries no advice risk,
and does not depend on this answer. Take questions 1–3 to the DPO and intermediary-compliance track
before the interview ships.

answer: *(awaiting)*

---

## H-007 — ANSWERED 2026-08-25: same treatment. The notice already existed; now it cannot vanish.

The wizard already collects the special-category fields — chronic conditions, family medical history,
height, weight, smoking, activity, gender — behind a notice that says they are **optional**, used
**only** to tailor health and life cover, **not shared with insurers without explicit consent**, and
may be left blank or deleted later. That is a good notice, and nothing was measuring whether it stays.

`tests/unit/health-questions-carry-their-notice.test.tsx` enumerates those seven fields from the
wizard's own source and requires all four promises to still be present. A new health question added
without extending the notice fails there — which is the only moment anyone would think to ask.

It matches each promise by **substance, not wording**. Pinning a sentence pins whatever that sentence
happens to say, and a guard in this codebase has already held a false monetization claim in place by
asserting a literal.

---

### Original halt as raised

## H-007 — Article 9 consent for the advisor interview

date: 2026-08-24 · raised_by: Product-Truth (Opus 5)
blocks: the §8.2 interview only.
status: **open**

The interview as described asks about **health, income and family** to establish cover needs.
Health is Article 9 special-category data; income and dependants are ordinary but sensitive.

§9.5's tier test already answers most of it — *can the app deliver the value without ever learning
the answer?* — and §9.5 puts **Tier C (health) out of this run entirely.** H-007 is whether §8's
interview may cross that line, which §9.5 does not govern.

**What needs deciding:** which categories may be collected · on what lawful basis, given consent for
Art. 9 must be explicit and separable from the AI-processing consent that already exists ·
retention · and whether the record may be exported to an intermediary, which is a disclosure.

**Recommendation:** specify the interview to Tier A/B only and **defer every health question** to a
later decision. That is buildable now, needs no Art. 9 basis, and still produces a record worth
having. It also avoids opening a second Article 9 front alongside the pending agent-side decision.

answer: *(awaiting)*


---

## H-008 — CLOSED 2026-08-25. No grant. The email drives the activation event instead.

The false claim was removed earlier. The commercial half, answered on the owner's instruction to use
my own judgement:

**Do not reinstate the grant.** Credits are the wrong lever for this audience. Someone who has not
opened the wallet in thirty days is not blocked by a lack of currency — they are blocked because
there is nothing analysed to spend it on. 500 credits against an empty wallet buys nothing the
recipient can use, costs real inference money for people who may never return, and rewards dormancy
over the action that makes the product worth anything.

The activation event is an **upload**, so the day-30 email now drives that: the CTA points at
`/wallet/add` («Προσθήκη ασφαλιστηρίου») rather than the dashboard. If a win-back incentive is ever
wanted, tie it to the upload — value released by an action is self-funding and measurable; a blanket
grant is neither.

---

### Earlier resolution (the honesty half)

**Acted under standing authority, because the honesty half was not a decision.** CLAUDE.md forbids
"publishing a public claim the code does not support" *regardless of instruction*, and this one was
shipping daily to production. Waiting for an answer meant continuing to send it.

**What was done (V2-P1-12):** the day-30 churn email no longer mentions credits — no gift box, no
48px «500», no «AI Credits προστέθηκαν στον λογαριασμό σας». The `bonus_credits_granted` emission is
deleted from `churn-prevention.service.ts`; the registry entry moved `live → planned` and no longer
names an emitter. Seven Greek claims left the copy freeze; four neutral lines replaced them. The
email still goes out and still re-engages.

**What was NOT decided, and is still yours:** whether returning customers *should* get credits.
Granting them is the billing system, which §12.4 puts out of scope, and "should we spend money to win
back lapsed users" is a commercial call. The three options are unchanged — grant them for real, drop
the incentive permanently, or design a claimable offer. **Nothing now blocks on this**; the product is
honest either way, and the registry entry is wired to receive a real grant the day one exists.

---

### Original halt as raised

## H-008 — A daily production cron tells customers it granted 500 credits. Nothing grants them.

date: 2026-08-24 · raised_by: P1-14, escalated by the Adversarial Reviewer
blocks: nothing in the queue. Raised because the fix is a **commercial** decision, not a defect fix.
status: **open** — and this is the one I would want answered soonest.

### What ships today

`lib/services/churn-prevention.service.ts` (day-30 branch) sends `getChurnDay30Email`, which says:

> «Ως ένδειξη εκτίμησης, **σας δωρίζουμε 500 δωρεάν AI credits**…»
> «**AI Credits προστέθηκαν στον λογαριασμό σας**»

and then emits an in-app notification repeating it:

> «Μπόνους επανασύνδεσης: **500 credits προστέθηκαν**, λήγουν σε 30 ημέρες»

**No credits are granted.** Verified: the service contains **zero** balance writes — no
`creditTransaction`, no `tokenBalance`, no increment, no create. The only write is the notification
itself. The code says so in its own comment:

```ts
// Record the bonus token grant (integrate with actual billing/token system)
await emit({ event: "bonus_credits_granted", … })
```

The `emit` **is** the "record". The integration was never built.

**And it is live.** `vercel.json` schedules `/api/v1/jobs/churn-prevention` at `0 11 * * *` — daily,
in production.

### Why this is a halt and not an item

`CLAUDE.md` lists *"publishing a public claim the code does not support"* under **Never, regardless
of instruction**. This is that, in both channels, on a schedule. It also breaches §2.10 — a
notification asserting an event that did not occur.

But the *fix* depends on intent, and that is yours:

- **A — grant the credits.** The promise becomes true. Touches the billing/token system, which
  §12.4 puts out of scope for this run.
- **B — stop making the claim.** Remove the grant language from the day-30 email and delete the
  `bonus_credits_granted` emission. In scope (P1-01 removed score claims from these same templates),
  reversible, and stops the falsehood today.
- **C — reword to an offer.** "Here is what Family gives you" rather than "credits have been added".
  Keeps a re-engagement hook without asserting a transaction.

**Recommendation: B now, then A or C deliberately.** B is the only option that stops a live
misstatement without committing you to build billing under time pressure, and it is the reversible
one. If the credits were always intended, A is the right end state and B costs nothing on the way.

**What I have NOT done:** I have not changed the copy. Removing it is in scope and I can do it in
minutes, but which of A/B/C you want is a commercial call, and B silently deletes a customer
incentive somebody may have been counting on.

answer: *(awaiting)*

---

## H-009 — CLOSED 2026-08-25: deep analysis sits on **both** paid tiers.

The owner's decision. `isDeepAnalysisLocked` was `tier !== 'pro'`; it is now `tier === 'free'`, so
Plus and Pro both unlock it and no paying subscriber is shown an upgrade prompt for a plan they hold.
The CTA reads «Ξεκλείδωμα με Plus» — the cheapest tier that clears the gate.

`locked-cta-names-the-real-tier` survived the change the way a guard should: it **failed**, saying
"if it moved, re-point this guard rather than deleting it". It now reads both gate shapes
(`tier !== 'X'` and `tier === 'free'`) and requires the CTA to name the *cheapest* unlocking tier —
naming a dearer one is not a lie, but it sells an upgrade the customer does not need. Probed both
ways.

---

### Earlier resolution (the copy half)

**Resolved 2026-08-25 (copy half).** The CTA now reads «Ξεκλείδωμα με Pro» / "Unlock with Pro",
naming the tier that actually clears `tier !== 'pro'`. `tests/unit/locked-cta-names-the-real-tier.test.ts`
reads the tier **out of the gate expression** and fails if the copy names a different paid tier —
probed both ways: changing the copy goes red, and changing the gate goes red too, so the sentence and
the predicate cannot drift apart again.

**A guard was pinning the defect.** V2-P2-01b's A-17 test asserted the literal «Ξεκλείδωμα με Plus»,
so the false claim had a test holding it in place. Updated, with a note pointing at the guard that
now owns the tier-naming invariant rather than duplicating it.

**Still open, and still yours:** whether deep analysis belongs behind Pro (€8.99) or Plus (€4.99).
That is what each plan is worth, §12.4 puts gating mechanics out of scope, and a Plus subscriber is
still shown an upgrade prompt — now an honest one. Note `lib/monetization/feature-gates.ts` exports
`tierUnlocks(tier, gate)` with a `TIER_RANK`; this gate hand-rolls `tier !== 'pro'` instead of using
it, which is the kind of second definition this run keeps finding.

### Original halt as raised

## H-009 — «Ξεκλείδωμα με Plus» unlocks nothing. The gate requires Pro.

**Raised 2026-08-25, from V2-P2-01b's out-of-scope list. The copy half is mine to fix; the gate is
yours.**

`isDeepAnalysisLocked = entitlements.tier !== 'pro'` — `app/(protected)/coverage-insights/page.tsx:141`
and now `app/(protected)/protection/page.tsx:281`. Tiers are `free | plus | pro`. The locked branch
renders a Crown and a CTA reading **«Ξεκλείδωμα με Plus» / "Unlock with Plus"**, pointing at
`/upgrade?reason=feature_locked`.

**Two things are wrong, and they are different kinds of wrong.**

1. **The copy is false, for everybody.** Only `pro` clears that gate. A free customer who reads
   "Unlock with Plus", buys Plus, and comes back is still locked out of the thing they bought it for.
   That is CLAUDE.md's absolute — publishing a claim the code does not support — and it is worse than
   the usual case because the claim is what induces the purchase. **This is copy, which is in scope,
   and I will fix it to name the plan the gate actually requires.**
2. **A paying Plus subscriber is shown an upgrade prompt for a plan they hold.** Whether deep
   analysis *should* sit behind Pro or behind Plus is a commercial decision about what each plan is
   worth, and §12.4 puts plan-gating mechanics out of this run's scope. **I am not touching the
   gate.**

Fixing (1) without (2) leaves a Plus subscriber correctly told that Pro unlocks it. That is honest,
and it is the reversible half — copy reverts in one line, an entitlement change grants or removes
access. If the intent was always that Plus unlocks deep analysis, the fix is one character in the
gate and the copy follows it back.

**Nothing blocks on this.** The dishonest half is being removed either way.

---

## H-010 — Two structured-extraction gaps, ONE decision

*(insured-person name · cyber/business/pension `AcordData` objects)*

**Decide these together or not at all.** Both are the same §12.2 schema change. Split into two
tickets, one gets approved and the other is forgotten — and the forgotten one is indistinguishable
from a working feature on the surface, which is how it survived this long.

date: 2026-08-26 · raised_by: implementation (P5-wallet-01 pre-check)
blocks: **W-02 partial closure for health and life only.** Motor, property and pet proceed.
status: **open**

### Context, verified against the schema rather than assumed

`AcordData` has **no field naming the insured individual**. Every `*name*` field in the schema was
checked: `insurerName`, `coordinationCentreName`, `pet.name`, `namedDrivers`, `beneficiaries.name`.
`insuredPersons` is a **role/class benefit schedule** — its fields are `role`, `classLabel`, `count`,
`benefits`, with schema examples "master", "chief engineer", "cashier" — not individuals.

Health and life rows therefore cannot be distinguished from each other **on any surface**, and **5 of
the 29 heavy-fixture duplicates are unresolvable for this reason**. `cyber`, `business` and `pension`
have **no `AcordData` object at all**.

### The question
Should the extraction schema carry an insured-person name, and a minimal object for cyber / business /
pension?

### Options
- **Add the field.** Resolves health and life identity across every surface. It is a schema change →
  **§12.2 halt**. It is also **personal data on a health policy**, so scope and lawful basis need
  stating, not assuming.
- **Do not add.** Health and life rows stay indistinguishable. Acceptable at realistic portfolio
  sizes — typical fixture is 3, production wallets are 3 and 1 — and degrades as health holdings grow.

### Recommendation (raiser's, and I concur) — covers BOTH halves
**Do not add in this run.** §12.2 blocks the schema change regardless; the insured-person field is
personal data on a health policy; and both defects are confined to lines with negligible real
holdings (production wallets hold 3 policies and 1).

**Revisit when EITHER trigger fires** — both are observed, not remembered:
1. a real capture shows **non-zero health duplicates**, which the `duplicate-identity-row` metric
   now checks continuously; or
2. a real **cyber, business or pension policy is uploaded**, at which point the customer is looking
   at an editorial card with nothing extracted behind it.

Trigger 2 has no automated watch. It fires on a human noticing an upload in one of those three
lines, which is weaker than trigger 1 and is stated so rather than dressed up.

### The cyber / business / pension half, verified 2026-08-26

The amendment recorded this as "`/branches` renders cards for both Cyber and Επιχείρηση with nothing
behind them". Checked, and the precise version is narrower and more useful:

- **Editorial content exists.** `lib/insurance/content/{cyber,business,pension}.ts` are all present,
  so the cards carry a tagline and "why it matters" prose like any other line. They are not blank.
- **Structured extraction does not.** `AcordData` has objects for `motor`, `property` and `health`,
  and **none** for `cyber`, `business` or `pension`.

So a customer who uploads a cyber policy gets a branch card and editorial, and **nothing extracted**:
no coverage figures, no identity, and no structured input for gap detection. That is a
**structured-identity gap**, not an empty card — and it is the more serious reading, because an empty
card is visibly empty while an editorial card looks complete.

Worth stating for whoever acts on this: adding the three objects is the same §12.2 schema change as
the insured-person name, and should be decided with it rather than separately.

### Why this is worth a halt rather than a silent limitation
Because the alternative is a substitute field. The nearest candidates all look like identifiers and
are not: `beneficiaries.name` names the **beneficiary**, `insuredPersons.*` is a class schedule, and
policy number / product name / sum insured are not identity at all. Recording the gap keeps someone
from closing it cosmetically in six months.

---

## SEC-01 — Is a Vercel log drain configured? (the single open question)

**Raised 2026-08-26. Everything else in SEC-01 is closed; this is the only thing that decides
whether containment is established.** It cannot be answered by any tooling available to the agent —
there is no MCP tool for drains and the REST drains API is not reachable from here. It is a
dashboard check: **Vercel → project `policy-wallet` → Settings → Log Drains** (and the team-level
drains list, since a team drain covers the project without appearing under it).

### What happened, in one paragraph
A Supabase session object reached the Vercel runtime logs **8 times**, counted two independent ways
(error grouping 7+1; a text-filtered log aggregation over 3 days). Each entry carried a live
access-token JWT and a live refresh token, because `_recoverAndRefresh` interpolates the whole
serialised session into its error message and nothing between that throw and the sink removed it.

### Exposure window
**2026-08-23 20:47:10 UTC → 2026-08-26**, closing with deployment `60087bb7`, which shipped the
`proxy.ts` cookie-adapter fix and made the throw unreachable. The belt-and-braces half — catching
the throw and redacting it before anything logs it — lands with `385bc0b8`.

Whether occurrences predate 2026-08-23 **could not be established**: the 7-day log aggregate times
out and a 30-day query is rejected outright, so the window's left edge is the limit of
observability, not a proven start.

### The question
Was a log drain configured on this project or team at any point inside that window?

### What each answer implies

- **No drain → SEC-01 CLOSES.** Exposure is confined to Vercel's own runtime logs. Those cannot be
  deleted (Vercel exposes no delete endpoint for runtime logs) but they age out with retention, and
  every credential in them is already dead: both access-token JWTs expired ~68 hours before
  remediation, neither leaked refresh token still existed in `auth.refresh_tokens` (GoTrue rotates
  on use), and the account's live session was revoked — prod verified at 0 sessions / 0 unrevoked.

- **Drain configured → SEC-01 STAYS OPEN, with a new scope item.** The 8 entries were forwarded
  verbatim to a third party with **its own retention and its own access list**, neither of which is
  bounded by anything done here. Containment is then *not* established, and the follow-up is: name
  the destination, determine its retention, determine who can read it, and purge there if it
  permits deletion. Revoking the Supabase session does not reach it.

### Deliberately NOT done
The only lever that would purge the Vercel entries early is deleting the two deployments that
produced them (`dpl_AV89m5aD82rRT4XDcWVpocCMGChD`, `dpl_HACe2hPXeXHWGvQ3EtLH7Ure52Ws`). That is
irreversible, destroys rollback targets, and buys nothing while the credentials are already dead.
Not done on the agent's authority.

### CLOSED — the IP origin line is not a finding
The revoked session carried IP `186.247.46.50`, which geolocates to Brazil on a Greek-market
product, and was flagged during review because it sat on the only live session on the affected
account. **Confirmed a VPN. Not a finding, not an indicator of compromise.** Recorded here so that
nobody re-opens it from `docs/archive/2026-08-26-sec-01-admin-session-revocation.sql`, which
preserves the IP in its pre-change record and would otherwise look like an unexamined lead.

### Status
`docs/STATUS.md` reads **contained, not closed**, and stays that way until the drain question is
answered by a human. The agent does not close this.
