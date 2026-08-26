# D-G05 resolved — `HookTicker` extends `HeroSlides` by extraction, and does not rotate on the homepage

Required by G-05: *"Establish first whether `HeroSlides.tsx` is extended or replaced, and record
which."* Determined by reading the component, before any copy exists.

## Finding 1 — `HeroSlides` already satisfies every §3.1 accessibility requirement

Not approximately. Each one, with the reasoning documented in the file:

| §3.1 requirement | `HeroSlides` today |
|---|---|
| Motion pausable via a **visible** control | Explicit labelled pause/play button, and the file calls out that it is deliberately *not* a hover-only affordance |
| `prefers-reduced-motion: reduce` → static, no animation | `matchMedia` disables auto-advance **entirely** — the file's own note: "someone who asked for no motion did not ask for faster motion" |
| Content in the DOM for assistive tech regardless of animation state | All slides rendered in one grid cell; inactive ones marked `inert` |
| Keyboard focus pauses rotation | Auto-advance stops on hover **and** on keyboard focus anywhere inside |
| Not the sole route to any content | CTAs sit **below** the component and never move |
| — (beyond the brief) | `aria-live` is `off` while self-advancing and `polite` once a person takes control, per the ARIA carousel pattern |
| — (beyond the brief) | One grid cell, so height never changes and the page does not shift on a timer |

It also carries a **fixed P0**: the homepage once moved its CTA on interaction, and this component is
built so nothing can reintroduce that.

**Writing a second rotator would mean re-solving six accessibility problems that are already solved,
and re-earning a P0 that was already paid for.** The odds of getting all six right a second time are
poor, and the failure would be silent.

## Decision — EXTEND by extraction

1. **Extract the rotation + a11y machinery** out of `HeroSlides.tsx` into one primitive. It is
   cleanly separable: four state values (`index`, `paused`, `tookControl`, `reducedMotion`), two
   refs (`hovering`, `focused`), two effects (`matchMedia`, `setInterval`), and the `aria-live` /
   `inert` render rules — `HeroSlides.tsx:127–190`.
2. **`HeroSlides` consumes it.** Its content, its three slides, its timing and its behaviour are
   unchanged. This is a refactor with no user-visible delta, and it must be proven so.
3. **`HookTicker` consumes the same primitive.** One rotation definition, two content adapters —
   not a second rotator.

**Not "replace":** `HeroSlides`' three slides are core product positioning, and swapping them for
hooks is a product decision nobody has made. Not in scope here.

## Finding 2 — the hooks CANNOT rotate on the homepage, and §3.1 asks them to

A genuine conflict between two instructions, so it is recorded rather than quietly resolved:

- §3.1: the ticker is *"used on the homepage and on `/guides` index"*.
- D-G05: *"Never a second rotator on one page — that is the duplicate-action class arriving on the marketing surface."*

`HeroSlides` renders on the homepage (`components/landing/WorldClassLanding.tsx:122`, one instance).
A `HookTicker` there would be the second rotator D-G05 forbids. Verified that the other two surfaces
are clear: **neither `/guides` nor `/solutions/agents` carries any rotator today** (no `setInterval`,
no carousel, no `HeroSlides`).

**Resolution, chosen as the reversible option:**

| Surface | Hooks render | Why |
|---|---|---|
| Homepage | **static** | `HeroSlides` already rotates here. A second rotator is forbidden, and demoting the hero to make room is a product decision. |
| `/guides` index | **rotating** (B2C set) | No rotator present. |
| `/solutions/agents`, `/pricing?audience=agent` | **rotating** (B2B set) | No rotator present; §3.1's audience split keeps the registers separate. |

This costs nothing extra to build. §3.1 already requires a **static stack** for
`prefers-reduced-motion`, so that code path must exist regardless — the homepage simply always takes
it. One component, one data source, two render modes.

**If the intent was for hooks to displace the hero slides on the homepage, that is a different
decision and it is not mine to take.** Say so and it changes in one line.

## What must be proven, not asserted

The extraction is a refactor of a live, carefully-tuned component with a documented P0 history. Its
acceptance is a **REGRESSION-GUARD, labelled as such** per the carried-over rule: `HeroSlides`
behaves identically before and after — same interval, same pause semantics, same reduced-motion
behaviour, same `aria-live` transitions, same `inert` handling, no layout shift. That criterion
cannot fail on the pre-change code because the pre-change code *is* the reference; it measures the
absence of a regression, not the presence of the feature, and is reported separately from the
criteria that measure the hooks themselves.
