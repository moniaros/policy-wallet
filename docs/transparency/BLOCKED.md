# PW-TRANSPARENCY-02 — blocked items

Each entry names the exact human task that unblocks it. Nothing here is a code task.

| Id | Item | Blocked on | Exact human task | Filed |
|---|---|---|---|---|
| BL-01 | **Terms §5 says the free tier is «δωρεάν για ένα συμβόλαιο» / "free for one policy"** (`lib/legal/legal-content.ts:128` EL, `:613` EN). Canonical marketing and code say 3 (`FREE_POLICY_LIMIT`, `plan-defaults.ts` free `policies: 3`); the planned model is reported as 5 policies with one lifetime full analysis. | The enforced production limit. The Terms are a contract and must state what the product enforces, which is the `plans` row in the production database, not marketing copy or the roadmap. The production rows were not read in Goal 0 (§I). | Read the production `plans` table for the B2C free tier (`plan_id` `ph-free` or the row whose `tier_key` is `free`) and report two values: the enforced policy count (`limits.policies`) and the analysis allowance (`limits.aiAnalysisPerMonth`, null meaning unlimited). Then decide the number the Terms will state. Until then, do not edit Terms §5. | 2026-09-05 (amendment 01, A1.4) |
| BL-02 | **Delete the two protection-score APIs** — `app/api/v1/protection-score/route.ts` (B2C) and `app/api/v1/customers/protection-scores/route.ts` (B2B). No in-repository consumer; both still return `overallScore` / `tier` JSON. | Whether a client outside this repository (a native app — the repo carries RevenueCat and `PushDevice`) calls them. The amendment says record and halt, never break a consumer. | Read the API gateway / Vercel request logs for both paths over the last 30 days. Zero non-web requests → delete both routes and their `scripts/api-route-policy-inventory.json` entries. Any → name the consumer in `HALTS.md` H-T02 and keep the routes until it migrates. | 2026-09-05 (amendment 01, B1.7) |

## Not blocked but waiting on a human answer (for reference)

These are human-track items from the amendment that do not block a specific code change in Track A; they are listed in `STEP0-FINDINGS.md` §I and the amendment's human track.

- Production value of `EXTRACTION_CITATIONS` (scopes C1 provenance).
- Deliverability of `info@`, `careers@`, `dpo@policywallet.gr`.
- May policyholders correct values a rule reads? (scopes C1).
- Risk DNA dimension scores: keep with denominators and text, or remove (B1.6 — options will be presented, not decided).
- Whether `policywallet-transformation-multiagent.md` is committed to `docs/` or its references dropped; `policy-wallet-public-surface-audit.md` is retired.
