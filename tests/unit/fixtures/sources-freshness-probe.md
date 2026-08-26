# PROBE FIXTURE — deliberately broken. Not a real sources file.

This file exists to prove `tests/unit/sources-freshness.test.ts` turns red. Every defect below is
intentional and each one must be detected. A guard without a probe proven to fail is not a guard.

Defects planted, in order:

1. `SRC-901` — `reverify_after` is in the past (stale claim still being rendered).
2. `SRC-902` — missing the `excerpt` field entirely (a claim with no evidence behind it).
3. `SRC-903` — `reverify_after` is not a real date.
4. `SRC-904` — duplicate id, colliding with the record above it.
5. `SRC-905` — `source` is a bare origin, which cannot support a specific claim.

---

## Records

### SRC-901
- **claim:** A claim whose verification expired years ago.
- **source:** https://example.gov.gr/some/specific/document.pdf
- **excerpt:** «Κείμενο.»
- **verified_at:** 2019-01-01
- **reverify_after:** 2020-01-01
- **hooks:** H1
- **interval_note:** 12 months.

### SRC-902
- **claim:** A claim with no excerpt at all.
- **source:** https://example.gov.gr/another/document.pdf
- **verified_at:** 2026-08-26
- **reverify_after:** 2099-01-01
- **hooks:** H2
- **interval_note:** 12 months.

### SRC-903
- **claim:** A claim whose expiry date is not parseable.
- **source:** https://example.gov.gr/third/document.pdf
- **excerpt:** «Κείμενο.»
- **verified_at:** 2026-08-26
- **reverify_after:** soon-ish
- **hooks:** H3
- **interval_note:** 12 months.

### SRC-904
- **claim:** First record carrying this id.
- **source:** https://example.gov.gr/fourth/document.pdf
- **excerpt:** «Κείμενο.»
- **verified_at:** 2026-08-26
- **reverify_after:** 2099-01-01
- **hooks:** H4
- **interval_note:** 12 months.

### SRC-904
- **claim:** Second record carrying the same id.
- **source:** https://example.gov.gr/fifth/document.pdf
- **excerpt:** «Κείμενο.»
- **verified_at:** 2026-08-26
- **reverify_after:** 2099-01-01
- **hooks:** H4
- **interval_note:** 12 months.

### SRC-905
- **claim:** A claim cited to a homepage, which proves nothing.
- **source:** https://www.aade.gr
- **excerpt:** «Κείμενο.»
- **verified_at:** 2026-08-26
- **reverify_after:** 2099-01-01
- **hooks:** H5
- **interval_note:** 12 months.
