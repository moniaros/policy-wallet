# Ethniki «Πάμε Απλά» — Πίνακας Ετοιμότητας & Πλάνο Συνεχούς Ανάπτυξης

**Ημερομηνία:** 2026-07-30 · **Branch:** `claude/policywallet-ethniki-0r0bai`

**Σκοπός:** Στη φόρμα «Πάμε Απλά – Simply Forward» της Εθνικής Ασφαλιστικής
δηλώθηκαν συγκεκριμένες δυνατότητες του PolicyWallet. Αυτό το έγγραφο απαντά σε
δύο ερωτήματα: (α) ποιες από αυτές **αποδεικνύονται live σήμερα** και ποιες όχι,
με τεκμήρια σε επίπεδο αρχείου· (β) για ό,τι λείπει, ένα πλάνο ανάπτυξης
οργανωμένο σε αυτοτελή work packages, σχεδιασμένο ώστε **κάθε επόμενο Claude
Code session να αυτοεκκινεί από αυτό το έγγραφο** και να παραδίδει συνεχή,
ολοκληρωμένη πρόοδο.

> **Πώς χρησιμοποιείται:** ξεκίνα κάθε session με το prompt της ενότητας Γ.
> Κάθε WP έχει checkbox — το session που το ολοκληρώνει το τσεκάρει εδώ και
> ενημερώνει το `docs/STATUS.md`. Το έγγραφο είναι ο tracker μεταξύ sessions.

> **2026-07-30 — Επέκταση:** το
> [SCALE_READINESS_PLAN.md](SCALE_READINESS_PLAN.md) συνεχίζει την αρίθμηση
> (WP-12+) για scale/security/a11y/performance/trust, ανεξαρτήτως Εθνικής.
> Το **ενιαίο session prompt** εκεί (κεφαλίδα του doc) υπερισχύει αυτού της
> ενότητας Γ ως προς τη σειρά επιλογής WP μεταξύ των δύο εγγράφων.

---

## Α. Πίνακας ετοιμότητας (ισχυρισμός φόρμας → πραγματικότητα)

