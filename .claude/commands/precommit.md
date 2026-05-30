---
description: Run the repo's blocking CI guardrails locally and report failures
---
Run the project's CI guardrail scripts in this order and report the result of each
(pass/fail with the key error lines): audit:api-auth, lint, lint:i18n-changed,
lint:utf8, type-check, and verify:migrations. Then run the unit tests (npm test).
Summarize what's failing and what I need to fix before committing. Do not auto-fix
anything beyond trivially safe lint fixes without showing me first.