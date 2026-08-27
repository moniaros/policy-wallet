# RESULT — Ειδοποιήσεις `/notifications` — Phase 5 rebuild, PW-MOBILE-TRANSFORM-02

**Date:** 2026-08-27 · **Branch:** NEW-UI · **Session:** paid (`e2e-ph@policywallet.test`, `measure` project)
**Spec:** `tests/measure/notifications-rebuild.spec.ts` — the full `captureSurface` battery plus the two
Phase-5 §11 metrics (`duplicateActions`, `countConsistency`) and `clippedLabels`, all imported from the
shared definitions, nothing redefined.
**Runs:** `data/p5-rebuild-baseline/` (pre-rebuild, measured first) → `data/p5-rebuild-after/` (final).
The account is snapshotted before and restored byte-identically after every run (47 rows, readAt included).

## States

| state | how it is built |
|---|---|
| `populated` | real accumulated history + the standing P1-04 channel-duplicate fixture; the fixture's two in-app rows forced unread |
| `all-read` | every in-app row read-stamped |
| `empty` | all rows deleted (restored from snapshot afterwards) |

**Failed/unavailable — unreachable, and why.** `page.tsx`'s `!data` branch needs an unauthenticated
caller, whom `proxy.ts` bounces to signin before the page runs; `error.tsx` needs a server exception
(a dead DB) that cannot be staged without taking the shared dev stack down mid-suite. Per-event
delivery FAILURE (`status: "failed"`) deliberately does not render — delivery bookkeeping is not
customer-facing (§2.7, ledger N-04) — so no degraded per-row render exists to measure.

## Before / after — §11 battery × 3 widths × 3 states

Baseline (b) → after (a). 1.4.11 is reported as `control-class` (the gated class; the same accounting
the dashboard series used — `surface`/`unmeasured`/`subpixel` are recorded in the JSON, not gated).

| state@width | scrollHeight b→a | sections b→a | containers b→a (depth) | dup-facts b→a | dup-actions b→a | count-consistency b→a | sub-44 b→a | clipped/overflow b→a | 1.4.3 b→a | 1.4.11 control b→a | leaks b→a | truncation b→a |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| populated@320 | 5262→**4010** | 1→2 | 30→29 (2→2) | 0→0 | **4→0** | 0→0 (14→12 unmeasured) | 0→0 | 0→0 | 0→0 | **21→0** | **3→0** | 20→**2** |
| populated@390 | 4018→3762 | 1→2 | 30→29 | 0→0 | 4→0 | 0→0 | 0→0 | 0→0 | 0→0 | 21→0 | 3→0 | 7→1 |
| populated@430 | 3710→3594 | 1→2 | 30→29 | 0→0 | 4→0 | 0→0 | 0→0 | 0→0 | 0→0 | 21→0 | 3→0 | 6→0 |
| all-read@320 | 5166→**3874** | 1→2 | 29→28 | 0→0 | 4→0 | 0→0 | 0→0 | 0→0 | 0→0 | 18→0 | 3→0 | 20→2 |
| all-read@390 | 3882→3538 | 1→2 | 29→28 | 0→0 | 4→0 | 0→0 | 0→0 | 0→0 | 0→0 | 18→0 | 3→0 | 7→0 |
| all-read@430 | 3654→3438 | 1→2 | 29→28 | 0→0 | 4→0 | 0→0 | 0→0 | 0→0 | 0→0 | 18→0 | 3→0 | 6→0 |
| empty@320 | 864→864 | 1→2 | 6→5 | 0→0 | 0→0 | 0→0 (fully measured) | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |
| empty@390 | 988→988 | 1→2 | 6→5 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |
| empty@430 | 1076→1076 | 1→2 | 6→5 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 | 0→0 |

## What changed, and the measurement that justified each change

1. **Cards through `.pw-card`, not a hand-rolled border recipe.** The old `border-black/10` edge on 24
   interactive cards measured 1.21–1.37:1 — 21 control-class 1.4.11 failures at populated@320 (18
   at all-read; the rest of the 24 recorded readings were `unmeasured`). The primitive plus
   the element-scoped `--pw-border-control` rule is the ratified fix (globals.css, the dashboard's
   Goal-4 lesson). Control-class 1.4.11 → 0.
2. **The card stopped being one big `role="button"`.** The action collector excluded all 20 show-more
   toggles as `nested-in-command` (invalid ARIA: a control wrapping controls). Mark-read is now two
   explicit per-item paths — a 44×44 native unread-dot button, and expanding the message marks it
   read. Exclusions → 0; the toggles became first-class, measurable offers. Guard rewritten:
   `tests/unit/notification-item-keyboard-activation.test.ts` now pins the inverse invariant.
