# Extraction eval fixtures

Each fixture is a **pair**:

- `<name>.pdf` — a policy document (**synthetic or redacted only** — never a real
  customer/copyrighted policy; `*.pdf` here is gitignored so they are not committed).
- `<name>.expected.json` — hand-labeled ground truth. Label only the fields you
  are confident about; the scorer grades only what is present.

## expected.json shape

```json
{
  "insurerName": "Εθνική Ασφαλιστική",
  "policyNumber": "1651622",
  "lineOfBusiness": "motor",
  "startDate": "2024-05-22",
  "endDate": "2025-05-22",
  "premiumAmount": 452.30,
  "premiumFrequency": "annual",
  "minExclusions": 2,
  "minFinePrintClauses": 1,
  "minAccuracyPct": 0
}
```

- Dates are ISO `YYYY-MM-DD` and compared by day.
- `lineOfBusiness` must be one of the canonical `WRITE_BRANCH_IDS` (motor, home,
  health, life, travel, pet, liability, …).
- `insurerName` matches leniently (case/accent/suffix tolerant); `policyNumber`
  matches exactly (ignoring spaces/case); `premiumAmount` within €0.50.
- `minExclusions` / `minFinePrintClauses` assert the extraction found **at least**
  that many.
- `minAccuracyPct` (optional, default 0) is the floor the harness asserts for this
  fixture. Keep it 0 while establishing a baseline; raise it once a prompt is
  trusted, to turn the eval into a regression gate.

## Running

```bash
RUN_EVAL=1 GEMINI_API_KEY=... npx vitest --run tests/eval
# or
npm run eval:extraction        # sets RUN_EVAL=1 for you; still needs GEMINI_API_KEY
```

The run prints a per-fixture scorecard and writes `tests/eval/report.json`.
Capture it **before** and **after** a prompt change to see the delta — this is the
gate the pipeline lacked when prompts were changed blind.
