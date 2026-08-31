# Grafí — handover

*2026-08-30. What was built, how to keep building it, and the G12 hostile
review recorded per reader. The ledger (`DS_PROGRESS.md`) is the per-goal
state; `design-system.md` is the written system; this file is the seams.*

## The one-command loops

```bash
npm run tokens        # tokens/*.json → app/grafi.css + contrast-matrix.md (FAILS on a floor miss)
node scripts/brand-assets.mjs   # one SVG → all favicons/app icons/OG rasters
npx vitest --run tests/unit     # the gate — 516 files; run before every commit
```

## Where things live

| Thing | Path | Note |
|---|---|---|
| Tokens (source of truth) | `tokens/{primitives,semantic}.json` | semantic references primitive NAMES only; generator rejects hex |
| Generated CSS | `app/grafi.css` | never hand-edit; byte-drift guarded |
| Components | `src/design-system/` | primitives, layout, product, reading-demo, broker-scan, plan-recommender |
| Landing sections | `components/landing/grafi/` | GrafiHero, CoverageTicker, AnswerBlock, MarketNumbers, ComparisonBand, BrokerBand |
| Marketing content | `lib/marketing/` | positioning (PROMISE/NEUTRALITY_STATEMENT/…), defined-terms (JOINS the glossary — guarded), market-numbers (sourced claims ONLY), reading-demo, broker-band |
| Living docs | `/styleguide` | dev-only; also the utility consumer |
| Choreography CSS | `app/globals.css` tail | `g-ticker-*`, `g-scan`, `g-row-rise` |

## Sharp edges the next builder must know

1. **`cn()` must be taught new utility families.** tailwind-merge silently
   DELETES unregistered custom classes that collide into one inferred group —
   it has now bitten twice (legacy ladder; then `text-fg-on-brand` shipped a
   2.74:1 hero CTA). New `text-*`/`bg-*` namespaces ⇒ extend the groups in
   `lib/utils.ts` first.
2. **`@theme inline` emits on USE.** A token with no consumer produces no
   utility; `/styleguide` exists partly to guarantee emission.
3. **One Inter.** The layout's variable instance (preloaded, all weights) is
   the only font import. Do not add `Inter()` calls in components — that is
   how the H1 ended up painting from an un-preloaded file.
4. **The freeze, the debt, the joins.** Greek copy changes re-run
   `vitest -u tests/unit/greek-string-inventory.test.ts`; hex changes move the
   debt ratchet BOTH directions; answer-block terms must resolve in the
   glossary; market numbers must carry source+date or not exist.
5. **Samples are stamped.** Any new invented data renders under «ΔΕΙΓΜΑ»,
   outside animated regions, three-state chips only (severity is an
   underwriting verdict).
6. **proxy.ts allowlist** governs public reachability — new public routes go
   in it, and `/_vercel` must stay in it.

## G12 hostile review — three readers, recorded separately

### Reader 1 — a bank's compliance officer, cold
Read `/`, `/trust`, `/solutions/partners`. **Passes:** every market number
resolves to a linked, dated primary source; neutrality argued from payment
mechanics (present-tense, checkable), not absence of relationships; the
partners page offers documentation for THEIR assessment and never grades
itself; no institution named anywhere; advice stays the intermediary's.
**Flags (both already queued):** the /trust pledge's unqualified
never-transfer-to-banks sentence coexists with the (noindexed) partners page
— `legal-review-queue.md` item 1 is the resolution; IDD opinion pending is
item 2. **No copy edit made** — both are Terms-backed sentences.

### Reader 2 — 68, iPhone SE, 3G, never heard of it
375px: no horizontal scroll, one promise as H1, one primary action, «Χωρίς
κάρτα» reassurance line, four insurance words explained in plain Greek before
anything is asked of them. Term links widened to real 24px targets during
this pass. **Flag that stands:** on real 3G the page paints at ~1.4s but
settles late (the §4.10 JS-budget gap in `perf-report.md`) — this reader is
the person the marketing-bundle split is FOR.

### Reader 3 — awards jury (design, usability, creativity, content, mobile)
**Strong:** the three-state system carried from tokens to samples; the
ReadingDemo demonstrating the product instead of asserting it; sourced
numbers as design elements; dark as a real theme. **Flags that stand:** the
visual seam mid-page — ServicesGrid, WhyDifferent, ClearLimits, FAQ and the
final CTA band are still legacy-styled (the final CTA's slate #0F172A is off
the Grafí palette); remaining G4 primitives unshipped; motion vocabulary
present but sparse below the fold. All recorded as G6-polish/G4 remainder in
the ledger.

## Outstanding list (per the G12 rule: only §2 items and open verifies)

- Terms §3 consent qualification — with legal (queue item 1). Blocks partners
  de-noindexing.
- IDD / ν.4583/2018 opinion — with legal (queue item 2).
- Art. 9 reviewed wording for marketing reuse — queue item 3.
- `[verify]`-class claims deliberately NOT published: "seven in ten never
  switch", "one in five homes insured", any renewal-percentage figure beyond
  the ΕΔΑ. They stay out until a primary source lands in the register.
- Guides 6–8 of the marketing plan: held on citation debt (28 unresolvable
  legacy citations recorded in `docs/growth/G07-CITATION-AUDIT.md`).

## Not-yet-built (ledger detail)

G4 remainder (Select/Switch/Checkbox/Radio/Tooltip/FAQAccordion/StatCard/
nav rebuilds) · G5 remainder (none — ReadingDemo, PlanRecommender,
BrokerScanPanel, DeviceFrame, ProtectionRing all shipped) · G6 polish (legacy
bands onto Grafí; mobile perf) · G9 full-route restyle · `/solutions/agents`
restyle · screen-reader + forced-colors passes.

