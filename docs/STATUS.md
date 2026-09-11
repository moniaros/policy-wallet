# STATUS

**Production: `7f570f51`** — the DPIA input pack is generated and the generated compliance records are guarded (PW-PROVENANCE-01 W4-02, PR #334, deploy run 34631981624, 2026-09-11 18:15Z): `docs/compliance/DPIA-INPUTS.md` maps all 714 columns of the 57 personal-data stores to their recorded purpose and basis, states the two Art. 9 routes, and renders a 10-row transfer table from the rows `/subprocessors` publishes with each AI client's constructor read from code (all three: `apiKey` and nothing else — the §14.1 fact, now pinned by a test). **It also closes the gap W4-01 shipped with: `generate-ropa.ts --check` existed and nothing in CI ran it**; guard `generated-compliance-docs-current` now fails the build when either generated document is stale. No runtime surface; anonymous production smoke green, no new Sentry group — `docs/evidence/provenance-w4-02/RESULT.md`. CI passed first attempt this time. Over `568fee72` — the Art. 30 record is generated from the schema (PW-PROVENANCE-01 W4-01, PR #320, deploy run 34627851127, 2026-09-11 17:31Z): 57 personal-data models carry a `/// @ropa` tag, `docs/compliance/ROPA.md` is generated from them and guard `ropa-tags-complete` fails CI on an untagged store. No runtime surface, so the anonymous production smoke (8 public routes 200 in Greek, the auth routes 307 to signin, Playwright 2/2, no Sentry group first seen after the deploy) proves the deploy is live and the product unchanged — `docs/evidence/provenance-w4-01/RESULT.md`. **CI on NEW-UI flaked once more on `area-detail-questions` and SKIPPED the deploy; re-running the failed jobs fired it. Third time in four days — see Top risks.** Over `560a0681` — the pricing surface refuses a purchase it cannot complete (#333, deploy run 34578482913, 2026-09-11). **This closed a LIVE defect, not a hypothetical one:** `/pricing` was advertising €4.99 and €8.99 with a working buy button while `STRIPE_SECRET_KEY` was a TEST key — read from the live page's own payload (`stripeMode:"test"`) — so a visitor could reach a sandbox Stripe page, type a card and land on the success screen having paid nothing. Verified on production after deploy: the paid cards now carry `checkoutUnavailableReason="sandbox_in_production"` and «Οι online αγορές είναι προσωρινά κλειστές» / «Online purchases are paused», the free card is untouched, and every price still renders (€0/€4.99/€8.99/€39/€79 and the agent tiers). **Self-healing:** setting a live key in Vercel restores the buttons with no deploy. Over `53797aee` — the unshared-policy count is the customer's disclosure, not the platform's (#331, halt H-B2 + D-06, deploy run 34454502928, 2026-09-10): with it, PW-BRIDGE-01's last two open questions are answered and the loop's repair phase is complete. The post-merge CI on this commit failed once on the known `area-detail-questions` flake (630/631 files, 7330/7331 tests) and that SKIPPED the deploy entirely — re-running the job turned it green and the deploy then fired. **A red gate does not just report; it silently withholds production.** Over `95c2dbe0` — the registration kill-switch (#332, deploy run 34415772058, 2026-09-09 23:11Z): `ALLOW_REGISTRATIONS` is read on all four account-creation paths, and production's value is `NO`, so signups are CLOSED and the notice is live. Over `c436f177` — the customer's ask becomes a work item (#330, deploy run 34412082119, 22:24Z). Previous: **`892bfd62`** — PW-BRIDGE-01 Queue D measured before designing (#329, deploy run 34328728826, 2026-09-09 08:25Z): three of six candidates closed without building a surface. Over `5f49e9bb` — Queue C closed (#328, 07:04Z). Over `d9e670b1` — Queue C-03/04/05/08, the report saying what the app says (#326/#327, 22:25Z and 23:03Z). Over `cb19406b` — Queue B tiers 2 and 5 (#325, 21:32Z). Over `8852bc50` — tiers 3 and 4 (#324, 20:46Z), with **0 orphan grants** in production. Over `4bcdafa3` — Queue B tier 1 (#323, 19:10Z), verified end to end: generating a branded report created exactly ONE notification row addressed to the POLICY OWNER, in-app, `sent`, naming the actor, dated, deduped per policy per day; a second view added no row. Over `eacc60ad` — Goals 5–6 live and the catalogue aligned (deploy run 34262203801, 18:21Z): production `gap_definitions` 50 rows / 50 active / 14 branches, digest `8045aa4e46935b149e2864f9a20c502a` equal to dev's, `/methodology` renders «50 κανόνες σε 14 κλάδους». Previous: **`55051255`** — Detail of the deployed commit: the bridge residues (#322; deploy run 34158511174, 2026-09-07 20:16Z): C-01b — every residue countdown and both raw expiry windows go through the one lifecycle call (the fact shapes NAME the resolved date; a fourth builder found on the wallet policy page; guard rule (c) on raw windows) and A-01b — the credential column is omitted at the Prisma client (`omit: { user: { password: true } }`, generator `omitApi`; 11 full-row user loads and 9 bare User includes narrowed to selects; guard rules (c)(d)(e)); plus the type-check script's explicit 4 GB heap after CI's ~2 GB default OOMed at the edge. Smoked on production with the owner's policyholder session: /dashboard, /wallet, the expired policy page and /protection render; no app console error. Previous: **`d8827ad7`** — #317 (the compliance docs pack, merged by a parallel session) on top of the B2C home's «Συνοπτική εικόνα» facts row re-laid as a container-stepped fact-cell grid (#321 → `8425f3ea`; deploy run 34140208489, 2026-09-07 15:48Z, carrying both). Smoked on production with the owner's policyholder session at 549px: the card is `@container`, the h2 carries the new recipe, the pill reads «2 δεν αξιολογήθηκαν» and «3.374 € συνολικό ετήσιο ασφάλιστρο», no horizontal scroll, no score fact, no app console error; the desktop widths could NOT be checked on production — the extension cannot resize the owner's window (stays 549) — they hold on the local production build at 1024/1280/1440 (rounds 1–3, `docs/evidence/dashboard-facts/`). Over the four squashes of the 2026-09-07 goal series: bridge C-01/C-02 — the digest and the renewal cron count from the one lifecycle call (#316 → `873eba68`, deploy run 34122411356, 12:32Z; prod `coverage_end_date` backfilled on three rows by SQL, before-values recorded; the two stale open renewal cycles went 2 → 0 with the column repair, 0 of 8 unresolved — SELECT 18:40Z), the register sweep + the placeholder scrub on AI prose (#318 → `85ae3e80`, deploy run 34129168697, 13:45Z; smoked: /protection life tagline «Σιγουρευτείτε», no singular, no placeholder), the agent-side bridge residue A-07/A-11/A-12/A-13/A-14/A-15/A-16/A-17/A-18 (#319 → `04274609`, deploy run 34136272053, 15:07Z; policyholder side smoked on production — the expired policy's review section renders open with the dated provenance line and the pre-plan sentence, no score fact anywhere; the AGENT side is NOT smoked: the owner's browser session offers only Ασφαλισμένος/Διαχειριστής views), and the audit ledger docs (#286 → `f034f9c4`). Housekeeping: #310, #287, #225, #47 closed with notes; #295 kept with a rebase + source-map re-measure comment. Previous: **`21160711`** — the story series' follow-ups (#315, deploy run 34098730747, 2026-09-07 08:10Z: branch content on the ratified term, the summary's recording-finding sentence), over the B2C story series, three squashes on 2026-09-07: the home as a story (#311 → `345d8321`, deploy run 34087702665, 05:44Z), «Καλύψεις & κενά» as a protection story (#314 → `1c9dde12`, deploy run 34089281527, 06:06Z), the mobile menu ☰/X (#313 → `b7811030`, deploy run 34091421340, 06:37Z); each smoked signed-in on production with the owner's session. Previous: **`3c287313`** — PW-CONTENT-01 Goals 1–4 and 7 (PR #308, deploy run 34038640338, 2026-09-06 14:20Z; smoke in `docs/evidence/content-g8/`). Before that: **`7b86805d`** — PW-TRANSPARENCY-02 close-out (PR #307, deploy run 33996579556, 2026-09-05 22:43Z; previous production `e55cf432` = B4 #304, `886ac01f` = R3 #303, `6ff5aebc` = #301, `b0044eaa` = #300, `85088850` = #299). Before the series: **`45013e3f`** — the Document Validation Gate (PR #298), merged and deployed
2026-09-05 00:00Z (deploy run 33930719296) after CI green (one flaky, unrelated
`area-detail-questions` case re-run); prod migration `20260905120000_document_validation_stamp`
and the `policies` bucket INSERT-policy drop verified by query BEFORE the merge; production
smoke: one junk PDF refused with no rows and no tokens, one real schedule validated and analysed
(evidence in Done below and in `docs/audits/document-validation-gate-2026-09.md` §7). Previous:
**`b395a106`** — merged 2026-09-04 (PR #290 carrying the whole stack #291 → #294 →
#296: the Steady phone layer, B2B batches B and C, the audited customer intake); CI green,
deployed 2026-09-04 11:48Z (deploy run 33868900303) and verified: 200, the phone-layer
stylesheet served by production, no new Sentry group in the window after. Previous:
`a910cbe7` (hotfix #292, every upload committed a policy with zero documents) on `6cb43303`
(Direction A, PR #288) + `addfb7e6` (PR #289, dashboard link-card borders and coverage-map tiles).
The Grafí homepage (`76f62a43`, 2026-08-30) is LIVE and smoked: fixed-promise H1, 16-line ticker, sourced numbers with
their links, retired sentence absent, 4 steps + ReadingDemo, broker band, comparison, three
pricing cards (€0/€4.99/€8.99) + recommender, CTA white-on-green, no h-scroll at 390; /en
mirror, partners pair noindex, /_vercel scripts 200 (were 307). Zero new Sentry groups in the
2h window after deploy.

## Current phase

**ALLOW_REGISTRATIONS — the registration kill-switch is wired (PR #332, `feat/allow-registrations-flag`, 2026-09-10).** The owner added the variable to Vercel (Production, Preview, Development) and nothing read it. Implemented as a LOCK, not a message: `lib/auth/registration-gate.ts` is the one answer to "may an account be created", and all four doors ask it — `registerUser` (an export of a `"use server"` file, so a callable endpoint with no UI), `/auth/callback` (where the `User` row is born for OAuth AND magic-link), the public `/api/v1/auth/magic-link/request`, and the signup screen. Declared as the flag `auth.allow_registrations` rather than read raw: `parseBooleanEnv` already understands the `YES`/`NO` the owner typed and refuses to read a TYPO as "off", so absent/blank/misspelt means OPEN — the fail direction a front door must have — and the pause is liftable from `/admin/automation/flags` without a redeploy. **Invited customers are exempt** (owner decision): an address with an agent-created phantom row or a live `Invite` still activates, bound to the ADDRESS not the token, so a leaked link opens nothing. The signup screen keeps the form for a `?token=` arrival and otherwise shows a notice that says invitations still work — invited people who type the URL instead of following the link would otherwise be turned away by a rule that exempts them. Guard `account-creation-behind-gate` enumerates creation call sites from the FILESYSTEM and demands an import or a written exemption; **its first probe run PASSED because the probe's own comment mentioned the module path** — the "guard matched a mention inside a comment" failure this repo has recorded twice — so both scans now strip comments and the check requires an `import` statement. Verified in the running app (notice and form, `el`/`en`, both roles, flag off and on; signin untouched), `registerUser` proven never to reach `supabase.auth.signUp` when refused and to reach it when allowed, production build clean with the signup pages still STATIC on a 30s revalidate inherited from the flag cache. **SHIPPED and LIVE: PR #332 merged to NEW-UI as `95c2dbe0`, deploy run 34415772058 success, 2026-09-09 23:11Z. Production `ALLOW_REGISTRATIONS` is `NO` — signups on policywallet.gr are CLOSED right now.** The value was not readable ahead of the merge (`vercel env ls` shows `Encrypted`, and `vercel env pull` redacts — 41 of 55 values came back empty, including plainly non-sensitive ones); it was read AFTER deploy from the page's own serialised prop, the serialised `registrationsOpen` prop reading `false` in the RSC payload of both signup routes — which is also the browser-free way to check it in future. Production smoke: `/auth/signup/policyholder` renders the three-line Greek notice and the «Σύνδεση» button, `/auth/signup/agent` likewise, `?token=…` still renders the full form, `/auth/signin` 200. The form was NOT submitted — creating an account and entering a password are prohibited actions for the agent — so the server-side refusal rests on `tests/unit/register-user-honours-gate.test.ts`, which proves `registerUser` never reaches `supabase.auth.signUp` when refused and does reach it when allowed. Also noted: `/api/v1/auth/magic-link/request` is unreachable today anyway — `proxy.ts` does not allowlist `/api/v1/auth`, so an anonymous POST is 307'd to signin (verified locally) — and has no caller in the app; it was gated regardless.

**PW-BRIDGE-01 — loop running on `feat/bridge-01-l0` (draft PR #310); nine Queue A items closed on 2026-09-06 after the owner's «continue» resumed the L0 halt (D-B1: the conversation number is the classified count; actor attribution lives in copy; the production catalogue alignment still needs its own explicit go).** Closed with guards proven red first and harness VERIFY: **A-01** the credential hash is no longer selected on eleven agent paths (presence query, mapped column pinned to the schema); **A-08** both audiences instrumented with canonical `data-fact-value` — the policy pair measures 8 fact pairs, the new wallet pair 24; **A-05/A-04/A-03/A-19** the agent policy page renders identity through the identity module, the end date from the lifecycle, an unknown premium as unread, the status label in the account language (measured 2 → 0 and 1 → 0 divergences); **A-20/A-21/A-20b** agent rows resolve status and insurer with the wallet's resolvers and a placeholder identity counts as missing in the resolver itself (wallet pair 10 → 0). Remaining in Queue A: A-02 (the finding count), A-06 (record status after an agent confirms), A-07, A-09…A-18. Original L0 note: **PW-BRIDGE-01 — L0 inventory complete (2026-09-06, branch `feat/bridge-01-l0`).** `docs/bridge/PARITY.md` (26 parity rows + 5 residue, built from code), `INTERACTIONS.md` (23 cross-role paths: 7 invisible to the affected party, 2 misleading, 8 without a declared actor), the two-sided harness (`tests/measure/bridge/`, Playwright project `bridge`: two sessions over one record set, nine fixture states, reversible seeding, fact-divergence metric with a committed red probe) and `QUEUES.md` (A 18 · B 23 · C 8 · D 6). The harness caught a deliberately moved run date on live pages (`docs/evidence/bridge-l0/DIVERGENCE-DEMO.json`) and the nine-state sweep found two state contradictions (unauthored branch, expired) and one unmeasurable pair (the agent's customer profile has no `data-fact`). Halt `docs/bridge/HALTS.md` H-B1 names the two questions the loop would otherwise decide under §5. Nothing repaired; no production touched.

**PW-CONTENT-01 — Goals 1–4 and 7 SHIPPED (PR #308 → NEW-UI `3c287313`, deploy run 34038640338, 2026-09-06 14:20Z); Goals 5–6 on PR #309 BLOCKED on the production catalogue alignment (BL-C1); Goal 8 done as far as the agent can; Goal 9 reported (2026-09-06).** What shipped: **Goal 1** one resolved locale per request — `resolveUserLanguage` is the only normaliser of the stored preference (61 hand-rolled sites → 0), `resolveLocale` the only tag table (en → `en-GB`), the protected and onboarding layouts seed the client `LanguageProvider` from the server and a seeded provider owns the `<html lang>` stamp (the EN sweep found the root provider overriding it); three guards with probes; sweep evidence `docs/evidence/content-g1/`. **Goal 2** 3 → 8 citation-backed classifications (6 legislative, 2 market; ENFIA components, accident-declaration phone ×2, hospital class, direct billing), citations render on the agent insights page too; home tile 1 → 2, hero 4 → 5, /protection «1 σημείο … 3 υπό αξιολόγηση» → «2 σημεία … 2 υπό αξιολόγηση»; `PROVENANCE-REVIEW.md` (50 rows) still blocks GA. **Goal 3** the relationship index is removed from every render site (`lib/agent/health-score.ts` deleted; guard). **Goal 4** `catalogue_mismatch` no longer withholds a composition: the denominator is always the run's recorded plan and a stale-catalogue sentence names the run's date (`data-fact="composition.stale"`); three states pre-plan / unauthored / stale are distinct by guard. **Goal 7** `/methodology`, `/changelog`, `/status` in EL and EN, every number from `PUBLIC_COUNTS` (six catalogue-derived entries), changelog entries are dated merges with PR numbers. **Goals 5–6 (PR #309, `feat/content-01-rules`, gate green 611 files / 7122 tests):** `renters` becomes a write branch, 21 rules authored (29 → 50, 8 → 14 branches), `lib/gap-detection.ts` byte-identical; merging requires the production `gap_definitions` alignment (a production write: owner's go, archive export first — `docs/content/BLOCKED.md` BL-C1, `PROD-ALIGNMENT.md`). **Dev was moved back to the 29-row set** (deactivation, D-C8) so #308's CI catalogue check could pass; step one of BL-C1 re-aligns it. **Goal 8:** 8.1 moot (the example.com seed accounts do not exist in production); production smoke done anonymous + agent-side (evidence `docs/evidence/content-g8/RESULT.md`: 8 pages 200 and self-canonical, sitemap carries the six trust routes, 0 score vocabulary outside negations, agent pages clean); Lighthouse SEO 100 / 100 / 100 on /methodology, /changelog, /status; policyholder smoke not run (BL-C2: no policyholder session in the browser). Facts for the owner (`docs/content/HANDOFF.md` C-H1…C-H7): `policywallet.gr` has **no MX record** — dpo@/info@/careers@ cannot receive mail (GA blocker C-H6). Next: PW-BRIDGE-01 L0 inventory (halts for approval after L0).

**Previous phase note (PW-CONTENT-01 Goal 0):** **PW-CONTENT-01 — Goal 0 investigation written, HALTED for approval (2026-09-06).** `docs/content/STEP0-FINDINGS.md`: the rule vocabulary (8 rule types, 11 field-check operators, one rule per authored definition), the extractor's branch reach (31 writable branches, 8 authored, 23 without a rule; `renters` is not writable and `contents` is not a branch — a tenant's contract is stored as `home`), the two locale sources and the 11 server-plus-client surfaces, the composition's `catalogue_mismatch` state that blanks every run on any catalogue change, re-analysis cost (~56k tokens, ~€0.10–0.15 per run; no bulk path), the 26 under-review slugs in Greek, the relationship index's weights and its «Καλή» for an all-expired customer, the legal-page machinery and the absence of any changelog source, and the fact that the three seeded example.com accounts do not exist in production (Goal 8.1 moot; HANDOFF H7 stale). Recommendation on D9/D10: run-plan denominator, never withheld, with a dated stale line. No code, no data changed. Previous: **PW-TRANSPARENCY-02 — CLOSE-OUT BLOCK F0–F7 shipped (2026-09-06).** PR #307 (`feat/transparency-02-closeout`) merged into NEW-UI as **`7b86805d`** after CI green; deploy **run 33996579556 **success** (production deployment `policy-wallet-hslk24dut`, 2026-09-05 22:43Z; its route list carries no protection-score API, only the `jobs/protection-score-refresh` cron)**. What shipped: **F1** deterministic finding order (provenance class → authored catalogue order, one comparator at every ordering/slicing site incl. the accessor's default read; guard `finding-order-deterministic`); **F2** B1.6 DECIDED — Risk DNA dimension scores removed from every render site (numbers, threshold meters, trend arrows, points lines; the agent KPI's averaged score; the advisor book's household index), B3 disclosed treatment in their place (guard `risk-dna-no-scores`; H-T01 closed); **F3** Terms §5 states the production free tier exactly (3 policies, analyses uncapped in number on a 150,000-unit monthly allowance, no interactive questions; GR-GA-2026.09.2; BL-01 resolved) and `EXTRACTION_CITATIONS` read through its effect (effectively on; not acted on; H2); **F4** the two protection-score APIs deleted on evidence (no consumer, 0 prod device registrations, Sentry 30d 0 vs 13 sampled siblings; Vercel's 30-day log unreadable — stated; H-T02/BL-02 closed); **F5** citation-backed provenance — 3 legislative (Ν. 2496/1997 άρθρο 17 ×2, Ν. 4830/2021 άρθρο 9 §1 β΄), 26 under review, 0 market; the citation renders at every site of a class (card, coverage insights, agent insights, attention list, report, digest; guard `provenance-citations-render`); **`docs/transparency/PROVENANCE-REVIEW.md` is pre-GA gated and BLOCKS GA** (HANDOFF H10 — legal sign-off). The F5 evidence run (`docs/evidence/transparency-f5/RESULT.md`) exposed and fixed two seams: report items carry the kebab slug (`canonicalGapSlug` in the one lookup) and the agent insights rows never selected a slug. **F6** CLAUDE.md/AGENTS.md: a layout metric reports element boxes with every pair. **Production smoke:** unauthenticated, on production — Terms §5 EL/EN live with the enforced free tier and version GR-GA-2026.09.2; `/`, `/pricing`, `/product/motor` carry no score vocabulary; Sentry 0 new issues in the 2h window after deploy. **Authenticated smoke on production, agent side (2026-09-06, the owner's agent account, read-only):** the agent dashboard renders seven KPI tiles and no «Μέσος δείκτης προστασίας» (F2 live); `/insights` carries no score words and its gaps section correctly shows nothing for a book with no visible finding; the B2B customer-policy view of the visible motor policy (`64504715`, analysed 2026-08-21) renders `record.status` = «Προς επιβεβαίωση», the dated provenance line («The analysis of 21 August 2026 completed and the rules that ran found nothing»), the V3 pre-plan sentence (`composition.prePlan`), no score words, and severity colour only on the shell's logout button; the finding-bearing policy (`cmtnmck13000385ohunkc6rbi`, owned by the same customer) is NOT visible to this agent and returns not-found — the visibility rule holding. **Still not smoked:** the B2C wallet page itself (needs the owner's policyholder session; the agent does not sign in with credentials) — verified on dev in the F5 evidence run. Two observations for the UX backlog, not gates: the customer profile shows the relationship index «90/100» (kept by design with its disclaimer; `relationship-vs-protection-score` guard), and the B2B view is mixed-language for this account — the server half speaks the stored preference (EN) while the client card speaks the client context (EL), a pre-existing two-source seam (`app/(protected)/layout.tsx` vs `LanguageProvider`) that B1/B2's lines made visible. Production holds ONE live finding (`missing_accident_declaration_phone`, under review), so no citation can render there until a classified rule fires. **Next 3:** (1) owner signs in as the policyholder and the B2C wallet page smoke runs (`/wallet/cmtnmck13000385ohunkc6rbi`, `/protection`, `/dashboard`); (2) legal sign-off of `PROVENANCE-REVIEW.md` — blocks GA; (3) C1 waits for its own written approval — not started. **Not started, by instruction:** C1–C7. Ledgers: `docs/transparency/{PROGRESS,DECISIONS,HALTS,BLOCKED,HANDOFF,GUARDS}.md`.

**Previous phase note (R1–R4, 2026-09-05):** Merged and deployed to production: #299 (`85088850`: Track A, B0 + prod migration, B1.5, B1.7, B2), #300 (`b0044eaa`: B1 record status, B3 provenance skeleton), #301 (`6ff5aebc`: Goal G guard inventory, V3 pre-plan state, R1 freeze pin, verification evidence), #303 (`886ac01f`: R3 — one accessor for gap rows, the six V2 leaks sealed at the read). Production smokes: the dated provenance line, «Προς επιβεβαίωση», the disclosed under-review section and the V3 pre-plan sentence all render on the smoke policy. **B4** («dashboards become routers») is on PR #304 (`feat/transparency-02-b4-r4`, rebuilt on the merged head): overlapping hit areas 0 on both audiences at 320/390/430 with the metric scoped to page-flow elements (the earlier 2–9 were the fixed bottom bar and the off-canvas drawer, reported as app-shell items in `docs/evidence/dashboard-b4/RESULT.md`); sections reported as 7 with the page header named. Decisions of record: `docs/transparency/DECISIONS.md` (D-V1). Human track: `docs/transparency/HANDOFF.md`. Halted: no C1, no C2, no B1.6, no Track C. B1: the five-state record status (`lib/wallet/record-status.ts`, text-only label on the policy head and the agent findings card; `confirmed` unreachable until C1) and severity removed as an ordering / colour / chip / emphasis axis everywhere outside six reasoned exemptions (guard `severity-never-orders.test.ts`, 4 probes). B3: `lib/gaps/provenance.ts` ships all 29 checks `under_review` with `citation: null`; provenance is the ordering axis; under-review findings render only disclosed, count in no summary, reach no email / notification / report (guard `provenance-skeleton.test.ts`); candidates for the human track in `docs/transparency/PROVENANCE-CANDIDATES.md`. Suite 594 / 6909 green.

Previous phase note (kept for the record): branch `feat/transparency-02`. **Prod migration `20260905150000_gap_instance_run_provenance` is APPLIED and
verified on production** (2026-09-05 ~10:30Z, via Supabase MCP: six new `gap_instances` columns, `analysis_run_id`
NOT NULL, FK to runs, two new indexes, the old unique index replaced by the partial «current row» one, the single prod
row backfilled to its motor run, `_prisma_migrations` stamped with the file's sha256; rollback export
`docs/archive/2026-09-05T1025Z_prod_gap_instances_before_…sql`). Applied BEFORE the merge on purpose: the old
code reads gap rows without the new columns and keeps working, the new code cannot run without them; only analysis
persistence fails in the window between apply and deploy (zero real users). B0: one writer of `gap_instances` with run
provenance and supersede semantics; every findings list names its run and dates it. B1.5: the unauthored-branch state on
the policy page, the findings card, the dashboard tally (with denominator) and the agent client card. B1.7: score
renders removed agent-side and the per-policy health number removed; the two score APIs wait on BL-02. **B2: two lines,
two denominators** — `lib/gaps/composition.ts` classifies the run's attempted rules by question (20 coverage / 9
recording), reads declared inputs presentation-side, counts the unsubstantiated as indeterminate; rendered only on
the B2C findings card and the B2B customer-policy view, never email/push/report; no undeclared-input rule exists.
B1.6 (Risk DNA numbers) is a halt (`docs/transparency/HALTS.md` H-T01). Blocked: BL-01 (Terms §5), BL-02 (score APIs).
Still to do in this series: B1 taxonomy + severity de-emphasis, B3 provenance skeleton, B4 dashboards, Goal G guards.
Next 3: (1) merge #299 on CI green and smoke the prod policy page for the provenance line and the composition;
(2) B1 status taxonomy; (3) B3. Ledger: `docs/transparency/PROGRESS.md`.

**Grafí design-system build + marketing rebuild — ladder G0–G12 walked** (2026-08-30, 18 commits
`a4aae9f2..`). Ledger: `docs/DS_PROGRESS.md`. G0–G3, G7, G11, G12 done; G4/G5/G6/G8/G9/G10
partial with the remainder named per-goal in the ledger. Written system: `docs/design-system.md`;
seams and hostile review: `docs/handover.md`.

## In progress (2026-09-11)

- **2026-09-11 — PW-PROVENANCE-01 W4-01 is LIVE (#320 → `568fee72`, deploy run 34627851127, 17:31Z).** The first item of the provenance series: the Art. 30 record is derived from `prisma/schema.prisma` (one `/// @ropa` line per model holding personal data — purpose, lawful basis, Art. 9 columns, retention class, export scope, erasure treatment), `scripts/generate-ropa.ts --check` fails when the committed record is stale, and guard `ropa-tags-complete` (11 tests, 5 probes, red on the real tree before green) stops a new personal-data table landing without a recorded purpose and basis. 57 tagged, 0 untagged, 1 model with Art. 9 columns; `unclear` is a valid value so the guard never forces an invented basis (D-P4); the tag is per MODEL, confirmed against a real base change during the four-day drift (D-P6). Verified: local gate on the merged head, CI, the deploy carrying the commit, the anonymous production smoke. Not a DPIA — that is halt H-P2. **W4-02 followed the same day (#334 → `7f570f51`, deploy run 34631981624, 18:15Z): the DPIA input pack — 714 columns classed Art. 9 / subject key / identifier / ordinary, the two Art. 9 routes, the transfer table from the published subprocessor rows with the AI clients' constructor options read from code — and guard `generated-compliance-docs-current`, which is the first thing in CI that fails when a generated compliance document goes stale (W4-01's `--check` was wired to nothing). Two authored maps, both closed: an unknown processor or provider service throws instead of being omitted. Decisions D-P7…D-P9 in PROGRESS. Next in the queue: W0-01 (the `acordData` read-site guard, the blocking prerequisite for every wave that touches `AcordData`): 102 files reference `acordData` today, all through `(x as any)?.field` against a `Json?` column, so `tsc` catches nothing.** Ledgers: `docs/provenance/{PROGRESS,QUEUES,GUARDS,HALTS,BLOCKED,HANDOFF}.md`.

- **2026-09-11 — the CATALOG COUPLING standing task is done, and its wording was wrong.** CLAUDE.md asked for a refusal keyed on `stripe_price_id` resolving in LIVE mode. That field charges nothing: `lib/billing.ts` builds checkout line items from inline `price_data` off the plan ROW, and `Plan.stripePriceId` is only ever written back FROM Stripe by the webhook — a plan with an empty one charges fine, a plan with a good one may charge nothing. Implementing it literally would have been theatre AND would have blocked working plans. What makes an advertised price unchargeable is the MODE.

- **The defect was live on production while the task sat open.** `publicCheckoutAvailability()` is now the one answer to «can this deployment take money»: live sells everywhere; unconfigured sells nowhere; sandbox sells off production and is refused on it. Deliberately NOT «test mode is bad» — sandbox checkout is what test mode is for, so dev, preview and `next start` are unchanged. A blocked paid plan keeps its PRICE (true) and loses its BUTTON (not true); free and «contact us» plans are untouched because neither promises a payment. `createCheckoutSession` enforces the same rule at the door, because /account, UpgradeModal and CarriedPlanCard reach checkout without passing the pricing card — a fix that only hides a button only looks like one — and the API maps the refusal to `503 CHECKOUT_UNAVAILABLE` so a configuration state stays out of the 500 signal.

- **What the owner has to do to sell again:** set a LIVE `STRIPE_SECRET_KEY` in Vercel. Nothing else — the buttons return on the next revalidation, with no deploy and no code change. Guard `pricing-refuses-unchargeable-plans` (12 cases, red-then-green verified, with a probe for a checkout path that skips the rule); suite 632 files / 7343 tests.

## In progress (2026-09-10)

- **The owner answered PW-BRIDGE-01's three open questions with «proceed with recommendations», and all three shipped.** The briefing found that two of the three were smaller than the ledger claimed, and that the load-bearing defect was in neither of them but in the seam under both.

- **D-03 + D-04 (#330 → `c436f177`).** D-04 was real: the renewal request was a notification and nothing else — an activity row and two bells, no owner, no surface listing it — while the customer was told «θα σας ενημερώσουμε για τα επόμενα βήματα» whether or not a person had been reached. It is now a dated `renewal` collaboration thread both parties can open, reusing the open one. **D-03's ledger row was half stale:** asking about a finding ALREADY opened a thread linked to the gap and the customer's own timeline already rendered it, so this was a repair, not the new surface it was filed as. What was actually wrong: the Opportunity was minted BEFORE the thread (so a thread failure left the customer's question as a pipeline row with no channel back to them), the thread's subject was a server-authored English literal rendering as a heading in a Greek customer's own timeline, and nothing linked the finding to its thread. **The find that mattered was the recipient.** All three customer-to-advisor sends picked one with `customerRelationship.findFirst({ status: "active" })` — not policy-scoped, so a customer with two advisors sent to whichever row Postgres returned first, and blind to `pending_activation`, the normal state before a customer accepts. `resolvePolicyAdvisors` replaces it with the READ rule used in the other direction: an advisor qualifies only if they can already SEE the policy. That is the same rule as H-B2 seen from the send side, so a send path can no longer decide the disclosure question by accident.

- **H-B2 / D-06 (#331 → `53797aee`).** The halt offered (a) no disclosure, (b) existence, (c) a count. The answer taken is none of them as a PLATFORM behaviour: an advisor still cannot infer that an unshared policy exists, because we never say so — the CUSTOMER can, from the page that already lists what their advisor sees, off by default and reversible in one tap. This is the first halt in the series resolved by moving a decision to the person whose record it is rather than making it for them. `customer_relationships.unshared_count_disclosed` (default false) was applied to dev with `migrate deploy` and to prod via Supabase MCP with a matching `_prisma_migrations` row on the same sha256, verified by SELECT on both (**3 dev / 4 prod relationships, 0 disclosed**) — so the shipped default changes nothing anyone currently sees. With it on the agent's policy tab states a count and nothing else; with it off the value is `null` and the counting query never runs, so the number cannot leak through a timing difference either.

- **Neither change was smoked interactively, and that is the one gap.** The owner's production browser session has expired and the sign-in page asks for a password, which the agent does not enter. Both are verified by CI, the full suite, the deploy carrying the commit, and SELECT on both databases — but no click has exercised the new renewal thread on production. Two accounts to use when you do: the owner's own six policies are all self-uploaded with **0 active grants**, so the expected result there is the new honest copy «κανένας σύμβουλος δεν έχει πρόσβαση σε αυτό το ασφαλιστήριο»; `artemiskohas@gmail.com` (pending_activation + 3 grants) is the account where the fix changes the outcome — it reached nobody before and reaches the advisor now.

## In progress (2026-09-07)

- **2026-09-09 — Queue D measured against what already exists (#329 → `892bfd62`); the loop's repair phase is finished.** Queue D's own rule is that a candidate is scored against §0 BEFORE design and «a zero is closed, not parked», so nothing was built until each row was measured. **D-02 already MET** (the advisor page lists each grant's level and revokes from that same surface — and since tier 1 the revoke tells the advisor). **D-05 already MET** (asset identity on the agent's policy page and policy list; it folded into Queue A as its pre-score note predicted). **D-01 mostly met** — model, respond view and the mutual thread were all in place; the gap was the LIST CARD, the surface where the request lives as a work item on BOTH sides, which showed only a document name and a status word while ignoring an `agentName` prop it was already given. It now names the requester and the dates (`documentRequest.origin`, registered). **D-06 blocked on halt H-B2**; **D-03 and D-04 are genuinely new surfaces** and are left for the owner's steer rather than invented. **What measuring saved:** two of six candidates needed nothing built and a third needed one line rather than a feature. A queue of «bridges» read as six new surfaces; three were already standing.

- **PW-BRIDGE-01 status after tonight: Queues A, B and C are closed; Queue D is 3 of 6 closed with 2 awaiting the owner's design steer and 1 on a halt.** Everything the loop could repair without a product decision has shipped and is on production. What remains needs you: **H-B2** (agent-side disclosure of unshared policies: none, existence only, or a count), **D-03** (a shared finding thread), **D-04** (a renewal handoff surface). **H-B0** stands unchanged — the agent→customer «add policy» flow waits on an Article 9 lawful-basis decision outside this series.

- **2026-09-09 — Queue C-06 and C-07 close the queue (#328 → `5f49e9bb`).** **C-06:** the weekly digest's «3 νέα κενά κάλυψης εντοπίστηκαν» named no denominator, so a count read as a verdict on the week; it now carries «— από 11 ανοιχτά συνολικά» from one query differing only in period, and discloses that under-review findings are not among them. The denominator is omitted rather than faked when absent or incoherent. **Half of that row was a false alarm, and it is the more useful finding:** the registry's generic «Ένα ασφαλιστήριο …» copy is the SANITISATION fallback `presentStoredNotification` uses when stored content is tainted by internal prose — a case where naming a policy is impossible and inventing one would be the defect. Every emitter names the policy itself. **C-07:** measured, not argued — report, digest and invite at 320 and 390 px with the longest realistic Greek identity fields: **6/6 clean, 0 overflowing, 0 clipped**. `scripts/build-outbound-samples.ts` + `scripts/measure-outbound-documents.mjs` make it repeatable without a dev server, and separate OVERFLOW from CLIPPING — a document can have no horizontal scroll while an element's content is wider than its box and the box hides the rest. Suite 626 files / 7289 tests.

- **2026-09-09 — Queue C: the report is no longer a surface that omits what the app states (#326 → `7faaf9c2`; behavioural tests #327 → `d9e670b1`).** Root cause: both report routes built their inputs INLINE, in duplicate, so following the app meant editing the same block twice. One `lib/services/reports/report-context.ts` now builds provenance, pre-plan, staleness, composition and record status, and both routes read it. **C-04** the report renders the composition's two lines — denominators first, from the app's own copy keys, with its stale sentence rendered once. **C-03** it states where the record has got to («Προς επιβεβαίωση», framed as describing the RECORD, not the person's insurance) or who confirmed it. **C-05** verified: under-review findings are excluded and disclosed, never counted. **C-08** closed by I-09. Eight behavioural cases pin the rendered output, passing first run. **Four guards went red and all four were right to:** three pinned the CALL SITE rather than the invariant (re-pointed — asserted where it is computed, plus at both routes that carry it through), and one matched a component's NAME inside a COMMENT, which is the failure mode CLAUDE.md already records; it strips comments now. Suite 625 files / 7284 tests.

- **2026-09-09 — production proof of Queue B tier 1, from a real action rather than a test.** At 21:08:55 the owner ended a relationship from the agent UI. Before tonight the customer would have been told nothing. Instead `advisor_relationship_ended` wrote two rows to the CUSTOMER — in-app and email, both `sent`, dated, deduped on the relationship id — reading «ΑΓΓΕΛΙΚΗ ΜΟΝΙΑΡΟΥ τερμάτισε τη συνεργασία. Δεν έχει πλέον πρόσβαση στα ασφαλιστήριά σας.» **Consequence worth knowing:** that termination revoked the grants, so the agent's branded report now returns 403 for those policies and the browser session can no longer smoke agent-side report routes. The 403 is CORRECT — check `customer_relationships.status` before concluding a report route broke.

- **2026-09-09 — Queue B tiers 2 and 5 (#325 → `cb19406b`): every cross-role notification names a person, and the three passive interactions are decisions rather than omissions.** **Tier 2** takes copy-level attribution (the ledger allows a schema change instead; tier 1 set the precedent). Two shapes were wrong: I-16 named a ROLE in both directions («Ο σύμβουλός σας ζήτησε…», «Ο πελάτης ανέβασε…») when a person had acted, and I-10/I-11/I-12/I-14 named a person through a raw `.name` — which is attribution only until a fixture or placeholder token reaches it, the exact thing `displayPersonName` exists to stop. Two of those sentences tell someone that another party can now see their policy. **Tier 5's find was I-02:** all three branches of `applyInviteRedemption` were silent, and one of them MINTS THE ACCESS GRANT — the branch taken when the advisor has no account yet — so a policy share could complete with neither side told, while `sharePolicy` announces the identical fact when the advisor already exists. The relationship branches now share one `announceRelationshipActivated` (reusing sharePolicy's copy: a fact must not read differently because it arrived by invite), the signup branch announces only when a relationship actually flipped, and the share branch tells both sides keyed on the invite. I-15 and I-23 stay passive as recorded decisions with their reasons. The guard's tier-2/5 block asserts the IDENTITY MODULE is used rather than that a name appears. Suite 624 files / 7270 tests.

- **2026-09-08 — Queue B tiers 3 and 4 (#324 → `8852bc50`): the flag stops lying about who it is for, and a share stops committing in halves.** **I-09:** `flagPolicyExtraction` emitted `extraction_flagged` to the FLAGGING AGENT while its registry declaration said `owner`, its copy spoke to the owner and its `requiredAction` was `confirm_extracted_values` — so a customer's record was marked «flagged», the «unverified» badge stayed up, and the only person who could resolve it was the one not told. Split into two events: the customer-facing one now reaches `policy.ownerUserId` naming the advisor and quoting the reason; a new `extraction_flag_raised` carries the triage row, and the admin flag queue reads THAT (it renders its recipient as «who flagged this», so reading the customer-facing event would have named the customer as the flagger). Production held zero rows of either, so the repoint cost no history. **I-03:** the grant and the relationship were two separate awaits. `computePolicyAccess` derives read/write/delete from an `AccessGrant`'s level ALONE and never re-checks the relationship, so a grant that committed while the relationship failed leaves an advisor holding access nothing explains and no termination path can find — every one of them works from the relationship. Both now commit in one `$transaction`, with no outer-client query inside it. The guard gains a tier-3/4 block whose universe is the ledger's own tier rows: every id is either checked or recorded as closed elsewhere with its reason. Two lessons in it — a recipient check needs the EMIT CALL's body, not the function's, and a non-greedy regex for a transaction body stops at the first nested `})`. Suite 624 files / 7263 tests.

- **2026-09-08 — PW-BRIDGE-01 Queue B tier 1: the seven invisible interactions are closed (#323 → `4bcdafa3`).** Each was a path by which one person changed what another holds or can see while the affected party was told nothing. Now: a revoked share tells the advisor (`policy_share_revoked`); a relationship ended from either side tells whichever party did NOT act (`advisor_relationship_ended`, emitted once from the shared `terminateRelationship`); a transfer tells the CUSTOMER, who was the only one not told although the registry always listed them; an agent confirming an extraction tells the owner whose insurer, number, dates, premium and sum insured it overwrote (`policy_details_confirmed`); a branded report leaves a record on the owner's side (`branded_report_generated`, in-app, deduped per policy per day); and the owner's own edit or deletion of a shared policy reaches the advisors holding a grant, via a new `getPolicyGranteeUserIds` read BEFORE the delete. Attribution is copy-level by design — `notifications` has no actor column and the ledger sanctions that choice — and every emit is best-effort AFTER the write it reports, so a failed notification can never report a successful termination as a failure. **Guard `effects-on-a-record-are-told` reads its universe from the Queue B tier-1 row of the ledger**, so an eighth invisible interaction fails the build until it is wired; it brace-matches the function that causes the effect and checks the registry declares the affected party. It caught three real gaps on its first run, one of them mine (`policy_removed` still declared `owner` only). Guard inventory 39 → 40. Suite 624 files / 7259 tests.

- **2026-09-08 (evening) — the deploy landed and the catalogue was re-activated; BL-C1 and BL-C3 are closed.** The owner cleared the Actions block by making the repository **public** (public repos get free Actions). The merged code commit could not trigger CI on its own — the two commits after it were docs-only and `paths-ignore` skips those — so `deploy.yml` was dispatched manually on NEW-UI, which is what that trigger exists for; it shipped `eacc60ad` and succeeded at 18:21Z. The 21 parked rules were then re-activated with one UPDATE and verified: 50 active, 14 branches, digest equal to dev's. Smoked on production: `/methodology` says 50 rules in 14 branches, and the agent's policy page renders its ten facts with the dated provenance line, the pre-plan sentence and **no** stale-catalogue line.

- **2026-09-08 — SECURITY, CLOSED by the owner (rotation confirmed): the repository is now PUBLIC, and its history is world-readable.** A scan of every tracked file finds no live credential (the guard `no-credentials-in-tracked-files` passes, and the two connection strings in audit docs are `<…>` / `${…}` placeholders). **But commit `852a2b4c`, reachable from NEW-UI, contains a version of `.env.example` carrying a PRODUCTION Supabase pooler credential** — project `cquudefwfwrmvpftuhyl`, an 11-character password. The guard's own docblock states that password was rotated after the August incident; **that rotation cannot be verified from here.** **Owner's answer, 2026-09-08: the rotation is confirmed — the credential in history is dead, the public history stands, and no rewrite is wanted.** The scan recipe is kept because the repo being public makes it worth repeating before any future commit of an env file. Nothing else in the last 400 commits' non-doc files matches a credentialed connection string, and no JWT ever appeared in `.env.example`.

- **2026-09-08 — the agent-side production smoke of #319 is DONE** (it was blocked on the agent session; the owner's browser was signed in as the agent). On `/customers/cmren9d8a…/policy/cmt2ekeee…` (motor, analysed 21 Aug), every fact renders exactly ONCE and the ten keys are: `policy.status`, `policy.insurerName`, `policy.policyNumber`, `policy.insuredSubject`, `policy.premiumAmount`, `policy.startDate`, `policy.expiryDate`, `record.status`, `gap.findingsProvenance`, `composition.prePlan`. So **A-07** holds (one insurer, «Εθνική Ασφαλιστική»), **A-13** holds (`policy.insuredSubject` = the plate «ΙΚΖ3113»), **A-14** holds (`document.count` door = 1), **A-16/A-18** hold (the dated provenance line and the pre-plan sentence render on the agent side too), and **A-11/A-12** hold (no score fact, no percentage anywhere on the page). `record.status` reads «Επιβεβαίωση συμβούλου». The finding-bearing policy of the same customer still returns not-found to this agent — the visibility rule holding. **Not a defect:** `#gap-analysis` and `#documents` appear twice in the DOM and half the `[data-fact]` nodes measure 0×0 — they sit inside React's streaming buffers (`div#S:3[hidden]` at the end of `<body>`), not in the live tree. Measure visibility before calling a duplicate a defect.

- **2026-09-08 — PW-CONTENT-01 Goals 5–6 merged (#309 → `43615847`); the production catalogue was aligned, verified, and then PARKED when the deploy could not run.** On the owner's go: dev aligned 29 → 50 active (`npm run align:gap-catalogue -- --apply`, verified `15fa2758cebeaecc` by the repo's own function); production archived first to `docs/archive/2026-09-08T1600Z_prod_gap_definitions_before_content_01.sql` (**byte-faithful** — the file's md5 equals the md5 Postgres computed over the same `string_agg`); the write NARROWED to the 21 new rows after proving the other 29 byte-identical to the repository (21 added / 0 changed / 0 removed, and per-slug text digests equal on both sides); the 21 statements rehearsed on dev, then applied to production in one transaction → 50 rows, 50 active, 14 branches, and prod and dev returned the identical Postgres-side digest `8045aa4e46935b149e2864f9a20c502a`. **Then GitHub Actions refused to start jobs** (billing), so `43615847` did not deploy. Fifty active rows under 29-rule code is the exact failure the runbook exists to prevent — every new run would record a plan the deployed catalogue does not know, rendering a permanent stale-catalogue line and findings whose slugs have no authored content (which `resolveGapContent` titles with the model's own prose). So the 21 rows were **deactivated, not deleted**, and production verified back to its exact prior state: the active 29 hash to `c66ba5a69febc06973dffcfe56d97879`, the value measured before any write, with `version` and timestamps untouched. **To finish:** deploy `43615847`, then one `UPDATE … SET is_active = true WHERE created_at::date = '2026-09-08'`, then confirm the digest is `8045aa4e46935b149e2864f9a20c502a`. Also in the merge: the branch rebased onto NEW-UI (18 commits), the renters bundle's «συμβόλαιο» swept to the ratified term under #315's widened guard, and pension's coverage-status reason corrected to `no_coverage_checks` now that Goal 6 authors recording rules for it (the unauthored case moved to `cyber`). The runbook's expected fingerprint `d6f515a1d400f9d5` was stale and matched nothing — measured, the 29-set is `2df9d0fd4b581caa` and the 50-set `15fa2758cebeaecc`; CLAUDE.md now says a fingerprint in a document is a claim, not a measurement. New: `scripts/print-gap-catalogue-sql.ts`, `scripts/fingerprint-gap-rows.ts`.

- **2026-09-07 (evening) — the bridge residues C-01b + A-01b SHIPPED (#322 → NEW-UI `55051255`).** C-01b: `PortfolioPolicyFacts.coverageEndDate`, `ProtectingPolicy.coverageEndDate`, timeline `PolicyRow.coverageEndDate`, `classifyUrgencyTier(policies[].expiresAt)`; builders (gap-engine ×2, wallet policy page, risk-graph service, timeline service) resolve through `resolvePolicyLifecycle`; the comparison card counts from the lifecycle; churn day-7 and perk-reminder spread `expiryWindowWhere(from, to?)` and re-check rows; guard residue 6 files / 8 hits → 1 / 1, rule (c) + probe. A-01b: client-level omit of `User.password` (`lib/db.ts`, exported `DbClient` type; base service, events writer and the dashboard prop type on it); 19 full-row `db.user.find*` → 11 narrowed + 8 allowlisted by reason; 10 bare includes → 9 narrowed + 1 comment; guard rules (c)(d)(e) + probe. C-02 proven on production by SELECT (stale open cycles 2 → 0 after the column repair; 0 of 8 unresolved). CI: the type check OOMed at the runner's ~2 GB default heap (cold local peak 2.74 GB with the omit, 2.71 GB without — not the omit's doing); `type-check` now runs with `--max-old-space-size=4096`.

- **2026-09-07 — the goal series after the story: bridge residue, housekeeping, two copy items, the facts row — ALL MERGED AND DEPLOYED (#316 `873eba68`, #318 `85ae3e80`, #319 `04274609`, #321 `8425f3ea`; #286 `f034f9c4`).** **PR A (C-01/C-02):** `expiryWindowWhere` on the resolved column with a raw-column fallback, the cron and the weekly digest resolve `resolvePolicyLifecycle(row, now)` in memory, the renewal cycle is re-keyed on the resolved date via `closeSupersededRenewals` and a new superseded sweep closes raw-keyed rows outside the 90-day window; the batch reminder quotes the cycle's own date; guard `expiry-countdown-single-source` (enumerated, exact-count residue C-01b, red-first on three sites) + behavioural `renewal-countdown-from-lifecycle`; inventory 35 → 36. **PR B (A-07…A-18):** the agent dashboard's dead protection-score read deleted; `gap-readers-exclude-superseded` tightened (live set AND `supersededAt: null`, brace-matched windows, split calls) and the seven readers it exposed fixed — the agent's customer-policy page had listed resolved/dismissed findings as current; one insurer render, the insured subject through `policyAssetIdentity`, documents in the wallet's order with a counted door, the customer's review section mounts on one predicate (unauthored/expired policies no longer hide `gap.findingsProvenance` / `composition.*`), the agent's card gets the customer's findings list; `review.scoreAtOpen` and `timeline.scoreDelta` gone from the registry and the renders; harness state `resolved_finding`. **PR C:** singular drifts in `lib/insurance/content/*` → plural register, the register guard widened to every Greek leaf; AI prose passes `scrubRenderableText` at its three composition points (placeholders only — real extracted insurer names stay, owner decision). **PR D:** `ProtectionStatusHero` — one `lg` boundary, the card a `@container`, columns 2 → `@md` 3 → `@xl` 4 by the CARD's width (314px at 1024 with the rail), fact cell = caption over a 20px tabular metric with an optional note, hairlines only inside a row via disjoint container ranges, the phone pill kept at 44px rows without negative margins, «N δεν αξιολογήθηκαν» + the qualifier as the cell's note; the rail's upgrade button allowed to wrap (it gave the page an hscroll at 1024). Acceptance = three consecutive clean rounds of `tests/measure/dashboard-facts.spec.ts` (10 captures each, production build, `--workers=1`) with byte-identical geometry — `docs/evidence/dashboard-facts/RESULT.md`. Gates before each merge: tsc · eslint · i18n · utf8 · api-auth · 620 files / 7111 tests; CI green (Kilo and the Cloudflare Workers build fail on every merged PR and are not gates). **Decisions under standing authority:** the prod cron could not be triggered by hand (the local `CRON_SECRET` differs from prod → 401), so C-02's production proof is the scheduled 05:00Z run — SELECT the open cycles keyed earlier than `coverage_end_date` (2 today) and expect 0; the rounds ran against `next start` of a production build after macOS memory pressure killed the Turbopack dev server twice.

- **2026-09-07 — Data protection & security review pack for external counsel — WRITTEN, not yet sent
  (`docs/compliance/DATA_PROTECTION_REVIEW_PACK.md`).** One document describing how the platform
  handles policyholder and Art. 9 data, written from the code rather than from intent, for a head
  of legal at a Greek insurer to review. §1–§13 are the implemented posture (consent gate on both
  provider paths, the document gate, single-path authorization, anonymize-in-place erasure and its
  schema-derived guard, split retention, admin read minimisation + audit, the 99-route auth
  inventory); §14 is an open-items register verified against the code on the day; §15 is seven
  questions put to counsel. Also published as a shareable page (private Artifact) for the review
  itself. **It ranks §14.1 — the AI providers are not regionally pinned and no zero-retention
  setting is applied in code — as the top legal exposure**, re-verified today: all three clients
  are still constructed with an API key alone (`lib/services/ai/{gemini,anthropic,openai}-ai.service.ts`),
  so `docs/audits/AI_PROVIDER_DATA_FLOW.md` §3 stands unchanged. No code was touched; this is a
  documentation deliverable.

- **2026-09-07 — «Καλύψεις & κενά» (/protection) as a protection story — SHIPPED as PR #314 → NEW-UI `1c9dde12`, deploy run 34089281527 (2026-09-07 06:06Z), smoked
  signed-in on production.** One derivation,
  `lib/protection/coverage-status.ts`, gives every branch that concerns the person one of four
  status words the checks can prove — «Φαίνεται να καλύπτεται» · «Μερική κάλυψη» · «Χωρίς
  ασφαλιστήριο» · «Δεν ελέγχθηκε ακόμη» — over a stated denominator, with under-review-only
  branches and cover held elsewhere disclosed in sentences; `toTileState()` projects it onto the
  dashboard map's tile words (home migration = commit c, pending). The page: h1 «Καλύψεις & κενά»
  (was «Η προστασία μου»), ONE primary decided from facts (`lib/protection/next-step.ts`), the
  summary's four counted doors, the findings explained (title from the content map, «Τι σημαίνει
  για εσάς» = the model's description disclaimed at point of use, «Γιατί έχει σημασία» = the
  provenance class in plain words beside its citation, one review door, dismiss; under review in a
  closed group; the free cap as «+N ακόμη»), the lens switch kept (owner decision) with the branch
  lens as category rows + a family filter (Όλα/Περιουσία/Υγεία/Οικογένεια/Μετακίνηση/Άλλα from the
  one line→area vocabulary), «Με βάση τη ζωή σας» (life events + the wizard folded), the foot (a
  counted door to /recommendations, last check + refresh, disclaimer). Retired:
  `CoverageInsightsClient` (verdict words «Επαρκής/Εκκρεμεί/…», a fabricated «what we checked»
  list, a «Σημείωση» button routing to /upgrade, generic fallback titles because gap rows have no
  title column) and `ProtectionBranchLens`; A-13 and A-16 retired in the ledger, A-05 re-homed to
  /recommendations, PS-01…PS-10 added. Evidence `docs/evidence/protection-story/{before,after}/`:
  phone 12,628→5,451 px (15→6.5 viewports), tablet 9,449→4,576, desktop 8,931→4,429; risk lens
  14,596→7,745 / 11,717→6,723 / 11,356→6,595; no horizontal scroll at any width; h1 fixed; the
  five-second questions answered from the first viewport. PRs: #314 (the story + the home map projected onto the same derivation + the new
  `tests/policyholder-console-clean.spec.ts`; it supersedes #312, which GitHub closed when its stacked
  base branch was deleted at the #311 merge — a closed PR cannot be retargeted), #313 (Goal 10, the
  mobile menu trigger ☰/X → `b7811030`, deploy run 34091421340). E2E: viewport-overflow 25/25 incl. /protection both lenses;
  axe (WCAG 2.1 AA tags) clean on both lenses at 390 and on the branch lens at 1280 — no critical
  or serious violation. Gate before the merges (a signed-in Vercel preview session is not mintable by the agent — preview
  hosts carry no app session and write to the production database): a production build of the
  stacked head under `next start` with the Playwright policyholder session — overflow 25 pages, axe
  3/3, shell 3/3 (the clipped-actions case passes alone; it times out only under seven workers),
  both story measures matching the committed after evidence, console-clean 8/8 — then the owner's
  session on production after each deploy: /protection renders the story over «από 6 κατηγορίες»
  (0 · 0 · 2 · 4), the primary lands on «Τι αξίζει να δείτε» with the one live finding dated
  5 Sept 2026 and its Π.Δ. 237/1986 citation, both lenses, no horizontal scroll, console clean.
  Follow-ups shipped the same day as **PR #315 → `21160711`** (deploy run 34098730747, 08:10Z): the 231
  «συμβόλαιο» uses across the 33 branch-content modules swept to «ασφαλιστήριο» and
  `lib/insurance/content` added to the term guard's universe (the «editorial prose» carve-out no
  longer covers branch education, whose taglines render on the category rows); `summary.notRecorded`
  + one sentence under the four doors (`branch.notRecordedCount`, a door to `#gaps`) that says a
  recording-class finding changes no status — the reconciliation of «Μερική κάλυψη 0» with a
  non-empty findings list. Still on the UX backlog (not a gate): «Τι σημαίνει για εσάς» quotes the
  extraction's insurer name verbatim («Example Insurance Company Ltd» on the owner's test policy).

- **2026-09-07 — The B2C home as a story (impeccable brief) — SHIPPED as PR #311 → NEW-UI `345d8321`, deploy run 34087702665 (2026-09-07 05:44Z), smoked signed-in
  on production (six regions, one primary, 19 counted doors, no horizontal scroll; /recommendations 4
  items; /notifications 24 items; console clean).** Six labelled regions in one order: `#overview` (next-step banner = the page's ONE
  primary, contextual: first open plan step → open recommendations → renewal ≤30 d → add the rest;
  facts row «Συνοπτική εικόνα»; branch map; the person's picture; life-event prompt, now full width),
  `#attention` (lead sentence + provenance tally with denominator + top findings + one door «Δείτε
  τα κενά μου»), `#renewals`, `#plan` (current step dominant; quick actions; preventive card),
  rail `#support` (advisor card in the shared anatomy, help, micro-tip) and `#activity` (recent
  activity, monitor, portfolio). New `/recommendations` page (same read + component + count key as
  /protection's block), nav renamed for the policyholder only (Τα ασφαλιστήριά μου · Καλύψεις &
  κενά · Συστάσεις · Υπενθυμίσεις · Προφίλ · Ρυθμίσεις; phone bar Αρχική · Ασφαλιστήρια · Καλύψεις
  · Συστάσεις · Ρυθμίσεις), active item = most specific href. Evidence
  `docs/evidence/dashboard-story/{before,after}/`: 390 → 6066→6907 px (two modules the brief asked
  for), 1280 → 3868→4046 px, hscroll false at both, 25 facts / 16 counts unchanged. Decisions: the
  brief's «συμβόλαιο» stays «ασφαλιστήριο» (owner-ratified term, guarded); the hero's «Έλεγχος της
  προστασίας μου» stood down (the attention card owns that door); the advisor card lost its solid
  fill (one loud surface per page); renewals now follow the findings (the brief's LEVEL 2 order —
  the b4 "renewals in the first viewport" evidence rule is superseded, a ≤30-day renewal reaches the
  banner instead). Still owed before merge: the E2E shell/overflow specs' result and a preview
  journey; see the report in the session.

- **2026-09-04 — The Personal Risk Profile: onboarding as breadth, assessment as depth, evidence
  as coverage — built on `feat/onboarding-protection-profile` (PR #293, base NEW-UI, awaiting the
  owner).** Contract and diagnosis in `docs/planning/PERSONAL_RISK_PROFILE.md` (four code audits:
  five vocabularies described one person, the assessment re-asked every onboarding fact and its
  wizard erased Art. 9 data on every save, the engine's own «what we still need» list was never
  shown, no rule ever met a need, most users never got a gap row). Built: `lib/protection/domains.ts`
  (the one risk↔domain↔LOB table, guarded), `PolicyholderProfile.fact_provenance` +
  `incomeDependency` (migration `20260904150000`, dev AND prod), `applyFactWrites` as the one
  write path, the six-level evidence scale, `attention-areas.ts` (importance + exposure + coverage
  → a conservative alignment: `gap` only on a rule finding, `appears_covered` only on a held line
  the catalogue accepts by exact id or declared substitute, an engine finding with nothing held is
  «δεν έχουμε δει», never "uncovered"; limits / expiring / lapsed caveats inline everywhere), one
  server loader, the onboarding map on the composed areas with «Τι άλλαξε στην εικόνα σου» after
  the upload, `/protection?lens=risk` as areas of attention + «Τι χρειάζεται ακόμη να
  καταλάβουμε», `/protection/areas/[area]` asking one unknown-or-coarse factor at a time (health
  behind a two-sided gate; prevention first; transfer «για συζήτηση», price arguments removed),
  the dashboard card on the same areas, reviews closed by evidence at area level from analysed
  policies only, eight new journey events + a server mirror. Three red teams (behavioural,
  insurance/risk, product) → one fix wave; a browser walk found that a document with no policy
  details became an active «covered» policy → `EXTRACTION_EMPTY`, `action_needed`, kept document.
  **Open for the owner:** which plan clears deep analysis (H-009 says both paid tiers; the
  pricing-v2 pins say top tier only; `plan-defaults.ts` says every tier) — production keeps the top
  tier through the one predicate `canRunDeepAnalysis`, the locked CTA names the feature, not a plan.
  Gates: full suite 572 files / 6644 tests, build green; harness `scratchpad/prp/prp-walk.mjs`
  (five personas at 390 through onboarding → map → upload → dashboard → lens → detail, DB
  inspection, cleanup). Not built (next): the needs-vs-limits adequacy rule (needs a benefit
  vocabulary on `coverages[].name` and a basis on `limit`), a month-2 cadence keyed on
  `factorsToResolve`, prevention by region/building age, a per-area change ledger.
- **2026-09-04 — The B2B customer-intake and policy-upload audit is merged (PR #296 → the
  stack → NEW-UI `b395a106`).** Ten launch-gating defects fixed, each with an enumerating guard
  and a probe: `/customers/[id]` read Next 16's Promise `params` synchronously and showed an
  arbitrary customer; a document reached the model provider with no consent on any party (now
  the agent's own AI consent, collected in-flow, plus a mandatory pre-scan attestation in the
  audit row — owner decision D1); the add-customer «smart PDF» door parsed and dropped the file
  (it opens the upload modal now); bulk import created relationships in the ENDED `inactive`
  status and choked on Greek `;` CSVs (per-row outcomes, chunked, ΑΦΜ accepted); invites
  resurrected terminated relationships; policy + grant + notification committed before the
  storage upload; server actions took unvalidated input (Zod, codes not prose, every error
  localised on the step that owns the field); the free tier was told «η ανάλυση εκτελείται»
  while the token gate could never pass (now `queued | blocked_quota | blocked_consent`, a
  blocked policy kept as `action_needed`). Owner decisions: D2 Article 14 inside the invite
  email only; D3 customers without an email (ΑΦΜ + Greek mobile as identity, synthetic
  `noemail+<afm>@customers.policywallet.invalid`, `users.contact_email_missing` — migration
  `20260904120000` applied and verified on dev AND prod, the one email transport refuses the
  domain, «Χωρίς email» pill + add-email path); D4/D6 a terminated relationship frees the seat
  and only the customer reconnects — a customer may have several agents, never assume one.
  Harness (session scratchpad, worth committing under `tests/journeys/`): `intake-walk.mjs`
  walks manual / pdf-door / upload / bulk at 390 as the E2E agent and `intake-db.mjs
  inspect|cleanup` checks the rows; three clean rounds on the final code (a fourth was lost to a
  dev-Supabase connectivity blip, not the product). Both databases had zero mixed-case emails,
  collisions or `inactive/not_invited` rows, so no data repair ran. Full suite 536 files / 6153
  tests; local production build green. Deferred: PRs #293 (onboarding) and #295 (perf) await the
  owner; the marketing dictionaries cut; the classifier blocked `gh pr merge` and `gh run`
  polling loops (merges went through the GitHub connector).
- **2026-09-04 — B2B batch C on `feat/b2b-batch-c` (stacked on #291 → #290): insights,
  benefits, commissions, questionnaires, team and the three customer modals are on the
  Direction A anatomy.** Three parallel subagents re-cut the nine files against the batch B
  exemplars; the lead swept the shared pieces the DOM audit still flagged (UploadDropzone,
  EmptyState rows, ConsentStatusBadge, the FAB tooltip, AiDisclaimer, AdvisorBookView) and moved
  the agent copy off «συμβόλαιο» (role-copy is now in the policy-term guard's file list). Fixed
  along the way: the questionnaires' hover-only edit/delete became always-visible pills, the
  team pipeline's raw `won`/`motor_liability` slugs became dictionary and taxonomy labels, the
  insights coverage empty state no longer reassures («Η κάλυψη είναι πλήρης» → what was checked),
  a rejected PDF scan in the add-customer modal now shows its reason. Verified in a browser as the
  E2E agent at 1440 and 390: no horizontal scroll, one primary per page, no console errors except
  one non-reproducing hydration warning on /customers. Trap: after a branch switch Turbopack
  served a stylesheet without `.pw-segmented` — the questionnaires toggle rendered bare until the
  cache was cleared. Gates green locally (CI does not run for a feature-branch base).
- **Late 2026-09-03 — Direction A is LIVE; the phone layer is up for the owner's decision.**
  PR #288 merged (`6cb43303`) after the owner's "error seen on production" turned out to be an
  OLD PREVIEW deployment whose Preview-scope `DATABASE_URL`/`DIRECT_URL` still carry 55-day-old dev
  credentials (Supabase `query_logs` showed the failed auths on the DEV project; production had
  none) — the raw Prisma message that page leaked is now a localised generic (`7f6a2f5d`), but
  the Preview env vars themselves are an OWNER action (`vercel env add` is classifier-blocked
  for the agent): set Preview `DATABASE_URL` to the dev 6543 pooler URL (without the local
  `connection_limit=5&pool_timeout=20`) and `DIRECT_URL` to the dev 5432 URL, then redeploy the
  previews. The dashboard defects the owner then flagged on the preview shipped as PR #289
  (`addfb7e6`): the element-scoped control-border rule painted every `a.pw-card` 45 % black
  (retired; `.pw-control-boundary` stays as the explicit opt-in), and unassessed coverage-map
  tiles were dashed and faded (plain sunken tiles now). **PR #290 (`feat/steady-mobile`) is the
  Steady phone layer** the owner pinned ("for the mobile UIs only"): ≤1023px only — near-white
  canvas, borderless 20px cards, one `.pw-segmented`/`.pw-segment` recipe (state from
  aria-current/pressed/selected; ink pill active on phones, the sunken track + white pill on
  desktop as before), avatar-left/bell-right header on the canvas, a floating ink icon-only tab
  bar (still `fixed bottom-0` + safe-area, so the shell guards hold), and the ink stat pill /
  panel under the headline number on the dashboard hero and the wallet overview (wrapper is
  `lg:contents`; every count renders once, h2 text unchanged). NOT merged on purpose — it is a
  design direction for the owner to look at on the preview at phone width. Guard moved in the
  register direction: `risk-assessment-panel-mobile` accepts `.pw-scroll-strip` and checks
  no-wrap on the `.pw-segment` rule itself. Deliberately not done: list rows as separate white
  cards on the canvas, dark detail headers with bottom sheets. Still legacy: **B2B batches B**
  (customers list/detail, renewals, opportunities, tasks, activity) **and C** (insights,
  questionnaires, team, commissions, benefits). Owner question answered in the session report:
  the Google consent screen's «to continue to cquudefwfwrmvpftuhyl.supabase.co» is the
  Supabase-hosted OAuth redirect — brand verification and/or a Supabase custom auth domain fix
  it, no code needed.
  **B2B batch B is on PR #291 (`feat/b2b-batch-b`, stacked on #290 because it uses the segmented
  recipe):** B-1 = tasks, activity, renewals, opportunities; B-2 = customers list, customer detail
  (the four tabs, the collaboration cards, the danger zone) and invite — all on the card anatomy
  (page names itself on the canvas, CardHead on every card, sub-card rows, fact cells / StatTiles,
  status pills on tokens, segmented view switches with aria-pressed, one primary per screen).
  `components/ui/PageHeader.tsx` deleted; SortableColumn headers in caption sentence case; the
  FAB clears the phone bar (fix on #290). Registers moved in the register direction:
  task-priority-colors-urgency (status-warning accepted), customer-list-responsive (toggle by
  recipe class), design-token-debt (invite hex gone), gap-severity-display-single-source and
  solid-panel-contrast (entries whose debt is paid), Greek inventory (+1 pair). 518 files / 5900
  tests, tsc, eslint, i18n, utf8 clean after each batch; captured at 1440/390 with 0 console
  errors. NOTE: CI does not run for a PR whose base is a feature branch — gates were run locally.
  **Still legacy (batch C):** insights, questionnaires, team, commissions, benefits, and the
  three customer modals (AddCustomerModal, UploadPolicyModal, BulkImportModal).
- **B2C app redesign — Direction A BUILT on `feat/b2c-direction-a` (`b73421e6`), draft PR #288
  against NEW-UI, awaiting the owner's look on the preview** (superseded by the entry above —
  merged the same day). Owner set aside `feat/grafi-b2c`
  (PR #287) for the policyholder app and picked, from the proposals artifact
  (https://claude.ai/code/artifact/ea4a5213-6b3b-4612-8769-d2e2a8d7161b), **Direction A · Inter ·
  cool slate**. Shipped in this pass: the shell (three-group sidebar, desktop top bar with
  accent-insensitive policy search ⌘K + bell + account, phone tab bar, flat slate canvas,
  light-first default) and `/dashboard` re-cut on the reference grid (facts row inside the
  same guarded h2, count bar instead of a score, renewal term bars, dedupe of duplicate
  uploads by policy number, map tiles, advisor rail card, one upload offer). Every honesty
  guard kept green; registers updated deliberately (clamp, token-debt, always-dark, Greek
  inventory). 518 files / 5900 unit tests, tsc, eslint, i18n, utf8, api-auth all clean.
  **Finish review (independent reviewer, degraded in-thread role via subagent):** first pass
  `fix` → batch applied (`0c64c2cd`: three visible planes via `--surface-canvas`/`--surface-sunken`,
  36px/10px slate-200 chips, 12px floor on every functional string, neutral term bars outside 30
  days, soft-pill secondary actions, drawer sign-out dedupe) → verdict pass scored 6/8 resolved or
  accepted-as-cited; regressions it found (pill arrow wrap, drawer label wrap) fixed in the
  follow-up commit. **Open by decision, for the owner:** (a) the severity tone module uses blue
  (`sky-500`) for the *medium* tier while the design rule says blue = info only — a product-wide
  single source (`components/gaps/severity-tone.ts`), not repainted here; (b) DESIGN.md still
  describes the pre-build canvas and lacks the sub-card/chip/count-bar devices — to be documented
  from the built world after the remaining surfaces are re-cut. Preview: Vercel git integration
  builds every push on `moniaros-projects/policy-wallet` (the second "AgentRise" team status fails
  on author access and is pre-existing); the CSP blocks Vercel's live-feedback script on previews.
  **Pass 2 (later 2026-09-03, same branch/PR): wallet, policy detail, protection and settings
  bodies re-cut onto the same card anatomy.** `/wallet`: KPI tiles + completion ring → ONE overview
  card of fact cells (every `data-count`/`data-fact` key kept, each rendered once), red notices box →
  white card with sub-card rows and a «+N ακόμη» soft pill, segmented filter/view controls on the
  sunken surface, sentence-case table headers, neutral chips, soft-pill row actions, the sticky
  `PageHeader` replaced by the page's own header, FAB as a round brand button with a card menu.
  `/wallet/[id]`: head without uppercase/mono (captions for labels, attention as a sub-card,
  primary DO + soft-pill ASK in one row — still exactly two buttons, DO first), summary on
  `CardHead` with the health donut turned into a fact cell, the six disclosure sections as cards
  with chips, 60+ uppercase labels across the sub-cards → sentence case, inner cards flattened into
  groups with sub-card tiles. `/protection`: header, segmented lens tabs (no green pill),
  `RecommendationCards` → `CardHead` + sub-cards with white pill actions, `InsightCard` without the
  coloured side bar and the six green blocks, raw branch id → localised branch name, expired notice
  on the warning tint. `/account`: rail active = bar + tint, chips, tokens. Also fixed a REAL
  hydration error on every expired policy (GlossaryHint's `<details>` inside a `<p>` in
  KeyDatesCard). Register/guard moves: token-debt −4 (ImportantNotices hex), Greek inventory
  (+«Επισκόπηση», +«Λήγουν σύντομα», «Αριθμός ασφαλιστηρίου» — the old ALL-CAPS label had evaded
  the «συμβόλαιο» ban because capitals drop the tonos), ledger A-10 now asserts the localised branch
  name rather than the raw id in capitals. Left as-is by decision: `policyStatus` labels stay
  ALL-CAPS in the source (pinned by policy-status-wording + e2e), `.pw-card:hover` mint lift is
  global, CoverageInsightsClient's verdict/stat tiles and the rest of its body, RecommendationCards'
  urgency colour map (bypass-listed). 518 files / 5900 unit tests, tsc, eslint, i18n, utf8,
  api-auth clean; browser console clean on all four surfaces at 1440 and 390.
  DESIGN.md and `.impeccable/design.json` re-documented from the BUILT world (three planes, card head,
  fact cells, soft pills, segmented control, count bar; MASTER.md gained the two app surface rows).
  **Pass 3 (later 2026-09-03, same branch/PR): /agent, /notifications, /account, /help re-cut and
  run through the finish reviewer until `disposition: ship` (three verdict passes; every material fix
  and regression resolved on recaptures).** Notable: notifications as ONE card of day-grouped rows with
  a fixed unread gutter; the advisor page as header + segmented tabs + white cards (connected state
  seeded on dev via `scripts/seed-agent-demo.mjs e2e-agent@… e2e-ph@…`); help page on the card
  anatomy with formal-plural copy and sentence-case article titles; every settings card opens with
  `CardHead` and its OWN glyph, row actions are soft pills (`.pw-soft-button` is now `:where()`-scoped
  so `text-status-danger` wins on destructive ones), quiet hours on the shared Switch, the ended plan
  reads as ended (badge, no price, past-tense entitlements, over-limit meter copy), UsageMeter's label
  is a caption (typography pin updated), TokenUsageCard on the ladder with a card head. Two shell
  traps fixed: a second `min-h-screen` INSIDE `<main>` under the 64px bar (64px/144px of empty canvas
  on every short page) and legacy `pb-28` tab-bar allowances stacked on the shell's own reserve.
  **Marketing (same day): the dummy phone UIs are gone.** `components/landing/real-screens/
  RealScreens.tsx` renders the REAL app components (ProtectionStatusHero + AttentionList, the
  renewals timeline, the coverage map, the advisor's ClientCard rows) on fixture data, laid out at
  390px and scaled into the hero DeviceFrame (now 300px, unpadded), both AudienceTabs phones and the
  «Γιατί τώρα» band; each screen brings a pinned `LanguageProvider` + `TranslationsProvider` (the
  public layouts mount neither), is `inert`, and is stamped as a sample; the mock-honesty guard now
  scans that file. BranchCoverageMap sizes to its container (`@container` / `@sm:`), which is what
  keeps it two-up inside a phone frame on a wide viewport. **Motion (same day, `/impeccable animate`):**
  the phone screens now behave like the app — a status bar and the app's own tab bar frame each
  screen; when a screen goes live (the hero frame switching to it, a static phone scrolling into
  view) its content pushes in from the right while the chrome stays put, cards settle in with a
  short stagger, bars fill to their values and counts tick up, and the tab bar's mark lands on the
  screen's tab; the hero now plays home → wallet → coverage map as one session. CSS keyframes
  (`.rs-live`, globals.css) + two small Web Animations tweens; reduced motion flattens everything;
  nothing loops off-screen. Pre-existing, not touched: a hydration attribute mismatch on the
  homepage comes from `PlanRecommender`'s range input (`caret-color` inline style).
  **Polish on /protection (same day, `/impeccable polish`):** functional first — the risk lens
  logged a React missing-key warning on every render (the RiskGraphPanel element is created in the
  server component and handed to the client view; Flight's frozen element cannot be marked
  validated, so it now carries a key), and the «Τι ελέγξαμε και είναι εντάξει» rows printed the
  stored slug («health», «motor») as a title with an English «OK» pill (now the taxonomy label and
  «Εντάξει»). Then the drift: the coverage summary is ONE card (CardHead · verdict sentence · tally ·
  expired notice · three fact cells on the sunken surface) instead of a centred kicker block over
  floating tiles; the empty states, free-tier gate, all-clear list and «Επόμενα βήματα» are cards
  with soft pills; branch tiles are chip · title · caption with status-token pills and no faded
  neutral state; life events, monitoring, risk profile, risk graph, household, trends, predictions
  and the quick-start opener share CardHead, sunken rows, segmented filters on the track and
  caption labels. Every bar, icon and pill colour is a status token (no `#1A2420`, no
  `text-black`, no palette literals). One guard learned the token vocabulary
  (`risk-assessment-panel-mobile`'s unknown-vs-unprotected check only knew `bg-red-50`-style
  classes). Recaptured both lenses at 1440/390: 0 console errors. Commit `fc6b7cac`. A second
  batch (captured as the FREE and DASH fixtures, whose thin profiles render the states the Pro
  fixture hides) put RiskProfileWizard on the anatomy — CardHead, sentence-case section heads,
  `.pw-input` recipe fields with a visible control edge, sunken chips with a primary ring when
  ticked (ChipToggle's amber «warning» accent is gone: a ticked family-history chip is state, not
  a finding), content-width submit — and moved every upgrade CTA on the page (lite gate, locked
  empty state, UpgradeTriggerCard's card and inline variants) to soft pills, so the wizard's
  submit is the screen's one primary. Not touched: the finding cards (already on the anatomy).
  **Auth pages (same day, `/impeccable polish`):** the auth tree is the Grafí world (the split
  AuthShell, `fg-*`/`surface-*`/`state-*` tokens) and sign-up already lived there; sign-in and the
  five utility screens did not. Sign-in: the email/phone switch is a segmented pill on the sunken
  surface, the error banner / field errors / reset dialog use the shared gap and covered notices,
  the submit and dialog buttons are the design-system Button, the trust badge and links are on
  tokens — no hex, no rose, no app-world `pw-*` recipes. Forgot / reset / verify / confirmation /
  handover: one anatomy (state disc · display-md heading · body · one action) on the same
  notices and Button; the reset page's two hand-rolled password inputs — `<label>`s with no
  `htmlFor`, an unlabelled three-segment meter — are now the shared PasswordField (a `showRule`
  prop hides the rule line on the confirm field). Shared recipes live in
  `components/auth/FormField.tsx` (`AUTH_LINK_CLASS`, `AUTH_PRIMARY_LINK_CLASS`,
  `AUTH_SECONDARY_LINK_CLASS`, `AUTH_NOTICE_GAP_CLASS`, `AUTH_NOTICE_COVERED_CLASS`). The five auth
  pages left the always-dark register's MIXED list because they no longer carry a dark literal.
  Captured unauthenticated at 1440/390: 0 console errors.
  **Next:** owner review on the preview (four app pages + /protection both lenses + homepage
  hero/audience/why-now); the severity tone decision. Two proposal-backlog claims were retracted/corrected in the artifact (the "avatar over
  the first tab" was the Next dev-tools button; the identical renewal rows were fixture
  duplicates, now collapsed).

## Done since the last entry

- **2026-09-05 — The Document Validation Gate (PR #298 → NEW-UI `45013e3f`,
  DEPLOYED 2026-09-05 00:00Z, deploy run 33930719296, SMOKED on production): no document enters
  expensive analysis unvalidated.** Root cause: nothing read a
  PDF locally, so «is this a policy?» was answered only AFTER the whole file had been base64'd to
  Gemini (~211k estimated tokens per run); `/wallet/add` uploaded from the browser straight into
  the bucket and committed the Policy with an extension check; every other door persisted before
  content was known; the selected branch was a prompt hint. Built: `lib/ingestion/` — `unpdf`
  probe (page cap FIRST, text of the first 12 pages, image-only), a Greek/English lexical
  classifier scored by distinct evidence groups (one repeated word can never look like a policy;
  text that talks to a model is refused outright), the cheap model only for the middle band or a
  scan (≤6k chars / ≤2-page pdf-lib excerpt, consent read first, closed schema, excerpt framed as
  data), branch FAMILIES with mismatch only when lexicon and model agree, duplicate by
  `documentHash`, a 20/h rejection budget; ONE persistence path `ingestPolicyDocument` (gate →
  storage → Policy + stamped PolicyDocument in one tx) behind `/wallet/add` (file now travels in
  the action; browser→storage code deleted), onboarding, wallet upload, renewal, the agent commit
  (grant in the same tx) and the documents route (attachment mode); the extract route and the
  agent scan gate BEFORE the daily spend cap; `extractPolicyData` takes a `ValidatedAIDocument`
  only `toValidatedAIDocument` can mint; `prepareDocument` validates legacy rows lazily
  (keep-and-inform); `createRun` returns the in-flight run, requires a document and marks
  «analysing» only after the token gate; `executeRun` re-checks consent + deletion; QStash
  `deduplicationId`. Migration `20260905120000_document_validation_stamp` on dev AND prod
  (verified by query); the `policies` bucket INSERT policy dropped on dev AND prod (archived;
  `pg_policies` on `storage.objects` is empty on prod, so the browser can no longer write the bucket). Copy: one code-driven block for every surface (el/en), no
  field counts; «Άλλαξε τύπο σε …» / «Συνέχισε ως …» / «Επιβεβαίωση και συνέχεια». KPI: ActivityLog
  `DOCUMENT_*` rows → admin dashboard «Document gate» card («AI analyses prevented», tokens
  prevented, classifier spend separately). Guards + probes: `document-gate-before-model`,
  `document-gate-storage-single-path`, consent guard's `classifyDocument` arm. Journey:
  `tests/document-gate.spec.ts` (policyholder, serial), `tests/document-gate-agent.spec.ts`;
  fixtures `tests/fixtures/documents/` (built by `build.mjs`). Audit:
  `docs/audits/document-validation-gate-2026-09.md`. **Deliberately not built:** OCR; a
  DB-level unique constraint on in-flight runs (Prisma 5 partial indexes); stopping
  `resolveLineOfBusiness`'s post-extraction overwrite. **Production smoke 2026-09-05 (owner account, `/wallet/add` as Motor):** `menu.pdf` → gate card `NOT_AN_INSURANCE_DOCUMENT`, 0 policies / 0 documents / 0 `token_usage`, one `DOCUMENT_REJECTED` row (tokensPrevented 188,640, no classifier call); `motor-schedule.pdf` → policy `cmtnmck13000385ohunkc6rbi` active, document stamped `validated` / `docgate-1` / `insurance_policy` / motor / consistent, run completed in 24 s, four `token_usage` rows (analysis, clarity, gap detection, other), one `DOCUMENT_VALIDATED` row. No new Sentry group in the window after deploy. The smoke policy is still in the owner's wallet.

- **Auth rebuild A0–A8 (brief: split-shell, phone removal, phased social login)**
  (2026-08-31, `e663df0f` — DEPLOYED, CI+deploy green, live signup smoked: new H1s,
  no phone field, «Δημιουργία λογαριασμού», no social button pending credentials): phone retired as an IDENTIFIER (synthetic emails minted
  for no new account; universal email verification; recovery restored); terms now
  RECORDED on both paths; one AuthShell across all 9 auth screens (panel subtree
  omitted <1024); social registry live|soon|off with signed-intent role transport,
  callback row-birth + linking guards (and the id-vs-email lookup bug fixed);
  Google code-complete behind NEXT_PUBLIC_AUTH_GOOGLE [verify: owner credentials].
  Ledger docs/AUTH_PROGRESS.md · audit docs/auth-audit.md · handover appended.
  518 files / 5900 unit tests green.
- **How-it-works band restyled onto Grafí** (2026-08-30, uncommitted): new
  `components/landing/grafi/HowItWorks.tsx` — numbered icon tiles, one bold brand-green
  phrase per step (`emphasis`, a verbatim substring of the JSON-LD description), per-step
  44px arrows (1/4 → signup `source=landing_how_it_works`, 2 → `#reading-demo`,
  3 → `#difference`), closing line «Εσείς αποφασίζετε.», ReadingDemo kept inside. Copy from
  the owner's mock (accents fixed). Guard: `tests/unit/landing-how-it-works.test.ts`.
  Verified 1280 + 390 (no h-scroll), HowTo JSON-LD plain, full unit set green.
- **«Για ποιον» band restyled onto Grafí and moved under «Πώς λειτουργεί»** (2026-08-30,
  uncommitted): new `components/landing/grafi/WhoItIsFor.tsx` (header with brush accent,
  the shared «σωστή κάλυψη, τη σωστή στιγμή» strip) around a rewritten `AudienceTabs`
  (same ARIA/keyboard contract, pill switch with icons, role cards with stamped phone
  samples on the three-state chips — «Καλύπτεται»/«Κενό», no «Εντάξει»). Mock copy taken
  in formal plural per the voice rule. Retired every hex literal in AudienceTabs and the
  last one in WorldClassLanding (debt list shrunk). `BrushUnderline` promoted to
  `src/design-system/layout.tsx`. Verified 1280 + 390, light + dark, both tabs.
- **Grafí tokens → components → homepage**: fixed-promise H1 (carousel gone), coverage ticker,
  answer block joined to the glossary (guarded), sourced market numbers (ΕΔΑ + ΕΝΦΙΑ only),
  4 steps + ReadingDemo, broker band + BrokerScanPanel, comparison on /compare's source,
  Free card + billing toggle + PlanRecommender on the enforced entitlement ceilings.
- **Accepted-but-never-applied marketing decisions landed**: NEUTRALITY_STATEMENT replaces the
  retired «δεν συνεργαζόμαστε» sentence; TRUST_FACTS stops claiming data "stays in Europe";
  FAQ funding claim retired; deliverable-4 titles/descriptions applied.
- **Three production-grade defects found by the G12 passes**: tailwind-merge silently deleting
  `text-fg-on-brand` (hero CTA at 2.74:1 → cn() group registration, a11y 97→100); triple Inter
  loading (un-preloaded H1 font); `/_vercel` analytics scripts 307'd to signin by proxy.ts.
- **/solutions/partners + /synergates** created noindex per A-04; «Κάλυψη» glossary entry;
  health/property wedge sections with primary sources.

## Blocked

- **Cloudflare `Workers Builds: policy-wallet` is permanently red and is not a code task** (`docs/provenance/BLOCKED.md` BL-P1): a `policy-wallet` Worker exists in the Cloudflare account with a git integration onto this repo, while the repo has no Workers project at all (no `wrangler.*`, no `open-next.config.ts`, no `@opennextjs/cloudflare`). Red on merged #316 and on every commit of #317. Needs the owner to disconnect it in the Cloudflare dashboard; until then every PR carries a red check that trains reviewers to ignore red.
- **BL-C1 — production catalogue alignment** (`docs/content/BLOCKED.md`): PR #309 (Goals 5–6, renters + 21 rules) merges only after `gap_definitions` is aligned on dev, then production (archive export first, fingerprint `d6f515a1d400f9d5` on both). Needs the owner's written go — a production write.
- **BL-C2 — policyholder production smoke**: no policyholder session in the browser; the agent does not sign in with credentials.
- **Legal sign-off of `docs/transparency/PROVENANCE-REVIEW.md`** (50 rows: 6 legislative, 2 market, 42 under review) — blocks GA (HANDOFF C-H2).
- **No MX record on `policywallet.gr`** — dpo@ / info@ / careers@ cannot receive mail (C-H6, GA blocker; owner's DNS).
- Partners de-noindexing: Terms §3 qualification + IDD opinion (legal — `docs/legal-review-queue.md`).
- Guides 6–8: citation debt (A-03: citation-clean or not at all).

## Top risks, ranked

1. **AI providers are not regionally pinned and no zero-retention setting is applied in code.** Complete policy documents — Art. 9 health content included — go to the global Gemini AI Studio endpoint under whatever the account defaults are, while `/subprocessors` asserts the providers' terms forbid training on them; that assertion rests on the executed account contracts, which nothing in the repo verifies. Neither fix is a code change alone (Vertex AI + EU location, or zero-retention terms). `docs/compliance/DATA_PROTECTION_REVIEW_PACK.md` §8/§14.1.
2. **Engine plans from the database, composition fingerprints the repo.** Any catalogue merge without the matching alignment makes every new production run render the stale-catalogue line and no new rule fires (why BL-C1 exists; CI checks the catalogue against DEV only — D-C8).
3. **Every production finding is still «under review»** — no citation can render on production until a classified rule fires there; the public methodology says so, but the product's first impression is a list with no legal basis shown.
4. **Marketing routes ship the app bundle** (mobile LCP 4.8s vs the 2.0s budget; `docs/perf-report.md`).
5. **`/en/*` server HTML says `lang="el"`** until an inline script runs (root-layout limitation, documented in `app/layout.tsx`; Lighthouse SEO 100 because it reads the hydrated DOM).

6. **`tests/unit/area-detail-questions.test.tsx` is a deploy-blocking flake.** Three red CI runs on NEW-UI in four days (#331; #320's PR run and its post-merge run), each a different timing case of the same file, and every red gate SKIPS the deploy — `deploy.yml` only fires on a green `workflow_run`. The recovery is «re-run failed jobs», which happens only while someone is watching. Either the file gets a deterministic clock and awaited transitions, or one day production silently stays stale.

## Next 3 actions

0. **Owner, one action, commercial:** set a LIVE `STRIPE_SECRET_KEY` in Vercel. Until then production honestly declines every online purchase (#333) — before that change it accepted cards into a sandbox and charged nothing. No deploy is needed once the key is set.
0b. **PW-BRIDGE-01's repair phase is finished.** H-B2, D-03 and D-04 were answered on 2026-09-10 and shipped (#330, #331). The one thing still open in the series is **H-B0** — the agent→customer «add policy» flow — which waits on an Article 9 lawful-basis decision outside it. The one thing still owed on what shipped: an interactive production smoke of the renewal thread, which needs a signed-in session. Superseded note: H-B2 (agent-side disclosure of unshared policies — none / existence / a count), D-03 (shared finding thread), D-04 (renewal handoff surface). Earlier note: **Queues A, B and C are closed.** What remains in PW-BRIDGE-01 is Queue D-01…D-06 — the six BRIDGES, which are new product surfaces rather than repairs (document request as a dated mutual work item, the permissions mirror, a shared finding thread, renewal handoff, asset identity agent-side, disclosure of unshared policies) — plus A-09's agent half, which is halt H-B2 and needs your decision. **Queue B is closed** (tiers 1–6 all acted or recorded). Remaining in the program: Queue C-03…C-08 (the report as the third surface — it carries the stale-catalogue sentence but no pre-plan or unauthored counterpart, renders no composition lines, and its under-review rows are unverified), Queue D-01…D-06 (the bridges), and A-09's agent half (HALT H-B2). Queue A is closed but for A-09's agent half, which is HALT H-B2. Earlier note: Queue B tiers 2–6 (actor attribution where `notifications` has no actor column — schema or copy), Queue C-03…C-08 (the report as the third surface), and A-02/A-06. **Closed 2026-09-08 — the owner confirmed the production password was rotated**, so the credential in commit `852a2b4c` is dead and the public history is accepted as-is; no rewrite, no going private. (The scan that found it, and the recipe for repeating it without printing secrets, stay in this file's security note below.) **Done 2026-09-08:** Goals 5–6 deployed and the catalogue aligned (BL-C1, BL-C3 closed). **Done 2026-09-07 (later):** the goal series #316 / #318 / #319 / #321 merged and deployed (see Production); C-02 proven on production by SELECT (stale open cycles 2 → 0 after the column repair; 0 of 8 unresolved — `docs/bridge/PROGRESS.md`); smoke the agent's customer-policy page with the agent account. Earlier: #311, #314 and #313 merged and deployed. One decision stays open from the home brief: the brief said «Τα συμβόλαιά μου», the shipped copy says «Τα ασφαλιστήριά μου» because `policy-term-asfalistirio` guards the owner-ratified term; flip the guard if the colloquial word is wanted.
1. **Owner:** say go on BL-C1 → align dev (`npm run align:gap-catalogue -- --apply`, verify `d6f515a1d400f9d5`) → export production `gap_definitions` to `docs/archive/` and commit → align production → verify → merge #309 → deploy, one window (`docs/content/PROD-ALIGNMENT.md`).
2. **Owner:** approve PW-BRIDGE-01 L0 (`docs/bridge/HALTS.md` H-B1) and answer its two questions (the conversation number for findings; actor attribution on notifications) → the loop starts at Queue A-01 (the password-hash select) and A-08 (instrument the agent surfaces so parity is measurable). C1–C7 stay unstarted.
3. **Owner:** legal sign-off of PROVENANCE-REVIEW.md (C-H2), the MX record (C-H6), and the extraction requests E1–E5 in `docs/content/DEFERRED-RULES.md` (C-H4) — each unblocks a named next step.

---

<details>
<summary>Previous entry (2026-08-28, PW-MOBILE-TRANSFORM-02)</summary>

## Done since the last entry

- **The needs check's multi-selects were the real dead end** (reported second, and
  worse than the single-choice one). `isStepComplete` counts a multi question as
  answered when its array EXISTS — an empty array is the affirmative "none of
  these", exactly as `toRiskProfilePayload` documents. Nothing ever created that
  array, so the only route to "none" was to tick an option and untick it. Anyone
  with no boat, no business and no high-risk sport hit a disabled Continue on
  step 5 while the step's own intro said «αν δεν ισχύει κανένα, προχωρήστε».
  Fixed with an explicit control, NOT by loosening the gate: the form's claim to
  honesty is that a reader can tell "asked and said no" from "never asked", so
  auto-completing would let someone who scrolled past look like they had
  answered. The renderer draws the pill for every multi question, so a new one
  cannot ship without it; `noneLabel` exists only because Greek gender has to
  agree («Καμία από αυτές» for καλύψεις). Guarded by a component test that
  asserts the OUTCOME — Continue disabled with nothing ticked, enabled after
  "none" — red-proved in both directions.

- **The literal sweep: 456 -> 124 across 80 -> 29 files.** Four status roles
  (success/warning/danger/info) are now tokens with the same machine-read
  `@on <surface> @min <ratio>` contract as the brand accent. Measured first, and
  the measurement changed the story: every shipping value already cleared 4.5:1,
  so this was never remediation. It was ONE ROLE RENDERING MANY WAYS — warning
  foreground in three ambers, warning tint in five, success in two mints — with
  the light side of all four roles already uniform. Only the unreviewed half of
  the theme had drifted. Light mode is now byte-identical (**0 of 15,111,680
  pixels** on a full-page landing diff); 59 dark instances move and the worst
  lands at 8.63:1 against a 4.5 floor. Edges left alone deliberately: amber-200
  on the amber tint is 1.12:1 and looks like a 1.4.11 failure, but the chip is
  already identified by its fill and text, so the border carries no information.
- **A defect class found on the way: eleven elements set the same property twice
  under the same variant.** Three named different values, and Tailwind emits both
  at equal specificity — so stylesheet order decides, not class order, and the
  rendered colour is one nobody chose. Eight fell out of the sweep; the other
  three used palette classes no colour rule would ever reach.
  `one-variant-one-declaration.test.ts` guards the shape and reads its colour
  vocabulary from globals.css so `text-sm` is not mistaken for a colour.
- **The needs check showed six blank grey slabs on a phone.** The step strip is a
  6px progress bar whose only text is `sr-only`; the unlayered mobile control
  floor (`button { min-height: 44px }` under 768px) had nothing to grow but the
  button's own box, so each segment inflated into an empty 44px pill. It looked
  correct on desktop, where the floor does not apply, which is why it survived.
  The button now owns the 44px target and the bar is a 6px child — the hero
  carousel's pattern — and `basis-8` keeps all six on one line down to 320px.
- **Three required questions were dead ends, and one value was unsaveable.** The
  needs check refuses to advance until every single-choice question is answered,
  and «Πού μένετε / Πώς εργάζεστε / οικογενειακή κατάσταση» had no option for a
  student, employer housing, or anything unlisted. Worse, `student` was already
  a valid value in `profile-mapping.ts` and **rejected by the Zod schema** — so
  anyone picking it in the questionnaire had their save refused. `partnered` was
  accepted everywhere and missing from the wizard's own select. Four descriptions
  of three fields, drifting in every direction;
  `profile-choice-sets-agree.test.ts` now enumerates the option lists from source
  and fails on any value the contract refuses, plus on a required question with
  no way out. Red-proved three ways, one of them the exact live bug.

- **Dark mode was ungoverned, and the token migration was about to make that permanent.**
  `text-[#29685B] dark:text-[#A7F3D0]` across four landing files was never a style pair — the
  brand green measures **2.74:1 on slate-900** and is unusable there, so the second literal was
  the contrast fix, stored as a magic string with nothing recording why. Migrating the light half
  to a token and leaving the dark half a literal (the pattern the already-migrated landing files
  use) buys a governed light theme and an ungoverned dark one; token work gets reviewed in light
  mode, which is exactly where drift hides. Owner chose to add the dark tokens FIRST.
  `--brand-accent-on-light` / `--brand-accent-on-dark` are named by role and carry a machine-read
  `@on <surface> @min <ratio>` contract; `tests/unit/token-contrast-contract.test.ts` enumerates
  every `*-on-light`/`*-on-dark` token in `app/globals.css`, resolves its surface, measures the
  ratio and fails below the floor — **including on a missing annotation**, so the contract cannot
  be skipped by omission. Red-proved three ways against the real file, plus an 8-branch probe
  fixture. This is the return on the decision: the literal-count ratchet became a contrast
  ratchet, and the remaining 81 pinned files inherit it.
- **HeroSlides fully migrated — 24 literals to 0**, and 11 `dark:` colour twins deleted rather
  than tokenised one-sided. Debt guard total **489 → 465** literals across **82 → 81** files;
  no other file's count moved. Two greys turned out to already have exact tokens
  (`#5B6A7A` = `--muted-foreground`, `#0F172A`+`dark:text-white` = `--brand-text-primary`), so
  those were zero-change swaps, not the trade-off they looked like.
- **One real defect in HeroSlides, found by asking what the greys were doing.** The inactive
  carousel dot measured **1.48:1** on white and **2.36:1** on slate-900 — a live SC 1.4.11
  failure, and *worse* in the theme nobody was checking. An inactive dot is the only thing
  telling a reader the control exists. Now `--dot-track`: **3.61:1** light, **3.75:1** dark.
  Verified by pixel diff: **176 of 272,240 pixels changed, all inside the two dots, in both
  themes** — nothing else on the hero moved.
- **The auto-rotating hero audit came back clean apart from that dot.** 2.2.2 pause control
  (visible, labelled, 44px), reduced-motion kills auto-advance entirely and removes the dead
  control, hold on hover AND keyboard focus, `aria-live` off→polite on user control, inactive
  slides `inert`+`aria-hidden` with only the active one an `<h1>`, focus ring at 6.51:1/13.92:1,
  44px targets. Reported rather than assumed — it was the most likely Level A failure on the page.

- **The gap engine was inventing duplicate motor cover.** `insuredSubject` kept a hand-rolled copy
  of the asset-identity map and never rejected the extractor's unreadable masks, so two different
  cars whose plates both read «(XXXX)» were reported as one vehicle insured twice — advice to drop a
  policy, on compulsory third-party cover. Measured against the shipped code before fixing. Now
  delegated to `policyAssetSubjectKey`, which also makes the dead `assetIdentityKey` live and adds
  pet and vessel subjects the old copy could not see.
- **Greek public pages could render English, per device, with no way back.** `/guides` and six
  siblings never pinned a locale, so they rendered whatever `localStorage` on THAT device last
  chose — which is why it looked like a mobile bug when nothing in the locale path is
  device-dependent. The ΕΛ toggle pointed at the page you were already on, so it was unrecoverable
  in place. Seven routes pinned; **verified on production with `language:'en'` stored — renders
  Greek, `langOwner="static"`.** Guard enumerates twins from the filesystem (both manual sweeps
  missed `/for-agents`; the guard caught it).
- **A renewal upload left a stale «Το ασφαλιστήριο έχει λήξει» until repeated refreshes.** Three
  defects: the path never marked the policy `analyzing`, so nothing had an honest state to show;
  `after()` deferred the run while `revalidatePath` fired ahead of it and nothing revalidated when
  it landed; and **on free/Starter the dates never moved at all** — the evidence gate rejects
  `renewal_notice` by definition, so those users would never have seen an update, ever. New
  `renewal_under_review` attention state claims neither verdict.
- **A renewal is now checked against the policy it is attached to**, comparing numbers
  presentation-insensitively (punctuation, and Greek/Latin capitals that render identically). A
  mismatch refuses to apply and names both numbers; the document is always kept.
- **The insured person is updated, not duplicated.** `deriveInsuredNames` unioned four keys holding
  one party; a renewal that restated the name listed the old and new spelling as two covered people.

- **GROWTH-HOOKS-01 Track A is live** — hook ticker on `/guides`, three new sourced guides, one
  extended, verified on the production site.
- **Two live consumer-facing errors corrected and deployed.** The uninsured-vehicle guide named the
  wrong authority (ΑΑΔΕ, not Γ.Γ.Π.Σ.Ψ.Δ./Σ.Δ.Ο.Ε.) *and* understated every fine — €150 published
  against €500 in law for a passenger car. Both from ν. 5113/2024, verified verbatim.
- **Phase 4** — design-token debt guard (321 keys, shrink-only, red-proved both directions), 274
  landing literals migrated with before/after computed-style verification across 24 captures,
  MASTER.md's real drift fixed.
- **Phase 5 preconditions** — the two missing §11 metrics built (`duplicateActions`,
  `countConsistency`), counts instrumented, and a **cross-surface** detector that catches a
  contradiction the per-page metric structurally cannot see. Proven red live, not just in jsdom.
- **Phase 6 guard audit** — all 45 guard files read. **Two were green over live defects.**
- **`check-utf8` now refuses C0 control bytes**, and immediately found a corrupted hostname in a
  March governance evidence record.

## Top risks, ranked

0. **Plan naming — the APP is fixed; the EDITORIAL corpus is not, and it is not safe to bulk-rename.**

   *Fixed 2026-08-28.* «Plus» named two different plans at two different prices: the upgrade modal
   offered «Συνέχεια με Plus — 8,99 €» for `ph-pro` while `/upgrade`, the public pricing page, the
   landing page and the help centre call `ph-plus` «Plus» at €4.99 and `ph-pro` «Family». Three
   components held their own label maps — `UpgradeModal`, `CarriedPlanCard` and `PlanBadge` (the
   third was invisible to the first guard, which named files instead of enumerating). All three now
   resolve through `planTierName()`; the four `subscription-copy` CTAs whose KEY named one tier and
   whose VALUE named another are corrected, as is the `/upgrade` FAQ that priced «Starter» at €39
   and «Plus» at €79 on the same page whose cards said «Plus €4.99» and «Family €8.99». The guard
   now enumerates `components/{monetization,account,shell}` and is red-proved against `PlanBadge`.

   **CLOSED 2026-08-28.** The gating audit turned out to be already written down:
   `plan-defaults.ts` states the intent in its own comments — `plus` is "displayed Plus (the name
   moved from Starter)", `pro` is "displayed Family (the name moved from Plus)". Every editorial
   instance was then decidable and renamed MEANING-PRESERVINGLY: 8 «Starter»→«Plus» (all reminder
   claims, and `notifications` is true on `plus`, so also factually right) and 3 «Plus»→«Family»
   (all gap/under-insurance claims, and `portfolioGapView` is `pro`-only). The copy freeze confirms
   it: 11 added, 11 removed, the only difference in each pair being the plan name.

   It also caught a **false claim at the point of sale**: `upgrade-copy` promised "Έως 5
   ασφαλιστήρια (Starter) ή απεριόριστα (Plus)" to a free user hitting the policy cap. The catalog
   says 10 and 25 — wrong on the numbers as well as the names, while the public pricing page had
   said 10/25 all along.

   A FOURTH hardcoded map was found by widening the guard: `MainNav` rendered "Plus" for `pro` and
   "Starter" for `plus` on the nav badges. The guard covered its directory but matched only
   `key: "value"` maps; a JSX text node was invisible to it. It now checks both shapes.


1. **H-011 — a document reaches a model provider BEFORE anyone consents.** The agent scan path
   (`parsePolicyPdfWithGemini`, 93 lines, zero consent references) sends the document, and
   `commitScannedPolicy` takes `attestedAiConsent` as a parameter — consent is attested *after* the
   processing. `AddCustomerModal` calls the scan directly from the client, bypassing both wrappers.
   **CLAUDE.md claims this cannot happen "on every path"; that claim is false.** There is a fair
   structural argument (the subject is unknown at scan time — resolving it is the point), but a
   lawful basis is needed when processing happens, not when it is recorded, and no exemption is
   written down anywhere. Three options in `HALTS.md → H-011`; the cheapest is to accept it and fix
   the doc, because a future agent will trust the invariant as written.

2. ~~**The money path has rotted.**~~ **GREEN — 14/14, 2026-08-28.** It had been red for five days
   and nobody knew, because Playwright is not in CI. Running it found far more than the one stale
   selector STATUS knew about: **6 failed / 4 passed / 4 never ran**, and the spec could not pass in
   ANY configuration — its docblock said FREE tier, the config gave it the PRO session (every
   assertion is about gates that need `tier !== 'pro'`), and its fixture resolved the PRO user's
   policy, a correct 404 under the free session.

   Nine iterations, because serial mode reveals one failure at a time. Fixed in the PRODUCT where
   the product was wrong (plan naming, the upsell inside a collapsed section) and in the
   ASSERTIONS where they described a page that had been deliberately replaced:

   - the `money-free` project, the free user's own fixture policy, the pro session pinned on the
     one billing block that needs it;
   - `PremiumInsightCards` carries its `id` on the component, not a container;
   - the shared modal probe matched «Συνέχεια με Plus» — three unrelated tests went red at once
     when the modal stopped calling `ph-pro` "Plus". It now requires the **price**, because the
     locked feature cards carry «Συνέχεια με απεριόριστες ερωτήσεις →» and sit EARLIER in the DOM,
     so a loose match with `.first()` selected a card and passed against a modal that never opened;
   - assertions on a raw filename the product never persists, on a Q&A trigger that moved into the
     head card in GOAL 2, and on a free-question allowance that was removed
     (`FREE_LIFETIME_QUESTIONS = 0`) — the last rewritten to pin what replaced it: the lock is a
     PLAN gate, so prior usage cannot change it.

   **Playwright is still not in CI.** Everything above was invisible to a fully green gate.
3. **SEC-01 — session objects reached the Vercel runtime logs. LAUNCH RISK, not post-GA debt.**
   **Contained, not closed**, and not closable by the agent. The middleware TypeError embedded the
   whole session in its message; **8 occurrences confirmed** in production (2026-08-23 ×7,
   2026-08-26 ×1), counted two independent ways.
   *Done:* the affected admin session **revoked** (prod verified 0 sessions / 0 unrevoked); both
   leaked access-token JWTs had already expired and neither leaked refresh token still existed in
   `auth.refresh_tokens`; the throw is caught and redacted in `proxy.ts`; `scrubText` now redacts
   credentials, which it never did; Sentry holds **no** copy. The IP-origin line raised in review
   is **CLOSED — confirmed VPN, not a finding**.
   *Open, and the only thing gating closure:* whether a **Vercel log drain** was configured inside
   the exposure window. Dashboard check, project *and* team — see `HALTS.md → SEC-01`. No drain ⇒
   exposure confined to Vercel's own logs, which age out and hold only dead credentials, and
   SEC-01 closes. Drain ⇒ the 8 entries were forwarded to a third party with its own retention and
   access list, containment is **not** established, and a new scope item opens.
   Vercel exposes no delete endpoint for runtime logs; the only early-purge lever is deleting the
   two producing deployments, deliberately not done — irreversible, and the credentials are dead.
   Whether occurrences predate 2026-08-23 **cannot be established**: the 7-day aggregate times out
   and 30 days is rejected.

2. ~~**The local session pooler (5432) is wedged.**~~ **RECOVERED, verified 2026-08-28** — connects
   in ~1.8s, `global-setup` provisioned all five e2e users over SQL, and a full Playwright
   measurement run completed. Local measurement is unblocked. Original note kept below.

2. **(historical) The local session pooler (5432) was wedged.** `verify:gap-catalogue` passed at 04:44 and failed
   at 05:10 on the same invocation. TCP is healthy (~400ms, no IPv6 records) and the database is
   idle at 3 upstream connections, but new *session-mode* connections stall past the 20s pool
   timeout while transaction mode (6543) still answers. Follows two crashed provisioning runs.
   Blocks every local Playwright measurement.
3. ~~**`/protection` is the one unresolved capture.**~~ **RE-CAPTURED 2026-08-28: it is 6 sections,
   not 20/26.** Both lenses. The re-measured id list is an exact PREFIX of the stored one and every
   dropped entry is a nested descendant of the six that remain — card titles inside «Προτάσεις
   κάλυψης», rows inside «Σύνοψη κάλυψης». `/account/history` held at 2 in the same run, so the
   collector did not simply start counting lower. **The ceiling concern was a measurement artefact;
   the page needs no section reduction.**

   **The rest of the stale corpus was then re-run, and it is in far better shape than "inflated by
   an unknown factor" implied.** Of 54 stale captures re-measured, **49 were already correct and 5
   were wrong.** The inflation is not a factor applied to the corpus — it is a property of one page
   SHAPE. Every capture that moved is a surface with nested card groupings, where the old collector
   counted a grouping and its own contents separately, consistently 3.3–4.5×:

   | capture | stored | true | factor |
   |---|---|---|---|
   | `/protection` ανά κλάδο | 20 | **6** | 3.3× |
   | `/protection` ανά κίνδυνο | 26 | **6** | 4.3× |
   | `overlays` batch-upload-modal | 12 | **3** | 4.0× |
   | `wallet-list` populated-paid | 9 | **2** | 4.5× |

   Everything unchanged was a page the collector scored 0 or 2 — nothing nested to double.

   **Four stale surfaces can NEVER be corrected.** `branches`, `coverage-insights`, `risk-profile`
   and `timeline` (31 captures) have no spec, because V2-P2-03 deleted their routes. Their inflated
   numbers are the only surviving record of pages that no longer exist and must be read as
   before-pictures, not measurements.
4. **`verify:gap-catalogue` now runs in CI** (the secrets were a name mismatch, not missing) — but
   the loud-skip fallback has never actually fired, so the failure path is unproven.
5. **The fix for a guard gap had the same gap.** The pooler lock shipped guarding `withDb` while
   the heaviest DB user in the run bypassed it. Assume every new guard's universe is too small
   until enumerated from the filesystem.

## Next 3 actions

1. ~~`no-raw-euro-money-interpolation` — seven files not yet fixed.~~ **STALE, verified
   2026-08-28: all seven were routed through the formatters, `KNOWN_RAW_EURO_DEBT` is empty and the
   tree is clean of BOTH shapes** — the guard's `€{expr}` / `€${expr}` forms and the suffix shape
   `{expr.toFixed(2)} €` it structurally cannot see (swept separately, 0 matches).
3. Confirm who can read the Vercel runtime logs — team `moniaros' projects` (Pro, no SAML) is the
   access boundary, and its member list could not be enumerated from the tooling here.
2. ~~Re-capture `/protection`.~~ **DONE** — see risk 3. The follow-on is that the label-collision
   correction proposed in `P5-measure-00` is now measured as far too weak to publish: it catches only
   doubles that SHARE a label (2 of the 20 dropped here), so it would have reported a number wrong by
   an order of magnitude while looking corrected. Re-run captures instead.
3. **P5-wallet-01** is unblocked: motor, property, pet and marine carry strong identifiers in
   `acordData`; health, life, travel, cyber, business and pension carry none, which is exactly why
   the duplicate rows measured were health. Rows without an identifier stand alone.

</details>
