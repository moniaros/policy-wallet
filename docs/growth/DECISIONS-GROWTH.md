# DECISIONS-GROWTH — GROWTH-HOOKS-01

## D-G01 — Branch base: `feat/growth-hooks` cut from `NEW-UI`, separate worktree
`main` is 1180 commits and six months stale (last commit 2026-02-16), does not contain
`docs/transformation/`, and production deploys `NEW-UI`. The original "not `NEW-UI`" instruction was
protecting the transformation branch from pollution; a separate branch in a separate worktree
achieves that regardless of base. Cutting from `main` produces undeliverable work.
Worktree: `../pw-growth`, branch `feat/growth-hooks`, from `ecffa8f1`.

## D-G02 — Track A precondition satisfied before the goal began
The §A false claims (`500+` / `10.000+` / `98%`), both fabricated testimonials and the `0/0/0` band
are gone — absent from `lib/i18n/translations/` and from four fetched live pages.
`policy-wallet-public-surface-audit.md` is not in the repository; the defects were verified directly,
which is stronger evidence than the document would have been.

**The method is recorded because it nearly went wrong.** The first grep swept `app/(public)` and
`components/` and found only tombstone comments describing the removals — in a codebase that forbids
hardcoded UI strings, so the strings could never have been there. Wrong universe, and the
tombstone-matching trap for the fourth time in this run. The corrected search of the i18n store plus
the live fetch is what made it evidence rather than inference.

## D-G03 — Free-tier 2-vs-3 stays OPEN
Not verifiable either way at Step 0. **Not closed on absence.** Now a Track B item: resolve against
the pricing source of truth and fix whichever surface is wrong.

## D-G04 — §3.2 is extend-and-reconcile, not author-ten-new
Twelve published articles exist in both locales. See `HOOK_RECONCILIATION.md`.

## D-G05 — `HookTicker` extends or replaces `HeroSlides.tsx`
Never a second rotator on one page — that is the duplicate-action class arriving on the marketing
surface. Which of extend/replace applies is established in G-05 and recorded there.

## D-G06 — H4 and H7 are EXTEND, and that is a halt avoidance, not a preference
Both hooks are **already published**, verified by opening the articles rather than reading slugs:
`prostimo-anasfalistou-oximatos` already carries the ΑΑΔΕ cross-check, δήλωση ακινησίας, and the
question "πώς ελέγχω αν το όχημά μου εμφανίζεται ασφαλισμένο"; `omadiko-symvolaio-ergasias` already
carries the leaving-employment cliff and the individual top-up. Publishing a second article on
either would leave **two live URLs making the same statutory claim** — a §10 halt condition under
the amended rules, not a judgement call.

## D-G07 — H9 and H10 are CUT from the guide corpus, retained as B2B surface items
Neither is a checkable statutory fact about the reader's own policy, which is what §3.1 requires of
a hook. Both are service offers. H10 keeps a ticker slot on `/solutions/agents` per §3.1's audience
split; neither earns a `/guides` article. Recorded as cut, not dropped.
