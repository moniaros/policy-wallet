# Brag Plan: PolicyWallet

## What is this app?
PolicyWallet reads a person's insurance policies (PDF or photo, any Greek insurer), explains in plain Greek what they cover, what they do not, and when they expire — and flags what may be missing. It sells nothing and takes no commission.

## The angle
"Your life changed. Your insurance didn't." The product's own story: life events pile up (a child, a new home, a loan) while the policies stay where you left them. Then we show the product doing the one thing it does — upload a policy, watch it get read, see the honest finding «ο σεισμός δεν καλύπτεται» — and land on the category line: «Δεν αξιολογούμε ασφαλιστήρια. Αξιολογούμε την προστασία σας.»

## Hook (first 2-3 seconds)
«Η ζωή σας αλλάζει.» lands alone on a deep-green field. Three life-change chips tick in on the beat: «Κάνατε παιδί» · «Αλλάξατε σπίτι» · «Πήρατε δάνειο». Then the turn: «Η ασφάλισή σας, όμως, έμεινε εκεί που την αφήσατε.»

## Key moments (the middle)
- A policy PDF chip slides into the wallet card; the «Το διαβάζουμε για εσάς…» bar fills; three extracted facts snap in on consecutive beats (insurer, branch, renewal in 74 days).
- The attention card: «Κατοικία: ο σεισμός δεν καλύπτεται» with the red «Υψηλή προτεραιότητα» pill and the product's own reason line, then «Αυτοκίνητο: ανανέωση σε 18 ημέρες».
- The honest count above the findings: «2 ευρήματα ίσως χρειάζονται έλεγχο» — the product never says "all clear" without naming what it checked.

## Outro / punchline
«Δεν αξιολογούμε ασφαλιστήρια.» (quiet) → «Αξιολογούμε την προστασία σας.» (heavy) → logo lockup + policywallet.gr.
No signup CTA: registrations are behind a runtime flag (`auth.allow_registrations`) whose current state this run cannot verify, so the outro promises nothing it might not be able to keep.

## User flow worth showing
Upload a policy (PDF chip lands) → it is read (progress, extracted facts) → the wallet shows what needs attention (gap finding + renewal). Scenes 2 and 3 are that flow, recreated from the product's own `RealScreens` sample data (fictional insurer «Ασφαλιστική Α», sample policy PW-2026-0733). No real customer data anywhere.

## Tone
- Preset: polished
- Creative direction: quiet premium product film for a regulated product — confidence through restraint
- Interpretation: four scenes, 4–6s each, soft crossfades, one idea per scene, generous holds; the copy is the product's verbatim Greek, no advice verbs in platform voice, no invented numbers.

## Format: landscape — 1920x1080
## Duration: 22s

## Visual identity (from the project)
- Background: deep green field #12211D (between the product's `--cta-dark #1A2420` and `--secondary #143B33`; the product's dark theme uses mint-on-dark)
- Accent: mint #89D9B2 (`--color-mint` / dark-theme `--primary`); brand green #29685B (`--primary`) for the card glow and logo bead
- Text: #F8FAFC on the field; #0F172A ink on the white UI cards; #475569 muted ink
- Status colours (from globals.css): danger #B91C1C on #FEF2F2, warning #92400E on #FFFBEB
- Display font: Inter (the product's only face; variable weight, Greek + Latin subsets shipped from the app's own build output)
- Body font: Inter
- Strongest visual element: the white wallet card on the deep-green field — the attention list with the «ο σεισμός δεν καλύπτεται» finding; the Grafí logomark (card-with-bead)

## Share copy (draft)
Η ζωή σας αλλάζει. Η ασφάλισή σας έμεινε εκεί που την αφήσατε. Το PolicyWallet διαβάζει τα ασφαλιστήριά σας και σας λέει αν είστε ακόμη προστατευμένοι — χωρίς να πουλάει τίποτα. policywallet.gr

## Audio direction
- Role: warm bed, sparse professional accents
- Music: happy-beats-business-moves-vol-12-by-ende-dot-app.mp3 (steady and clean; the polished pick)
- Music treatment: starts at 0 at ~0.32; fades out over the last 1.6s under the logo
- Music cue guidance: bundled preset read (`assets/music/cues/…vol-12….music-cues.json`, 109.96 BPM). Strong-cue targets: 8.74s (extracted facts land), 13.11s (the gap finding lands), 17.47s (outro line), 19.66s (logo). Beat-grid windows: chips at 1.64 / 2.19 / 2.73; facts at 8.74 / 9.29 / 9.83; second attention item at 14.20.
- Audio-reactive treatment: subtle; bass drives the breathing of the brand-green glow behind the cards and the field's radial warmth (±8%). No waveforms, no pulsing text.
- SFX posture: sparse, low-HF-risk picks; motion-matched.
- Audio-coupled moments: chip ticks (first and last only), PDF slide-in, facts landing, finding landing, logo bell.
- Restraint rule: never louder than the music; no sound on the line-2 text or the scene crossfades; nothing on the outro text except the single bell on the logo.

