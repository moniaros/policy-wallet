# PolicyWallet — Project Status

> **Full record of the 2026-07-28/29 UI audit:**
> [audits/UI_AUDIT_2026-07-29.md](audits/UI_AUDIT_2026-07-29.md) — what was
> found, what was fixed, what still needs doing, and the five corrections where
> my own tooling was wrong rather than the product.

## WP-07 (μερικώς) — gaps now become opportunities by themselves — 2026-07-30

PR #225. 2674/2674 unit tests, 6/6 gates.

Τα Opportunity rows δημιουργούνταν **μόνο** από ρητό cross-sell run, οπότε η
αξία pipeline στο agent dashboard έδειχνε **€0** όσα κενά κι αν εντόπιζε η
ανάλυση. Νέο `gap-opportunity-sync`, καλούμενο στο ένα σημείο όπου μια ανάλυση
είναι βέβαιο ότι τελείωσε.

Τρεις κανόνες: **η συγκατάθεση ορίζει την ορατότητα, όχι η σχέση** (η σχέση
δημιουργείται μονομερώς — δεν είναι άδεια)· **καμία κλήση LLM** (το gap έχει ήδη
την εξήγησή του)· **dedupe στο gapInstanceId** (αλλιώς κάθε επανα-ανάλυση
φουσκώνει το pipeline με αντίγραφα). Ειδοποίηση με userId μόνο.

11 tests, mutation-tested δύο φορές (dedupe και φίλτρο ορατότητας).

**Δεν έγιναν:** το συναινετικό activity stream και η επέκταση του
`agent-journey.spec.ts` — χρειάζονται E2E.

## WP-04 (μερικώς) — a bad extraction is no longer permanent — 2026-07-30

PR #225. 2663/2663 unit tests, 6/6 gates.

Το extraction cache ήταν κλειδωμένο **μόνο στο περιεχόμενο**: το ίδιο αρχείο
δίνει πάντα το ίδιο hash, άρα μια λανθασμένη πρώτη εξαγωγή σερβιριζόταν για
πάντα — και το να ξανανεβάσει ο χρήστης το ίδιο αρχείο «για να ξαναδοκιμάσει»
επέστρεφε το ίδιο λάθος. Κάθε βελτίωση του pipeline δεν άγγιζε τα ήδη cached.

Τώρα `EXTRACTOR_VERSION` ανά εγγραφή· παλαιότερες και legacy θεωρούνται stale.
Προστέθηκε ρητό `bypass`. Ο έλεγχος μπήκε **πριν** το log «cache hit» — αλλιώς
τα logs θα κατέγραφαν επιτυχία και θα επέστρεφαν null.

**Δεν έγιναν:** κουμπί «Επανάλυση από την αρχή» στο UI και confidence badges —
θέλουν οπτικό έλεγχο.

## WP-05 (μερικώς) — the score stopped hiding an uninsured home — 2026-07-30

PR #225. 2657/2657 unit tests, 6/6 gates.

Το `home` και το `motor` μοιράζονταν **μία** κατηγορία score («Property &
Motor», weight 20) που ικανοποιούνταν από **οποιοδήποτε** από τα δύο. Νοικοκυριό
με σπίτι και αυτοκίνητο που ασφάλιζε μόνο το αυτοκίνητο έπαιρνε **100%**: το
σκορ έλεγε ότι είναι καλυμμένο ενώ το σπίτι ήταν ανασφάλιστο. Τώρα δύο
κατηγορίες από 10 — συνολικό βάρος αμετάβλητο, καμία άλλη κατηγορία δεν
μετακινείται.

**Τα 2649 tests πέρασαν και πριν και μετά** — καμία δοκιμή δεν κάλυπτε τη
συμπεριφορά. 8 νέα, mutation-tested.

**Δεν έγινε:** ο δομημένος χάρτης ελληνικών καλύψεων αυτοκινήτου και τα golden
tests — απαιτούν εκτέλεση του pipeline πάνω σε πραγματικά PDF (ΒΔ + AI provider).

## WP-23 (μερικώς) — the /trust page exists — 2026-07-30

PR #225. 2649/2649 unit tests, 6/6 gates, build επαληθευμένο.

Το προϊόν δεν είχε καμία σελίδα ασφάλειας: η στάση του δηλωνόταν μόνο από ένα
chip row που έλεγε «AES-256» χωρίς να παραπέμπει πουθενά, ενώ η πλατφόρμα κάνει
πραγματικά τα δύσκολα (ανακλητή πρόσβαση ανά ασφαλιστήριο, Art. 15 εξαγωγή,
διαγραφή, αυτοματοποιημένη διακράτηση, έγγραφα μόνο μέσω authorizing route) και
τίποτα από αυτά δεν ήταν ορατό σε αυτούς για τους οποίους χτίστηκε.

Δίγλωσση σελίδα (el + `/en`), στο SEO registry και στο allowlist του `proxy.ts`.
Το test καρφώνει ότι **κάθε ισχυρισμός έχει αρχείο πίσω του** και ότι δεν
εμφανίζονται πιστοποιήσεις ή απόλυτα που δεν κατέχουμε. Τρία guards του repo
έπιασαν το κείμενό μου πριν το commit (SEO μήκος 209→159, ελληνικό sentence
case, και δικό μου probe που σάρωνε σχόλια).

**Ανοιχτό:** insurer logos — δεν είναι κώδικας, χρειάζονται αρχεία λογοτύπων 27
εταιρειών με άδεια εμπορικού σήματος.

## WP-18 (μερικώς) — an agent's customer book no longer ends at 100 — 2026-07-30

PR #225. 2637/2637 unit tests, 6/6 gates.

Το `getCustomers` ζητούσε μία σελίδα των 100 «για να μιμηθεί το all» και
επέστρεφε μόνο αυτήν: ασφαλιστής με 150 πελάτες έβλεπε **100**, χωρίς τίποτα να
λέει ότι υπάρχουν άλλοι 50. Σφάλμα **ορθότητας** πριν γίνει θέμα κλίμακας.
Τώρα διατρέχει σελίδες· το cap ασφαλείας **καταγράφει** όταν ξεπεραστεί αντί να
κόβει σιωπηλά — η αποτυχία που διορθώνεται ήταν η σιωπή.

**Δεν έγιναν:** τα composite indexes (απαιτούν migration· δεν υπάρχει ΒΔ εδώ και
ένα ανεφάρμοστο migration στο repo είναι χειρότερο από κανένα), pagination στα
5 unbounded reads του agent dashboard, N+1 στα cron services, acordData trimming.

## WP-17 (μερικώς) — fonts consolidated; a CI-breaking regression of mine fixed — 2026-07-30

PR #225. 2632/2632 unit tests, 6/6 gates, **production build verified**.

