# HALTS — PW-MOBILE-TRANSFORM-01

Questions only the human may answer (§12.1) and items blocked under §12.2.
A halt blocks the listed items, not the run, unless marked `blocks: RUN`.

**Open: 1.**

---

## H-001 — Should the protection score exist at all?

date: 2026-08-23
raised_by: Product-Truth (Opus 5)
blocks: the *final* disposition of the score. Does **not** block Phase 1's removal of the score
from outbound, which §12.1 states explicitly is not a decision.
status: **open**

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

Two independent reasons, both structural rather than incidental:

1. **"Nothing to score" is implemented as `policyCount === 0`.** The honest predicate is "nothing
   *analysed*". The empty portfolio is caught; the unanalysed one — which every new customer
   passes through — is not.
2. **The all-expired case cannot be caught by that filter even in principle.**
   `engagement-drip.service.ts:151` selects `where: { status: "active" }`, and **nothing in the
   codebase ever writes `status: 'expired'`** — expiry is derived at render time by
   `resolvePolicyLifecycle`. So the column reads "active" forever and an entirely lapsed portfolio
   counts as fully covered. This also violates `CLAUDE.md`'s standing rule that status, expiry and
   any countdown come from that one call.

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
(WCAG 1.4.1) whatever colours it keeps; and the `status: "active"` column read is replaced with
`resolvePolicyLifecycle`, because "expired policies count as active cover" is wrong under every
option above.

answer: *(awaiting)*
