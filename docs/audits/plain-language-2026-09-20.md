# Public-page plain-language review — 2026-09-20

## Scope and method

Follow-up to the [analytics-led content changes](analytics-content-2026-09-20.md). Reviewed the public marketing site, product pages, pricing, needs questions, guides, glossary, company/contact, trust/methodology/platform/status and legal introductions. Authenticated customer, agent and admin screens are outside this marketing review.

Read the Greek source strings and their English companions, then visited all 144 sitemap routes (72 per language) in the browser. Edited 35 source files. The [change ledger](../evidence/plain-language-2026-09-20/changes.json) records 119 replacement operations, including follow-up polishing of earlier replacements; this is not a count of unique final sentences.

Editorial standard: common words, one idea per sentence where practical, explicit subjects, everyday examples, and an explanation alongside an essential insurance term. Technical implementation details were removed from customer explanations where they did not help a decision. Necessary qualifications remain: the document and insurer determine cover; the platform explains and the licensed partner advises.

This is an editorial review, not a reading-age certification or a comprehension study with 14-year-olds. Official quotations and operative legal clauses remain precise and can still require adult explanation. The two densest guides now begin with a plain-language summary. Legal edits are limited to introductory explanation; no consent contract, policy version, or binding obligation was changed.

## Broken / misleading content — corrected

- ENFIA guide incorrectly dated the introduction and increase of the discount. Replaced that history with explicitly dated 2026 guidance and linked [AADE's 14 January 2026 announcement](https://aade.gr/sites/default/files/2026-01/dt_14.01.2026_0.pdf). The guide and property page no longer present €1,000/m² as a timeless minimum: the reader is directed to the applicable year's AADE figure (the 2026 announcement says €900/m²).
- The coverage-gap guide's underinsurance example incorrectly said a €100,000 insured sum on a €200,000 rebuild value would not pay €100,000 for total loss. Replaced it with a clearly conditional partial-loss example: €20,000 damage → €10,000 before other deductions, if the average clause applies. Both languages corrected.
- Group-health/liability copy implied overlapping insurance was automatically unnecessary. It now explains that cover can complement other cover and points to a discussion with the advisor. Both languages corrected.
- Methodology promised identical findings from the same document. It now accurately promises the same rule result from the same extracted data; extraction itself is not represented as deterministic.

These are accuracy defects, separate from stylistic preferences. No security or database defect was introduced or repaired here.

## UI/UX improvements — not launch gates

- Explained sea assistance, pension surrender, exclusions, sublimits, insured amounts, hereditary/pre-existing conditions and business cover in everyday Greek.
- Simplified company, partner, trust and methodology copy, questions and pricing feature labels.
- Replaced vague jargon with concrete actions: for example, «Μαζική εισαγωγή» becomes «Προσθήκη πολλών πελατών μαζί».
- Removed a grammatical error in the company introduction and fixed awkward sentence joins during final review.
- Kept the established layout, product capabilities, pricing and language routes.

## Verification

- Node 20.20.2; 319 tests across 10 files passed: SEO metadata, marketing content contracts, voice guards, policy terminology, guide plan parity, legal parity, defined-term glossary links, overpromise copy, fabricated public counts and content link integrity.
- API auth inventory audit: 106/106 routes, zero findings. ESLint, changed-string i18n check, UTF-8 check and TypeScript passed. No migration or database change; migration verification not run.
- Browser: all 144 sitemap routes at 320×900 had one H1, the expected document language and zero document-level horizontal overflow. This measures basic rendering, not every interactive state or comprehension.
- Additional institutional pages `/solutions/partners` and `/solutions/synergates` rendered without horizontal overflow; they retain their existing noindex status. `/perks` is intentionally unavailable when no offers are active and was not counted as a marketing content page. Redirect aliases and the internal styleguide are not additional authored public pages.
- Visually inspected Greek pension/life copy on mobile and the guides index at 1280×900. Revisited the final guide introductions; browser viewport restored and guides preview left open.
- Local preview: port 3001 in this checkout. Port 3000 is another checkout and is not evidence for this work.
- Final production build passed (exit 0), including TypeScript and page generation. Executed outside the sandbox after the established sandbox build limitation; no deployment performed.

## Decisions and release boundary

Used the Impeccable clarify workflow. Retained official quotations instead of paraphrasing them as if they were the legal text. Did not change open content halts, plan rows, database state or deployed production. Changes are reviewable in the working tree. No production verification or measured comprehension/conversion gain is claimed.
