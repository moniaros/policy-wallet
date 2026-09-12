# PW-PROVENANCE-01 R-01 — production verification after PR #347 (NEW-UI `1813dcf1`)

Passkeys as a SECOND factor over the Supabase session: the ceremonies (`lib/auth/passkeys.ts`, six
inventoried routes under `/api/auth/passkeys`), the proof (`lib/auth/step-up.ts`, a 12-hour HMAC cookie
bound to the user, verified with Web Crypto in the proxy), ONE gate in `proxy.ts` for every
`ROUTE_OWNERSHIP` pattern, `/auth/step-up`, and a Settings → Security block shown only while
`PASSKEYS_ENABLED=1`. **Shipped OFF.** With the flag unset — production's state — nothing is enforced,
the routes refuse and the block is absent; the flag is the break-glass for a lost authenticator
(D-P41, HANDOFF P-H6). Script in this directory: `prod-smoke.sh`.

## Timeline (UTC, 2026-09-12)

| Step | Evidence |
|---|---|
| PR #347 (`origin/NEW-UI` merged in four times as W5-02, its docs and W3-01 landed; the Greek string inventory regenerated on each) | CI run 34661394286 **success** 00:34:04Z, 5/5 jobs |
| Squash merge to NEW-UI | `1813dcf1` at 00:36:12Z, via the GitHub connector |
| CI on NEW-UI, run 34662184887 | **success** 00:47:55Z, first attempt |
| Deploy, run 34662816082 (`workflow_run`, on NEW-UI's head `1813dcf1`) | **success** `00:51:39Z`; Vercel deployment `dpl_BEo9Ui8XpSrnkmuGwiabq9zQCFT2`, `githubCommitSha` `1813dcf1…`, READY 00:51:36Z, aliases `www.policywallet.gr`, `policywallet.gr`, `app.policywallet.gr` |
| Smoke window | 00:51:54Z – 00:52:30Z |

## Local gate on the PR tree

audit:api-auth (0 findings after the rate limits became object literals the audit can see) · lint ·
lint:i18n-changed (SCAN_ALL) · lint:utf8 · lint:encoding · type-check · verify:migrations ·
`vitest --run tests/unit` **646/646 files, 7511/7511 tests** · build — green. Two premise guards
were updated, not skipped: `no-fake-biometric-auth-claim` now asserts the WebAuthn flows are EXACTLY
the two second-factor surfaces and no login screen carries one; `settings-ia` asserts the passkeys
block renders only behind the flag.

**The guard, red before green on the real tree:** `proxy-step-up-gate` — the gate line in `proxy()`
disabled → 19 of 23 cases red (every ownership pattern and the forgery case); restored → 23 of 23
green. `step-up-token` refuses a token with the wrong user, an expired one, a tampered expiry, nonce or
signature, a malformed shape, and one signed under another secret.

## Anonymous production smoke

`BASE_URL=https://www.policywallet.gr npx playwright test --project=public-anon prod-smoke`
→ **2 passed (35.0s)**.

`prod-smoke.sh` (curl, no session), 00:52Z: the eight public routes **200** in Greek, the three
authenticated routes **307** to signin; `/auth/step-up` **200** anonymously (it must — it is how a
signed-in person gets past the gate); `GET /api/auth/passkeys`, `POST …/challenge`, `POST …/options`
all **401** to an anonymous caller (never 5xx, never 200).

## Sentry (org `policywallet`)

`firstSeen:-1h` at ~00:53Z: **no group first seen after this deploy**. Server traces are 10 %
sampled and the window is minutes long — weak evidence, recorded as such.

## Not run — and what the owner does next

- **A real authenticator was not exercised** (no browser session on this machine, BL-C2). The
  ceremony's cryptography is the library's; the state machine around it is asserted on doubles.
  The owner's first enrolment, after setting `PASSKEYS_ENABLED=1` in Vercel and redeploying, is the
  live test — enrol a second authenticator before relying on the first (P-H6).
- **Signed-in production pass:** none; with the flag unset the settings block is absent by design.
- **Database:** none — no migration; the tables existed; no row written.
