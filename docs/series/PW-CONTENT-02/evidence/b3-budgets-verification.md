# B3 verification — production plans, 2026-10-24 (project cquudefwfwrmvpftuhyl, read through the Supabase MCP)

Before (B2 SELECT, ~10:11 UTC): plan_id | version | updated_at | monthlyTokenBudget
- agent-free | 1 | 2026-08-21 03:45:30.566 | 150000
- agent-starter | 1 | 2026-08-21 03:39:38.719 | 1600000
- agent-pro | 1 | 2026-08-21 03:39:38.719 | 4500000
- agent-agency | 1 | 2026-08-21 03:39:38.719 | 12000000
- ph-free | 2 | 2026-08-21 00:47:11.974 | 150000
- ph-plus | 2 | 2026-08-21 03:39:38.719 | 600000
- ph-pro | 1 | 2026-08-21 03:39:38.719 | 1500000

Write result (one statement): plans_updated 5, revisions_written 5, audit_rows_written 5.

After (re-SELECT): plan_id | version | updated_at | monthlyTokenBudget | plan_revisions.changes at that version
- agent-free | 2 | 2026-10-24 10:15:29.85 | 2000000 | {"entitlements.monthlyTokenBudget": {"to": 2000000, "from": 150000}}
- agent-starter | 2 | 2026-10-24 10:15:29.85 | 19600000 | {... "to": 19600000, "from": 1600000}
- agent-pro | 2 | 2026-10-24 10:15:29.85 | 58700000 | {... "to": 58700000, "from": 4500000}
- agent-agency | 2 | 2026-10-24 10:15:29.85 | 156300000 | {... "to": 156300000, "from": 12000000}
- ph-pro | 2 | 2026-10-24 10:15:29.85 | 8700000 | {... "to": 8700000, "from": 1500000}
- ph-free | 2 | 2026-08-21 00:47:11.974 | 150000 | (unchanged; latest revision is the July displayName rename)
- ph-plus | 2 | 2026-08-21 03:39:38.719 | 600000 | (unchanged)

The full post-write `entitlements::text` of every row is in the fixture (`tests/fixtures/production-plan-rows-2026-10-22.json`, `rawEntitlementsText`).
Before the write, `UPDATE_PLAN` activity_logs rows: none (a SELECT returned []); `plans.version` was 1 on the five rows (the stronger evidence the admin page never saved them).
Known difference (review I-1): the written `plan_revisions.snapshot` uses database column names (`plan_id`, `display_name`, …) and a numeric `price`, whereas `updatePlan` stores Prisma field names with Decimal strings; only the nested `entitlements` object is identical. Nothing reads the snapshot today (the admin page renders version, email, date and `changes`).