## Storyboard

### Scene 1 — Hook — 6.0s (0.0–6.0)
Deep-green field with two soft radial glows and a faint grid. «Η ζωή σας αλλάζει.» (display, 800) rises in at 0.3s. Three chips tick in below on beats 1.64 / 2.19 / 2.73: «Κάνατε παιδί» «Αλλάξατε σπίτι» «Πήρατε δάνειο». At 3.27 the second line slides in from the left: «Η ασφάλισή σας, όμως, έμεινε εκεί που την αφήσατε.» Hold. Content fades from 5.5s.
Sequential/interaction: yes — three chips arrive one by one, held on screen until the scene ends.
Audio intent: calm confidence; the chips are the only rhythm.
Audio-coupled idea: soft drop on chip 1 and chip 3.
Music: warm bed from 0.
Transition mood: soft → Scene 2

### Scene 2 — We read it for you — 6.4s (5.8–12.2)
Left: kicker «ΠΩΣ ΛΕΙΤΟΥΡΓΕΙ», headline «Το διαβάζουμε για εσάς», sub «Βρίσκουμε τι καλύπτει, τι δεν καλύπτει και πότε λήγει.» Right: the white wallet card (logomark + «Ασφαλιστήρια»). At 6.56 a PDF chip «ασφαλιστήριο-κατοικίας.pdf» slides in from the right. 7.1–8.6 the «Το διαβάζουμε για εσάς…» bar fills. At 8.74 (strong cue) the first extracted fact lands, then 9.29 and 9.83: «Ασφαλιστική — Ασφαλιστική Α», «Κλάδος — Κατοικία», «Ανανέωση — σε 74 ημέρες». Hold to 12.2.
Sequential/interaction: yes — file slides in; progress fills; three fact rows land on consecutive beats and stay.
Audio intent: the product working, unhurried.
Audio-coupled idea: card-slide on the PDF, a soft impact when the first fact lands.
Transition mood: soft → Scene 3

### Scene 3 — We show you the truth — 5.6s (12.0–17.6)
Mirrored: card left, text right. Right: kicker «ΧΡΕΙΑΖΕΤΑΙ ΤΗΝ ΠΡΟΣΟΧΗ ΣΑΣ», headline «Σας δείχνουμε την αλήθεια», sub «Σας εξηγούμε με απλά λόγια τι καλύπτουν τα ασφαλιστήριά σας και τι μπορεί να σας λείπει.» Left card header: «Συνοπτική εικόνα» · «2 ευρήματα ίσως χρειάζονται έλεγχο». At 13.11 (strong cue) item 1 lands: red pill «Υψηλή προτεραιότητα», «Κατοικία: ο σεισμός δεν καλύπτεται», reason «Το ασφαλιστήριο κατοικίας δεν περιλαμβάνει σεισμό — ρωτήστε τον ασφαλιστή σας πριν την ανανέωση.» At 14.20 item 2: amber pill «Μεσαία προτεραιότητα», «Αυτοκίνητο: ανανέωση σε 18 ημέρες», «Ελέγξτε ότι οι ίδιες καλύψεις και απαλλαγές ισχύουν και στη νέα περίοδο.» Hold to 17.6.
Sequential/interaction: yes — two attention items land one after the other and stay.
Audio intent: the payoff; one clear landing, one softer.
Audio-coupled idea: soft impact on item 1, soft drop on item 2.
Transition mood: soft → Scene 4

### Scene 4 — Outro — 4.6s (17.4–22.0)
Centered. 17.47 (strong cue): «Δεν αξιολογούμε ασφαλιστήρια.» (light weight, muted). 18.56 (strong cue): «Αξιολογούμε την προστασία σας.» (heavy, white). 19.66 (strong cue): logo lockup — mark with mint bead, «Policy» white «Wallet» mint — then «policywallet.gr» at 20.19. Music fades under the logo.
Sequential/interaction: yes — two lines then the lockup, held to the end.
Audio intent: settle and land.
Audio-coupled idea: one bell on the logo; music fade-out.
Transition mood: hold to black-free end (last frame is the lockup).

**Music mood for this video:** polished / steady
**Audio summary:** a warm steady bed from frame one, five quiet motion-matched accents, a single bell on the logo, and a fade under the final lockup.
