# DASHBOARD_PROGRESS — the audit ladder (D0–D8)

Run started 2026-08-31. Instruments first, evidence always; the role doing the
work is named per row (test engineer writes probes, product engineer fixes
what they prove). Baselines: the OLD build at :3000 (main checkout, NEW-UI);
the audited app: this worktree at :3100.

| id | goal | role | status | artefacts | assumptions |
|---|---|---|---|---|---|
| D0 | Harness | test engineer | **DONE** (visual twice-run proof owed after the re-accept) | playwright.audit.config.ts (5 devices × themes-in-spec, no webServer, workers=1) · tests/audit/{helpers,audit.setup,visual.spec}.ts · main-config testIgnore guard · build-identity assertions (old 307s /dashboard, new 301s it) | A-32..A-35 |
| D1 | Inventory | test engineer | **DONE** | information-inventory.{json,md} (old, 322 items — dashboard counts, expiry lines, plates/policy numbers, statuses all present; spot-checked) + information-inventory-new.json (244 items) via inventory.spec.ts, desktop capture, digit-collapsed fact keys | |
| D2 | Probes A2–A6 | test engineer | **A2 done · A6 done** (new build asserts clean: three states only, zero banned/templates/duplicates/shouting; old babel recorded — 11 status words, 29 uppercase runs, 23 duplicates, 1 banned) · **A3 done** (new: zero axe + zero customs, 2 widths × 2 themes; old baseline: 5 findings recorded) · **A4 done** (new asserts clean after the border-control token fix — the Input boundary measured 1.45:1; old baseline: 2 pairs) · **A5 done** (CLS 0.000 everywhere; layout await-chain parallelised — TTFB −1.3 s; client LCP−TTFB < 1.5 s asserted, absolute 2 s gate = PERF_STRICT for a same-region run, A-36) — **D2 COMPLETE** | tests/audit/{layout,a11y,contrast,performance,consistency}.spec.ts + docs/audit/*-baseline.json | |
| D3 | Report | test engineer | pending | docs/audit/dashboard-audit.md (ranked, evidenced, incl. «what works») | |
| D4 | Widgets | product engineer | pending | styleguide state demos + presentations sheet | |
| D5 | Dashboard fixes | product engineer | **A2 geometry CLEAR** (user-reported responsiveness: 132→0 findings across 5 viewports ×23 routes; both Switches, GlossaryHint width, pricing scale, help/upgrade grids vs the 700px shell column, 9 sub-44 controls, titled truncations) — other probes pending | probes green on / at :3100; density assertions | |
| D6 | Sibling fixes | product engineer | pending | probes green on /see /policies /money /updates /adviser /me | |
| D7 | Gates | both | **gate 1 GREEN** (loss.spec.ts: 189 guarded facts auto-matched, live-quoted via loss-resolutions.json, or retired in retired-information.md R-01..R-18; it found /help ORPHANED → /me row, and the folder hiding expiry dates → dates on expiring rows in every lens) · gates 2-5 green via A6/A2/A3/A4 · gate 6 per A-36 · gates 7-8 pending | |
| D8 | Handover | both | pending | handover addendum, accepted visual baseline | |