---

# AUTH REBUILD HANDOVER (2026-08-31) — signup split-shell, phone removal, phased social login

Ledger: [AUTH_PROGRESS.md](AUTH_PROGRESS.md) · Audit: [auth-audit.md](auth-audit.md) ·
Assumptions AUTH-01…08 in [ASSUMPTIONS.md](ASSUMPTIONS.md). All of A0–A8 walked; A5 is
code-complete and waits on credentials only.

## What changed, in one paragraph

Signup no longer collects a phone. That was not a field deletion but an identifier
retirement: email-less signups used to mint a synthetic Supabase identity
(`phone_…@phone.policywallet.app`), skip verification entirely, and have no recovery
path. Email is now the only identity for new accounts, every account gets the real
verification token flow, and — for the first time — the terms checkbox produces a
server-side record (ConsentAudit ×2 + version stamps) on BOTH the email and the OAuth
path. Every auth screen renders through one `AuthShell` (split-screen ≥1024 with a
brand-fill trust panel whose subtree is genuinely omitted from the DOM below 1024;
form-only with 16px gutters on phones). Social login ships as a registry
(`lib/auth/social-providers.ts`): providers are `live | soon | off`, only `live`
renders, phases are a config flip.

## The three A8 passes — findings

**Security (OAuth flow).** Role travels only in an HMAC-signed, httpOnly, 10-minute,
single-consume cookie (`lib/auth/oauth-intent.ts`; tamper/expiry/replay covered by
tests/unit/social-auth-providers.test.tsx). `next` is sanitized at both ends and only
ever appended to our own origin. PKCE verifier and session live in httpOnly cookies —
nothing in localStorage. `startSocialAuth` is rate-limited (10/5min/IP) and refuses
non-live providers server-side. Callback fails CLOSED: no provider email → signOut +
error page, row-creation failure on a new account → signOut + error page. Two accepted
residuals: (1) `redirectTo` falls back to the Host header when NEXTAUTH_URL is unset —
Supabase's own redirect allowlist is the second fence; keep NEXTAUTH_URL set in prod.
(2) Supabase links same-verified-email identities automatically, so the brief's
"link after asking" is delivered as "never re-role, redirect to the account's own home
with ?notice=oauth_role_mismatch" [verify: surface that notice in UI copy].

**First-time user (iPhone SE / 3G).** 375px verified on :3000: 16px gutters, no card
chrome, sticky light header, 16px inputs (no iOS focus-zoom), 44px targets, zero
running animations, trust facts as text under the form. framer-motion is gone from the
signup route entirely; no provider SDK ever loads (server-side redirect flow). NOT
verified on a physical iPhone over real 3G [verify].

**Compliance.** Terms checkbox unchecked by default; marketing consent hardcoded
false; social path shows the «Με τη συνέχεια αποδέχεστε…» line and records acceptance
server-side with version+timestamp+source; Article 9 / AI-processing consent untouched
at first upload; no advice language, no counts, no testimonials; samples stamped.
One flag left open: the policyholder under-CTA line «Διαγράφετε τα πάντα όποτε
θέλετε.» is the brief's wording — the precise mechanics (request-based deletion,
statutory month) live in the TRUST_FACTS on the same screen; if legal prefers, swap to
«Ζητάτε πλήρη διαγραφή όποτε θέλετε.» in SignupForm.

## Owner checklist to make Google live (A5's last mile)

1. Google Cloud Console → OAuth client (web), authorized redirect:
   `https://<project>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → Google: client id + secret; add
   `https://www.policywallet.gr/auth/callback` (www, not apex) and
   `http://localhost:3000/auth/callback` to the redirect allowlist.
3. Vercel env: `NEXT_PUBLIC_AUTH_GOOGLE=live` (+ keep `NEXTAUTH_URL=https://www.policywallet.gr`).
4. Smoke both roles: signup/agent → Google → account exists with roles=agent,
   ConsentAudit source=oauth_signup, lands on /onboarding/agent.
Facebook (phase 2): start Meta app review for the `email` scope, then repeat with
`NEXT_PUBLIC_AUTH_FACEBOOK` — and build the collect-and-verify-email fallback before
going live (today a no-email return is safely refused). LinkedIn (phase 3): agent-only
by registry design.

## Sharp edges for the next session

- **The guards moved with the markup.** LocaleToggle/pw-clear-consent/back-arrow
  contracts now point at `components/auth/AuthShell.tsx`; the terms aria contract at
  `components/auth/TermsCheckbox.tsx`; the opacity guard walks all of app/auth. If you
  add an auth screen, render it through AuthShell and the guards cover it for free.
- **`cn()`/FormField cloning trap**: FormField clones its single child with id+aria.
  Give it a bare `<input>`, never a wrapper div — PasswordField owns its markup for
  exactly this reason.
- **Existing synthetic-phone accounts still sign in** through the signin phone tab
  (`resolveAuthEmailIdentifier`). Do not remove it until that cohort (owner test
  accounts) is migrated or abandoned.
- **`emailVerificationRequired` stays flag-off** (`auth.enforce_email_verification`).
  Every new account is now verifiable; flipping enforcement is the owner's call and
  will also gate the existing unverified accounts.
- **Playwright E2E cache is broken on this machine**: chromium-1208 is half-installed
  (framework dylib missing) and downloads kept being killed. Run
  `./node_modules/.bin/playwright install chromium` on a stable connection, then
  `npx playwright test tests/e2e/auth.spec.ts --project=chromium`.
- The signin OTP-reset dialog and the token reset page kept their pre-rebuild inner
  styling (tokens only on labels/shell) — a later polish pass can finish them.
