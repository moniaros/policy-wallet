# Hyperframes Composition Brief: PolicyWallet

## Objective
Create a short launch-style brag video for PolicyWallet.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22 seconds

## Source Material
- Project root: the PolicyWallet Next.js repo (one directory up)
- Primary files read: `lib/marketing/positioning.ts`, `lib/landing/content.ts`, `components/landing/real-screens/RealScreens.tsx`, `lib/i18n/translations/el.ts`, `app/globals.css`, `public/brand/logo-mark.svg`, `README.md`
- Product name: PolicyWallet
- Tagline / strongest claim: «Δεν αξιολογούμε ασφαλιστήρια. Αξιολογούμε την προστασία σας.»
- Key UI or visual moment to recreate: the white wallet card on the deep-green field — first the upload → read → extracted-facts flow, then the attention list with «Κατοικία: ο σεισμός δεν καλύπτεται»
- Copy that must appear verbatim:
  - «Η ζωή σας αλλάζει.»
  - «Η ασφάλισή σας, όμως, έμεινε εκεί που την αφήσατε.»
  - «Κάνατε παιδί» · «Αλλάξατε σπίτι» · «Πήρατε δάνειο»
  - «Το διαβάζουμε για εσάς» / «Βρίσκουμε τι καλύπτει, τι δεν καλύπτει και πότε λήγει.»
  - «Σας δείχνουμε την αλήθεια» / «Σας εξηγούμε με απλά λόγια τι καλύπτουν τα ασφαλιστήριά σας και τι μπορεί να σας λείπει.»
  - «Κατοικία: ο σεισμός δεν καλύπτεται» + «Υψηλή προτεραιότητα»
  - «Αυτοκίνητο: ανανέωση σε 18 ημέρες» + «Μεσαία προτεραιότητα»
  - «2 ευρήματα ίσως χρειάζονται έλεγχο»
  - «Δεν αξιολογούμε ασφαλιστήρια. Αξιολογούμε την προστασία σας.»

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium product film for a regulated product
- Interpretation: four scenes, soft crossfades, one idea per scene, generous holds, the product's verbatim Greek only
- Angle: see `brag-plan.md` — life changed, insurance didn't; then the product reading a policy and telling the truth
- Hook: «Η ζωή σας αλλάζει.» + three life-change chips on the beat
- Outro / punchline: the category line, then the logo lockup and policywallet.gr — no signup CTA (registration flag state unknown)
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Advice verbs in platform voice; numbers not on the product's own surfaces

## Visual Identity
- Background: #12211D
- Text: #F8FAFC (field), #0F172A / #475569 (cards)
- Accent: #89D9B2 mint; #29685B brand green
- Display font: Inter, self-hosted `@font-face` from `assets/fonts/inter-greek.woff2` + `inter-latin.woff2` (variable weight)
- Body font: Inter
- Visual references from the project: the Grafí logomark (`assets/brand/logo-mark.svg`), the `.pw-card` white surface with 24px radius, uppercase kicker labels, status pills

## Storyboard
Use the storyboard in `brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 6.0s — headline, three chips on beats, the turn line
2. We read it for you — 6.4s — wallet card: PDF slides in, progress fills, three facts land on beats
3. We show you the truth — 5.6s — attention card: two findings land, honest count in the header
4. Outro — 4.6s — category line in two weights, logo lockup, policywallet.gr

## Audio
- Audio role: warm bed, sparse professional accents
- Audio arc: bed from frame one; accents only on the chips, the file, the facts, the findings, the logo; fade under the lockup
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: volume ~0.32, fade out over the last ~1.6s
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (109.96 BPM). Strong-cue locks: 8.74, 13.11, 17.47, 19.66. Beat grid: 1.64/2.19/2.73, 8.74/9.29/9.83, 14.20.
- Audio-reactive treatment: subtle; `assets/audio-data.json` (30fps, 16 bands) already extracted; bass → breathing of the brand-green glow behind the cards, ±8%
- Audio-coupled moments:
  - chips 1 and 3 — soft drop
  - PDF chip — card slide
  - first extracted fact — soft impact
  - first finding — soft impact; second finding — soft drop
  - logo — one bell
- SFX selection guidance: low-HF-risk picks already copied into `assets/sfx/` (impactSoft_medium_001, drop_001, drop_002, click_003, card-slide-1, impactBell_heavy_000, keypress-001…006)
- SFX analysis guidance: the brag skill's `assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes decides timestamps, density, and volume from the implemented animation.
- Audio files: in `composition/assets/`

## Hyperframes Instructions
Domain skills loaded: `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, `hyperframes-keyframes`, `hyperframes-cli`. /brag owns the story; Hyperframes owns structure, timing, and the render gate.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer.
- Treat cue metadata as timing hints; readability wins.
- Beat-lock 1-3 major reveals (±0.15s); snap sequential events to beats (±0.10s) unless it rushes reading.
- Audio-reactive: at least one visual element breathes with the bass; no waveform/equalizer visuals.
- Local assets only.
- `npx hyperframes check` must pass before render.
