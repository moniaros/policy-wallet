# PW-CUSTOMER — Run Plan

**Source:** policyholder assessment of policywallet.gr, 21 Oct 2026 (14 customer asks, 11 dislikes).
**Shape:** 13 goal-series. One is copy-only and can start today. Three are foundations. Eight are features. One is spec-only and waits on human decisions.
**Verified against:** Claude Code docs (model-config, sub-agents, goal), 21 Oct 2026. Re-check the "Model facts" below if you run this more than a month from now.

---

## 1. Model facts this plan depends on

| Model | Pinned ID | Alias | Default effort | Levels |
|---|---|---|---|---|
| Fable 5.1 | `claude-fable-5-1` | `fable` | high | low · medium · high · xhigh · max |
| Opus 5.5 | `claude-opus-5-5` | `opus` | medium | same |
| Sonnet 5.5 | `claude-sonnet-5-5` | `sonnet` | medium | same |
| Haiku 5.5 | `claude-haiku-5-5` | `haiku` | medium | same |

These facts change how you should run things:

- **Fable 5.1 is the top tier.** It sustains long autonomous sessions and investigates before acting. Depending on your plan it may **bill to usage credits** rather than your included limits.
  - In `-p` runs it bills without asking.
  - In background sessions an unanswered consent prompt ends the turn after 5 minutes.
  - Check `/model` for "Requires usage credits" before you launch anything unattended on Fable.
- **Opus 5.5 at `medium` ≈ Opus 5 at `high`** on coding work, according to Anthropic's testing. Don't carry old effort levels over; start at `medium` and raise it only where the series says so.
- **`max` has diminishing returns and is prone to overthinking.** The docs recommend it for things like finding security vulnerabilities. This plan uses it only for the security reviewer.
- **Safety-classifier fallback.** If a request on Fable 5.1 or Opus 5.5 is flagged for cybersecurity content, it re-runs on Opus 4.8. Inside subagents this happens **without asking you**. Our RLS/IDOR reviews are defensive work on our own code, but they can still trip the classifier.
  - Run `/tasks` while the security reviewer works to confirm which model it is actually on.
  - Set `switchModelsOnFlag: false` in your user settings so the main session asks you before switching.
- **Switching model or effort mid-session throws away the prompt cache.** Pick both at launch. When a different phase needs a different model, start a new session or delegate to a subagent, which keeps its own cache.
- **`CLAUDE_CODE_EFFORT_LEVEL` overrides subagent frontmatter.** Do not set it in your shell or settings, or every agent file below loses its effort setting.

---

## 2. Routing — who runs what

This flips the routing in `policywallet-transformation-multiagent.md` §1, which used Fable for implementation volume. Fable is now the most capable and most expensive tier, so spend it where judgement is scarce: investigation and adversarial review. Volume goes to Opus and Sonnet.

| Work type | Model | Effort | Agent file | Why |
|---|---|---|---|---|
| Step 0 for **foundation / privacy / cross-surface** series (ASSET, NOTIFY, INGEST, HOUSEHOLD, BUSINESS) | Fable 5.1 | xhigh | `step0-investigator` | Mistakes here become migrations or data leaks. Fable investigates before it concludes. |
| Step 0 for **single-surface** series | Opus 5.5 | high | `step0-investigator` (model override) | Bounded scope; Opus is enough. |
| **Adversarial review** (fresh context, never the author) | Fable 5.1 | xhigh | `adversarial-reviewer` | Catches the "fixed here, broke there" class. It must not have seen the work being made. |
| **Security review** (RLS, IDOR, share links, inbound email) | Opus 5.5 | max | `security-reviewer` | The docs point to `max` for vulnerability-finding. Watch for classifier fallback (§1). |
| **Backend build** (schema, RLS, extraction schema, diff engine, inbound pipeline) | Opus 5.5 | high | main session | Edge cases are likely and verification matters. |
| **Largest long-horizon build** (PW-ASSET-01 only) | Fable 5.1 | high | main session | It touches every surface and runs longer than one sitting. |
| **UI build** inside the design system | Sonnet 5.5 | high | `ui-implementer` (worktree) | Well-specified volume work; runs in parallel in its own worktree. |
| **CI guards** | Sonnet 5.5 | high | `guard-writer` | Every guard must be shown failing first. |
| **Greek copy** (authoring and review) | Opus 5.5 | high | `greek-copy-reviewer` | Greek drift is subtle. Eli still signs off every customer-facing string. |
| **Greek rules research** (ΚΤΕΟ, τέλη κυκλοφορίας, ΕΝΦΙΑ, mandatory business cover) | Opus 5.5 | high | `step0-investigator` (model override) | Must use web search with cited sources. Never from model memory. |
| **Mechanical sweeps** (string inventory, number-format replacement, grep audits) | Haiku 5.5 | medium | `sweeper` | Pattern work; cheap. |
| **Fixtures that must reproduce a defect** | Sonnet 5.5 | medium | main session or `ui-implementer` | Needs reasoning about failure states, not just volume. |
| **`/goal` evaluator** | default small fast model | — | — | Leave it alone. It only reads the transcript. |

---

## 3. How to run any series

Install the agent files once: copy `.claude/agents/*.md` into the repo's `.claude/agents/`. Copy `docs/series/*.md` into `docs/series/`.

For each series:

1. **Step 0 — investigation, no code.**
   ```bash
   claude --agent step0-investigator
   ```
   Then prompt: `Run Step 0 of docs/series/<ID>.md.`
   For a single-surface series, launch with `--model claude-opus-5-5 --effort high` instead.
   The agent writes `docs/series/<ID>/STEP0.md` and stops.

