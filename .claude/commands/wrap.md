---
description: End-of-session wrap-up — update STATUS and remind me of guardrails
---
Update docs/STATUS.md to reflect this session: Current phase, Done, In progress,
Blocked, Top risks (ranked critical/high/med), Next 3 actions. Keep it to one screen.
List separately any new security/correctness findings (these gate launch) vs.
UI/UX dissatisfaction (these do not). Then remind me which CI guardrail scripts
to run before I commit: audit:api-auth, lint, lint:i18n-changed, lint:utf8,
type-check, verify:migrations.