**Γραμματοσειρές.** Υπήρχαν 10 ξεχωριστές κλήσεις `next/font` (η Inter του root,
4 διπλότυπες Inter, 4 IBM Plex Sans) και **9 από τις 10 χωρίς `display: swap`** —
ο browser κρύβει το κείμενο μέχρι να φορτώσει, δηλαδή σε ελληνικό subset και
αργή σύνδεση λευκή σελίδα στις πρώτες οθόνες. Τώρα ένα `lib/fonts.ts`.
`next.config.ts`: images (AVIF/WebP + remotePatterns από env), compress,
optimizePackageImports για framer-motion.

**⚠️ Παλινδρόμηση δική μου από το WP-01.** Ο production guard του `lib/env.ts`
απαιτούσε AI key, και το `next build` τρέχει με `NODE_ENV=production` ενώ το CI
χτίζει **χωρίς κανένα AI key**. Θα είχε σπάσει το CI στο πρώτο commit. Ο έλεγχος
εξαιρεί πλέον το build phase· η πραγματική εγγύηση είναι ο factory σε χρόνο
αιτήματος. Βρέθηκε **μόνο επειδή έτρεξα το build** — lint/types/tests ήταν όλα
πράσινα.

**Διόρθωση μέτρησης:** το «unoptimized hero PNG στο LCP path» δεν υπάρχει — τα
μεγάλα assets στο `public/` δεν αναφέρονται από πουθενά. Raw `<img>`: 11, όχι 13.

## WP-26 (μερικώς) — sold-but-unbuilt features are now declared — 2026-07-30

PR #225. 2626/2626 unit tests, 6/6 gates.

Το audit έλεγε «`canAgentUseFeature` με **0 call sites**, ~13 πουλημένα flags
χωρίς fence». **Και τα δύο ήταν λάθος.** Το helper έχει 5+ call sites, και η
καταμέτρηση έψαχνε μόνο τον helper — προσμετρούσε ως ακάλυπτα το `priorityQueue`
(ορίζει προτεραιότητα ουράς στον orchestrator) και το `pipelineAnalytics`
(διαβάζεται από το agent dashboard). Μετρημένος αριθμός εντελώς άχτιστων:
**5 από 17**.

Νέο `lib/pricing/unbuilt-features.ts` κάνει το κενό δηλωμένο. Δεν διέγραψα
features — build vs de-list είναι προϊοντική απόφαση. Το test ελέγχει δύο
κατευθύνσεις και έχει ratchet στο 5.

**Δεν έγιναν** (τα βαρύτερα): free-tier υπόσχεση υπενθυμίσεων, notification-bell
dead end, invite/acceptance, **revoke UI χωρίς paywall (Art. 7(3))**,
ειδοποιήσεις στα 5 σιωπηλά handoffs, read-access audit rows.

## WP-09 (μερικώς) — bilingual AI output stopped duplicating one language — 2026-07-30

PR #225. 2622/2622 unit tests, 6/6 gates.

Το WP περιέγραφε «πληρότητα» (πόσα `aiExplanationEl` είναι κενά). Ο έλεγχος
βρήκε **χειρότερο από κενά**: όταν ο provider επιστρέφει σκέτο string αντί για
`{ en, el }`, το `gap-analysis.service.ts` έγραφε **την ίδια συμβολοσειρά και
στις δύο στήλες**. Η γραμμή φαινόταν πλήρως μεταφρασμένη σε κάθε έλεγχο
πληρότητας, ενώ ο Έλληνας χρήστης έβλεπε αγγλικά παρουσιασμένα ως ελληνικά —
αόρατο στα δεδομένα, ορατό μόνο στον χρήστη.

Νέο `lib/services/bilingual-ai-fields.ts`: σκέτο string = απάντηση μίας
γλώσσας, μπαίνει μόνο εκεί· η άλλη στήλη μένει null ώστε ο renderer να πέσει
στη localized περιγραφή του gap definition αντί να ψεύδεται. **Δεν έγιναν:**
backfill ιστορικών γραμμών + audit script — θέλουν ζωντανή ΒΔ.

## WP-19 (μερικώς) — route loading states + honest offline copy — 2026-07-30

PR #225. 2615/2615 unit tests, 6/6 gates.

Υπήρχαν 18 `loading.tsx` και **και τα 18** μέσα στο `app/(protected)`. Τα 59
public routes, όλο το auth δέντρο και οι δύο ροές onboarding δεν είχαν κανένα —
και οι landing σελίδες είναι επιπλέον σε `<Suspense fallback={null}>`, οπότε
αργή πλοήγηση έδειχνε κυριολεκτικά τίποτα. Προστέθηκαν και στα τρία groups.
Επιπλέον το ίδιο το group fallback των protected ήταν **βουβό** (σκελετοί χωρίς
live region ή κείμενο) — ακριβώς το ελάττωμα για το οποίο είχαν διορθωθεί τα
composites.

Το offline toast υποσχόταν εμφάνιση αποθηκευμένων δεδομένων ενώ το
`offline-storage.ts` έχει **μηδέν importers**· χρήστης που το πίστευε διάβαζε
ό,τι υπήρχε στην οθόνη ως τρέχοντα στοιχεία του. Το test γράφτηκε στην αιτία:
όσο ο store δεν έχει καταναλωτές, καμία δήλωση για cached δεδομένα.

**Δεν έγιναν:** streaming Suspense στα βαριά pages, `/offline` route, ενοποίηση
των 2 Skeleton implementations — θέλουν E2E για να επιβεβαιωθούν.

## WP-16 (μερικώς) — Sentry, crons, rollback/DR runbook — 2026-07-30

PR #225. 2601/2601 unit tests, 6/6 gates.

**Διπλό Sentry wrap.** Υπήρχε ένα υπό συνθήκη και ένα **χωρίς συνθήκη** στο
export· το δεύτερο έτρεχε πάντα, άρα με ορισμένες τις μεταβλητές το config
τυλιγόταν δύο φορές — δύο περάσματα source maps ανά build και φωλιασμένο plugin
config. Τώρα ένα, με org/project από env. **Hardcoded fallback DSN**
αφαιρέθηκε: κάθε dev μηχάνημα, preview και fork ανέφερε σιωπηλά στο production
project.

**Δύο jobs που δεν έτρεχαν ποτέ** μπήκαν στο `vercel.json`. Το
`billing-reconciliation` θα αναφέρει ασυμφωνία μέχρι το WP-27 — προτιμότερο από
job που δεν τρέχει. **Σιωπηλό pooling fallback** έγινε θορυβώδες (console +
Sentry) αντί να ανακαλύπτεται στο πρώτο φορτίο.

**`RUNBOOK_ROLLBACK_AND_DR.md`** — το repo είχε 12 incident runbooks και κανένα
για rollback/επαναφορά. Vercel promote, κανόνας expand→contract (50 migrations,
καμία με rollback story), PITR με ρητά RPO ≤5min / RTO ≤4h, τριμηνιαίο drill,
και υποχρεωτικό βήμα **επαν-εφαρμογής διαγραφών GDPR** μετά από restore.

