# PolicyWallet v2 Roadmap Status

Last updated: 2026-02-23
Source of truth: `PolicyWallet_Product_Spec_v2.docx`

## Overall delivery status
- Delivery readiness estimate: ~49% ready / ~51% remaining.
- Change from prior baseline (~44%): +5 points from stabilization + Phase 1 dashboard alignment work.

## Phase status

| Phase | Status | Progress | Notes |
|---|---|---:|---|
| Phase 0 - Stabilization | COMPLETE | 100% | Build pipeline unblocked, lockfile/JSON conflicts resolved, warnings cleaned, build/type/lint/test smoke passing. |
| Phase 1 - Core Journey Compliance | IN PROGRESS | 68% | 3-step onboarding shipped, policyholder `/home` command-center shipped, bottom nav spec tabs aligned, biometric-first signin UI now primary with password as secondary path. |
| Phase 2 - Wallet and Policy Model Deepening | NOT STARTED | 20% | Existing wallet features present, but missing full category/deep-field parity and 5-step upload UX completion. |
| Phase 3 - Gap + Wellness Engines | NOT STARTED | 15% | Base gap logic exists; deterministic rule packs and wellness module workflows still missing. |
| Phase 4 - Collaboration, Notifications, Utilities | NOT STARTED | 25% | Agent/foundation exists; family UX, timing matrix completeness, export/diff/pass production readiness still open. |

## Completed in latest implementation pass
- Removed Next.js warning by setting `turbopack.root`.
- Migrated deprecated `middleware.ts` convention to `proxy.ts`.
- Removed deprecated Sentry Next.js options to silence deprecation warnings.
- Enhanced policyholder home dashboard (`/home`) toward section 5.1 parity:
  - Upcoming renewals now renders horizontal timeline cards.
  - Each renewal card now shows policy type icon, insurer, renewal date, and premium amount.
  - Recent documents now renders as horizontal quick-access cards.
  - Quick upload FAB is now centered on mobile, right-aligned on desktop.
- Hardened signin UX toward section 4:
  - Biometric/PIN quick-unlock options are now the first-presented path.
  - Email/password flow is now explicitly secondary and collapsed by default.
  - Device quick-unlock setup state is surfaced to users in the signin card.

## Remaining Phase 1 blockers
- Login experience still has one remaining section 4 gap:
  - No production-grade passkey/biometric auth handshake (current biometric flow is UI-first quick-unlock prefill path).
  - 30-day session persistence behavior not explicitly enforced/tested.
- Dashboard support action is still Help Center-first, not in-app support chat.

## Next implementation target
1. Implement production passkey/biometric credential verification (not only prefill UX).
2. Add/validate 30-day session persistence behavior.
3. Add support chat entrypoint on dashboard (while retaining Help Center fallback).
