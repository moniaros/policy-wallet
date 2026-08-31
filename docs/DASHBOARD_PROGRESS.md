# DASHBOARD_PROGRESS — the audit ladder (D0–D8)

Run started 2026-08-31. Instruments first, evidence always; the role doing the
work is named per row (test engineer writes probes, product engineer fixes
what they prove). Baselines: the OLD build at :3000 (main checkout, NEW-UI);
the audited app: this worktree at :3100.

| id | goal | role | status | artefacts | assumptions |
|---|---|---|---|---|---|
| D0 | Harness | test engineer | **DONE** (visual twice-run proof owed after the re-accept) | playwright.audit.config.ts (5 devices × themes-in-spec, no webServer, workers=1) · tests/audit/{helpers,audit.setup,visual.spec}.ts · main-config testIgnore guard · build-identity assertions (old 307s /dashboard, new 301s it) | A-32..A-35 |
| D1 | Inventory | test engineer | **DONE** | information-inventory.{json,md} (old, 322 items — dashboard counts, expiry lines, plates/policy numbers, statuses all present; spot-checked) + information-inventory-new.json (244 items) via inventory.spec.ts, desktop capture, digit-collapsed fact keys | |
| D2 | Probes A2–A6 | test engineer | pending | tests/audit/{layout,a11y,contrast,performance,consistency}.spec.ts + docs/audit/*-baseline.json | |
| D3 | Report | test engineer | pending | docs/audit/dashboard-audit.md (ranked, evidenced, incl. «what works») | |
| D4 | Widgets | product engineer | pending | styleguide state demos + presentations sheet | |
| D5 | Dashboard fixes | product engineer | **A2 geometry CLEAR** (user-reported responsiveness: 132→0 findings across 5 viewports ×23 routes; both Switches, GlossaryHint width, pricing scale, help/upgrade grids vs the 700px shell column, 9 sub-44 controls, titled truncations) — other probes pending | probes green on / at :3100; density assertions | |
| D6 | Sibling fixes | product engineer | pending | probes green on /see /policies /money /updates /adviser /me | |
| D7 | Gates | both | pending | eight gates green; docs/audit/retired-information.md | |
| D8 | Handover | both | pending | handover addendum, accepted visual baseline | |
