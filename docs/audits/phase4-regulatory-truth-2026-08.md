# Phase 4 — Regulatory identity and truth defects
**2026-08-20 · investigation, implementation and verification**

---

## 1. The entity — published

The owner decision was to publish. Before doing so I verified the values against the
**record**, not against a memory: the withholding commit `ec9d5f81` (2026-07-22, *"withhold
company registry details, show 'available soon'"*) still contains the pre-suppression
`lib/legal/entity-placeholders.ts`, whose own header reads *"These are the REAL corporate
registry values."*

| Field | Value | How verified |
|---|---|---|
| Legal name | «Insurance Martech Ι.Κ.Ε.» / Insurance Martech IKE | git record + owner instruction |
| ΓΕΜΗ | 188863359000 | **cross-checked**: the owner supplied this independently and it matches the git record exactly |
| ΑΦΜ | 302659440, ΔΟΥ Χίου / Chios Tax Office | git record (9 digits, correct form) |
| Registered seat | Εντός Οικισμού Καλαμωτής, 82102, Χίος | git record |
| DPO | dpo@policywallet.gr | already live throughout |

The ΓΕΜΗ match is what raised confidence from "a number in a test file" to "the register
value": two independent sources agreeing on a 12-digit identifier is not coincidence.

**Now rendered on:** the sitewide footer, Terms §1 (*provider*) and Privacy §1 (*controller*),
in both locales, all from the single `LEGAL_ENTITY` source.

### One thing deliberately NOT restored: the court venue

The pre-suppression record also set `venue` to «Χίου (Βορείου Αιγαίου)» / "Chios (North
Aegean)", and `law_venue` in the terms renders that field. Restoring it would have changed the
jurisdiction clause from *"the courts of Greece"* to the courts of the company's own island.

That is a **change to the contract**, not a disclosure fix: it narrows where a consumer's
dispute is heard, it is worse for the consumer, and nobody asked for it. The venue stays
generic, with the reason recorded at the field and pinned by a test. **Flagged for the owner**
— restoring the original venue is a legal decision, not a transparency one.

### The concealment guards are gone

`tests/unit/legal-content-parity.test.ts` asserted the legal name, ΓΕΜΗ, ΑΦΜ and seat did
**not** appear. Those assertions are replaced by their inverse: the controller and operator
clauses must now contain the name, ΓΕΜΗ, seat, and (on the operator clause) the ΑΦΜ, in both
languages — plus a test that no "available soon" placeholder survives anywhere in the corpus,
since an aging placeholder becomes its own false claim.

The footer comment that conceded the ν. 3419/2005 obligation while not meeting it now records
that it is met.

---

## 2. Truth defects — all were still live, all fixed

| Defect | Was | Now |
|---|---|---|
| `forgot-password:67` | "Τραπεζικού επιπέδου ασφάλεια" / **"Bank-grade security"** — a tier claim with no attestation, audit or standard behind it | "Κρυπτογράφηση AES-256" / "AES-256 encryption" — the same checkable fact the rest of the site states |
| `SignupForm.tsx:390` | **"Takes 90 seconds"** — an invented duration | "No card required. Cancel anytime." |
| `no-overpromise-copy.test.ts` | scanned `app/(public)` only | **also scans `app/auth`** — the omission is why both defects above survived a marketing audit that closed with three consecutive zero-finding rounds |
| `AudienceTabs:286`, agents page `:163` | **"50 files" / "fifty at once"** — matched **no** entitlement tier (real tiers: 10 / 100 / 500 / unlimited) | 100 / "a hundred", the actual Agent Starter limit |
| Homepage hero | Greek promised gap-finding with **no tier attribution**, English said "PolicyWallet Plus" — the binding language was the looser one | both name Plus |
| Reassurance line | the short free-tier promise hand-typed in **17 files**, plus the long form hardcoded a second time | single-sourced as `CTA_REASSURANCE_SHORT` / `CTA_REASSURANCE` |
| `proxy.ts` | `/api/health` declared `auth:"public"` in the inventory but **never allowlisted** — an uptime probe got a 307 to signin | allowlisted |
| `proxy.ts` | dead `/workbox-` prefix (PWA removed, no such asset is built) | removed |