3. **Rows are `<li>` in a real list; actions instrumented.** The baseline's 4 gated duplicate-action
   groups were pairs of byte-identical legacy cards (unkeyed channel-duplicate rows, which D-002
   forbids merging heuristically) grouped by accessible-name identity. With `data-action` +
   per-row subjects (`dismiss` subject = event id; `viewPolicy` subject = event id, NOT policy id —
   two notifications about one policy are two rows, not one offer twice) → 0 gated groups.
4. **Timestamp moved above the title.** The 320px capture showed unread titles wrapping one word per
   line: 44px dot button + 12px gap + ~95px nowrap timestamp in a 272px card interior. A full-width
   metadata line returned the width: scrollHeight@320 5262→4010 (−24%) and truncation@320 20→2.
5. **Stored history scrubbed at the render boundary** (`actions.ts`, both read paths, via
   `scrubRenderableText`). Two legacy `policy_analysis_failed` rows carried the PENDING sentinel pair
   verbatim (BASELINE.md N3 — stale rows predating the emit()-level scrub; the table is never
   pruned), and one row carried a fixture policy number. Leaks 3→0, and the two sentinel numerals
   also left the unmeasured-numeral count (14→12).
6. **Hardcoded `tr(el, en)` copy moved to the i18n store** (`t.notifications.*`; six new keys, six
   existing reused). Invariant, not metric-driven.
7. **`section#history` landmark** — sections 1→2; the list is now a named grouping, not an accident
   of the collector's column heuristic.
8. **Decorative header icon tile removed; unread dot 10px→6px.** Container composition at 320 was
   enumerated live: 24 of 30 were the event rows themselves, 3 are shell chrome (sticky header, its
   badge, bottom nav), leaving header + icon tile + preferences button. The tile was the one
   page-owned bounded box carrying no information. Page-owned containers now 26 = the 50% line of
   the page-owned Phase 0 baseline (52 of 55 were page-owned).
9. **Dead code deleted:** `NotificationBell.tsx` (unmounted since UserMenu dropped its `compact`
   branch — zero importers, verified by grep and tsc), `NotificationCard.tsx`, and the dead
   `index.ts`/`types.ts` barrel. Ledger rows N-12/N-13; two ratchet lists shrank.
10. **Capability repairs recorded in the ledger:** N-07 (row → policy navigation) implemented with a
    server-verified destination; N-08 (policy filter) recorded as DEFERRED — it had been silently
    absent since P1-04.

## Deliberately left

- **The 12 unmeasured numerals** are historical notification bodies whose numbers were frozen at send
  time («6 νέες προτάσεις», «Εντοπίσαμε 2 κενά κάλυψης»). Instrumenting them with live count keys
  would report history as contradiction — the standing INSTRUMENTATION-PLAN.md decision, respected.
  `countConsistency` verdict is therefore `consistent-but-unmeasured` on populated states, which is
  the honest reading, and `consistent-and-fully-measured` on empty.
- **Residual truncation (≤2 per capture)** is the ratified expand-in-place clamp: `line-clamp-3`
  released by «Εμφάνιση ολόκληρου μηνύματος», registered as *reachable* in
  `clamped-text-reachability`. The metric has no exemption channel for release-in-place clamps, so
  the entries are reported, not hidden.
- **1.4.11 surface-class readings (19 populated / 2 empty)** — decorative card edges at ~1.2:1, the
  product-wide `--pw-border` decision (1.4.11 does not govern non-control boundaries); same ungated
  accounting as the dashboard series.
- **The nav-overlap group** (logo → `/dashboard` vs «Αρχική» → `/dashboard`) is shell chrome,
  reported-not-gated by the collector's default policy, and outside this boundary.
- **Absolute timestamps** stay (short date + time). The N-03 relative-time reframe remains open from
  P1-04; nothing measured here justified re-deciding it.
- **Chronological order** stays — unread rows are not floated above read ones; a history that
  reorders itself is no longer a history.

## Honesty notes

- The Phase 0 T-015 baseline (`data/current/`, 2026-08-23) measured the PRE-V2-P3 page (channel
  chips, preferences tab). The `p5-rebuild-baseline` run in this file is the honest immediate
  pre-rebuild reference; both are kept.
- The empty state says «Δεν υπάρχουν ειδοποιήσεις ακόμη» — empty, never all-clear.
- `scrollHeight` differences between populated and all-read at the same width are real: bold unread
  titles wrap differently, and the mark-all row renders only while something is unread.
