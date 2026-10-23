# Status

## Current phase
Mobile public-menu duplicate correction — 23 October 2026. Shipped via PR #411 as `91579018`; dev, protected preview and live verification passed. Prior homepage release: PR #408, application `95c8670a`.

## Done
- Menu release: CI `39981645626`, deploy `39983054320`, Vercel `dpl_HKWEuSk7XJyDE33p7sRUF3fxqsQU` READY. Ten preview and ten live menu journeys passed; existing browser tab refreshed.
- Mobile menu: “Για ασφαλιστές” appears once under Products in both languages; desktop direct access remains. Ten local browser cases passed (320/390/430/600/1280px, Greek/English), including Escape/focus restoration and menu-close navigation. All 7,874 unit tests and the required local guardrails passed.
- Added actual app previews for policyholders/agents, an enlarged reading demo, four photographic category links, guide/glossary cards and three trust explanations.
- Preserved forest/mint branding, light video hero, four-step section, reviewed bilingual facts and auth/payment restrictions. Independent visual review: PASS.
- API auth, lint, i18n/UTF-8, types, 7,874 tests and build passed. Dev/prod: 88 migrations, none pending; no DB/catalogue changes.
- Exact preview and live: seven responsive/language/theme cases, 35 axe scans per environment, no findings; 22 destinations, no-JS fallback, keyboard/replay, signup handoff and live video loop verified.
- Production CI 39647092968 and deploy 39648473964 succeeded. Vercel `dpl_HYmFCK1UwbyAR5cSd8vqvDMD6pi9` Ready.

## In progress
- No remaining menu-fix work. The separate `pw-customer` / PR #410 content work is not included.

## Blocked
- No design release blocker. Paid checkout remains restricted pending statutory online withdrawal. Optional Kilo review lacked credits; CI payment journey skipped without its E2E database secret.

## Top risks ranked
1. Online withdrawal needs declaration, confirmation and durable receipt before paid consumer checkout.
2. Provider/retention evidence, protected deletion copy and regulatory perimeter remain separate follow-ups.
3. Existing production session-pool configuration remains an infrastructure follow-up.

## Next 3 actions
1. Complete the consumer withdrawal flow before enabling payments.
2. Resolve provider/retention evidence and protected deletion copy.
3. Address production pool configuration and provision payment-journey test infrastructure.

Evidence: [five homepage extensions](audits/homepage-five-panels-2026-10-21.md), [four steps](audits/homepage-steps-2026-10-21.md).

Menu evidence: [duplicate correction](audits/mobile-menu-duplicate-2026-10-23.md).
