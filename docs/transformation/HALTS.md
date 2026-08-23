# HALTS — PW-MOBILE-TRANSFORM-01

Questions only the human may answer (§12.1) and items blocked under §12.2.
A halt blocks the listed items, not the run, unless marked `blocks: RUN`.

**Open: 1** (H-004). **Answered: 2** (H-001 = C, H-002 = B). H-003 is not yet raisable — it needs the Phase 2 specs.

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
blocks: nothing in the queue. Raised because fixing it means crossing a §12.4 boundary, and
because `CLAUDE.md` lists "publishing a public claim the code does not support" under
**Never, regardless of instruction**.
status: **open**

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

answer: *(awaiting)*