## WP-12 (μερικώς) — browser-uploaded bytes are now validated — 2026-07-30

PR #225. 2601/2601 unit tests, 6/6 gates.

Το B2C μονοπάτι ανεβάζει από τον browser κατευθείαν στο storage και δίνει στο
`createPolicy` **μόνο ένα URL**, παρακάμπτοντας και τους τρεις ελέγχους του
server path: magic bytes, malware scan, server-side όριο μεγέθους. Το
`isOwnedStorageUrl` απεδείκνυε μόνο ότι το URL έδειχνε στο δικό μας bucket —
**ποτέ τι υπήρχε μέσα**. Νέο `lib/security/verify-stored-upload.ts`: ο server
διαβάζει τα bytes με δικά του credentials και εφαρμόζει την ίδια κοινή πολιτική
πριν το αντικείμενο γίνει persisted document. Fails closed· το αποθηκευμένο
μέγεθος είναι το μετρημένο, όχι αυτό που δήλωσε ο client.

`scripts/storage-policies.sql` (versioned, idempotent) βγάζει το bucket/RLS
config από το «out-of-band»: private bucket, size limit, MIME allowlist, το
**H2 `DROP POLICY`** και INSERT περιορισμένο στο prefix του χρήστη. **Owner
action** να τρέξει ανά περιβάλλον.

**Δεν έγιναν:** signed upload URLs + quarantine prefix, drift probe, reconciler
ορφανών. Αντικαθιστούν το κύριο μονοπάτι ανεβάσματος και εξαρτώνται από bucket
policies που δεν μπορούν να εφαρμοστούν ούτε να επαληθευτούν εδώ (χωρίς DB,
χωρίς E2E). Το κενό ασφαλείας κλείνει ήδη με τα παραπάνω· το quarantine design
παραμένει το σωστό τελικό σχήμα για περιβάλλον όπου δοκιμάζεται.

## WP-15 — AI spend is bounded by rate, and watched — 2026-07-30

PR #225. 2593/2593 unit tests, 6/6 gates. **Phase A του SCALE plan ολοκληρώθηκε
πλην του WP-12.**

Τα budgets ήταν **μόνο μηνιαία**: ένας Plus χρήστης μπορούσε να κάψει 3M tokens
σε λεπτά, και ένα plan με `null` budget (ρυθμίσιμο από admin) δεν είχε κανένα
ταβάνι. Τώρα ωριαίο ταβάνι = μηνιαίο/10 (δάπεδο 100K) και **απόλυτο ωριαίο 2M
ακόμη και για unlimited** — επιβαλλόμενο και στο `reserveTokens`, το μονοπάτι
από το οποίο περνά κάθε πραγματική δαπάνη. DB-backed κατά συνείδηση: με
`RATELIMIT_ALLOW_LOCAL=1` και χωρίς Upstash, ένας Redis limiter εκφυλίζεται σε
per-instance μετρητή· η μέτρηση πάνω στις `TokenUsage` γραμμές είναι
instance-independent.

Νέο `AI_SPEND_SPIKE`: κάθε προϋπάρχων κανόνας παρακολουθούσε **αποτυχίες**,
κανένας **κόστος** — ένας βρόχος ολοκληρώνεται κανονικά και απλώς χρεώνει.
Σύγκριση τελευταίας ώρας με τον μέσο ωριαίο 7 ημερών (>3×), δάπεδο €5, καμία
ειδοποίηση χωρίς ιστορικό. Τρέχει μέσα από τον υπάρχοντα evaluator — κανένα νέο
cron.

## WP-14 — rate limiting is default-deny — 2026-07-30

PR #225. 2580/2580 unit tests, 6/6 gates.

**Η επανακαταμέτρηση διόρθωσε το εύρημα.** Το «58 routes χωρίς όριο» ερχόταν
από το inventory· ο έλεγχος στον κώδικα έδειξε **7 routes με υπαρκτό limiter
και stale inventory entry** (`policies/extract`, `bulk-import`, `invites`,
`process-policy`, `tokens/purchase`, `device-token`, `analysis-runs/[runId]`)
— πραγματικά ακάλυπτα: **51**.

`audit:api-auth`: κάθε `rateLimit.required: false` απαιτεί πλέον γραπτή
`justification`. 95/95 ταξινομημένα — 51 με όριο, 44 αιτιολογημένα (cron-gated
jobs, QStash-signed consumer, read-only, idempotent toggles). Νέα όρια σε 9
mutating routes (report-unlock, feedback, questionnaires, 4× collaboration).

**`createPolicy` ήταν εντελώς χωρίς όριο** ενώ ξεκινά billable AI: τα server
actions κάνουν POST σε page route, οπότε ο per-IP limiter του `proxy.ts` δεν
τα κάλυπτε ποτέ. 40/ώρα ανά χρήστη· onboarding upload 20/ώρα. Cron secret σε
constant time (`timingSafeEqual`), με απόρριψη αντί για throw σε ασυμφωνία
μήκους.

**Σύζευξη που φάνηκε μόνο υπό δοκιμή:** το `lib/rate-limit.ts` εισήγαγε το
`lib/env.ts` (eager parse ΟΛΟΥ του schema στο module load) — μόλις μπήκε στα
wallet/onboarding actions, 8 test files ζήτησαν `AUTH_SECRET`. Διαβάζει πλέον
τις δύο προαιρετικές Upstash μεταβλητές απευθείας· ο production έλεγχος μένει
στο `lib/env.ts`.

## WP-13 — first analysis moved onto the durable queue — 2026-07-30

PR #225. 2569/2569 unit tests, 6/6 gates.

Κάθε **πρώτη** ανάλυση έτρεχε inline μέσα σε server-action `after()`. Τα server
actions δεν παίρνουν `maxDuration`, άρα εκτελούνταν στο platform default
(~10-15s) ενώ μία κλήση AI επιτρέπεται έως 180s και ένα run κάνει πολλές — σε
πραγματικό φορτίο ο executor σκοτωνόταν στη μέση και το ασφαλιστήριο έμενε
`analyzing`. Τα 3 re-run paths ήδη έμπαιναν στην ουρά· μόνο η πρώτη ανάλυση,
αυτή που χτυπά κάθε χρήστης, όχι.

Η διόρθωση μπήκε σε **ένα** σημείο (`runBackgroundAnalysis`, εξυπηρετεί και τα
5 call sites). **Η παγίδα:** το post-analysis (dedup/merge, μετάβαση σε
`active`, ειδοποιήσεις) ζούσε μέσα στην inline ροή — σκέτη μεταφορά στην ουρά
θα το είχε σιωπηλά ρίξει για κάθε πρώτη ανάλυση. Εξήχθη σε `finalizeAnalysis` /
`finalizeQueuedAnalysis` και ο consumer το καλεί με `finalize: true`· τα re-run
paths στέλνουν `false` και κρατούν ακριβώς τη σημερινή συμπεριφορά.