| # | Ισχυρισμός στη φόρμα | Κατάσταση | Τεκμήριο / Τι λείπει |
|---|---|---|---|
| 1 | Ενιαία, κατανοητή ανάγνωση συμβολαίου ανεξαρτήτως κλάδου | ⚠️ Σχεδόν | Λειτουργεί end-to-end για **καθαρά ψηφιακά PDF**. Λείπει: text-extraction/OCR layer (raw bytes → multimodal μοντέλο· κανένα `pdf-parse`/`pdfjs`/`tesseract` στο `package.json`), το extraction-cache «κλειδώνει» κακή πρώτη εξαγωγή, το per-field confidence δεν εμφανίζεται στον χρήστη → **WP-03, WP-04** |
| 2 | Νέος κλάδος = παραμετροποίηση, όχι νέα ανάπτυξη (15 LOB) | ✅ / ⚠️ | Αρχιτεκτονικά ✅ (`lib/insurance/content/*`, λεξιλόγιο 22 LoB, `branchFamilyId` στο `lib/insurance/taxonomy.ts`). Το **βάθος κανόνων ανά κλάδο** όμως είναι ρηχό: ελάχιστα seeded motor gap definitions, χωρίς ελληνική ταξινομία καλύψεων αυτοκινήτου, και το `lib/services/gap-engine/protection-score.ts` ενώνει motor+home σε μία κατηγορία «Property & Motor» → **WP-05, WP-06** |
| 3 | Δίγλωσσο περιεχόμενο (όχι μόνο UI) | ✅ / ⚠️ | UI: 2.416/2.416 κλειδιά (`lib/i18n/translations/{el,en}.ts`). Pipeline: `lib/services/translation/greek-to-bilingual.ts` ✅. Λείπει: έλεγχος πληρότητας του αποθηκευμένου `aiExplanationEl` (`prisma/schema.prisma:428`) — εκκρεμεί από RealityReport Phase C → **WP-09** |
| 4 | Ο ασφαλιστής έχει εικόνα χαρτοφυλακίου & δραστηριότητας πελάτη | ⚠️ | **Καλύτερα από το εύρημα του Ιουνίου**: το agent dashboard πλέον περνά από `getAgentPolicyVisibilityWhere` (`lib/agent-visibility.ts` — per-policy, ανακλητά AccessGrants· consent-first). Activity feed υπάρχει (`app/(protected)/activity/actions.ts` — notifications, relationships, opportunities, questionnaires). Λείπει: **αυτόματο** gap→Opportunity (σήμερα μόνο explicit cross-sell run — `lib/services/cross-sell.service.ts:198`) και συναινετικό stream «τι έκανε ο πελάτης» → **WP-07** |
| 5 | Εικόνα συμβολαίων άλλων εταιρειών | ✅ | Multi-insurer by design· μητρώο 27 ελληνικών ασφαλιστικών σε παραγωγή (`prisma/greek-insurers.json`, βλ. STATUS 2026-07-30) |
| 6 | Αντιπρόταση «πακέτο» | ⚠️ | Engine ✅ (`GREEK_COVERAGE_MATRIX` 8 γραμμών, coverage score 0–100, εκτίμηση προμήθειας `lib/agent/commission.ts`). Λείπει: **πελατο-παρουσιάσιμη** πρόταση πακέτου (δίγλωσσο έγγραφο «τρέχον χαρτοφυλάκιο vs προτεινόμενο») → **WP-08** |
| 7 | GDPR-first compliance | ✅ / ⏳ | Platform-side ✅: `ConsentAudit`, Art.15 export, `gdpr-erasure.service.ts`, retention job (`app/api/v1/jobs/privacy-retention`), DSR runbook + evidence + legal signoff (`docs/compliance/`). Org-side για πιλότο (DPIA, DPA, DPO) = βήματα της Εθνικής, όχι κώδικα |
| 8 | PageSpeed mobile 79 (έναντι 47/33) | ✅ | Μέτρηση ιδιοκτήτη 2026-07-30 στο pagespeed.web.dev — χρειάζονται screenshots (owner action #2) |
| 9 | Λειτουργική ετοιμότητα για demo/πιλότο | ❌ | (α) Prod rate limiting per-instance — λείπει Upstash (owner action #1, STATUS 2026-07-30)· (β) **σιωπηλό mock fallback** χωρίς API key → «Mock Insurance Co.» χωρίς banner (`lib/services/ai/ai-service.factory.ts`, `determineServiceType`) → **WP-01**· (γ) upload lifecycle: ψεύτικο progress, «analyzing forever», χωρίς client-side size check → **WP-02** |

### Διαχωρισμός backlog (κατά CLAUDE.md)

- **Broken / insecure — μπλοκάρει demo ή πιλότο:** WP-01, WP-02, WP-03, Upstash (owner).
- **Αξιοπιστία ισχυρισμών της φόρμας:** WP-05, WP-06, WP-07, WP-08, WP-09.
- **UI/UX (δεν μπλοκάρει):** WP-10.

---

## Β. Work packages

Μέγεθος σε **sessions**: S ≤1 · M 1–2 · L 2–4. Κάθε WP είναι αυτοτελές και
τελειώνει πράσινο σε όλα τα gates (βλ. ενότητα Γ).

### Phase 0 — Ασφαλές demo

#### ☐ WP-01 — Mock-provider safety (S)
- **Στόχος:** να μην μπορεί ποτέ ένα demo/παραγωγή να δείξει «Mock Insurance Co.»
  χωρίς κανείς να το καταλάβει.
- **Αρχεία:** `lib/services/ai/ai-service.factory.ts` (`determineServiceType` —
  σιωπηλό fallback σε mock), `lib/services/ai/mock-ai.service.ts`, `lib/env.ts`.
- **Παραδοτέα:** ρητό opt-in (`AI_SERVICE_TYPE=mock` ή νέο `AI_ALLOW_MOCK=1`)·
  σε `NODE_ENV=production` χωρίς ρητό opt-in → boot error αντί για fallback·
  εμφανές δίγλωσσο banner «Demo δεδομένα» σε κάθε οθόνη ανάλυσης όταν ο ενεργός
  provider είναι mock (i18n keys και στα δύο αρχεία).
- **Acceptance:** matrix unit tests στο selection (κανένα key → throw σε prod,
  warn+mock μόνο σε dev· κάθε key → σωστός provider)· E2E: banner ορατό με mock.
- **Gates:** χωρίς νέο route — δεν αγγίζει api inventory.

#### ☐ WP-02 — Upload lifecycle (M)
- **Στόχος:** πραγματική, όχι σκηνοθετημένη, εικόνα προόδου και κανένα συμβόλαιο
  κολλημένο για πάντα σε `analyzing`.
- **Αρχεία:** `components/wallet/AddPolicyClient.tsx` (fabricated βήματα από
  elapsed time, χωρίς size pre-check), `app/(protected)/wallet/actions.ts`
  (fire-and-forget `after()`), `app/api/v1/upload/route.ts` (15MB cap μόνο
  server-side), νέο job στο `app/api/v1/jobs/`.
- **Παραδοτέα:** client-side έλεγχος μεγέθους/τύπου με μεταφρασμένο μήνυμα·
  βήματα προόδου από το πραγματικό state του analysis run (polling)· watchdog
  που μαρκάρει stuck runs (> N λεπτά) ως failed με retry CTA· cleanup ορφανών
  αρχείων (job + εγγραφή στο `scripts/api-route-policy-inventory.json`).
- **Acceptance:** unit στο watchdog + polling reducer· E2E: >15MB αρχείο δίνει
  σαφές μήνυμα· διακοπή ανάλυσης καταλήγει σε failed+retry, όχι αέναο spinner.

### Phase 1 — Ανθεκτική εξαγωγή

#### ☐ WP-03 — Local text extraction πριν το LLM (L)
- **Στόχος:** κάθε PDF με text layer να πηγαίνει ως **κείμενο** στο μοντέλο
  (−~55% κόστος ανά ανάλυση κατά `docs/planning/TOKEN_ECONOMICS_2026-07.md`,
  «highest-leverage single change left») και τα σκαναρισμένα να αναγνωρίζονται
  ρητά αντί να παράγουν hallucinated πεδία.
- **Αρχεία:** orchestrator `prepareDocument` (lib/services/analysis/), απόφαση
  βιβλιοθήκης (pdfjs-dist ή pdf-parse, server-only) μέσα στο WP.
- **Παραδοτέα:** εξαγωγή text layer· heuristic επάρκειας (coverage %)· text
  path όταν επαρκές, αλλιώς σήμανση «σκαναρισμένο έγγραφο» με καθαρό UX μήνυμα
  (χωρίς OCR σε αυτό το WP — μόνο έντιμη άρνηση)· τα fixtures
  `docs/policies/motor_ethniki_*.pdf` ως golden inputs.
- **Acceptance:** ίδια ή καλύτερη εξαγωγή στα 4 motor fixtures μέσω text path·
  μετρημένη μείωση tokens στο `TokenUsage`· σκαναρισμένο δείγμα → ρητό μήνυμα,
  όχι «Unknown Insurer».

#### ☐ WP-04 — Cache versioning & confidence στο UI (M)
- **Στόχος:** μια κακή πρώτη εξαγωγή να μην είναι ισόβια· ο χρήστης να βλέπει
  πόσο σίγουρο είναι το σύστημα ανά πεδίο.
- **Αρχεία:** `lib/services/analysis/extraction-cache.ts`, οθόνες ανάλυσης
  (AnalysisCard), pattern confidence badges από `/admin/insurers`
  (`field_confidence` — βλ. STATUS 2026-07-30).
- **Παραδοτέα:** extractor-version στο κλειδί cache· action «Επανάλυση από την
  αρχή» (bypass + invalidate)· per-field confidence badges στα βασικά πεδία
  (ασφαλιστής, ασφάλιστρο, ημερομηνίες)· i18n keys και στα δύο αρχεία.
- **Acceptance:** unit: αλλαγή extractor version → cache miss· E2E: re-analyze
  αλλάζει αποτέλεσμα όταν το cached ήταν λάθος.

### Phase 2 — Βάθος κλάδων

#### ☐ WP-05 — Ελληνική ταξινομία αυτοκινήτου (L)
- **Στόχος:** ένας broker που ξέρει απ' έξω τις καλύψεις να μη βρίσκει γενικόλογα
  ή λάθος gaps — εδώ κρίνεται η αξιοπιστία απέναντι στην Εθνική.
- **Αρχεία:** `lib/insurance/taxonomy.ts`, `lib/services/gap-engine/`
  (`profile-gap-rules.ts`, `protection-score.ts`), `prisma/seed.ts`,
  `lib/insurance/content/` (roadside.ts, motorbike.ts υπάρχουν ήδη — reuse).
- **Παραδοτέα:** δομημένος χάρτης καλύψεων (αστική ευθύνη / πυρός-κλοπή / μικτή,
  ίδιες ζημιές, φυσικά φαινόμενα, θραύση κρυστάλλων, οδική βοήθεια, προσωπικό
  ατύχημα οδηγού, ανασφάλιστο όχημα, νομική προστασία)· ντετερμινιστικοί gap
  κανόνες πάνω στο extracted σχήμα (LLM μόνο για residual free-text)· **motor
  ως αυτόνομη κατηγορία** στο `SCORE_CATEGORIES` (σήμερα λιμνάζει μέσα στο
  «Property & Motor», weight 20)· seed gap definitions ανά tier.
- **Acceptance:** golden tests στα 3+1 πραγματικά Ethniki motor fixtures —
  σωστή διάκριση απλής/μικτής, σωστά «λείπει θραύση/οδική» ανά fixture· score
  δείχνει «Αυτοκίνητο: κρίσιμο κενό» αντί «Property 50%».

#### ☐ WP-06 — Template επέκτασης ανά κλάδο (M ανά κλάδο)
- **Στόχος:** να αποδειχθεί έμπρακτα ο ισχυρισμός «νέος κλάδος = παραμετροποίηση».
- **Σειρά:** κατοικία → υγεία → ζωή (οι κύριοι κλάδοι της Εθνικής).
- **Αρχεία/πηγές:** ίδιο pattern με WP-05· περιεχόμενο από
  `lib/insurance/content/*` και `docs/product/LOB_CONTENT.md` (ήδη γραμμένο υλικό).
- **Acceptance:** ίδια δομή golden tests με πραγματικό fixture ανά κλάδο (ζητείται
  από τον owner — action #4)· κάθε νέος κλάδος = δηλωτικός χάρτης + κανόνες,
  **μηδέν νέες οθόνες**.

### Phase 3 — Ζωντανός βρόχος ασφαλιστή

#### ☐ WP-07 — Αυτόματο gap→Opportunity + consented activity (L)
- **Στόχος:** ο ισχυρισμός #4 της φόρμας να είναι πλήρως αληθής: ο ασφαλιστής
  βλέπει την ευκαιρία **να εμφανίζεται μόνη της**, με συγκατάθεση παντού.
- **Αρχεία:** ολοκλήρωση ανάλυσης (orchestrator completion hook),
  `lib/services/gap-engine/opportunity-scoring.ts`,
  `lib/services/cross-sell.service.ts` (υπάρχον create στο :198),
  `app/(protected)/wallet/actions.ts:1544` (τρίτο site δημιουργίας — έλεγχος/
  reuse), `app/(protected)/activity/actions.ts`, components/notifications.
- **Παραδοτέα:** μετά από ανάλυση πελάτη με ενεργό policy grant → create/update
  Opportunity (dedupe ανά gapInstance, **χωρίς LLM κλήση**, σεβασμός
  `getAgentPolicyVisibilityWhere`)· NotificationEvent στον owning agent·
  συναινετικά events στο feed (upload, ολοκλήρωση ανάλυσης, προσέγγιση
  ανανέωσης)· audit rows με userId μόνο (πρότυπο GDPR audit M3 από STATUS).
- **Acceptance:** επέκταση `tests/agent-journey.spec.ts`: πελάτης ανεβάζει →
  agent βλέπει μετρήσιμη ευκαιρία χωρίς χειροκίνητο βήμα· unit: κανένα
  Opportunity για policy χωρίς grant· dedupe σε επανα-ανάλυση.

### Phase 4 — «Πακέτο» & πληρότητα

#### ☐ WP-08 — Πρόταση πακέτου (L)
- **Στόχος:** ο ισχυρισμός #6: από «εικόνα των συμβολαίων άλλων εταιρειών» σε
  απτή, δίγλωσση αντιπρόταση πακέτου που ο agent δίνει στον πελάτη.
- **Αρχεία & reuse:** `cross-sell.service.ts` (missing lines),
  `lib/services/analysis/deterministic-savings.ts`,
  `lib/services/reports/savings-report.ts`, `lib/agent/commission.ts`.
- **Παραδοτέα:** ροή «Δημιουργία πρότασης πακέτου» από την καρτέλα πελάτη:
  επιλογή γραμμών (missing + γραμμές σε άλλες εταιρείες) → έγγραφο «τρέχον
  χαρτοφυλάκιο vs προτεινόμενο πακέτο» με εκτιμήσεις ασφαλίστρου/εξοικονόμησης,
  δίγλωσσο, εκτυπώσιμο· persist ως record· consent-gated· audit row· εγγραφή
  τυχόν νέου route στο api inventory.
- **Acceptance:** E2E: agent χτίζει πρόταση για πελάτη με 2 εταιρείες → σωστές
  γραμμές, δύο γλώσσες, print view· unit στη σύνθεση γραμμών κατά
  `branchFamilyId` (μοτοσυκλέτα ≠ «λείπει αυτοκίνητο»).

#### ☐ WP-09 — Πληρότητα δίγλωσσης AI εξόδου (M)
- **Στόχος:** κανένα στοιχείο ανάλυσης χωρίς και τις δύο γλώσσες.
- **Αρχεία:** `aiExplanationEl` (`schema.prisma:428`), pipeline βημάτων
  clarity/translation, script ελέγχου.
- **Παραδοτέα:** audit script ποσοστού πληρότητας· backfill job (Flash — φθηνό
  βήμα κατά TOKEN_ECONOMICS)· unit guard: το output schema της ανάλυσης απαιτεί
  και τα δύο πεδία· κανόνας render fallback.
- **Acceptance:** report 100% στα νέα runs· backfill μετρημένο στο TokenUsage.

#### ☐ WP-10 — Dashboard clarity (M — UX, δεν μπλοκάρει)
- **Παραδοτέα:** RealityReport Phase A: Coverage circle (από protectionScore),
  Renewal timeline, ένα AI insight card, CTA «Share with agent».
- **Acceptance:** E2E στα τέσσερα στοιχεία + 320px χωρίς οριζόντιο overflow
  (πρότυπο από STATUS 2026-07-30).

### Phase 5 — Μόνο αν προχωρήσει πιλότος με την Εθνική

#### ☐ WP-11 — Pilot enablement (L, conditional)
- Theming/white-label πάνω στα tokens του `app/globals.css` (design-system
  MASTER.md)· SSO (OIDC)· bulk import συμβολαίων· KPI telemetry πιλότου
  (activation, χρόνος-έως-πρώτη-ανάλυση, opportunities/πελάτη).
- **Δεν ξεκινά** χωρίς ρητή απόφαση πιλότου — ό,τι προηγείται έχει αξία και
  χωρίς Εθνική.

### Εξαρτήσεις & σειρά

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4        (Phase 5 conditional)
WP-08 απαιτεί WP-05 (αξιόπιστες εκτιμήσεις ανά κάλυψη)
WP-09 ανεξάρτητο — μπορεί να τρέξει παράλληλα με οτιδήποτε
WP-10 οποτεδήποτε μετά το Phase 0
```

---

## Γ. Μηχανισμός συνεχούς εκτέλεσης

### Session prompt (paste σε κάθε νέο session)

```text
Διάβασε docs/STATUS.md και docs/planning/ETHNIKI_READINESS_AND_DEV_PLAN.md.
Πάρε το επόμενο ανοιχτό (☐) WP με τη σειρά των φάσεων, εκτός αν σου ορίσω άλλο.
Πριν γράψεις κώδικα, επανεπιβεβαίωσε στον κώδικα ότι το κενό υπάρχει ακόμη —
αν έχει καλυφθεί, τσέκαρε το WP με σημείωση και προχώρα στο επόμενο.
Υλοποίησε πλήρως: κώδικας + unit tests + E2E για ό,τι αγγίζει UI + i18n keys
και στα el.ts/en.ts + συγχρονισμός scripts/api-route-policy-inventory.json για
κάθε νέο/αλλαγμένο route.
Τρέξε τα gates: audit:api-auth, lint, lint:i18n-changed, lint:utf8, type-check,
npx vitest --run tests/unit. Για schema αλλαγές: prisma migrate dev και
verify:migrations μέσω Supabase MCP (τοπικά δεν τρέχει — βλ. παγίδες).
Στο τέλος: τσέκαρε το checkbox του WP σε αυτό το έγγραφο, ενημέρωσε το
docs/STATUS.md, commit στο claude/policywallet-ethniki-0r0bai. Όχι PR χωρίς
ρητή εντολή.
```

### Κανόνες κάθε WP session

1. Ένα WP ανά session κατά κανόνα· αν περισσεύει χρόνος, ξεκίνα το επόμενο
   μόνο αν θα προλάβεις να το αφήσεις πράσινο.
2. Κανένα WP δεν κλείνει με κόκκινο gate ή skipped test.
3. Ό,τι αποκλίνει από το πλάνο καταγράφεται εδώ (μία γραμμή κάτω από το WP).
4. Ευρήματα «broken/insecure» εκτός scope → STATUS.md, ξεχωριστά από UX.

### Παγίδες περιβάλλοντος (μην ξανακαείς)

- `verify:migrations` **δεν τρέχει τοπικά by construction** (direct host
  IPv6-only, pgbouncer δεν κρατά advisory lock) — μόνο μέσω Supabase MCP
  (βλ. STATUS 2026-07-30, διόρθωση «local pooler connectivity was dead»).
- Playwright **μόνο port 3000**· ποτέ :5000 (AirPlay). Cookie banner: helper
  `dismissCookieBanner` από `tests/helpers/ui.ts`.
- Tests με `mock` AI provider — ποτέ πραγματικά κλειδιά σε CI.
- Φρέσκο container: `nvm use && npm install` πριν από οτιδήποτε.
- Το E2E δεν είναι στο CI — τρέξε το τοπικά πριν από merge UI αλλαγών
  (`--project=chromium --project=agent-chromium --project=sentry`).

---

## Δ. Owner actions (εκτός κώδικα)

1. **Upstash Redis** σε Production/Preview + αφαίρεση `RATELIMIT_ALLOW_LOCAL`
   (ανοιχτό OWNER ACTION στο STATUS — αποδυναμώνει κάθε rate limit).
2. **Screenshots PageSpeed** (79/47/33) με ημερομηνία — το lab score κυμαίνεται.
3. Αν προχωρήσει πιλότος: **DPIA, σύμβαση επεξεργασίας, έγκριση DPO** (πλευρά
   Εθνικής· το platform-side compliance είναι έτοιμο).
4. **Πραγματικά δείγματα PDF ανά κλάδο** (κατοικία, υγεία, ζωή) για τα golden
   tests των WP-06 — υπάρχουν μόνο motor fixtures.
5. Στη φόρμα: ονόματα συναδέλφων (υποχρεωτικό πεδίο) + επιλογή «Εύρος επίδρασης».

---

## Ε. Ιστορικό επαλήθευσης (2026-07-30)

Τα ευρήματα του `docs/demo/motor-demo-path.md` (2026-06-01) επανελέγχθηκαν στον
σημερινό κώδικα πριν γραφτεί αυτό το πλάνο:

| Εύρημα Ιουνίου | Σήμερα |
|---|---|
| Agent dashboard φιλτράρει με `createdByUserId` — self-uploads αόρατα | **ΔΙΟΡΘΩΜΕΝΟ** — όλα τα queries περνούν από `getAgentPolicyVisibilityWhere` (grant-based, ανακλητό)· τα σχόλια στο `dashboard/agent/page.tsx` τεκμηριώνουν τη διόρθωση |
| Σιωπηλό mock fallback χωρίς κλειδιά | Ισχύει — επιβεβαιωμένο στο `determineServiceType` → WP-01 |
| Κανένα PDF text/OCR layer | Ισχύει — κανένα σχετικό dependency στο `package.json` → WP-03 |
| Καμία αυτόματη δημιουργία Opportunity από gaps | Ισχύει — μόνο explicit sites (`cross-sell.service.ts:198`, `wallet/actions.ts:1544`, collaboration proposals) → WP-07 |
| Protection score ενώνει motor+home | Ισχύει — `SCORE_CATEGORIES` «Property & Motor», weight 20 → WP-05 |
| Upload lifecycle (fake progress, stuck analyzing) | Μη επανελεγμένο σήμερα γραμμή-γραμμή· κρατιέται ως ισχύον από το Ιούνιο → WP-02 (το session του WP-02 επανεπιβεβαιώνει πρώτα) |
| Extraction cache «κλειδώνει» κακή εξαγωγή | Μη επανελεγμένο σήμερα· ίδιος κανόνας → WP-04 |
