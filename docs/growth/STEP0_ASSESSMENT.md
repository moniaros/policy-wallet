# GROWTH-HOOKS-01 — Step 0 assessment

**Written 2026-08-26. No product code written. No file outside `docs/growth/` modified.**

Three findings below invalidate premises the goal is built on. None is a reason to abandon it; each
changes what the work *is*. They are stated first because two of them decide whether any of it can
ship at all.

---

## BLOCKER 1 — `feat/growth-hooks` cannot be cut from `main`

The goal says, with emphasis, "cut from `main`, **not** from `NEW-UI`". Measured:

| | |
|---|---|
| `origin/main` last commit | `f25015f2`, **2026-02-16** — six months stale |
| `NEW-UI` ahead of `main` | **1180 commits** |
| `main` ahead of `NEW-UI` | 0 commits |
| `docs/transformation/` on `main` | **absent** |
| Branch deployed to production | **`NEW-UI`** (`.github/workflows/deploy.yml`, and every deploy this week) |

`main` is not the trunk. It is an abandoned pre-rewrite branch. Building the marketing surface on it
would mean: authoring against six-month-old components, no access to the transformation record the
rest of Step 0 depends on, and a 1180-commit merge before a single line reached a user.

**I did not create the branch.** Cutting from `main` executes the instruction and produces
undeliverable work; cutting from `NEW-UI` contradicts an emphasised instruction. That is a decision,
not a default, so it is the first thing on the go/no-go table.

**Recommendation: cut `feat/growth-hooks` from `NEW-UI`.** The emphasis on "not `NEW-UI`" reads as
intended to keep growth work off the transformation branch — which a *separate branch plus separate
worktree* already achieves, whatever its base.

---

## BLOCKER 2 — `policy-wallet-public-surface-audit.md` does not exist

The goal references its §A and §B as the definition of the audit debt Track A must clear first
(§3.3), and §2.3 calls §A "the reference failure". **No such file is tracked in this repository.**
`docs/audits/` holds 21 audits; the nearest are `marketing-website-audit-2026-08.md` and
`marketing-launch-report-2026-08.md`. Neither is the cited document.

So the named defects cannot be resolved *against that document*. I checked for the defects
themselves instead, which is the better test anyway:

| §A / §B defect as described | Live? | Evidence |
|---|---|---|
| `500+`, `10.000+`, `98%` claims | **No** | Absent from `lib/i18n/translations/{el,en}.ts` — the render source, since this codebase forbids hardcoded UI strings. Absent from live `/`, `/pricing`, `/product`, `/guides` (fetched 2026-08-26). |
| Two fabricated testimonials | **No** | Removed, with tombstones: `ProductSections.tsx:383` "Invented testimonial removed (brand doc §7)"; `AgentsSolutionPageClient.tsx:219` "no invented testimonials (EU consumer-law risk)". |
| `0/0/0` stat band | **No** | No match in `app/`, `components/`, `lib/`. `AudienceTabs.tsx:165` tombstones the former 92%/71%/98% tiles. |
| Placeholder phone | **No** | No placeholder-shaped number found. |
| Single contact domain | **Not a defect as stated** | Two addresses exist (`info@`, `dpo@`) on one domain — which is correct for a DPO contact, not a placeholder. |
| Free-tier 2→3 contradiction | **Not verified** | Needs the missing audit's §B wording to know which two surfaces it compared. Carried as an open question, not asserted either way. |

**A caution on my own method.** My first grep swept `app/(public)` and `components/` and found only
tombstone comments. That is the same trap this repo has hit four times — an absence check matching
the prose that describes the removal. It was also the *wrong universe*: UI strings render from the
i18n store, not from components. The table above is the corrected search. The live-page fetch is
what makes it evidence rather than inference.

**Consequence:** Track A's precondition is **already satisfied**, and §3.3's removal work is largely
done. What remains is one unverified item (free-tier 2→3) and the missing audit itself.

---

## BLOCKER 3 — `/guides` already exists, with 12 published articles

§3.2 reads as a greenfield build ("Ten articles … Route `/guides` index + `/guides/[slug]`"). Both
routes exist in EL **and** EN, driven by `lib/guides/content.ts` (12 entries):

`ekptosi-enfia-asfalisi-katoikias` · `kena-kalypsis-ti-einai-pos-ta-vriskete` ·
`checklist-ananeosis-asfalistiriou` · `ti-kalyptei-i-asfaleia-aytokinitou` ·
`apallagi-asfaleia-ygeias-pos-leitourgei` · `poso-kostizei-i-asfalisi-seismou` ·
`asfaleia-katoikidiou-ti-exaireitai` · `omadiko-symvolaio-ergasias` ·
`prostimo-anasfalistou-oximatos` · `diaxeirisi-asfalistirion-se-ena-simeio` ·
`pliromi-asfalistron-psifiaka` · `efarmoges-asfalistirion-apozimioseis`

At least five collide with hooks rather than complement them:

