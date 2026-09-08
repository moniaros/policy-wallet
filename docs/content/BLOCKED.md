# PW-CONTENT-01 — blocked items

Each entry names the exact human task that unblocks it.

| Id | Item | Blocked on | Exact human task | Filed |
|---|---|---|---|---|
| ~~BL-C1~~ | **RESOLVED 2026-09-08 on the owner's go.** Dev and production are both on the 50-rule set, fingerprint `15fa2758cebeaecc`; production archived first (`docs/archive/2026-09-08T1600Z_prod_gap_definitions_before_content_01.sql`, md5-verified) and only the 21 new rows written, the 29 existing ones being byte-identical to the repository already. What was run, and how it was verified without a production connection string, is in [PROD-ALIGNMENT.md](PROD-ALIGNMENT.md). | — | — | 2026-09-06, resolved 2026-09-08 |
| BL-C2 | **B2C policyholder production smoke (Goal 8.2).** | The owner's policyholder session in the Chrome profile the extension drives; the agent does not sign in with credentials. | Sign in to www.policywallet.gr as the policyholder in that Chrome profile, then say so; the smoke runs the wallet page, /protection and /dashboard. | 2026-09-06 |