2. **You approve.** Edit STEP0.md in place and add `Approved: <date> — Eli` at the top. Answer every question it raised in `HALTS.md`.

3. **Build.** Start a new session on the model and effort the series header names, for example:
   ```bash
   claude --model claude-opus-5-5 --effort high
   ```
   Put it in auto mode if you're leaving it alone, then paste the series' `/goal` line. The goal evaluator only reads the transcript, so every condition is written as something the session has to print.

4. **Review.** In a fresh session (or from the build session, as a subagent), run:
   - `adversarial-reviewer` on every series,
   - `security-reviewer` wherever the series header says **Security review: yes**.

   Critical findings send the series back to step 3. A series cannot be partly done: if any acceptance item fails, the whole series is not done.

5. **Deploy gate.** Follow `engineering:deploy-checklist` and your existing sequence (staging DB + RLS → preview deploy verification → five-step human GO checklist → prod flip last). Before the first test, confirm the email/push stub is in place so no real message can go out.

6. **Close out.** Update `STATUS.md`, add an entry to `DECISIONS.md`, and record before/after measurements in `docs/series/<ID>/RESULT.md`.

**Session-start context** stays at `STATUS.md` + the one series file. Invariants live in `CLAUDE.md` and are not repeated in the series files.

---

## 4. Human decisions that block work

None of these should be guessed by an agent. Each series header lists which ones it waits on.

| # | Decision | Blocks |
|---|---|---|
| **H1** | **Send-side notification policy.** Which events may send email or push at all, how often, and the digest rule. (Halt #2 in the transformation doc.) | Sending in NOTIFY, RENEWAL, CALENDAR, CLAIMS; all of LIFE-SEASON |
| **H2** | **Compliance boundary** for prevention prompts and life-event guidance: where explaining becomes advice under IDD. Needs DPO and underwriter input. | LIFE-SEASON; some wording in EXCLUSIONS |
| **H3** | **Packaging.** What is free vs paid. You've already agreed a depth-based paywall (one free lifetime full analysis); decide whether exclusions and gaps stay Family-only, and whether pricing moves from policy count to assets. | Item 1 of CONTENT-02; plan gating in every feature series |
| **H4** | **Schema migration approvals** for the asset model, household membership/shares, claims log, and business workspaces. | ASSET, HOUSEHOLD, CLAIMS, BUSINESS |
| **H5** | **Article 9 lawful basis** for (a) a household member seeing another member's health policy, and (b) OCR of human medical invoices. | HOUSEHOLD (health visibility); CLAIMS (human-health phase) |
| **H6** | **Accounts and providers:** Apple Wallet pass certificate, Google Wallet issuer account, inbound-email provider and domain, a signed Android build key if the wallet pass ships through the app. | EMERGENCY (wallet pass), INGEST (email forwarding) |
| **H7** | **Underwriter sign-off** on the "commonly assumed covered" exclusion catalogue. It ships as `under_review` until then. | EXCLUSIONS (top-3 ranking) |
| **H8** | **Legal verification** of mandatory-insurance rules by business type. | BUSINESS (obligations checklist) |

---

## 5. Sequencing

```
Wave 0 (start now)   PW-CONTENT-02 ─────────────────────────────── (H3 only for item 1)
Wave 1 (foundations) PW-ASSET-01 ──┬── PW-NOTIFY-01 (dark) ── PW-INGEST-01
                                   │
Wave 2 (features)    EMERGENCY · RENEWAL · CALENDAR · EXCLUSIONS · QA · CLAIMS(pets)
                       └─ all need ASSET; RENEWAL/CALENDAR/CLAIMS send only after H1
Wave 3 (privacy)     PW-HOUSEHOLD-01 · PW-BUSINESS-01 · CLAIMS(human health, after H5)
Wave 4 (blocked)     PW-LIFE-SEASON-01 — spec only until H1 + H2
```

**Parallelism.** In Wave 2, `ui-implementer` instances run one per series in separate worktrees. Backend pieces that touch the asset model run one at a time, through whichever series owns that change, so two series never patch the same table concurrently. Don't start Wave 2 until the ASSET-01 design is approved; building on a moving data model multiplies rework.

**What to start tonight:** Step 0 of PW-CONTENT-02 (Opus 5.5, high) and Step 0 of PW-ASSET-01 (Fable 5.1, xhigh). They don't touch each other.

---

## 6. Customer-ask → series map

| Customer ask (21 Oct assessment) | Series |
|---|---|
| Dislikes 1–3, 8–9, 11 (copy, positioning, formatting, duplication) | CONTENT-02 |
| Dislike 4 / ask 2 — think in things, not policies | ASSET-01 |
| Ask 1 — emergency card, offline, Wallet | EMERGENCY-01 |
| Ask 3 — renewal companion | RENEWAL-01 |
| Ask 4 — money & obligations calendar | CALENDAR-01 |
| Asks 5, 6 — exclusions; paying twice | EXCLUSIONS-01 |
| Asks 7, 8 — limits used; claims tracker | CLAIMS-01 |
| Ask 9, 12 — life events; seasonal | LIFE-SEASON-01 |
| Ask 10 — family logins & shares | HOUSEHOLD-01 |
| Dislike 5 / ask 11 — business space | BUSINESS-01 |
| Ask 13 — easier ingestion | INGEST-01 |
| Ask 14 — ask my policies | QA-01 |
| How each feature is communicated (channels, cadence) | NOTIFY-01 + H1 |
| Dislike 7 — health data and AI outside the EU | INGEST-01 (redaction and EU-only option in Step 0) + H5 |
| Dislike 10 — no sign of an app | EMERGENCY-01 (PWA install + Wallet); the Android backend-readiness workstream you already have |
