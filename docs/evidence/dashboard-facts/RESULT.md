# «Συνοπτική εικόνα» facts row — three clean rounds (2026-09-07)

The overview card's facts row on the B2C home (`components/dashboard/home/ProtectionStatusHero.tsx`)
re-laid as a container-stepped grid of fact cells from `lg`, the ink pill kept below it.

**Acceptance** = three consecutive clean rounds of `tests/measure/dashboard-facts.spec.ts`
(project `measure-dash`, `--workers=1`, a production build on :3000), where a round is the ten
captures `{seven-facts, two-facts} × {390, 768, 1024, 1280, 1440}` with zero failed assertions
plus a batched inspection of the light and dark crops, and the three rounds' geometry is
byte-identical after stripping `capturedAt`:

```
node tests/measure/dashboard-facts-rounds.mjs round-1 round-2 round-3
# → identical geometry across round-1, round-2, round-3
```

| Round | Result | Notes |
|---|---|---|
| round-1 | 11 passed | Two fixes landed in the same batch before it went green: the premium caption's first letter lowered in code (`::first-letter` does not apply to a flex label from `lg`) and the upgrade card's soft button allowed to wrap (a 358px nowrap button overflowed the 314px card at 1024). |
| round-2 | 11 passed | Geometry identical to round-1; crops clean at every width. |
| round-3 | 11 passed | Geometry identical to rounds 1–2; crops clean. |

**What each capture asserts** (see the spec): no horizontal scroll, no overlapping hit areas and
no tap target under 44px inside `#overview`, no font under 12px, labels ≤ 2 lines, notes ≤ 2 lines,
the unassessed door's text carries its qualifier, the h2 carries every rendered count in fact order;
at 390/768 the pill layout with no hairlines; at 1024/1280/1440 the grid with 2/3/4 cells per row
(capped by the fact count), no hairline at a row start, none missing inside a row, metric baselines
within 1px, cells ≥ 120px wide, 20px metric / 12px caption.

**Files**: `<round>/<fixture>-<width>.json` (the `factRowGeometry` metric + overflowers + counts),
`<round>/<fixture>-<width>.png` (light card crop), `<round>/<fixture>-<width>-dark.png` (dark crop).
The phone crops include the fixed bottom nav because the card sits in the first viewport; it is a
shell item, not part of the card (the overlap metric pairs page-flow elements only).
