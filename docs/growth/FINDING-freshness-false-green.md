# FINDING — `sources-freshness` is green over a corpus it never evaluates

**Escalated ahead of C3-0 by owner instruction, 2026-08-29. Report only — not fixed in this run.**

## Correction to how I first put it

I described this as *"reporting green on 29 citations it structurally cannot evaluate."* That is
wrong in a way worth fixing before anything is built on it: **the freshness check never looks at
those 29 at all.** It is not mis-evaluating them. The defect is real but it is a different shape,
and getting the shape right decides what the smallest fix is.

## Which check produces the green

Two, with different universes.

| check | file:line | universe | verdict |
|---|---|---|---|
| `it('every reverify_after is still in the future')` | `tests/unit/sources-freshness.test.ts:197` | the **16 `SRC-###` records** parsed from `docs/growth/SOURCES.md` | genuinely evaluates freshness |
| `it('introduces no bare-origin citation beyond the enumerated legacy debt')` | `:269` | **all 37** citations in `lib/guides/content.ts` | sees all 29, classifies them as known debt |

**The 29 bare origins are structurally outside the freshness check.** They are
`GuideSource = { label, url }` (`lib/guides/content.ts:48-51`) — the type carries **no
`verified_at` and no `reverify_after`**, so there is no date for `findStale()` to read. They are not
evaluated as fresh; they are not evaluated at all.

The corpus check does see them, and it is well built: `LEGACY_BARE_CITATIONS` is enumerated exactly
and asserted in **both** directions — a new bare citation fails, and fixing one without delisting it
also fails. The list can only shrink. The guard's own docblock says *"The list is debt, not an
exemption,"* and it means it.

## So what is actually wrong

**The guard is internally honest. The assurance is false one level up.**

- The suite is named **`sources-freshness`** and it reports **green**.
- What is true: 16 records are fresh; **29 citations — 78% of the corpus — are unevaluable, and
  that fact lives only inside a `const` array in a test file.**
- **Nothing emits the ratio.** No count reaches CI output, `PROGRESS`, or any dashboard. To learn
  that 11 of 15 published guides cite nothing checkable, you must open the test and count an array.

A green check named for freshness, over a corpus that is 78% unevaluable, with the shortfall
recorded nowhere a reader will look, is an assurance nobody authorised and nobody can audit. That is
the same shape as the other three failures this run has hit — a claim with no way to check its own
scope — and it is why this was escalated rather than filed.

**Bare origins also defeat the only mechanism that could ever catch them.** A homepage returns 200
in perpetuity. Even if `GuideSource` gained a `reverify_after`, re-verification would consist of
fetching `https://www.eaee.gr`, getting 200, and stamping a new date. The citation would look
maintained for ever while the claim behind it drifted. **Freshness is not a meaningful property of
a bare origin** — which is why the fix is not "add dates to the 29".

## One inaccuracy found on the way

The docblock at `:29` states *"The 12 pre-existing guides carry 30 citations."* The array holds
**29**, and G-07 independently measured **29**. The prose is off by one against its own data.
Trivial, and exactly the genre under discussion.

## The smallest change that makes an unresolvable citation report as unevaluable

**Not** making the check red. The file's own reasoning applies and is correct: *"A guard that goes
red on twelve pre-existing articles the day it ships gets muted within a week."* Red here would be
removed, and the debt would become less visible, not more.

The smallest honest change is to **state the number instead of hiding it in an array** — one added
assertion, no behaviour change, no red:

```ts
it('reports how much of the corpus it cannot evaluate — 29 of 37 citations (GB-04)', () => {
    const bare = allCitations.filter((c) => isBareOrigin(c.url))
    const guidesWithNoResolvableCitation = /* … */
    // Pinned exactly, both directions: the number moves only when the debt does,
    // and it appears in CI output on every green run instead of nowhere.
    expect({ unevaluable: bare.length, total: allCitations.length, guidesBlind: guidesWithNoResolvableCitation })
        .toEqual({ unevaluable: 29, total: 37, guidesBlind: 11 })
})
```

Three properties that matter:
1. **The count is in the test name and the assertion**, so a green run prints it. The debt stops
   being a thing you must go looking for.
2. **It fails in both directions** — debt grows, or debt shrinks without the number being updated.
   Same discipline `LEGACY_BARE_CITATIONS` already has, applied to the aggregate.
3. **It renames nothing and reddens nothing**, so there is no incentive to mute it.

Worth pairing with a rename of the suite — `sources-freshness` promises more than it delivers, and
`sources-registry` would describe what it actually guards — but that is cosmetic beside the count.

## Explicitly not done here

No change was made to `tests/unit/sources-freshness.test.ts`, to `GuideSource`, or to any citation.
The 29 remain, the guard remains green, and GB-04 remains unqueued and unstarted. This is the
written finding that was asked for.