---

## 3. DSR wording now matches the machine

Phases 1–2 established what the system actually does. The marketing surfaces did not say it.

- **Export** is genuinely self-service and immediate — but not complete. Payment-method
  details, session/security telemetry, the access-audit trail, usage ledgers and
  agent-authored records about the customer are held and not included.
- **Deletion** is self-service only as a *request*; execution is `verifyAdminRole()`-gated,
  with a one-month statutory clock (Art. 12(3)) and a 72-hour internal SLA.

| Surface | Was | Now |
|---|---|---|
| `positioning.ts` TRUST_FACTS | "Ζητάτε αντίγραφο ή **πλήρη** διαγραφή όποτε θέλετε" / "Ask for a copy or **full** deletion whenever you want" | "Download a copy whenever you want. Ask for deletion and we complete it within one month." |
| `/company` | "you can **export or delete it whenever you want**" — implies deletion executes on demand | export immediate; deletion asked for and completed within one month |

**Chosen deliberately: request-and-fulfil with a stated SLA, not automated execution.** Erasure
is irreversible and touches Stripe, the auth identity and storage; a human check before an
irreversible destructive action is the safer design, and the in-product copy has described it
accurately for months. The word "entire" is not used anywhere.

**Greek availability confirmed** — `legal-content.ts` carries both locales, Greek is the
default route (`/terms`, `/privacy`) with the `/en/*` mirror. No fix needed.

---

## 4. The drill — run, passed, dated

`scripts/gdpr-erasure-drill.ts`, **2026-08-20**, against the dev project
(`lzqvtvjggylcujenlelh`; the script refuses to run against production by ref check).

It provisions a throwaway user with a full PII footprint — auth identity, Art. 9 health
profile, policy plus a real storage PDF, B2B relationship, form submission, export snapshot,
consent row — runs the **real** `eraseUserData`, verifies every surface, and cleans up.

**DRILL PASSED — 13/13.**

```
✅ Supabase auth identity deleted        ✅ policy deleted
✅ Storage PDF deleted                   ✅ relationship terminated
✅ User email anonymized                 ✅ form submission deleted
✅ taxId cleared                         ✅ export payload purged
✅ phone cleared                         ✅ consent row kept, ip scrubbed
✅ health profile scrubbed               ✅ brevo/stripe no-ops reported
✅ re-run is safe (idempotent)
```

This is the first post-remediation drill on record; the July document describes the
pre-remediation state. It also exercises the Phase 1 additions (thread-subject scrub,
questionnaire deletion) without a foreign-key failure — the RESTRICT hazard I flagged there
did not materialise.

---

## 5. Verification against the acceptance criteria

| Criterion | Result |
|---|---|
| Superlative/numeric claims across public copy traceable and verifiable | ✅ for the enumerated defects; the no-overpromise guard now covers `app/auth`, and the free-tier promise is single-sourced. ⚠️ **not** a proof of exhaustiveness — see below |
| Controller identity present and correct on every Art. 13 surface | ✅ footer, Terms §1, Privacy §1, both locales, from one source, pinned by inverted guards |
| A drill record exists with a date and an outcome | ✅ §4 |

**Gate:** `tsc` clean · **4574/4574 unit tests (434 files)**.

### Honest remainder

1. **"A grep returns only traceable claims" is not something I can assert.** I fixed the
   enumerated defects and widened the guard that would have caught two of them. A general
   sweep of every numeric and superlative claim across ~120 public URLs in two languages is a
   separate audit, and claiming it here would be the kind of unverified statement this
   programme exists to remove.
2. **The registered seat could not be independently confirmed against ΓΕΜΗ** from here. It is
   the value that was live until 2026-07-22 and is internally consistent (ΔΟΥ Χίου matches the
   Chios seat). If the company has since moved, the address is stale — **owner to confirm**.
3. **The court venue stays generic** pending a legal decision (§1).
