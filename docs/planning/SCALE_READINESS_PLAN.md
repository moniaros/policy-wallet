# PolicyWallet — Scale & Production Readiness Plan (WP-12+)

**Ημερομηνία:** 2026-07-30 · **Branch:** `claude/policywallet-ethniki-0r0bai`

**Σκοπός:** το PolicyWallet, ως αυτόνομο προϊόν (ανεξαρτήτως υιοθέτησης από
οποιαδήποτε ασφαλιστική), να καλύψει τις 9 απαιτήσεις του ιδιοκτήτη:
**R1** έτοιμο για εκατομμύρια χρήστες · **R2** χωρίς προβλήματα ασφάλειας ·
**R3** mobile-first & responsive · **R4** φιλικό σε ασφαλισμένους μεγαλύτερης
ηλικίας · **R5** σωστά δεδομένα, χωρίς λάθη ή ψέματα · **R6** πολύ γρήγορο ·
**R7** ξεκάθαρο loading (login, register, AI analysis, μεταβάσεις) ·
**R8** εμπιστοσύνη · **R9** επεκτασιμότητα με vendors + ενέργειες πρόληψης →
καθημερινή χρήση.

**Δεσμευτικές αποφάσεις ιδιοκτήτη:** παραμένουμε σε Vercel + Supabase
(βελτιστοποίηση εντός serverless)· managed SaaS για μη-διαφοροποιητικές
δυνατότητες (OCR, monitoring, email, logging, observability, AV) — OSS μόνο
ώριμο/χαμηλής συντήρησης, ποτέ δική μας μη-διαφοροποιητική υποδομή· πρώτο
ορόσημο εκτέλεσης **50–100K χρήστες** (η αρχιτεκτονική σχεδιάζεται για
εκατομμύρια· τα αμιγώς «εκατομμυρίων» θέματα στο tier της §3).

Συνεχίζει τον μηχανισμό του
[ETHNIKI_READINESS_AND_DEV_PLAN.md](ETHNIKI_READINESS_AND_DEV_PLAN.md)
(WP-01..11): ίδιο WP template, ίδια gates, κοινή αρίθμηση από WP-12.

> **Πώς χρησιμοποιείται — ενιαίο session prompt (αντικαθιστά το πεδίο
> «επόμενο WP» και των δύο εγγράφων):**
>
> ```text
> Διάβασε docs/STATUS.md, docs/planning/ETHNIKI_READINESS_AND_DEV_PLAN.md και
> docs/planning/SCALE_READINESS_PLAN.md.
> Πάρε το επόμενο ανοιχτό (☐) WP με σειρά: ETHNIKI Phase 0 → SCALE Phase A →
> ETHNIKI Phase 1-2 ή SCALE Phase B (παράλληλα, διάλεξε το μικρότερο ανοιχτό) →
> SCALE Phase C → ETHNIKI Phase 3-4 ή SCALE Phase D → SCALE Phase E.
> Πριν γράψεις κώδικα, επανεπιβεβαίωσε στον κώδικα ότι το κενό υπάρχει ακόμη —
> αν έχει καλυφθεί, τσέκαρε το WP με σημείωση και προχώρα.
> Υλοποίησε πλήρως: κώδικας + unit tests + E2E για UI + i18n keys και στα δύο
> el.ts/en.ts + συγχρονισμός scripts/api-route-policy-inventory.json.
> Gates: audit:api-auth, lint, lint:i18n-changed, lint:utf8, type-check,
> npx vitest --run tests/unit. Schema: prisma migrate dev + verify:migrations
> ΜΟΝΟ μέσω Supabase MCP.
> Τέλος: τσέκαρε το checkbox στο σωστό doc, ενημέρωσε docs/STATUS.md, commit
> στο claude/policywallet-ethniki-0r0bai. Όχι PR χωρίς ρητή εντολή.
> ```

---

## 0. Πηγές αλήθειας & τι ΔΕΝ ξαναπροτείνεται

**Τα docs του repo είναι τρεις γενιές.** Gen-1 (Φεβ–Μαρ 2026:
`PLAN_b4_launch.md`, `UI_UX_ENHANCEMENT_PLAN.md`, `V2_SPEC_ROADMAP_STATUS.md`,
`pending.md`) είναι **παγωμένα και παραπλανητικά** — τα ✅ τους είναι
προδιαγραφές, όχι shipped κατάσταση, και features που μαρκάρουν «done»
διαγράφηκαν αργότερα ως νεκρός κώδικας. ΔΕΝ χρησιμοποιούνται ως live truth.
Live: το πάνω μέρος του `STATUS.md`, το `audits/UI_AUDIT_2026-07-29.md`, τα
δύο plan docs.