`reap-stale-analyses`: daily → `*/15`. Το σχόλιο «Hobby allows only daily
crons» ήταν άκυρο (11 crons — το Hobby δεν επιτρέπει τόσα). Per-user
concurrency μεταφέρθηκε στο WP-15: το QStash δέχεται ένα `flowControl.key` ανά
μήνυμα, οπότε per-user key θα ακύρωνε το fleet-wide cap.

## WP-01 + WP-02 — mock-provider safety & honest upload lifecycle — 2026-07-30

Branch `claude/policywallet-ethniki-0r0bai`, PR #225. 2563/2563 unit tests,
6/6 gates πράσινα.

**WP-01 — το mock δεν είναι πια σιωπηλό fallback.** Χωρίς provider key ο
factory **ρίχνει** αντί να γυρίσει mock (6 πραγματικά `getAIService()` call
sites το έφταναν)· χρειάζεται ρητό `AI_ALLOW_MOCK=1` / `AI_SERVICE_TYPE=mock` /
`NODE_ENV=test`. Το `lib/env.ts` αρνείται production χωρίς key ούτε opt-in.
**Δεύτερο ελάττωμα βρέθηκε επιτόπου:** το `PolicyAnalysisRun.provider` ήταν
hardcoded `"gemini"` σε 4 σημεία — ένα run που έτρεξε σε mock κατέγραφε τον
εαυτό του ως Gemini, δηλαδή το μόνο πεδίο που θα πρόδιδε τα πλαστά δεδομένα
ισχυριζόταν το αντίθετο. Τώρα γράφεται ο πραγματικός provider (κάτι που κάνει
και το `AI_SERVICE_TYPE` να ισχύει end-to-end)· επίσης το `"anthropic"`
έλειπε από τους αποδεκτούς providers στο `executeRun`, οπότε Anthropic runs
εκτελούνταν σιωπηλά σε Gemini. Νέο `DemoDataBanner` (`role="alert"`, δίγλωσσο)
πάνω από το `AnalysisCard`. 13 tests, mutation-tested.

**WP-02 — η οθόνη αναμονής σταμάτησε να λέει ψέματα.** Η πρόοδος βγαίνει από
τις πραγματικές γραμμές βημάτων του run (`analysisProgress`: stepKey,
completed/total, runStatus, failureCode) αντί από στοπερ που αφηγούνταν βήματα
που δεν συνέβαιναν — με `role="progressbar"`/`aria-valuenow`/`aria-live` (δεν
υπήρχε καμία προσβάσιμη ένδειξη). Η επιλογή αρχείου τρέχει τώρα την ίδια κοινή
πολιτική με τον server (`validateUploadFile`) στον browser και κατονομάζει
αρχείο + λόγο, αντί για γενικό «Η μεταφόρτωση απέτυχε». Ο watchdog **δεν**
ξαναχτίστηκε — υπάρχει ως `reapStaleRuns`· μένει μόνο η συχνότητα (WP-13). Ο
reconciler ορφανών αρχείων μεταφέρθηκε στο WP-12 (ίδιο storage μονοπάτι).

## Scale-readiness plan (50–100K → εκατομμύρια) — 2026-07-30

Νέο: [planning/SCALE_READINESS_PLAN.md](planning/SCALE_READINESS_PLAN.md) —
WP-12..WP-27 σε 5 φάσεις (A stop-the-bleeding security/timeouts/abuse, B
perf+ops+honest feedback, C CI gates, D μεγαλύτερες ηλικίες/a11y/trust/
εντιμότητα, E load rehearsal + πρόληψη), πάνω σε 3 εξερευνήσεις κώδικα + πλήρη
συμφιλίωση με τα audits (Gen-1 docs = παγωμένα· τα fixed/decided ΔΕΝ
ξαναπροτείνονται). Κορυφαία ανοιχτά που τεκμηριώθηκαν: πρώτες αναλύσεις inline
σε after() εκτός QStash· B2C upload παρακάμπτει magic-bytes/AV (direct-to-
storage, H2 ανοιχτό)· createPolicy χωρίς rate limit· default reading size
12–14px χωρίς large-text mode· κανένα perf/a11y gate στο CI· κανένα load
test/DR/SLO πουθενά· ~13 sold-but-unbuilt agent features· revoke UI
paywalled (Art. 7(3)). Ενιαίο session prompt και για τα δύο plan docs στην
κεφαλίδα του νέου. Docs-only αλλαγή — branch
`claude/policywallet-ethniki-0r0bai`.

## Ethniki «Πάμε Απλά» — readiness matrix + συνεχές dev plan — 2026-07-30

Νέο: [planning/ETHNIKI_READINESS_AND_DEV_PLAN.md](planning/ETHNIKI_READINESS_AND_DEV_PLAN.md)
— ποιοι ισχυρισμοί της φόρμας προς την Εθνική αποδεικνύονται live σήμερα
(πίνακας με τεκμήρια αρχείων) και 11 WPs σε 5 φάσεις για ό,τι λείπει, γραμμένο
ώστε κάθε επόμενο session να αυτοεκκινεί από το doc (session prompt,
checkboxes, καταγεγραμμένες παγίδες περιβάλλοντος). Επανέλεγχος των ευρημάτων
του motor-demo-path (2026-06): το agent-visibility του dashboard έχει
διορθωθεί (grant-based), τα υπόλοιπα ισχύουν. Docs-only αλλαγή — branch
`claude/policywallet-ethniki-0r0bai`.

## Insurer reference data + admin editing — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `c225fe9`, deploy `dpl_CSjERdp7…` (`f76d9eglm`), Ready, apex+www.
The 29-record Greek-insurer research dataset now lives at
`prisma/greek-insurers.json`; **27 records imported to PROD and dev** (the two
`status='merged'` historic entities — AXA, Ευρωπαϊκή Πίστη — skipped by
design). Insurer model enriched (slug join key, bilingual/legal names, market
status, group parent, free-text contact channels, HQ address JSON, roadside
partner, 22-value LoB vocab, per-field confidence map); `/admin/insurers` is
now a full CRUD surface (list + `[insurerId]` edit page with confidence badges;
edits stamp changed fields `admin_edited`, provenance preserved).

- **Prod pre-check paid off:** prod did NOT hold the 5 dev-seed rows but 5
  admin-created ones (`Groupama`, `NN`, canonical «Εθνική Ασφαλιστική»…). The
  generator's claim pass was generalized to claim-by-canonical-name for every
  record, killing the unique(name) collision class; `Groupama`/`NN` added to
  the legacy-merge map. End state verified: prod 27/27 slugged, 0 orphans; dev
  28 rows (27 + inactive legacy AXA).
