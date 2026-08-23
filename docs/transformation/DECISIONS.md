# DECISIONS — PW-MOBILE-TRANSFORM-01

Append-only. Every Opus-vs-Fable adjudication, every metric-definition change, every candidate
defect refuted in Phase 0, every design question resolved. Nothing here is relitigated.

---

## D-001 — `GapResult.isDetected` is a dead legacy type, not a model-facing schema

date: 2026-08-23
raised_by: Orchestrator (run-start §0.10 verification)
decision: **No halt.** The AI contract is clean.

`lib/services/gap-analysis.service.ts:58` declares `isDetected: boolean` on `GapResult`, which on
its face looks like a §0.10 violation ("No AI provider schema accepts either").

Evidence that it is not model-facing:
- `lib/services/ai/ai-service.interface.ts:67` — "This interface used to carry `isDetected:
  boolean`" — removed from the actual AI service contract.
- `lib/services/ai/ai-service.interface.ts:180` — `severity` removed for the same reason.
- `lib/services/ai/prompts.ts:158-160` — the instruction was deliberately deleted, not merely
  unused.
- `gap-analysis.service.ts` itself records that `analyzePolicy()` — the third gap pipeline that
  consumed this type — was removed in Aug 2026.
- `app/(protected)/wallet/actions.ts:1192` confirms no component ever read it.

Consequence: the type is vestigial dead code on a decommissioned pipeline. Removing it is
cleanup outside this run's scope. The §11.2 engine-ownership guard asserts on the *AI schemas*
(`ai-service.interface.ts`, `prompts.ts`) and on the `lib/gap-detection.ts` hash — not on this
orphan. Recorded so a later pass does not re-raise it as a halt.

`lib/gap-detection.ts` run-start baseline: sha256 `69d2c946aaefc309a1c09f0a72b13baebddc173811e33f4de0b592ca1259b859` (commit `7f6990b7`).

---

## D-002 — A stable, channel-independent notification event id already exists

date: 2026-08-23
raised_by: Orchestrator (run-start verification)
decision: **§6.1 item 6's halt does not fire.** Dedup is presentation-layer. No schema change.

`lib/notifications/orchestrator.ts:354-355` builds the persisted key as
`dedupeKey = ${params.dedupeKey}:${recipient.kind}`. The channel is a *suffix* on a
channel-independent base (`gap:v<n>`, `risk_change:v<n>`, `score:v<n>`, `escalation:<id>` —
see `risk-events.ts:127,157,191` and `retry.ts:120`).

So "one event, one row" (§2.7) groups on the base key with the `:${channel}` suffix stripped.
That is a stable identifier, not the title-plus-timestamp heuristic §6.1 forbids.

**Caveat carried into the fix:** `dedupeKey` is optional (`dispatch.ts:68`,
`orchestrator.ts:267`). Rows emitted without one cannot be grouped by it and must fall back to
rendering ungrouped rather than being merged on a guess. The Phase 0 fixture set must contain
both a keyed duplicate pair and an unkeyed row, or the fix ships untested on half its input.

---

## D-003 — Reuse and rename the existing harness; do not build a second one

date: 2026-08-23
raised_by: Orchestrator
decision: Reuse `tests/measure/`; rename `policy-detail.ts` → `metrics.ts`.

§5.1 says build ONE harness with definitions in a single module. One already exists and already
honours that rule: `tests/measure/policy-detail.ts` holds the shared definitions and
`tests/measure/dashboard.ts` imports them, with a header comment explicitly stating that this is
to stop definitions forking between surfaces.

The defect is housing, not duplication: shared definitions living in a file named after one
surface will not survive ten surfaces. Rename to `metrics.ts`.

One genuine drift to reconcile before reuse: `dashboard.ts:clippedContent` (scans `.pw-page-shell`
for CSS truncation classes) and `policy-detail.ts:clippedLabels` (scans nav/headings for
`scrollWidth > clientWidth`) are two different truncation metrics. §5.2 defines one. They merge
into a single definition before either is used for a baseline.

---

## D-004 — The contract's evidence for Αρχική is stale; re-derive from HEAD

date: 2026-08-23
raised_by: Orchestrator
decision: Re-verify every candidate defect against HEAD before queueing any fix.

§4.3 describes the dashboard as 12 sections with nine-plus CTAs and none primary. `docs/STATUS.md`
records that the dashboard mobile series (Goals 0–5) shipped on `dd815b3d`: 6 sections in every
state, 1 primary CTA, 0 sub-44px targets, 0 count-consistency failures, 0 1.4.11 failures, scroll
−13.6% across all 19 captures.

The contract describes the pre-Goal-0 dashboard. §5.4 requires refuting honestly in both
directions and explicitly warns against "fixing" what was never broken, so the whole candidate
list is treated as unverified until re-measured — not just the dashboard's.

First likely refutation, recorded now: §4.3 cites `AI Insights` in English in the tab bar.
`lib/i18n/translations/el.ts:99` has `insightsShort: 'Αναλύσεις'`, and `AppShell.tsx:81` renders
that key. The English string is in `en.ts` only. The adjacent real defect is `el.ts:1193`
`aiInsights: 'AI Αναλύσεις'` — mixed-script, not untranslated. Reclassify rather than "fix".

---

## D-005 — A guard's universe is part of the guard, and is stated explicitly

date: 2026-08-23
raised_by: Orchestrator (T-014 verification)
decision: Extend `score-containment.test.ts` to `lib/`; never write a second score guard.
Every guard in §11.2 states and justifies its universe against `SURFACES.md`.

The score reaches customers by email (four sites) while a well-written, filesystem-enumerating
`tests/unit/score-containment.test.ts` passes. It passes because its universe is `components/` +
`app/` and every outbound template is in `lib/`. A second guard, `email-content-honesty.test.ts`,
*does* scan `lib/email/templates/` but asserts only that no score **trend** is claimed — it
deliberately permits the **value**.

Right invariant, wrong universe; right universe, narrower invariant. The sentence §2.2 actually
cares about — "never enters email, push, or any outbound channel" — is asserted by neither.

`CLAUDE.md` already says a guard scoped to known locations guards those locations rather than the
invariant. This adds the corollary the repo did not yet have: **that applies to the DIRECTORY the
guard walks, not only to the patterns it matches.** Enumerating exhaustively within too small a
root is still an assumption, and it is a harder one to spot because the guard looks rigorous.

Consequence for Phase 1 item 1: extend the existing guard (§11.1 forbids a second), with outbound
templates FORBIDDEN rather than sanctionable — a sanctioned surface is one that carries the
qualifier at the point of use, and an email cannot carry a disclosure the reader can open.

---

## D-006 — The score's BASIS is in scope; only its arithmetic is not

date: 2026-08-23
raised_by: Product-Truth (Opus 5)
decision: Changing when `provisionalProtectionScore` returns a number **at all** is in scope.
Changing the weighted-average computation is not.

§0.10 and §12.4 put "protection score arithmetic" out of scope and rendering in scope. The
unanalysed/all-expired finding sits on the line, so the line is drawn here rather than argued
about later.

- **Out of scope (arithmetic):** the severity weights `{critical: 25, high: 15, medium: 8, low: 3}`,
  the 0-100 clamp, category weighting in `calculateProtectionScore`.
- **In scope (basis / rendering):** the `if (policyCount === 0) return null` predicate — it decides
  whether a number may be produced, which is the honesty rule, not a calculation. A function that
  returns 100 for a portfolio nobody analysed is not computing wrongly; it is answering a question
  nobody could answer.

This is the same distinction `scoreSupport()` and the §2.3 guards already draw elsewhere in the
repo, applied to the producer instead of the render site.

Blast-radius note for whoever implements it: `provisionalProtectionScore` is imported by
`engagement-drip.service.ts`, `weekly-digest.service.ts` and `tests/unit/email-content-honesty.test.ts`
at minimum. Enumerate before changing; the existing guard asserts its current null-behaviour and
will need updating in the same commit.

---

## D-007 — "How many policies does this person have" has three answers in outbound

date: 2026-08-23 · revised same day after reading `lib/policy-status.ts`
raised_by: Orchestrator
decision: Every Policy query meaning "does this owner hold this policy" uses
`status: { notIn: [...NON_LIVE_POLICY_STATUSES] }`. Lifecycle verdicts continue to come from
`resolvePolicyLifecycle`. These are two different questions and must not be conflated.

**Correcting my first framing of this.** I initially wrote that `status: "active"` should be
replaced by `resolvePolicyLifecycle`. That is wrong, and the repo already says so. `lib/policy-status.ts:3-17`
documents the class and prescribes the fix:

> `status: "active"` … is a recurring bug: the stored status is an ingestion state nothing
> recomputes, so 'active' silently excludes in-force policies stored under the other live states —
> a policy marked "expiring_soon" was dropped from the renewal reminders, the weekly digest, and
> the churn win-back count until this single list replaced three hand-copied ones.

So `status: "active"` is wrong in **both** directions at once:
- it **excludes** in-force policies stored as `expiring_soon` / `action_needed` / `incomplete`;
- it **includes** policies whose cover has ended, because nothing ever writes `'expired'`.

`resolvePolicyLifecycle` answers a different question — is it in force *today*, and when does it
end — and is the right tool for display and countdowns, not for a "do they hold it" filter.

### The fix landed on three of five call sites

| site | filter | verdict |
|---|---|---|
| `lib/services/renewal.service.ts` | `NON_LIVE_POLICY_STATUSES` | correct |
| `lib/services/churn-prevention.service.ts:148` | `NON_LIVE_POLICY_STATUSES` | correct |
| `lib/services/weekly-digest.service.ts:104` (renewals) | `NON_LIVE_POLICY_STATUSES` | correct |
| `lib/services/weekly-digest.service.ts:166` (score denominator) | **no filter at all** | counts deleted, analyzing and cancelled policies |
| `lib/services/engagement-drip.service.ts:152` | **`status: "active"`** | the original bug, missed |
| `lib/services/engagement-scoring.ts:167` | **`status: "active"`** | the original bug, missed |

So the same customer is described by **three different policy counts** depending on which email
reaches them, and the digest's own file uses two different definitions eleven lines apart — the
correct one for the renewals list, none at all for the score denominator.

That is a §2.6 count-consistency failure that crosses channels rather than surfaces, and no
count-consistency metric currently looks at outbound at all.

### Why it was missed

The same shape as D-005. A real fix was applied where the symptom had been observed — three
services whose bug reports existed — and the two that had never been reported kept the defect.
The single shared constant was created, which is the right move, and then not adopted everywhere.
`NON_LIVE_POLICY_STATUSES` needs a guard asserting that no Policy query filters on a bare
`status: "active"`, or the next service written will make it four of six.