**Ήδη διορθωμένα — μην ξαναπροταθούν:** horizontal overflow 0/108 routes × 9
widths· a11y findings 0/0/1 (policyholder/agent/admin)· contrast 0 ευρήματα
(108×2 themes)· touch targets 498→~28· VAT overcharge στο checkout· ψεύτικο
biometric unlock (αφαιρέθηκε)· τα 11 crons ζωντανά στο `vercel.json` (ήταν
307→signin)· πραγματικό Stripe cancel· upload ευρήματα U1–U7· intent-audit
C1+H1–H8+M1–M12 (PRs #203–#210)· MEDIC metering· agent dashboard visibility
(grant-based, ανακλητό).

**Συνειδητά αποφασισμένα — μην ξαναπροταθούν:** μαζικά per-route
`loading.tsx`/`error.tsx` στα protected (τα inherited boundaries είναι
απόφαση — μόνο scoped όπου χρειάζεται)· admin χωρίς mobile bottom nav
(desktop-first για staff)· wallet responsive μέσω CSS, όχι JS breakpoint.

**Meta-κανόνας για κάθε νέο harness** (από το UI_AUDIT §7/§9: «Four of the
last five "defects" were measurement failures»): **vacuity floor** σε κάθε
suite (ελάχιστο πλήθος σαρωμένων στοιχείων, ώστε βλάβη του harness να κοκκινίζει
αντί να περνά) και σάρωση σε **production build** (`npx next start`), όχι dev.

---

## 1. Πίνακας διαστάσεων → φάσεις

| R | Απαίτηση | Καλύπτεται ήδη από (μην επαναληφθεί) | Νέα WPs | Φάση |
|---|---|---|---|---|
| R1 | Εκατομμύρια-ready | WP-02/03, QStash consumer + lease/failover ladder | 13, 14, 15, 16, 18, 24 | A, B, E |
| R2 | Ασφάλεια | api-guard + CI inventory, webhook signatures, WP-01, GDPR platform | 12, 14, 15 | A |
| R3 | Mobile-first | 320px guards, 108-route sweep (local), bottom nav, touch CSS floors | 20, 21, 22 | C, D |
| R4 | Μεγαλύτερες ηλικίες | WP-04, WP-10, GlossaryHint + /lexiko | 21, 22 | D |
| R5 | Σωστά δεδομένα, όχι ψέματα | WP-01, 03, 04, 05/06, 09 | 12, 16, 19, 23, 26, 27 | A, B, D |
| R6 | Ταχύτητα | ISR marketing, server-component βαριές σελίδες | 17, 18, 20 | B, C |
| R7 | Loading feedback | WP-02, AnalysisCard %-bar, toploader | 13, 19 | A, B |
| R8 | Εμπιστοσύνη | WP-01/04/09/10, grants, GDPR evidence | 22, 23, 26 | D |
| R9 | Vendors + πρόληψη | Partner catalog + crons, WP-07/08 | 25 | E |

---

## 2. Φάσεις & work packages

Μέγεθος σε sessions: S ≤1 · M 1–2 · L 2–4. Κάθε WP κλείνει πράσινο σε όλα τα
gates. Ένα WP ανά session κατά κανόνα· αποκλίσεις καταγράφονται κάτω από το WP.

### Phase A — Να σταματήσει η αιμορραγία (η ανάπτυξη να μην προκαλεί ζημιά)

*Μόνο εδώ η ίδια η αύξηση χρηστών προκαλεί βλάβη: cross-tenant reads, πρώτες
αναλύσεις που σκοτώνονται από timeout, απεριόριστη κατάχρηση, αδέσμευτη δαπάνη.*

#### ☐ WP-12 — Storage tenancy + ένα validated upload path (L) — R2, R5
- **Στόχος:** κλείσιμο του ανοιχτού ευρήματος H2 (κάθε authenticated χρήστης
  μπορεί να διαβάσει κάθε policy PDF μέσω permissive `storage.objects` policy)
  και πέρασμα του B2C upload από τον ίδιο έλεγχο (magic bytes + AV + size) που
  έχει ήδη ο server path. ΟΧΙ naive proxy: το Vercel serverless body cap είναι
  4.5MB — γι' αυτό ο client ανεβάζει direct· η λύση είναι signed upload URLs.
- **Αρχεία:** `components/wallet/AddPolicyClient.tsx` (:141-149 direct
  `supabase.storage.upload` + `getPublicUrl`), `lib/storage.ts` (chokepoint),
  `lib/security/file-upload.ts` (έτοιμος OWASP validator), 
  `lib/security/malware-scan.ts` (hook `UPLOAD_SCAN_URL`, fails closed),
  `app/(protected)/wallet/actions.ts` (`createPolicy`), νέο
  `scripts/storage-policies.sql` versioned, drift probe στο
  synthetic-launch-check.
- **Παραδοτέα:** (α) server action εκδίδει `createSignedUploadUrl` σε per-user
  **quarantine prefix** (auth + rate limit + client pre-check από WP-02)·
  (β) finalize step server-side: λήψη από quarantine → `validateUpload`
  magic-bytes/cross-checks + malware scan + size cap → μετακίνηση σε τελικό
  prefix· η ανάλυση δεν ξεκινά ποτέ σε μη-επικυρωμένα bytes· (γ) εκτέλεση του
  H2 `DROP POLICY` + per-user-prefix storage RLS, **σε versioned SQL** (η
  προηγούμενη prod βλάβη ήρθε ακριβώς από out-of-band drift)· (δ) drift probe·
  (ε) anon-key εγγραφές εκτός quarantine αποτυγχάνουν· (στ) κάλυψη και των
  σπασμένων callers του `uploads` bucket (agent onboarding docs, `/api/v1/upload`)
  και per-viewer signed URLs στο documents POST (σήμερα mock URL).
- **Acceptance:** E2E — χρήστης Β ΔΕΝ διαβάζει object του Α με direct storage
  REST call· oversized/spoofed-extension/EICAR απορρίπτονται στο finalize με
  δίγλωσσο μήνυμα· happy path 12MB PDF ανέπαφο· unit στον finalize validator·
  SQL στο repo + drift probe πράσινο.
- **Reconciliation:** επιβεβαίωσε πρώτα αν το H2 `DROP POLICY` έχει ήδη τρέξει
  out-of-band (`docs/audits/upload-pipeline-security-2026-07.md` §5).

#### ☐ WP-13 — Queue-first analysis + κανονική ανάκαμψη (M) — R1, R7, R5
- **Στόχος:** καμία πρώτη ανάλυση inline μέσα σε server-action `after()` με
  platform-default timeout· κολλημένο run ανακάμπτει ≤15 λεπτά χωρίς
  out-of-band ρύθμιση.
- **Αρχεία:** `app/(protected)/wallet/actions.ts` (:189 inline), 
  `app/onboarding/actions.ts` (:381), `app/(protected)/agent/actions.ts`
  (:1013), `lib/services/analysis/analysis-queue.ts` (`enqueueAnalysisRun` —
  ήδη σε χρήση από 3 re-run sites, π.χ. `wallet/actions.ts:1351`),
  `policy-analysis-orchestrator.service.ts` (`createAndExecuteRun` :531),
  `vercel.json`, `scripts/setup-qstash-reaper-schedule.mjs`.
- **Παραδοτέα:** όλα τα first-run sites enqueue-first (inline μόνο ως dev
  fallback χωρίς QStash)· **per-user concurrency** (flowControl key
  `ai-analysis:<userId>`, parallelism 1–2, το global cap μένει)· cron
  `reap-stale-analyses` σε `*/15 * * * *` στο `vercel.json` (σήμερα daily· η
  15λεπτη κάλυψη εξαρτάται από out-of-band QStash schedule που ίσως δεν
  υπάρχει — χειρότερη περίπτωση 24h κολλημένο)· loud Sentry warn όταν λείπει
  `QSTASH_TOKEN` σε production.
- **Acceptance:** unit — enqueue-first ανά site· staging E2E — kill εκτελούμενο
  run → reaper το μαρκάρει failed + retry CTA ≤15 λεπτά· grep-test ότι κανένα
  production path δεν φτάνει `createAndExecuteRun` χωρίς απόπειρα enqueue.

#### ☐ WP-14 — Rate limiting: default-deny (M) — R2, R1
- **Στόχος:** route ή mutating server action χωρίς δηλωμένη κλάση rate limit
  = κόκκινο CI, όχι σιωπηλά απεριόριστο.
- **Αρχεία:** `scripts/audit-api-auth.js` + `api-route-policy-inventory.json`
  (νέο υποχρεωτικό πεδίο `rateLimit`: `ai|mutate|read|webhook|none-με-αιτιολόγηση`),
  τα ~58 αταξινόμητα routes (προτεραιότητα: `app/api/policies/extract`,
  `v1/collaboration/*`), `wallet/actions.ts` `createPolicy` +
  `onboarding/actions.ts` (σήμερα ΚΑΝΕΝΑ όριο — τα agent actions έχουν),
  `lib/api-auth.ts` (cron secret `===` → `crypto.timingSafeEqual`).
- **Παραδοτέα:** schema + CI fail σε ελλιπή κλάση· 95/95 ταξινομημένα·
  user-scoped όρια στα δύο actions με τον υπάρχοντα Upstash limiter·
  timing-safe σύγκριση· **tests ότι τα services εφαρμόζουν το isolation
  helper** (`getAgentPolicyVisibilityWhere`) — το ❌ FAIL του B2B audit
  «helper unit-tested; no test proves services apply it».
- **Acceptance:** fixture route χωρίς κλάση κοκκινίζει το CI· unit στα όρια
  των δύο actions· inventory πλήρες.
- **Owner action (χωρίς αυτό το WP είναι θέατρο):** Upstash creds σε
  Production/Preview + αφαίρεση `RATELIMIT_ALLOW_LOCAL=1` (`lib/env.ts:100`).
- **Reconciliation:** επανακαταμέτρηση του 37/95 (προγενέστερο των τελευταίων
  fixes)· το εύρημα B2 «ένα fixed window για όλα» εμφανίζεται ήδη διορθωμένο
  στον σημερινό κώδικα (memoized per-(limit,window)) — το audit προηγείται.

#### ☐ WP-15 — Όρια ταχύτητας δαπάνης + ειδοποίηση κόστους (S) — R1, R2
- **Στόχος:** χρήστης (ή κλεμμένο session) να μην καίει το μηνιαίο budget σε
  λεπτά· κάποιος ειδοποιείται όταν η δαπάνη εκτοξεύεται.
- **Αρχεία:** `lib/token-tracking.ts` (atomic reservation υπάρχει — προσθήκη
  ωριαίας διάστασης· μηνιαίο aggregate στο :457), incident-dispatcher
  (υπάρχοντες windowed κανόνες), `/admin/tokens`.
- **Παραδοτέα:** ωριαίο cap tokens/αναλύσεων ανά χρήστη κατά plan
  (**`null` δεν σημαίνει πια unlimited** — μόνο ρητό admin-flagged unlimited)·
  dispatcher κανόνας στο `costEur`: ωριαία δαπάνη >3× του κυλιόμενου 7ήμερου
  ωριαίου μέσου ή απόλυτο ταβάνι → alert στα υπάρχοντα κανάλια· εμφάνιση στο
  `/admin/tokens`.
- **Acceptance:** unit — άρνηση velocity ανεξάρτητη από Redis (DB-backed
  backstop, το pattern του MEDIC fix)· ο κανόνας πυροδοτεί σε harness· το
  μπλοκάρισμα επαναχρησιμοποιεί το υπάρχον `TOKEN_LIMIT_BLOCKED` UX.

### Phase B — Γρήγορο, παρατηρήσιμο, έντιμο feedback

*Με την κατάχρηση ελεγχόμενη: ταχύτητα και αποδείξιμη παρατηρησιμότητα πριν
προσκληθεί φορτίο. Το loading-feedback εδώ γιατί το WP-13 μόλις έκανε το queue
state αξιόπιστη πηγή αλήθειας για progress UIs.*

#### ☐ WP-16 — Operational readiness: Sentry, crons, DR (M) — R1, R5
- **Στόχος:** σωστό monitoring config (όχι διπλό), κάθε γραμμένο job τρέχει,
  και υπάρχει γραπτή, δοκιμασμένη απάντηση στο «restore σε πότε; πόσο γρήγορα;
  πώς κάνουμε rollback;».
- **Αρχεία:** `next.config.ts` (:70-82 conditional `withSentryConfig` + :84
  δεύτερο unconditional wrap με hardcoded org — να μείνει ΕΝΑ, conditional),
  `sentry.{client,edge,server}.config.ts` (αφαίρεση hardcoded fallback DSNs),
  `vercel.json` (προσθήκη crons για τα υπάρχοντα-αλλά-απρογραμμάτιστα
  `billing-reconciliation`, `launch-readiness-snapshot`), `lib/db.ts` (το
  σιωπηλό fallback `POOLED_DATABASE_URL`→`DIRECT_URL` γίνεται loud Sentry
  warn σε prod), νέα `docs/operations/RUNBOOK_ROLLBACK.md` + `BACKUP_DR.md`.
- **Παραδοτέα:** μονό Sentry wrap· DSNs μόνο από env· 2 crons προγραμματισμένα
  (**σημ.: το billing-reconciliation θα χτυπά μονίμως μέχρι το WP-27/C6 —
  προγραμματίζονται μαζί ή αποδέξου προσωρινά alarms εν γνώσει**)· loud
  pooling fallback· log-drain vendor (slot §4)· rollback runbook (Vercel
  instant rollback + expand-contract migration policy — 50 migrations, καμία
  με rollback story)· DR doc: Supabase PITR (owner), στόχοι **RPO ≤5min /
  RTO ≤4h**, τριμηνιαίο restore drill σε scratch project (το υπάρχον
  «restore rehearsal» είναι record-level simulation 1674ms, όχι DR), **και
  διαδικασία επαν-εφαρμογής GDPR διαγραφών μετά από restore** («a restore
  would resurrect erased PII» — ανοιχτό του gdpr-deletion audit).
- **Acceptance:** ένα Sentry upload pass στο build log· diff στο vercel.json·
  εξαναγκασμένο pooling fallback παράγει Sentry event σε staging· τα 2 νέα
  runbooks ελεγμένα έναντι των 12 υπαρχόντων (χωρίς επικάλυψη).
- **Owner actions:** verify `POOLED_DATABASE_URL` στο prod· PITR add-on·
  λογαριασμοί log-drain/uptime· validation των AI incident secrets
  (Slack/PagerDuty — τα drills έτρεξαν με fallback τιμές).

#### ☐ WP-27 — Billing truth tail (M) — R5, R8
- **Στόχος:** ό,τι αφορά χρήματα να είναι ακριβές και πλήρες — «σωστά δεδομένα»
  ισχύει και για τιμολόγια.
- **Αρχεία/θέματα (από `agent-checkout-billing-audit-2026-07.md` §2):**
  **C6** τα τοπικά `Invoice` rows δεν δημιουργούνται ποτέ → κενό in-app
  billing history ΚΑΙ ο reconciliation monitor μονίμως σε alarm (προαπαιτούμενο
  για χρήσιμο WP-16 cron)· **C3** αναλυμένο net+VAT στο Stripe invoice
  (απόφαση `tax_behavior:'inclusive'` ή Stripe Tax) — B2B agent σήμερα δεν
  μπορεί να ανακτήσει ΦΠΑ· **C7** hardcoded 24% για όλους — απόφαση VAT-ID
  capture/reverse-charge· **C4 υπόλοιπο** gross/VAT στο Billing panel + B2C
  UpgradeModal.
- **Acceptance:** νέα συνδρομή δημιουργεί Invoice row· reconciliation πράσινο
  σε φυσιολογική μέρα· invoice PDF δείχνει καθαρή ανάλυση ΦΠΑ· unit στο
  vatInclusiveBreakdown σε όλα τα σημεία εμφάνισης.
- **Owner action:** live Stripe keys στο admin (σήμερα TEST mode σε prod —
  refund/cancel/credit χτυπούν το test API).

#### ☐ WP-17 — Assets & bundle performance (M) — R6
- **Στόχος:** το LCP της landing να μην είναι unoptimized PNG, οι ελληνικοί
  χαρακτήρες να μην αναβοσβήνουν αόρατοι, οι βαριές βιβλιοθήκες να μην
  φορτώνουν στο first paint.
- **Αρχεία:** `next.config.ts` (προσθήκη `images` config AVIF/WebP,
  `compress`, `optimizePackageImports: ['framer-motion']` — το lucide-react
  είναι ήδη στο default list), τα 13 raw `<img>` (πρώτα το hero PNG στο LCP
  path), τα 10 `next/font` instances (5 διπλότυπα Inter με static weights,
  IBM Plex Sans εκτός tokens σε 4 auth pages, 9/10 χωρίς `display:swap` —
  ενοποίηση σε ΕΝΑ shared font module, greek subset παντού),
  `next/dynamic` για below-fold βαριά client components,
  `@next/bundle-analyzer` devDep.
- **Acceptance:** Lighthouse mobile στη landing ≥85 τοπικά (γίνεται CI budget
  στο WP-20)· κανένα `<img>` στο `app/` (grep test)· first-load-JS πίνακας
  πριν/μετά στο WP note, shared chunk ≤150KB gz.

#### ☐ WP-18 — Query scale: indexes, pagination, όρια (M) — R1, R6, R5
- **Στόχος:** καμία σελίδα δεν διαβάζει ολόκληρο βιβλίο πελατών unbounded· τα
  δύο πιο καυτά query shapes αποκτούν τα composites που λείπουν.
- **Αρχεία:** `prisma/schema.prisma` + 1 additive migration:
  `Policy @@index([ownerUserId, status])`,
  `TokenUsage @@index([userId, createdAt])` (χτυπιέται σε ΚΑΘΕ AI κλήση μέσω
  του μηνιαίου aggregation `lib/token-tracking.ts:457`), **`AccessGrant` index
  στο hot path** (ανοιχτό ❌ του B2B audit)· τα 5 unbounded `findMany` του
  agent dashboard (:61, :77, :94, :393, :514) + wallet list — pagination
  take/cursor ή aggregate-only (πρότυπο: τα admin lists ήδη σελιδοποιούν)·
  **`getCustomers` hardcoded `limit: 100`** («silently truncates books over
  100 customers» — κυριολεκτικό scale defect)· **N+1 στα crons**
  `renewal.service.ts:77` + `weekly-digest.service.ts:43` (~6-10 queries ανά
  policy/χρήστη, σειριακά — «timeout risk as the book grows»)· **acordData
  trimming**: wallet + agent dashboard σερβίρουν πλήρες `acordData` στα RSC
  props ενώ υπάρχει denormalized `coverageEndDate` ακριβώς γι' αυτό
  (DEFERRED τότε ως perf, τώρα scale item).
- **Acceptance:** staging agent με 5K policies → dashboard p95 <1s, bounded
  row counts (query-log assertion)· book 250 πελατών εμφανίζεται πλήρης·
  crons σε batch queries (όχι ανά-εγγραφή)· token-gate p95 <50ms με 10K
  TokenUsage rows· `verify:migrations` μέσω MCP· agent journey E2E πράσινο.

#### ☐ WP-19 — Loading-feedback πληρότητα + έντιμο offline (M) — R7, R4, R5
- **Στόχος:** κάθε route και κάθε async λειτουργία >400ms δείχνει σκόπιμο,
  προσβάσιμο feedback· η εφαρμογή σταματά να υπόσχεται offline που δεν έχει.
- **Αρχεία:** `loading.tsx` για public/auth/onboarding groups (18 υπάρχουν,
  όλα σε `(protected)`· 59 public routes + auth + onboarding: κανένα)·
  streaming `<Suspense>` στα βαριά server pages (wallet, dashboard, agent
  dashboard — σήμερα μηδέν streaming Suspense σε όλη την εφαρμογή)·
  `AddPolicyClient` + `AnalysisCard`: `role="progressbar"` +
  `aria-valuenow/min/max` + `aria-live="polite"` (σήμερα 1 progressbar role
  και 8 aria-live συνολικά)· `ProcessingHUD` ως ενιαίο primitive ή διαγραφή·
  `OfflineProvider` (το toast υπόσχεται ψευδώς «showing saved data» —
  το `lib/services/offline-storage.ts` έχει 0 importers)· νέο minimal
  `/offline` route· **onboarding βήμα 3**: αντί για νεκρό χρόνο, render του
  review skeleton + δείγμα κάρτας όσο τρέχει η ανάλυση (top-5 επένδυση #2 του
  product review)· **ενοποίηση των 2 Skeleton implementations + 22 αρχείων με
  hand-rolled `animate-pulse`** στο design-system component.
- **Acceptance:** E2E throttled — loading UI σε login/register/onboarding/
  public· axe πράσινο στα progress components· aria attributes επιβεβαιωμένα
  σε E2E· offline E2E — airplane mode → `/offline`, χωρίς ψευδές toast·
  i18n keys και στα δύο αρχεία.

### Phase C — Κλείδωμα ποιότητας στο CI

*Μία φάση, ένα WP, επίτηδες ανάμεσα στο «κάν' το γρήγορο/σωστό» και στο
«γυάλισμα»: τα gates μπαίνουν όταν υπάρχει κάτι να περάσουν, και πριν από το
Phase D ώστε όλο το UX γυάλισμα να προσγειώνεται ήδη φρουρούμενο.*

#### ☐ WP-20 — CI gates: Playwright, axe, Lighthouse, bundle (M) — όλα τα R
- **Αρχεία:** `.github/workflows/ci.yml` (νέα jobs μετά το build),
  `playwright.config.ts` (CI project + `@ci-smoke` tag), υπάρχουσα responsive
  sweep suite (subset-tag), axe suite (από warn σε fail), νέο
  `lighthouserc.json`, size-limit ή analyzer-diff script.
- **Παραδοτέα με συγκεκριμένα κατώφλια:**
  - **Playwright smoke (PR-blocking, chromium, ≤10 min):** ~12 διαδρομές —
    landing, login, register, onboarding, wallet list, upload→analysis progress
    (mock provider), policy detail, dashboard, agent dashboard, benefits,
    εναλλαγή el/en, cookie consent. **Responsive subset:** 8 routes ×
    {320, 390, 768, 1280}px, μηδέν οριζόντιο overflow. Το πλήρες 108×9×3
    γίνεται **nightly scheduled workflow** (κόστος/flake).
  - **axe (PR-blocking):** fail σε **critical + serious** στα smoke pages,
    δύο locales (σήμερα τα serious περνούν με console.warn)· allowlist αρχείο
    με ημερομηνία λήξης ανά εγγραφή — το WP-22 το μηδενίζει.
  - **Lighthouse CI (2 εβδομάδες warn burn-in → blocking), mobile, στα
    `/`, `/auth/signin`, `/pricing`:** LCP ≤2.5s, TBT ≤300ms, CLS ≤0.1,
    performance ≥85 στο `/`. Authed σελίδες μέσω Playwright navigation-timing
    (το LHCI auth είναι εύθραυστο).
  - **Bundle budget (PR-blocking):** shared first-load ≤150KB gz· κάθε route
    ≤300KB gz (wallet ≤350)· fail σε >10% regression vs main.
  - **Τοπικά/scheduled:** πλήρες 108-route sweep (nightly), RUN_UX_AUDIT
    keyboard/SR/dark-contrast, theme-contrast pixel suite (**fix του
    ελλείποντος `sharp` devDep ή απόσυρση — απόφαση στο session**), k6
    (εβδομαδιαίο staging).
  - **Vacuity floors σε όλα τα νέα + σάρωση σε production build** (§0)·
    **γενίκευση του API-discovery fallback** ώστε `/tasks/[id]` και
    `/customers/[id]` (router.push-only πλοήγηση) να μην είναι αόρατα στις
    σαρώσεις — η ίδια κατηγορία τυφλού σημείου που άφησε defect να περάσει
    πράσινο.
- **Acceptance:** σκόπιμα σπασμένο fixture ανά gate κοκκινίζει το CI· συνολικό
  PR pipeline ≤20 min· nightly πράσινο 2 συνεχόμενες φορές.

### Phase D — Μεγαλύτερες ηλικίες, προσβασιμότητα, εμπιστοσύνη, εντιμότητα

#### ☐ WP-21 — Re-ladder μεγεθών + λειτουργία μεγάλων γραμμάτων (L) — R4, R3
- **Στόχος:** ο μεγαλύτερος σε ηλικία ασφαλισμένος διαβάζει περιεχόμενο
  αποφάσεων σε ≥16px by default και το μεγαλώνει με ένα προφανές κουμπί. Το
  #1 επαληθευμένο εύρημα: 836 `text-sm` + 754 `text-xs` έναντι 67 χρήσεων
  16px· καμία ρύθμιση κλίμακας.
- **Αρχεία:** ladder tokens στο `app/globals.css` (μηδέν arbitrary px πλέον —
  η βάση είναι έτοιμη), policyholder surfaces πρώτα (wallet, analysis,
  dashboard, benefits, onboarding, auth), `ConfidenceBadge` (10px kicker σε
  περιεχόμενο απόφασης — παραβιάζει τον ίδιο τον κανόνα του ladder),
  `AiDisclaimer` (12px), persisted preference (cookie/profile) + toggle στο
  header/menu (~112.5–125% root scale — το rem-based ladder κλιμακώνει από
  τη ρίζα).
- **Acceptance:** E2E — computed font-size ≥16px στο decision content των
  βασικών οθονών· το toggle επιμένει μεταξύ sessions· WCAG 1.4.4 — 200%
  browser zoom χωρίς απώλεια περιεχομένου στο smoke set· το nightly 108-route
  sweep παραμένει μηδέν-overflow (το re-ladder είναι ακριβώς ό,τι θα το
  έσπαγε — ελληνικές σύνθετες λέξεις στα 320px)· axe gate πράσινο.

#### ☐ WP-22 — A11y burn-down σε serious-zero (M) — R4, R3
- **Αρχεία/θέματα:** allowlist του WP-20 → 0 (incl. γνωστά contrast — τα
  μετρημένα tokens έχουν headroom)· touch targets στη ζώνη 13–24px σε
  policyholder+agent surfaces (**~28 residual κατά το τελικό UI_AUDIT· το
  ενδιάμεσο breakdown έλεγε 39+8 — το session μετρά πρώτα**)· aria-live
  κάλυψη στα async status surfaces· time-boxed SSR fix για το `lang` στα
  `/en/*` (σήμερα `lang="el"` hardcoded μέχρι να τρέξει JS — το πλήρες
  per-locale split μένει deferred)· dark theme στο axe matrix.
- **Acceptance:** axe critical+serious = 0 με κενό allowlist, δύο locales,
  δύο themes· 0 ανοιχτά touch findings σε policyholder+agent· keyboard suite
  (τοπικά RUN_UX_AUDIT) pass τεκμηριωμένο στο WP note.

#### ☐ WP-23 — Trust surfaces (M) — R8, R5
- **Στόχος:** τα assets εμπιστοσύνης που ήδη υπάρχουν να γίνουν ορατά σε
  αυτούς για τους οποίους χτίστηκαν.
- **Αρχεία/Παραδοτέα:** νέα δίγλωσση **`/trust`** σελίδα (server component,
  ISR όπως τα marketing) ΜΟΝΟ με επαληθεύσιμα γεγονότα: grant-based per-policy
  ορατότητα agent (ανακλητή), Art.15 export + erasure, retention job,
  κρυπτογραφημένο storage, signed URLs, όριο μη-συμβουλής AI — κάθε δήλωση
  ανιχνεύσιμη σε shipped feature (ο κανόνας εντιμότητας του repo)· το
  «AES-256» microcopy του TrustStrip αποκτά επιτέλους σελίδα να δείχνει·
  **insurer logos live** (pipeline πλήρες αλλά κάθε consumer κάνει hardcode
  `insurerLogo: null` — 27 registry insurers έχουν logo πεδία· render σε
  wallet/analysis με graceful fallback)· `AiDisclaimer` + `ConfidenceBadge`
  κληρονομούν το WP-21 ladder· **AiDisclaimer και στα agent surfaces** (gap/
  recommendation/protection-score — εύρημα B9, σήμερα μόνο B2C)· σύνδεση στο
  footer/nav.
- **Acceptance:** E2E δύο locales + 320px· περιεχόμενο ελεγμένο έναντι
  `docs/compliance/` evidence· logos για 27/27 + fallback για άγνωστους.
- **Reconciliation:** το `conversion-audit-2026-07.md` ίσως έχει ήδη
  προδιαγραφή trust-page — επαναχρησιμοποίησε.

#### ☐ WP-26 — Εντιμότητα & αμφίδρομη διαφάνεια σχέσης (L) — R5, R8
- **Στόχος:** το «χωρίς ψέματα» του ιδιοκτήτη, κυριολεκτικά: δεν πουλάμε ό,τι
  δεν υπάρχει, δεν υποσχόμαστε ό,τι δεν στέλνουμε, και η σχέση agent↔πελάτη
  είναι αμφίδρομα ορατή και ανακλητή.
- **Αρχεία/θέματα:**
  - **Sold-but-unbuilt sweep** (`pxa-monetization-audit`): το
    `canAgentUseFeature()` έχει **0 call sites** — ~13 πουλημένα boolean
    features χωρίς fence· branded PDF reports & API access πουλιούνται
    άχτιστα· `family_portfolio` & `claims_preparation_assistant` είναι gate
    stubs με μηδενική υλοποίηση· agent token top-ups τιμολογημένα αλλά
    μη-αγοράσιμα. Ανά feature: **fence ή build ή de-list** — απόφαση
    καταγεγραμμένη στο WP note.
  - **Free tier:** το marketing υπόσχεται «βασικές υπενθυμίσεις» που δεν
    στέλνονται — ή δίνεται η υπενθύμιση (email) ή διορθώνεται το κείμενο.
    Ρητή απόφαση, όχι σιωπή.
  - **Notification bell:** το dropdown δεν φορτώνει ποτέ τη λίστα και κρύβει
    το «view all» όταν είναι άδειο — νεκρό τέλος.
  - **Σχέση agent↔πελάτη** (`b2b-b2c-integration-audit` [NOW]): ο agent
    μπορεί σήμερα να δημιουργήσει **μονομερώς `active` σχέση** με υπαρκτό
    χρήστη χωρίς invite/αποδοχή/ειδοποίηση → γίνεται invite/acceptance flow·
    **revoke UI στο «My Agent» — ΧΩΡΙΣ paywall** (η ανά-policy ανάκληση είναι
    σήμερα κλειδωμένη πίσω από πληρωμή· Art. 7(3) GDPR: η ανάκληση συναίνεσης
    πρέπει να είναι εξίσου εύκολη με τη χορήγηση — αυτό είναι σχεδόν-νομικό,
    όχι προϊοντική επιλογή)· ειδοποιήσεις και στις δύο πλευρές για τα **5
    σιωπηλά handoffs** (αίτημα εγγράφου, πρόταση, ολοκλήρωση agent-run
    ανάλυσης, έκβαση ανανέωσης, upload εγγράφου πελάτη)· **read-access audit
    rows** όταν agent βλέπει PII πελάτη (εύρημα B7, GDPR) με το υπάρχον
    userId-only πρότυπο.
- **Acceptance:** grep — κανένα πουλημένο feature flag χωρίς fence ή χωρίς
  καταγεγραμμένη de-list απόφαση· E2E — δημιουργία σχέσης απαιτεί αποδοχή·
  revoke προσβάσιμο χωρίς συνδρομή και τερματίζει την ορατότητα άμεσα·
  ειδοποίηση και στις δύο πλευρές στα 5 handoffs· audit row σε agent read.

### Phase E — Απόδειξη κλίμακας & θεμέλιο καθημερινής χρήσης

#### ☐ WP-24 — Load rehearsal σε προφίλ 50–100K (M) — R1
- **Αρχεία:** `scripts/load/` (k6 baseline υπάρχει με τεκμηριωμένα
  thresholds — επέκταση κατά το δικό του README: seeded users, Supabase
  password-grant tokens, authed διαδρομή wallet→upload→analysis-trigger με
  **mock AI provider**), το `launch-readiness-snapshot` job (προγραμματισμένο
  στο WP-16) καταγράφει το evidence.
- **Παραδοτέα:** μοντέλο κίνησης 50–100K (π.χ. 5% DAU peak-hour ≈ 250–500
  ταυτόχρονα sessions, burst 50 uploads/min)· εκτέλεση σε staging·
  παρακολούθηση Supavisor pool, Upstash limiter, βάθος ουράς, reaper·
  ευρήματα διορθωμένα ή WP-καταγεγραμμένα· evidence στο
  `docs/operations/evidence/`.
- **Acceptance:** p95 <500ms reads, <2s analysis-enqueue, error rate <1%,
  καμία εξάντληση pool, limiter επιβάλλεται across instances (κανένα
  «degraded to in-memory» warning)· snapshot committed. Vacuity floor +
  production build (§0).

#### ☐ WP-25 — Ενέργειες πρόληψης πάνω στο partner catalog (M) — R9, R8
- **Στόχος:** το υπάρχον catalog + cron μηχανήματα γίνονται ο καθημερινός
  βρόχος «πρόληψης» του ιδιοκτήτη με **αποκλειστικά additive** αλλαγές — ΟΧΙ
  νέο υποσύστημα. (Υπάρχουν ήδη: `lib/partner-offers/catalog.ts` με vendor+
  offer μοντέλα, honesty rule, validity windows, 300s cache tag + admin
  revalidation, profile-tag matching από το gap engine· crons `perk-reminders`,
  `engagement-drip`, `churn-prevention`, `renewal-check` τρέχουν καθημερινά·
  σελίδα `/benefits`.)
- **Αρχεία:** `lib/partner-offers/catalog.ts` + `matching.ts`,
  `prisma/schema.prisma` (additive: `kind = offer | prevention_action`,
  εποχικό παράθυρο, LOB tags), `app/(protected)/benefits/page.tsx`, κάρτα στο
  home dashboard, `perk-reminders` job (συμπεριλαμβάνει nudges πρόληψης —
  κανένα νέο cron), agent πλευρά μέσω υπάρχοντος Opportunity/notification
  path («πρότεινε στον πελάτη», consent-gated μέσω
  `getAgentPolicyVisibilityWhere`).
- **Παραδοτέα:** τυποποιημένες ενέργειες πρόληψης στο ίδιο catalog (π.χ.
  χειμερινός έλεγχος σωληνώσεων για LOB κατοικίας, φωτογράφιση οχήματος προ
  ανανέωσης, οδηγίες καύσωνα για υγεία) με matching LOB + εποχή + profile
  tags· μία κάρτα «αυτή την εβδομάδα» στο home· admin CRUD στο υπάρχον
  `/admin/partners`· honesty rule (άδειο catalog = τίποτα δεν render)·
  δίγλωσσο περιεχόμενο.
- **Acceptance:** E2E — ασφαλισμένος βλέπει LOB-matched κάρτα πρόληψης και
  agent προωθεί μία σε granted πελάτη· unit στο matching (LOB/εποχή)· μηδέν
  νέα crons, μηδέν νέοι cache μηχανισμοί (grep-asserted)· CTR event
  (consent-gated GA, υπάρχον pattern).

### Εξαρτήσεις & σειρά

```
Phase A αυστηρά πριν το E.
WP-13 → WP-19 (το queue state τροφοδοτεί το progress UI)
WP-27 → WP-16 (το reconciliation cron χωρίς C6 χτυπά μονίμως)
WP-17/WP-18 → WP-20 (τα budgets χρειάζονται κάτι να περάσουν)
WP-20 → WP-21/WP-22 (ratchet: το γυάλισμα προσγειώνεται φρουρούμενο)
WP-21 → τελικό acceptance του WP-22 (μεγέθη × contrast αλληλεπιδρούν)
WP-25, WP-26 ανεξάρτητα μετά το Phase A.
```

---

## 3. Tier «προς εκατομμύρια» — ρητά ΕΚΤΟΣ της εκτέλεσης 50–100K

| Θέμα | Σκίτσο στρατηγικής (για το μελλοντικό WP) | Trigger προγραμματισμού |
|---|---|---|
| App-table RLS (DB backstop απομόνωσης) | Σταδιακό retrofit: Prisma client extension θέτει session var (`app.current_user_id`) → RLS σε shadow/permissive mode στα top-5 tenant tables (Policy, PolicyDocument, TokenUsage, Opportunity, AccessGrant) → καταγραφή would-be denials σε Sentry → enforcement πίνακα-πίνακα. Ποτέ big-bang σε 64 μοντέλα. | >100K χρήστες, ή πολυ-tenancy πιλότος (WP-11), ή πρώτο Prisma-layer isolation bug |
| Read replicas + cache tier | Supabase read replica για dashboards/reports + Redis read-through στα hot aggregates· write path ανέπαφο | Σταθερό DB CPU >60% ή p95 regressions μετά το WP-18 |
| Multi-region / edge | Vercel regional functions + replica σε 2η περιοχή· η ελληνική βάση χρηστών το κάνει χαμηλής προτεραιότητας | Επέκταση εκτός ΕΕ ή SLA >99.95% |
| Load test προφίλ 1M + queue sharding | flowControl partitions ανά plan tier· διαπραγμάτευση provider quotas· token pools ανά tier | Πριν από event με πρόβλεψη >250K |
| OCR full rollout | Vendor επιλέγεται τώρα (§4)· ενεργοποίηση πίσω από το WP-03 seam όταν μετρηθεί το ποσοστό σκαναρισμένων | Scanned share >10% των uploads |
| Vendor self-serve portal | Μόνο αν το πλήθος partners κάνει το admin CRUD στενωπό | >~30 ενεργοί vendors |

---

## 4. Vendor slots (managed SaaS — απόφαση #2)

Κόστη = τάξη μεγέθους **εκτίμηση** στο 50–100K, εκτός LLM tokens και του
υπάρχοντος Vercel/Supabase/Upstash/Brevo/Stripe baseline. Σημεία ένταξης =
υπάρχοντα seams, καμία νέα αφαίρεση.

| Δυνατότητα | Παραδείγματα (επίλεξε 1) | Σημείο ένταξης | €/μήνα εκτ. |
|---|---|---|---|
| Malware/AV scanning | OPSWAT MetaDefender Cloud· Cloudmersive. **ΟΧΙ VirusTotal** — τα δείγματα κοινοποιούνται στην κοινότητα· τα policy PDFs είναι προσωπικά δεδομένα | `UPLOAD_SCAN_URL` hook στο `lib/security/malware-scan.ts` — ήδη fails closed· το WP-12 το κάνει 100% κάλυψη | 50–200 |
| OCR (μελλοντικό) | Google Document AI (EU region — Gemini ήδη στο stack)· Azure AI Document Intelligence (EU) | Πίσω από το sufficiency heuristic του WP-03 — ο κλάδος «σκαναρισμένο» καλεί vendor αντί για έντιμη άρνηση | 100–500 όταν ενεργοποιηθεί |
| Uptime/synthetics | Better Stack Uptime· Checkly (Playwright-native — φυσικό ταίριασμα) | Probes στο `/api/health` (πραγματικό SELECT 1) + 2-3 public pages + status page | 0–100 |
| Log drain | Axiom (native Vercel drain)· Better Stack Logs | Vercel log drain — ο structured JSON logger ήδη παράγει parseable γραμμές· WP-16 συνδέει + τεκμηριώνει retention | 25–100 |
| Load testing | k6 OSS από CI προς staging (`scripts/load/` υπάρχει)· Grafana Cloud k6 για τα μεγάλα rehearsals | `scripts/load/public-surface.js` + το authed σενάριο του WP-24 | 0–150 |
| Alerting/paging | Sentry (υπάρχον, Team/Business tier) + Better Stack ή PagerDuty free για on-call | Sentry metric alerts + cron monitors + incident-dispatcher webhooks (το WP-15 προσθέτει τον κανόνα κόστους) | 30–150 |
| Email | **Καλυμμένο** — Brevo ήδη ενταγμένο | καμία αλλαγή | υπάρχον |

**Σύνολο νέας vendor δαπάνης: ~€150–700/μήνα στο gate 50–100K (εκτίμηση).**

---

## 5. KPI πίνακας — στόχοι πύλης 50–100K

| Διάσταση | KPI | Στόχος | Πηγή |
|---|---|---|---|
| Ταχύτητα (field) | LCP / INP / CLS p75 mobile | ≤2.5s / ≤200ms / ≤0.1 | Vercel Speed Insights |
| Ταχύτητα (lab) | Lighthouse mobile στο `/` | ≥85 | LHCI (WP-20) |
| Ταχύτητα (bundle) | Shared first-load· χειρότερο route | ≤150KB gz· ≤350KB gz | size gate (WP-20) |
| API | p95 read / write / analysis-enqueue | <500ms / <1s / <2s | k6 staging (WP-24) |
| Διαθεσιμότητα | Uptime· 5xx· crash-free sessions | ≥99.9%· <0.3%· ≥99.5% | synthetics vendor· Sentry |
| Pipeline ανάλυσης | Επιτυχία 1ης ανάλυσης χωρίς user retry· p50 ολοκλήρωση· ανάκαμψη stuck | ≥97%· ≤3min· ≤15min, κανένα >24h | run telemetry + reaper (WP-13) |
| Ορθότητα / AI | Core fields (ασφαλιστής, ασφάλιστρο, ημερομηνίες) high-confidence σε ψηφιακά PDF· ποσοστό διορθώσεων χρήστη· δίγλωσση πληρότητα· mock σε prod | ≥90%· ≤5%· 100% νέα runs· 0 | WP-04 δεδομένα· WP-09· WP-01 |
| Ασφάλεια | Ανοιχτά high/critical· routes με κλάση limit· uploads μέσω validated path· cross-tenant E2E | 0· 95/95· 100%· 0 αποτυχίες | audits· WP-14· WP-12 |
| A11y | axe critical+serious (smoke, el+en, 2 themes)· touch ≥44px policyholder+agent· μέγεθος decision content· 200% zoom | 0· 0· ≥16px· καμία απώλεια | WP-20/21/22 |
| Loading | Routes με loading UI· async >400ms με feedback· AI progress ARIA-complete | 100%· 100%· ναι | WP-19 E2E |
| Εμπιστοσύνη | /trust live el+en· disclaimer ≥14px σε όλα τα AI surfaces· logos rendered· D30 retention & prevention CTR | shipped· 100%· 27/27· baseline στο gate | WP-23/25 + GA |
| Κόστος | Κόστος/ανάλυση· spend-spike alert | ≤ στόχος TOKEN_ECONOMICS· πυροδοτεί σε >3× κυλιόμενο ωριαίο μέσο | TokenUsage.costEur· WP-15 |

---

## 6. ΔΕΝ κάνουμε τώρα (με αιτία μίας γραμμής)

- **App-table RLS σε 64 μοντέλα** — το υψηλότερου ρίσκου regression change στο
  codebase· η Prisma-layer απομόνωση είναι CI-enforced· στρατηγική στη §3.
- **Read replicas / multi-region / edge** — κανένα φορτίο δεν το απαιτεί κάτω
  από 100K.
- **Πλήρες offline PWA (IndexedDB sync)** — 0 importers σήμερα, τεράστια
  επιφάνεια ορθότητας· το WP-19 δίνει έντιμο minimal offline.
- **In-house OCR/AV/queue/logging/monitoring** — απόφαση #2· όλα vendor slots.
- **Per-locale layout split για το `lang`** — deferred από το repo· μόνο το
  time-boxed SSR fix του WP-22.
- **Admin touch targets (44)** — staff σε desktop· batch μετά τα
  policyholder/agent.
- **useActionState migration στα auth forms** — τα χειροποίητα pending states
  δουλεύουν και είναι aria-σωστά· churn χωρίς αξία χρήστη.
- **Αλλαγή i18n βιβλιοθήκης** — 2.416/2.416 parity με CI enforcement· η
  μετανάστευση είναι καθαρό ρίσκο.
- **Πλήρες 108×9×3 σε PR CI** — κόστος/flake· nightly + 8-route PR subset.
- **Native mobile apps** — το PWA (manifest+SW+install prompt shipped) είναι η
  mobile στρατηγική σε αυτή την κλίμακα.
- **White-label/SSO/bulk import** — μένει WP-11, conditional σε απόφαση πιλότου.
- **`roles.includes()` sweep (~30 sites)** — μη-εκμεταλλεύσιμο με το σταθερό
  3-τιμών λεξιλόγιο· «dedicated, individually-tested sweep later» κατά το
  ίδιο το audit.

---

## 7. Owner actions (εκτός κώδικα, gate-blocking)

1. **Upstash Redis** σε Production/Preview + αφαίρεση `RATELIMIT_ALLOW_LOCAL=1`
   — χωρίς αυτό το WP-14 είναι θέατρο (`lib/env.ts:100`).
2. **Verify `POOLED_DATABASE_URL`** στο prod (το fallback είναι σιωπηλό μέχρι
   το WP-16).
3. **Supabase PITR add-on** (το WP-16 DR doc το προϋποθέτει).
4. **Vendor εγγραφές:** AV endpoint (`UPLOAD_SCAN_URL`), log drain, uptime
   monitor, paging προορισμός.
5. **Επιβεβαίωση αν το H2 `DROP POLICY` έχει ήδη εκτελεστεί** out-of-band
   (WP-12 reconciliation).
6. **Vercel plan** που υποστηρίζει `*/15` crons (τα 11 σημερινά υπονοούν Pro).
7. **Live Stripe keys στο admin** — σήμερα TEST mode σε production (WP-27).
8. **Validation των AI incident secrets** (Slack/PagerDuty — τα drills έτρεξαν
   με fallback τιμές).
9. **Τυπικό κλείσιμο ή supersede του Gen-1 go/no-go packet** (7 ανυπόγραφα
   rows, UAT evidence = templates 214–532 bytes) — είτε υπογράφεται είτε
   αντικαθίσταται επίσημα από τις πύλες αυτού του πλάνου.
10. **Δείγματα PDF ανά κλάδο** (κατοικία/υγεία/ζωή) για τα golden tests του
    WP-06.

---

## 8. Reconciliation flags (επιβεβαίωση στην αρχή του κάθε session)

- **WP-12:** status του H2 `DROP POLICY` στο upload-pipeline audit.
- **WP-14:** επανακαταμέτρηση routes χωρίς κλάση (το 37/95 προηγείται των
  τελευταίων remediations)· το B2 «ένα fixed window» εμφανίζεται διορθωμένο
  στον σημερινό κώδικα — το audit είναι παλαιότερο του fix.
- **WP-16:** επικάλυψη με τα 12 υπάρχοντα runbooks πριν γραφτούν τα 2 νέα.
- **WP-22:** πραγματικός αριθμός residual touch findings (~28 κατά το τελικό
  UI_AUDIT· 39+8 κατά το ενδιάμεσο STATUS breakdown).
- **WP-23:** πιθανό έτοιμο περιεχόμενο trust-page στο conversion-audit.

Κατά τον κανόνα και των δύο plan docs: **κάθε WP session επανεπιβεβαιώνει το
κενό στον κώδικα πριν γράψει οτιδήποτε.**
