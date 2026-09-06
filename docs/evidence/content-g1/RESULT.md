# Goal 1 — one locale, both audiences, both languages, 320 / 390 / 430 (PW-CONTENT-01)

Captured 2026-09-06 on `feat/content-01` at Goal 7 by `tests/measure/locale-sweep.spec.ts` (B2C, `measure` project, seeded policyholder) and `tests/measure/agent-book-locale-sweep.spec.ts` (`measure-agent`, seeded agent). Each sweep sets the seeded users' stored preference to the run's language AFTER the harness's global setup (which re-provisions them as Greek) and restores Greek at the end. Pages per audience: B2C — dashboard, wallet, protection, notifications, tasks, the seeded policy page, and the three public trust pages in the run's language; agent — dashboard, customers, insights, tasks, the B2B policy view.

Asserted per page and width: no horizontal overflow (`pageOverflow`, culprits recorded), `<html lang>` equals the run's language, `data-locale` equals the one tag table's value (`el-GR` / `en-GB`), and no dated sentence carries a month name from the other language.

| run | audience | captures | pages | max overflow | html lang / data-locale | failures | dated sentence at 390 |
|---|---|---|---|---|---|---|---|
| el | b2c | 27 | 9 | 0 px | el / el-GR | 0 | /wallet/… → «Ευρήματα από την ανάλυση της 6 Σεπτεμβρίου 2026.» |
| el | agent | 15 | 5 | 0 px | el / el-GR | 0 | /customers/…/policy/… → «Ευρήματα από την ανάλυση της 6 Σεπτεμβρίου 2026.» |
| en | b2c | 27 | 9 | 0 px | en / en-GB | 0 | /wallet/… → «Findings from the analysis of 6 September 2026.» |
| en | agent | 15 | 5 | 0 px | en / en-GB | 0 | /customers/…/policy/… → «Findings from the analysis of 6 September 2026.» |

## What the first pass found, and what changed

1. **The English run rendered Greek under `lang="el"`** (42 failures across every authenticated page). Two causes, both fixed: the harness's global setup resets the seeded users to Greek on every run, so the sweep now sets the preference itself; and, the real defect, the root layout's unseeded provider and the protected layout's seeded provider both stamped `<html lang>`, and React runs the parent's effect last, so the root's Greek default won. A seeded provider now claims the stamp (`data-lang-owner="seeded"`) and the unseeded one yields; `tests/unit/one-locale-per-request.test.tsx` renders the nested pair and asserts the seeded value on the html element.
2. **The agent's `/insights` overflowed 201 px at 320**: the citation appended to the provenance pill sat inside a `whitespace-nowrap` span. The pill keeps the class; the citation wraps on its own line.
3. **The agent's `/tasks` overflowed 63 px at 320 and 6 px at 390**: the priority and sort segmented controls (`button.pw-segment` «Χαμηλή», «Προθεσμία») neither wrapped nor scrolled. Both groups are now `.pw-scroll-strip`, like the type strip beside them.

After those three changes every sweep is clean: 0 overflow, the run's language on the html element and the tag table's locale on every page, and every dated sentence in the page's language.
