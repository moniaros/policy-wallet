# Personal data breach register (Art. 33(5) GDPR)

Every breach, notified or not, with the reasoning. One row per incident; drills are rows too, marked
`drill`, so the register is never empty on the night it is needed. Procedure:
`docs/operations/RUNBOOK_PERSONAL_DATA_BREACH.md`.

| Id | Kind | Aware at (UTC) | Contained at | Assessed at | ΑΠΔΠΧ notified (ref) | Subjects notified (n) | Closed at | Summary · root cause · preventive change |
|---|---|---|---|---|---|---|---|---|
| BR-0001 | drill | 2026-09-12T00:05Z | 2026-09-12T00:20Z | 2026-09-12T00:30Z | not sent — drill (would be due by 2026-09-15T00:05Z) | 0 — drill (Art. 34 would apply: scenario involves the service-role key) | 2026-09-12T00:40Z | Tabletop: «a Supabase service-role key appears in a Vercel log line». Walked steps 1–7 with real tools; rotation and notification simulated, everything else executed. Evidence `docs/operations/PERSONAL_DATA_BREACH_DRILL_EVIDENCE_2026-09.md`. Preventive change: the runbook itself + its guard (PW-PROVENANCE-01 R-03). |