| Hook | Existing article | Relationship |
|---|---|---|
| **H4** ΑΑΔΕ uninsured-vehicle | `prostimo-anasfalistou-oximatos` | **Same subject.** Writing a second is self-competing. |
| **H7** group vs individual health | `omadiko-symvolaio-ergasias` | **Same subject.** |
| **H6** ΕΛΓΑ vs replacement cost | `poso-kostizei-i-asfalisi-seismou` | Adjacent peril/catastrophe content. |
| **H5** dog-owner liability | `asfaleia-katoikidiou-ti-exaireitai` | Adjacent — pet policy exclusions. |
| **H1** rebuild vs objective value | `ekptosi-enfia-asfalisi-katoikias` | Adjacent — home valuation and ΕΝΦΙΑ. |

Publishing ten new articles without reconciliation puts two pages on one domain competing for the
same query — an SEO harm and a truth harm, since the two could disagree. **Track A's guide work is
an extend-and-reconcile exercise, not a build**, and each hook needs an explicit
create / merge / extend decision before copy is written.

---

## 0.2 — Required answers, with evidence

| Question | Answer | Evidence |
|---|---|---|
| Which transformation phase is open; is Phase 1 gated green? | **Phase 5 (rebuild) is open.** Phase 1 is **green** — tagged. | Tags `pw-transform-v2-phase-{0,1,2,3}-complete`; `STATUS.md` "Phases 0–3 complete and tagged" |
| Does the Phase 3/4 design system exist? | **No, as a phase deliverable.** `pw-transform-v2-phase-4-complete` is **not** tagged and `STATUS.md` lists the design system under not-started. A *pre-existing* `design-system/policywallet/` + `components/ui/` do exist. | `git tag -l`; `design-system/policywallet/MASTER.md` |
| Open halts intersecting this goal? | **H-010** (open — structured-extraction gaps incl. cyber/business/pension; intersects **H8**, and **H7** via cross-policy identity) and **SEC-01** (open — Vercel log drain; does not intersect). H-001…H-009 answered. | `HALTS.md:703`, `HALTS.md:777` |
| Is `lib/gap-detection.ts` canonical? | **Yes.** sha256 `69d2c946…1259b859`, matching the frozen baseline. Last touched `7f6990b7`, before this run. | `shasum`; `git log -- lib/gap-detection.ts` |
| §A false claims / testimonials still live? | **No.** See Blocker 2. | i18n store + live fetch of 4 pages |
| Does `/guides` exist? | **Yes**, EL + EN, 12 articles. | `app/(public)/guides/**`, `app/(public)/en/guides/**`, `lib/guides/content.ts:92` |
| Existing marquee/ticker/rotating component? | **Yes — `components/landing/HeroSlides.tsx`.** No generic ticker primitive. | grep for marquee/ticker/rotating/carousel |
| Outbound dispatch stub confirmed inert? | **NOT CONFIRMED.** No explicit inert flag located; only cadence-ceiling code. Treated as **unverified**, and §7 forbids any real dispatch, so this must be established before Track C testing. | `lib/notifications/cadence-options.ts:10` only |

**Halt-condition check (§10, shared surface):** `app/(public)` imports **nothing** from
`components/wallet/**` or `components/dashboard/**`. It shares the i18n *mechanism*
(`useLanguage`/`getTranslations`) but marketing keys are separately namespaced, so Track A adds keys
rather than editing transformation-surface keys. **Not a de facto edit.** The `locale-purity` guard
must assert this rather than assume it.

---

## 0.3 — Go / no-go

| Track | Verdict | Reason |
|---|---|---|
| **A — Marketing surface** | **GO, scope changed** | Marketing is outside the seven transformation surfaces (verified above) and §A is already clear. But §3.2 is extend-and-reconcile over 12 existing articles, and §3.1 must extend/replace `HeroSlides`, not add a parallel rotator. **Gated on Blocker 1** — no branch exists to build on. |
| **B — Source verification** | **GO** | Unblocked, and blocking for A and C. Start here regardless of Blocker 1: `SOURCES.md` is branch-independent. |
| **C — In-app journeys** | **SPEC ONLY** | Phase 1 green **but** the design-system phase is not started, so the goal's own gate ("Phase 1 green AND design system exists") fails on the second clause. Implementation queues behind Phase 4. Also: dispatch stub unverified. |
| **D — Engine-change proposals** | **GO** | Documents only. H3, H7, H1-estimation. |

**Nothing starts until Blocker 1 is decided**, except Track B and Track D, which are document-only
and branch-independent.

---

## Deviations from the brief, and why

1. **No branch or worktree created.** Blocker 1 makes the base a decision, and Step 0 says report
   and stop.
2. **This file is written on `NEW-UI` in the main checkout**, not in a growth worktree, because no
   worktree exists yet. It is a new directory (`docs/growth/`) and collides with nothing.
3. **The §0.4 append to `docs/transformation/HALTS.md` is DEFERRED.** A `P5-wallet-01` agent is live
   right now with `docs/transformation/**` in its file boundary. Appending mid-run is how this run
   previously produced a capture describing neither fixture. The row is drafted in
   `QUEUE-GROWTH.md` and moves across the moment that agent lands.