- Migration `20260730120000_insurer_reference_enrichment` (additive DDL)
  applied to BOTH DBs via Supabase MCP + `_prisma_migrations` rows with the
  file's real sha256. Seed SQL from `scripts/gen-insurer-seed-sql.ts`
  (idempotent; re-runs clobber dataset-owned fields, never is_active/logo).
- Verified live: list (27, status chips), ERGO edit page (stale/verified
  badges), no-op save → `UPDATE_INSURER` audit row + badges preserved,
  add-policy dropdown shows the canonical Greek names.
- **Re-import no longer destroys admin corrections — found from real prod
  data, not theory.** Minutes after deploy an admin filled in AIG's missing
  contact email, logo and postcode; the confidence map stamped exactly those
  `admin_edited`. The upsert as first written would have silently erased the
  email and postcode on the next seed run (the logo was already safe). Now
  every dataset-owned column is `CASE WHEN field_confidence->>'<field>' =
  'admin_edited' THEN <live> ELSE <dataset> END`, and the confidence map is
  merged so the stamps survive and keep protecting their fields. The dataset
  stays canonical for everything nobody has touched. Proven against a live DB
  (dev, then restored), not just asserted on the generated string — a
  string-level test would pass on SQL that does the wrong thing.
- **E2E added: `tests/admin-insurers.spec.ts`** (runs in `admin-chromium`,
  5/5 green). The `[insurerId]` route is invisible to every audit sweep —
  static-route enumeration never sees it and dynamic discovery only harvests
  hrefs from lists it already knows — so it is checked explicitly: console
  hygiene on both surfaces, all five sections + 22 LoB checkboxes present,
  **320px with no horizontal overflow** (the densest new layout in the app),
  and a full save round-trip asserting persistence, the `admin_edited` stamp,
  and that untouched dataset provenance survives the same save.
- 47 new unit tests incl. dataset-conformance (every imported row re-savable —
  URL/phone validation deliberately lenient: http:// sites and Greek short-code
  phones are real data). 2545 total green + full gate.
- **Correction to my own first note here.** I wrote "local pooler connectivity
  was dead". It was not: `db.insurer.count()` through the app's own Prisma
  client answers instantly (28 rows). What hangs is only the **migrate
  engine** (`migrate deploy` / `migrate status`, and therefore
  `verify:migrations`) — it takes a session-level advisory lock, which
  transaction-mode pgbouncer cannot hold, so it waits forever instead of
  erroring. `.env.local` points `DIRECT_URL` at the `:6543?pgbouncer=true`
  pooler because the direct host is IPv6-only and this machine has no IPv6
  route. So `verify:migrations` cannot pass locally on this network **by
  construction**, not by outage; the MCP path is the correct one and both DBs
  are confirmed at the same migration state. `prisma validate` green.


## MEDIC suggest metering + admin visibility review — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `c00ce21`, deploy `dpl_9rNz7GMk…` (`btlnbkp8f`), Ready, apex+www
verified. Final E2E: **16/16** (5 agent surfaces + full journey + 5 ladder
tests incl. the modal console check and the 320px strip), zero Chrome console
errors. 2498 unit tests + full gate green.

**Metering — one real defect, fixed.** The suggest button was a real, billable
LLM call (up to 80K chars of notes, re-runnable forever) with **none** of the
four controls the B2C Q&A path enforces and no audit trail. "Reuses the metered
askQuestion path" was true and misleading: that helper RECORDS usage, it does
not GATE it. Now: 20/hour rate limit, a DB-backed hourly backstop that does not
depend on Redis, a token-budget check before spending (estimated from the real
payload), and a `MEDIC_SUGGESTION_REQUESTED` audit row with `targetUserId` —
userId only, no email (GDPR audit M3). Both refusals surface as advisor-readable
toasts. 8 unit tests pin the gates at source level incl. ordering; mutation-
tested by deleting the rate limit.

**Admin visibility — clean, no fix needed.** Every qualification surface scopes
by ownership (`ownerAgentUserId` / `relationship.agentUserId`) derived from the
session, never from a parameter and never by role; the admin console has no
opportunity surface at all; `isAgentRole` admits admins to the agent actions but
the ownership check still blocks any admin who is not the owning agent. The new
Art. 15 export section is scoped to the requesting policyholder.

**Chrome consoles.** New `tests/agent-console-clean.spec.ts` — console, page
errors and HTTP ≥400 across the five agent surfaces; the modal + edit-strip
check lives in the ladder block where a fixture exists (placed in the console
spec it would have silently skipped). Local-only noise is filtered by explicit
rule, each verified rather than assumed: the placeholder Sentry DSN (prod ships
a real encrypted one and serves no placeholder), `_vercel/*` scripts (absent
locally), and Next's `?_rsc=` prefetch aborts. Four probe defects were found and
fixed before any product conclusion was drawn — a filter that missed
`speed-insights`, `networkidle` hanging, a 404 reported without its URL, and an
assertion that matched the word "askQuestion" inside a comment.

## ⚠️ OWNER ACTION: production rate limiting is per-instance only

**Found 2026-07-30 while auditing MEDIC cost behaviour. Not fixable in code —
needs credentials.** Production has **no** `UPSTASH_REDIS_REST_URL` /
`UPSTASH_REDIS_REST_TOKEN` (0 of 59 env vars) and runs with
`RATELIMIT_ALLOW_LOCAL=1`, the escape hatch
[DEMO_DEPLOY_RUNBOOK](operations/DEMO_DEPLOY_RUNBOOK.md) documents for "a
single-instance demo". Vercel is not single-instance, so `lib/env.ts`'s own
warning applies verbatim: *"each serverless instance keeps its own in-memory
counter, so the effective limit multiplies by the instance count (near
fail-open at scale)"*.

This weakens **every** limit in the app, not just MEDIC's: auth endpoints,
contact/lead forms, agent invites, billable AI scans. Broken/insecure bucket —
not a preference item.

**To fix:** provision an Upstash Redis instance, set both env vars in
Production (and Preview), then remove `RATELIMIT_ALLOW_LOCAL`. `lib/env.ts`
already refuses to boot production without them once the override is gone, so
the guard verifies itself. I did not create credentials or change production
env on your behalf.

Mitigated meanwhile for the AI spend path: the MEDIC suggest cap is now
DB-backed (counts its own audit rows) and therefore instance-independent.

## MEDIC subject-access gap (GDPR Art. 15) — 2026-07-30 — MERGED + DEPLOYED

`NEW-UI` @ `94270ec`, deploy `dpl_6EYcNhMq…` (`oqqu31pau`), Ready, apex+www
verified. **The sweep's "clean round" did NOT come up clean** — this round
found a sixth real defect, so the goal's completion bar is not yet met.

