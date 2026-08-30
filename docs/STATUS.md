# STATUS — 2026-08-30 (Grafí B2C ladder, session 2)

**Current phase:** G0–G14 walked; `feat/grafi-b2c` ready for the PR (never push NEW-UI).

**Done:** the signed-in product rebuilt on Grafí at `/`, /see, /policies(+id), /money, /updates, /adviser(+help), /me(+household/appearance — the whole /account tree moved), /add (verbatim Art. 9 gate, per-document consent write+enforcement+revocation), /life-event/[type], /welcome. Ledger docs/B2C_PROGRESS.md (G0–G14 + D-B2C-01..28), ASSUMPTIONS A-09..A-30. Three hostile reader passes ran against the live build; every code finding fixed (updates disclosure + steering copy, self-paired money rows, per-contract finding dedupe, never-read ⇒ «για έλεγχο», mute map cells, QA consent dead-end, axe clean both themes). Rendered gate 22/22; suite ~6,1xx tests green at each commit; build exit 0.

**In progress:** nothing — PR #287 open (https://github.com/moniaros/policy-wallet/pull/287), awaiting the prod DDL + owner merge.

**Blocked:** prod DDL (classifier denies MCP DDL — SQL in docs/handover.md); flags stay off until it lands.

**Top risks:** 1) merging without the DDL leaves flag-gated features dark (safe but invisible); 2) the legacy component pile (A-25) until its deletion commit; 3) seeded-account data oddities (consent register contradiction) mistaken for product truth.

**Next 3:** apply prod DDL + flip FF_APP_*; open/merge the PR; the legacy deletion commit.
