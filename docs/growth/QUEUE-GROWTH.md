# QUEUE-GROWTH — GROWTH-HOOKS-01

Same schema as `docs/transformation/QUEUE.md`. This goal does **not** write that file.

| id | surface | phase | owner role | status | blocking dependencies |
|---|---|---|---|---|---|
| **GB-00** | — | 0 | Orchestrator | **BLOCKED — human decision** | Branch base. `main` is 1180 commits / 6 months stale, lacks `docs/transformation/`, and production runs `NEW-UI`. Recommendation: cut from `NEW-UI`. Nothing in Track A or C starts until this is answered. |
| **GB-01** | — | 0 | Evidence | **retired** | Retired by PW-TRANSPARENCY-02 Amendment 01 (2026-09-05): `policy-wallet-public-surface-audit.md` is not in the repository and its §A/§C premises are stale at HEAD; `docs/transparency/STEP0-FINDINGS.md` §J supersedes it as the source of truth for the public surface. Do not reconstruct it. |
| **GA-01** | marketing | A | Evidence | **open** | Free-tier **2→3 contradiction** — the one §B item not verified either way. Needs the audit's wording, or an independent comparison of every surface stating a free-tier allowance. |
| **GA-02** | marketing | A | Product-Truth | blocked by GB-00 | Hook register `HOOKS.md` — ten rows, canonical copy, ≤72 Greek chars, claim-free phrasing. |
| **GA-03** | marketing | A | Implementation | blocked by GA-02, GB-00 | `HookTicker` primitive. **Must extend or replace `components/landing/HeroSlides.tsx`, not sit beside it** — a second rotator is the parallel-primitive failure this repo already has a protocol against. |
| **GA-04** | marketing | A | Product-Truth | blocked by GB-02 | **Guide reconciliation decision, per hook: create / merge / extend.** 12 articles already exist and ≥5 collide with hooks (H4↔`prostimo-anasfalistou-oximatos`, H7↔`omadiko-symvolaio-ergasias`, H6/H5/H1 adjacent). Two pages competing on one domain is an SEO and truth harm. |
| **GA-05** | marketing | A | Implementation | blocked by GA-04 | Guide bodies to the §3.2 schema, EL + EN, JSON-LD, sources block. |
| **GB-02** | — | B | Evidence | **open, starts now** | `SOURCES.md` — primary Greek sources for all ten hooks. Branch-independent, and blocking for A and C. |
| **GB-03** | — | B | Evidence | blocked by GB-02 | `sources-freshness` guard + `sources-resolve` guard, each demonstrated failing first. |
| **GC-01…06** | app | C | Implementation | **SPEC ONLY** | H1, H2, H4, H5, H6, H8 journeys. The goal's gate is "Phase 1 green AND design system exists"; Phase 1 is green, the **design-system phase is not started** (`pw-transform-v2-phase-4-complete` untagged). Implementation queues behind Phase 4. Build order when unblocked: **H4 first** (highest conviction, lowest complexity). |
| **GC-07** | app | C | Evidence | **open** | **Confirm the outbound dispatch stub is inert.** Not established in Step 0 — no explicit inert flag found. §7 forbids any real dispatch, so this precedes any Track C test. |
| **GC-08** | app | C | Orchestrator | blocked | Register hook→obligation mapping against the §7.2 asset-obligation calendar. **Do not build a second calendar or notification type.** Needs Phase 2 owner scheduling. |
| **GD-01** | — | D | Product-Truth | **open, starts now** | Proposal: `coverage_voiding_condition` gap category (H3). |
| **GD-02** | — | D | Product-Truth | **open, starts now** | Proposal: cross-policy overlap detection (H7). |
| **GD-03** | — | D | Product-Truth | **open, starts now** | Proposal: rebuild-cost estimation (H1) — recommend against before underwriter sign-off. |

## Draft row for `docs/transformation/HALTS.md` → `## Inbound dependency requests`

**LANDED 2026-08-26**, once `P5-wallet-01` completed and released `docs/transformation/**`. Written to
`HALTS.md` under `## Inbound dependency requests`. Text as filed:

> **GROWTH-HOOKS-01 → Orchestrator.** Track C (in-app journeys H1, H2, H4, H5, H6, H8) needs
> scheduling behind the Phase 4 design system; it is spec-only until then. Track C also needs the
> hook→obligation mapping scheduled against the §7.2 asset-obligation calendar owner — growth will
> **not** build a second calendar or notification type. No response needed before Phase 4 opens.