- **MEDIC data was invisible to a subject-access request.** The Art. 15 export
  builds 14 sections keyed by `userId`; `Opportunity` links to the policyholder
  only via `relationship.policyholderUserId`, so it was never queried. The
  profile the feature builds ABOUT a customer (need + severity, € at risk,
  decision criteria, qualification score) has been outside every DSR surface
  since 2026-07-26. Retention under the agent's IDD basis (erasure decision,
  audit H1) covers the ERASURE right and does not exempt the same data from
  ACCESS — different rights.
- Fix: `lib/medic/subject-view.ts` (subject-safe projection) + new
  `advisorOpportunities` export section + DSR runbook amendment 12. Third-party
  names in the stakeholder map (spouse, accountant — not the requester) are
  withheld under Art. 15(4) with the structure still disclosed and the
  withholding flagged in the payload. 6 unit tests; the no-name-leak property
  is mutation-tested. 2490 unit tests + full gate green.
- **Open for counsel:** the Art. 15(4) withholding is a judgement call, and
  whether free-text `Opportunity.notes` should also be disclosed was left
  undecided rather than guessed.

## MEDIC concurrency (CAS) + 320px edit strip — 2026-07-29 — MERGED + DEPLOYED

`NEW-UI` @ `39cf907`, deploy `dpl_2RMcYZ34…` (`nuh9ww1nf`), Ready, apex+www
verified. Sweep's last two angles closed:

- **Concurrent medic writers silently overwrote each other.** All four
  writers (€/EB patch, apply-suggestions, confirmGap sync, proposal-validate
  sync) did read→merge→write-whole-JSON unguarded: a patch could regress the
  pain-ladder mirror; a sync could drop a just-saved € figure. Fix:
  `lib/medic/cas.ts` — optimistic compare-and-swap on the existing
  `medicUpdatedAt` stamp (conditional updateMany; lost race → re-read,
  re-merge, 3 attempts; IO injected so the loop is pure). No schema change.
  5 unit tests incl. a race simulation proving both writes survive.
- **§F edit strip verified at 320px** (never rendered at phone widths before):
  no overflow, controls in-viewport, 24px tap floor — pinned as ladder E2E
  test 5 (5/5). 2484 unit tests + full gate green.

MEDIC issue-sweep tally so far: mirror desync, scorecard-empty, unreachable
`qualified`, row/reopen staleness, concurrent lost-updates — all fixed,
each with a regression guard. Next round must come up clean to close the goal.

## MEDIC row-staleness fix + audit's touch-target rule — 2026-07-29 — MERGED + DEPLOYED

`NEW-UI` @ `6dc2136`, deploy `dpl_EHqyAUaK…` (`7v2cgne0v`), Ready, apex+www
verified (www 200 / apex 308). Two commits:

- **fix(medic) `675ed8f`:** after saving € value-at-risk, an economic buyer, or
  applied AI suggestions, the opportunities row kept the OLD qualification
  score — and the modal re-seeds from the row on open, so close→reopen showed
  pre-save data (advisor's edits looked lost; affected apply-suggestions since
  it shipped). Modal now reports persisted medic changes via `onMedicChange`;
  row + selection update in place. Ladder E2E extended with a close→reopen
  guard (9/9). 2479 unit tests + full gate green. Swept and CLEARED:
  apply-suggestions cannot downgrade an advisor-identified stakeholder
  (append-only merge, name+stance dedupe).
- **fix(a11y) `6dc2136`:** committed the UI-audit session's uncommitted
  `globals.css` WCAG 2.5.8 touch-target floor (owner-approved) — the rule its
  recorded 498→~28 end state was measured with; git and prod are in sync again.

## Product UI/UX + responsive + a11y audit — 2026-07-29 — DEPLOYED

Reported from production: the `/wallet/[id]` header looked wrong in light mode.
It did, and the reason matters more than the fix.

**Why no audit caught it.** Every sweep enumerated static routes from
`app/**/page.tsx` and explicitly skipped the 17 dynamic ones as "covered by the
journey specs" — which do not check theming. `/wallet/[id]` had never been
rendered by any audit, so a 100%-green suite said nothing about it.

**The defect.** `PolicyHero` is dark in BOTH themes (`bg-[#111111]`,
`text-white`, `border-white/15`; not one `dark:` variant in the file). Its status
chip came from `getStatusColor()`, which returns light/dark PAIRS — correct for
a themed surface like `KeyDatesCard`'s `pw-card`, wrong here: in light mode the
light half won and rendered a `bg-green-50` / `text-green-700` chip, styling
meant for a white page, onto a black slab. Added `getStatusColorOnDark()`
following the on-dark idiom the hero already used for its renewal and gap
badges. Pinned with 5 unit tests.

**Coverage fix.** Both audits now DISCOVER dynamic routes at run time by
harvesting real detail hrefs from list pages. Live for `/branches/*`,
`/guides/*`, `/lexiko/*` (18 -> 24 routes, 90 -> 115 surfaces). `/wallet`,
`/customers` and `/tasks` yield nothing locally because the dev DB is
unreachable so no fixture policy exists — those now LOG "that route family is
NOT covered" instead of passing silently.

### New: responsive + a11y + runtime audit — 30 routes x 9 widths

320/360/390/414/768/1024/1280/1440/1920, loading each route once and resizing.
The old sweep's narrowest width was 390px, so 320 and 360 had never rendered.

| | before | after |
|---|---|---|
| horizontal overflow | 191 | **0** |
| accessibility | 18 | **0** |
| runtime/console | 121 | **1** (dev-only warning on a 404) |
| touch targets | 498 | 93 |

Two structural root causes, not per-page bugs:

1. **Greek compounds.** «ασφαλιστήριο» / «πολυασφαλιστήριο» are single words
   whose MIN-CONTENT width exceeds 320px, so a flex/grid child cannot shrink
   below them. Bisecting `/`, `/product` and `/product/business` all landed on
   nodes whose own boxes measured fine.
2. **Automatic minimum size.** Grid and flex children default to
   `min-width: auto`. On `/product` a decorative mock — a 36px icon tile and a
   label — set the width of the whole column while every box measured
   "correctly".

Both fixed in `globals.css` under `@media (max-width: 430px)`:
`overflow-wrap: anywhere` on text blocks, `min-width: 0` on grid/flex children.
Nothing at >=431px changes. **Verified on the live site**: 0 overflow at 320px.

Also fixed: `not-found.tsx` had no `<main>` landmark (every 404 in the app);
`/perks` repeated `| PolicyWallet` over the root layout's own title template;
the fake browser bar's unbreakable mono URL (`min-w-0 flex-1 truncate`);
`LegalDocumentPage`'s light-only hover.

### Full-application coverage — 108 routes

Both sweeps were expanded from a "representative" subset to **all 108 static
routes** (responsive: 30 -> 108; state cascade: 24 -> 108). Narrowing to a subset
is exactly what let the `/wallet/[id]` header defect ship green.

**108/108 routes fully scanned x 9 widths (320-1920): horizontal overflow = 0.**

The first 108-route attempt died on `page.evaluate: Execution context was
destroyed` — an admin route bouncing a policyholder killed the whole sweep. Each
scan is now guarded, and a route that does not complete all 9 widths counts as
incomplete rather than scanned, so coverage cannot silently shrink.

The 78 newly-covered routes carried real semantic defects no earlier sweep could
have seen: `/onboarding` and `/onboarding/agent` had no `<main>` landmark (the
first screen a new user meets, with no skip-link destination), and
`/auth/signup/confirmation` likewise. Both fixed.

### Accessibility — 18 findings down to 1

Fixed on routes no earlier audit had rendered:

- `/agent/settings` had `<label>` elements with no `htmlFor` and inputs not
  nested inside them — visually labelled, programmatically anonymous. Commission
  inputs were named only by an adjacent `<span>`, so the announcement never said
  which branch a rate belonged to.
- `/onboarding/agent` rendered TWO `<h1>`: the brand mark was one, and each step
  renders its own. Logo demoted to `<p>`.
- `/consent/ai` and `/wallet/add` had no `<h1>` at all — given sr-only headings,
  visible design unchanged.
- `<main>` landmarks added to `/onboarding`, `/onboarding/agent`,
  `/auth/signup/confirmation` and `not-found.tsx` (every 404 in the app).

**Final across 108 routes x 9 widths: overflow 0, a11y 1, touch 53.**

The 33 "incomplete" routes are admin pages correctly redirecting a policyholder
— detected and logged, never silently counted as passing.

### Coverage — three sessions, 95/108 routes

The audit runs under policyholder, agent AND admin sessions:

| session | routes fully scanned |
|---|---|
| policyholder | 73/108 |
| agent | 80/108 |
| **admin** | **95/108** |

The remaining 13 are genuine redirects (auth pages bounce a signed-in admin,
`/coverage` -> `/coverage-insights`, `/en/for-agents` -> `/en/solutions/agents`).

**I had recorded the dev DB as unreachable and the admin fixture as therefore
impossible. That was wrong** — the failure was a missing `DIRECT_URL` in the
shell, not connectivity. `E2E_ADMIN` is now provisioned by the existing
`provisionUser`, which writes the role into BOTH `raw_user_meta_data` and the
Prisma `roles` column (admin is gated on both).

### Results

| | start | now |
|---|---|---|
| horizontal overflow | 191 | **0** (incl. the admin console) |
| runtime/console | 121 | **1** (dev-only) |

### /wallet/[id] is now audited — the route that carried the defect

The wallet list navigates with `router.push()` on a card click, not an `<a href>`.
Discovery harvested hrefs, found none, and logged "/wallet ... NOT covered".
**That is exactly why the PolicyHero light-mode defect shipped while every suite
reported green.** Discovery now falls back to the app's own API with the session
cookie (plus a click-through). `/wallet` no longer appears in the NOT-covered
log.

**Two corrections to earlier entries in this file — both were my errors, not the
environment's:**

1. "Dev DB unreachable" — it was a missing `DIRECT_URL` in the shell. With
   `.env.local` loaded the DB answers fine. This had me record the admin fixture
   as impossible for several rounds.
2. "No fixture policy exists" — two exist. I queried `Policy.userId`; the column
   is `ownerUserId`. The query errored and I read that as "none".

Both times I treated a self-inflicted failure as a hard environmental limit.
Worth remembering: when a probe fails, check the probe before believing its
verdict.

### Design-system audit — every className in app/ and components/

Mostly consistent. Shadows use 6 standard values; icon sizes sit on the standard
scale; there are exactly **2** arbitrary spacing values in the whole codebase.

Two real problems, both fixed:

1. `text-[#92400E]` (amber-800) appeared **21 times with no dark partner**,
   several on `dark:bg-amber-900/30` — dark text on a dark surface, the same
   defect class as the reported PolicyHero header.
2. **Duplicate and conflicting `dark:` classes** left by an earlier codemod pass
   in this same session: 3 exact duplicates plus 6 files carrying two different
   values for one property (`dark:bg-amber-900/30 dark:bg-amber-500/15`), where
   the later silently won.

**Deliberately not changed:** 94 hex values without a dark partner are brand and
semantic FILLS that are correct in both themes — `bg-[#29685B]` with white text,
the fake browser chrome's traffic-light dots, status colours. The pixel contrast
audit across 108 routes x 2 themes reports 0 findings, and that is the ground
truth that matters. Converting them to tokens would be churn, not a fix.

### Theme switching — verified across 24+ routes

Three full light/dark toggle rounds per route (a surface that repaints only on
the FIRST switch shows as an unchanged fingerprint on a later pass), then a
refresh, then cross-page navigation and a return. **Passes: zero stale styles,
zero identical-fingerprint surfaces, theme persists cleanly across reloads.**

### Remaining low-priority debt

- **91 touch findings** at the 13-24px WCAG 2.5.8 boundary (44 admin, 39
  policyholder, 8 agent). The checkbox/radio cluster is fixed globally; the rest
  are 20px text links and inputs with explicit `w-3` utilities that correctly
  beat a base-layer rule — per-component work.
- **67 off-scale border radii** (10, 14, 20, 28, 32, 40, 48px). The 44 exact
  matches were collapsed onto the scale with no visual change; these seven are
  genuinely off-scale, so renaming them alters the design. **Needs a human
  decision on what the scale should contain** — a codemod would be guessing.
- `/team` reports no `<h1>` under the agent and admin sessions although
  `TeamClient` renders one unconditionally at line 165 — so those roles see a
  different view. Same for `/dashboard`, `/agent`, `/wallet/add` under admin.
  Not run to ground.
- `/tasks/[id]`, `/customers/[id]`: same `router.push()` navigation as the
  wallet; the API discovery fallback is wallet-specific and could be generalised.
- **No automation exists for UX journey review or performance** (re-renders,
  layout shift, duplicate CSS). Those two brief dimensions were not done and are
  not claimed.

### Checker corrections (each reported correct code as broken)

Left-edge overflow does not scroll in LTR, so a closed off-canvas drawer at
-272..0 is the pattern working; wide content inside its own `overflow-x` scroller
is deliberate; an `aria-hidden` off-screen honeypot needs no label; `sr-only`
skip links are not touch targets. The placeholder Sentry DSN and CSP-blocked
`va.vercel-scripts` are dev-only — **verified prod injects same-origin
`/_vercel/insights/script.js` (200), so the CSP was NOT loosened.**

## Theme & UI consistency audit — 2026-07-28 — MERGED + DEPLOYED

**Live in production.** `origin/NEW-UI` fast-forwarded `17a1b3f..e780e89` (18
commits, 72 files) and deployed via `vercel --prod`:
`dpl_Ab5iDG7KC9pEH2v9DqiMuAxD7DQr` (`kgk3zfa2p`), Ready, all 5 aliases moved
including apex + `www.policywallet.gr`. No DB work — zero `prisma/` changes in
the batch.

Post-deploy verification: 12 public routes 200, 4 protected 307, apex 308. All
three headline fixes confirmed in the shipped assets, not just the build:
`overflow-wrap:anywhere` on `/product/business`; `bg-amber-50
dark:bg-amber-900/20` and `text-amber-700 dark:text-amber-300` on `/product`;
and in the CSS bundle
`.dark .pw-app-canvas{background-image:radial-gradient(...),linear-gradient(to bottom right,#000,#111)}`.

Note: `verify:migrations` fails locally with `Environment variable not found:
DIRECT_URL` — the shell had not loaded `.env.local`. With it loaded,
`prisma validate` reports the schema valid. Environmental, not a defect.



**Full matrix green.** Theme audit (every route x desktop/tablet/mobile x
light/dark) plus theme-switch/stale-styles: **8/8 passed, 0 contrast findings**.
Layout audit (overflow, viewport escapes, clipped text): **4/4 passed, 0
findings**.

### Two "false positives" were real

The scanner fix that exposed them — sampling the background beside the glyph run
instead of across the whole element box — kept both alive, which forced a second
look at findings I had dismissed:

1. `ProductSections` warn branch: `border-amber-100 bg-amber-50` with no dark
   variant, beside an ok branch that correctly carried `dark:bg-slate-900`.
   Child text `text-[#0F172A] dark:text-white`. **White on amber-50, 1.04:1.**
2. `.pw-app-canvas` — the canvas under every authenticated page — painted
   `linear-gradient(..., #f8fafc, #ffffff)` with no `.dark` override, while its
   sibling `.pw-page-shell` had had one all along.

### Why every earlier sweep missed them — the durable lesson

- The static theme-pair audit reads a whole `className` body as ONE string. In
  `${warn ? "bg-amber-50" : "... dark:bg-slate-900"}` it sees both tokens and
  calls it covered. Those are two mutually exclusive elements: a dark variant on
  one branch masks its absence on the other. Making the audit **branch-aware**
  immediately surfaced 56 more. The same blind spot was in the *fixer*, whose
  "already paired?" lookahead read across the ternary boundary.
- A gradient paints via `background-image`, so a computed `backgroundColor`
  check reports `transparent` and never sees it. Only a composited pixel does.
  Anything translucent above it (a `/10` or `/15` wash) blended toward white and
  lost contrast in dark mode.

### Fixed

- 140 light-only surfaces paired with dark partners across 53 files
- `.dark .pw-app-canvas`; swept globals.css for other light gradients: none
- Tablet header overflow: PublicHeader showed nav + actions from `md:` but they
  need ~1024px; at 834px the CTA ran 84px off-screen on `/` and `/company`.
  Moved to `lg:`, keeping the hamburger that already existed.

### Scanner defects corrected

Background now sampled beside the glyph run. `sr-only` skip links no longer read
as truncated text — that guard's regex sat inside a template literal and reached
the browser with its escape stripped, so it split on the letter "s" and could
never match. Hover compared at 400ms rather than 120ms against 150ms
transitions, with the pointer parked between controls, `aria-current` items
exempt, and a pointer-reachability gate.

### Verified green

| Suite | Result |
|---|---|
| Theme audit (contrast, 3 viewports x 2 themes) | **8/8, 0 findings** |
| Layout (overflow, escapes, clipped text) | **4/4, 0 findings** |
| Interaction states (hover + focus) | **3/3, 0 findings, 0 unmeasured** |
| **State cascade** — every declared state, every element, 18 pages x 2 themes | **0 findings** |
| **Surfaces** — cards/dialogs/menus in dark mode | **0 light surfaces** (89/90/90 measured) |

Plus audit:api-auth, lint, i18n, utf8, type-check, 2469 unit tests, build.

**`tests/theme-state-cascade.spec.ts` is the one to keep.** Driving real mouse
events into controls cost ~1.5s each, so the button sweep never finished and two
runs were killed; it also only reached the handful of controls the sampler
picked. Reading the CSSOM instead — every rule carrying :hover, :focus-visible,
:focus, :active, :disabled, :checked, aria-pressed/selected/current or
[data-state] that sets a colour, resolved against live elements and scored on the
COMPOSITED surface — covers every element in every declared state and finishes in
15 minutes. It replaced theme-controls-audit.spec.ts, which measured 16 surfaces
and never completed a button run; this measures 90 and finishes.

### Full 108-route matrix — COMPLETE, zero findings

| Shard | Coverage | Result |
|---|---|---|
| desktop light + dark | 107/108 routes each | **0 findings** (33.5m) |
| tablet light + dark | 107/108 routes each | **0 findings** |
| mobile light + dark | 107/108 routes each | **0 findings** (1.1h) |

The single skipped route redirects after `goto` resolves, which destroyed the
execution context under the scanner's style injection and had been taking the
whole sweep down. Per-route try/catch + a 75% coverage floor fixed that — the
sweep was never timing out, and raising the budget could never have helped.

### Layout — COMPLETE, zero findings

108 routes x desktop/tablet/mobile: **4/4 passed, 0 findings** (43m). Covers
horizontal overflow, elements escaping the viewport, and text clipped without
an ellipsis.

The last open defect is FIXED. `/product/business` scrolled sideways at 390px
(scrollWidth 428). No element's rect exceeded the viewport, so the usual "find
the wide child" probe returned nothing. Bisecting — hide each subtree, watch
scrollWidth — found the hero `<h1>`: its box measures 342px and fits, but its
MIN-CONTENT width overflows, because «πολυασφαλιστήριο» is a single unbreakable
17-character word wider than the viewport at `text-h1`.

`overflow-wrap:anywhere` is the one value that shrinks intrinsic min-content
width (`break-word` does not). Applied to all 16 hero headings sharing the
pattern, since every LoB page carries Greek compounds of the same shape.
NOT fixed with `overflow-x:hidden`, which hides the symptom and silences the
audit.

### The lesson that cost the most

Four of the last five "defects" were the AUDIT failing, not the UI, and every one
had the same shape: **a failure to measure was reported as a failed component.**

- sr-only "truncation" on 12 routes — the guard's `/\s+/` sat inside a template
  literal, reached the browser as `/s+/`, and split on the letter "s"
- all 11 /account controls "no hover" — the snapshot returned `undefined`, and
  `undefined === undefined`
- 0 of 74 buttons measured — `evaluate()` given a STRING silently yields nothing;
  every real function reference worked

/account took eight rounds. What cracked it was not another hypothesis: the
finding count stayed byte-identical at 188 across five different edits, one of
which added an early `continue`. **A number that does not move when the code
moves is not measuring the code.** Both new suites now assert a minimum measured
count so this fails loudly instead of passing green.

**Not deployed** — 8 commits on `NEW-UI` awaiting go-ahead.

