/**
 * Coverage Taxonomy + Coverage Envelope seed (Phase 0)
 *
 * Reference data for the ingestion pipeline:
 *  - CoverageTaxonomy: the canonical coverage vocabulary every NormalizedCoverage,
 *    envelope expectation, and Gap keys against. `aliases` are the raw Greek
 *    Πίνακας Καλύψεων labels normalizers map onto each key.
 *  - CoverageEnvelope: the baseline expected-coverage benchmark the deterministic
 *    Gap Engine (Phase 6) diffs a policy against.
 *
 * Values (limits + severities) are STARTER placeholders to be tuned with an
 * underwriter; the shapes are authoritative. `expectations` must satisfy
 * EnvelopeExpectation[] from lib/services/ingestion/contracts.ts.
 *
 * Type-only import (erased at runtime) keeps this seed decoupled from the app graph.
 */

import type { PrismaClient, Prisma } from "@prisma/client"
import type { EnvelopeExpectation } from "@/lib/services/ingestion/contracts"

type TaxonomySeed = {
  key: string
  lineOfBusiness: string
  nameEl: string
  nameEn: string
  unit: "amount" | "percent" | "boolean" | "days"
  aliases: string[]
  sortOrder: number
}

const COVERAGE_TAXONOMY: TaxonomySeed[] = [
  // ── Motor (Αυτοκίνητο) ──────────────────────────────────────────────
  { key: "motor.civil_liability", lineOfBusiness: "motor", nameEl: "Αστική Ευθύνη", nameEn: "Civil liability", unit: "amount", aliases: ["Αστική Ευθύνη", "Σωματικές Βλάβες", "Υλικές Ζημίες", "Αστική Ευθύνη προς Τρίτους"], sortOrder: 10 },
  { key: "motor.own_damage", lineOfBusiness: "motor", nameEl: "Ίδιες Ζημίες", nameEn: "Own damage", unit: "amount", aliases: ["Ίδιες Ζημίες", "Μικτή", "Μικτή Ασφάλιση"], sortOrder: 20 },
  { key: "motor.fire", lineOfBusiness: "motor", nameEl: "Πυρκαγιά", nameEn: "Fire", unit: "amount", aliases: ["Πυρκαγιά", "Πυρός"], sortOrder: 30 },
  { key: "motor.theft", lineOfBusiness: "motor", nameEl: "Κλοπή", nameEn: "Theft", unit: "amount", aliases: ["Κλοπή", "Ολική Κλοπή", "Μερική Κλοπή"], sortOrder: 40 },
  { key: "motor.natural_disasters", lineOfBusiness: "motor", nameEl: "Φυσικά Φαινόμενα", nameEn: "Natural disasters", unit: "amount", aliases: ["Φυσικά Φαινόμενα", "Καιρικά Φαινόμενα"], sortOrder: 50 },
  { key: "motor.broken_glass", lineOfBusiness: "motor", nameEl: "Θραύση Κρυστάλλων", nameEn: "Broken glass", unit: "amount", aliases: ["Θραύση Κρυστάλλων", "Κρύσταλλα"], sortOrder: 60 },
  { key: "motor.roadside_assistance", lineOfBusiness: "motor", nameEl: "Οδική Βοήθεια", nameEn: "Roadside assistance", unit: "boolean", aliases: ["Οδική Βοήθεια", "Φροντίδα Ατυχήματος"], sortOrder: 70 },
  { key: "motor.legal_protection", lineOfBusiness: "motor", nameEl: "Νομική Προστασία", nameEn: "Legal protection", unit: "amount", aliases: ["Νομική Προστασία"], sortOrder: 80 },
  { key: "motor.driver_personal_accident", lineOfBusiness: "motor", nameEl: "Προσωπικό Ατύχημα Οδηγού", nameEn: "Driver personal accident", unit: "amount", aliases: ["Προσωπικό Ατύχημα Οδηγού", "Ατύχημα Οδηγού"], sortOrder: 90 },

  // ── Health (Υγεία) ──────────────────────────────────────────────────
  { key: "health.hospitalization", lineOfBusiness: "health", nameEl: "Νοσοκομειακή Περίθαλψη", nameEn: "Hospitalization", unit: "amount", aliases: ["Νοσοκομειακή Περίθαλψη", "Νοσηλεία"], sortOrder: 10 },
  { key: "health.outpatient", lineOfBusiness: "health", nameEl: "Εξωνοσοκομειακή Περίθαλψη", nameEn: "Outpatient care", unit: "amount", aliases: ["Εξωνοσοκομειακή Περίθαλψη", "Διαγνωστικές Εξετάσεις", "Διαγνωστικά"], sortOrder: 20 },
  { key: "health.surgical", lineOfBusiness: "health", nameEl: "Χειρουργική Επέμβαση", nameEn: "Surgical", unit: "amount", aliases: ["Χειρουργικό Επίδομα", "Χειρουργική Επέμβαση"], sortOrder: 30 },
  { key: "health.maternity", lineOfBusiness: "health", nameEl: "Μητρότητα", nameEn: "Maternity", unit: "amount", aliases: ["Μητρότητα", "Τοκετός"], sortOrder: 40 },
  { key: "health.daily_hospital_allowance", lineOfBusiness: "health", nameEl: "Ημερήσιο Νοσοκομειακό Επίδομα", nameEn: "Daily hospital allowance", unit: "days", aliases: ["Ημερήσιο Νοσήλιο", "Νοσοκομειακό Επίδομα"], sortOrder: 50 },

  // ── Home (Κατοικία) ─────────────────────────────────────────────────
  { key: "home.fire", lineOfBusiness: "home", nameEl: "Πυρκαγιά", nameEn: "Fire", unit: "amount", aliases: ["Πυρκαγιά", "Πυρός", "Φωτιά"], sortOrder: 10 },
  { key: "home.earthquake", lineOfBusiness: "home", nameEl: "Σεισμός", nameEn: "Earthquake", unit: "amount", aliases: ["Σεισμός", "Σεισμική Δραστηριότητα"], sortOrder: 20 },
  { key: "home.flood", lineOfBusiness: "home", nameEl: "Πλημμύρα", nameEn: "Flood", unit: "amount", aliases: ["Πλημμύρα", "Πλημμύρες"], sortOrder: 30 },
  { key: "home.theft", lineOfBusiness: "home", nameEl: "Κλοπή", nameEn: "Theft", unit: "amount", aliases: ["Κλοπή", "Διάρρηξη"], sortOrder: 40 },
  { key: "home.water_damage", lineOfBusiness: "home", nameEl: "Ζημιές από Νερά", nameEn: "Water damage", unit: "amount", aliases: ["Ζημιές από Νερά", "Διαρροή Σωληνώσεων"], sortOrder: 50 },
  { key: "home.civil_liability", lineOfBusiness: "home", nameEl: "Αστική Ευθύνη προς Τρίτους", nameEn: "Civil liability to third parties", unit: "amount", aliases: ["Αστική Ευθύνη προς Τρίτους", "Αστική Ευθύνη"], sortOrder: 60 },
  { key: "home.glass_breakage", lineOfBusiness: "home", nameEl: "Θραύση Κρυστάλλων", nameEn: "Glass breakage", unit: "amount", aliases: ["Θραύση Κρυστάλλων"], sortOrder: 70 },

  // ── Life (Ζωή) ──────────────────────────────────────────────────────
  { key: "life.death_benefit", lineOfBusiness: "life", nameEl: "Κεφάλαιο Θανάτου", nameEn: "Death benefit", unit: "amount", aliases: ["Κεφάλαιο Θανάτου", "Ασφάλιση Ζωής", "Απώλεια Ζωής"], sortOrder: 10 },
  { key: "life.permanent_disability", lineOfBusiness: "life", nameEl: "Μόνιμη Ολική Ανικανότητα", nameEn: "Permanent total disability", unit: "amount", aliases: ["Μόνιμη Ολική Ανικανότητα", "Μ.Ο.Α."], sortOrder: 20 },
  { key: "life.critical_illness", lineOfBusiness: "life", nameEl: "Σοβαρές Ασθένειες", nameEn: "Critical illness", unit: "amount", aliases: ["Σοβαρές Ασθένειες", "Κρίσιμες Ασθένειες"], sortOrder: 30 },
  { key: "life.hospital_income", lineOfBusiness: "life", nameEl: "Νοσοκομειακό Επίδομα", nameEn: "Hospital income", unit: "days", aliases: ["Νοσοκομειακό Επίδομα"], sortOrder: 40 },

  // ── Travel (Ταξιδιωτική) ────────────────────────────────────────────
  { key: "travel.medical_expenses", lineOfBusiness: "travel", nameEl: "Ιατρικά Έξοδα Εξωτερικού", nameEn: "Overseas medical expenses", unit: "amount", aliases: ["Ιατρικά Έξοδα", "Ιατροφαρμακευτικά Έξοδα Εξωτερικού"], sortOrder: 10 },
  { key: "travel.trip_cancellation", lineOfBusiness: "travel", nameEl: "Ακύρωση Ταξιδιού", nameEn: "Trip cancellation", unit: "amount", aliases: ["Ακύρωση Ταξιδιού", "Ματαίωση Ταξιδιού"], sortOrder: 20 },
  { key: "travel.lost_luggage", lineOfBusiness: "travel", nameEl: "Απώλεια Αποσκευών", nameEn: "Lost luggage", unit: "amount", aliases: ["Απώλεια Αποσκευών", "Αποσκευές"], sortOrder: 30 },
  { key: "travel.repatriation", lineOfBusiness: "travel", nameEl: "Επαναπατρισμός", nameEn: "Repatriation", unit: "amount", aliases: ["Επαναπατρισμός", "Υγειονομική Μεταφορά"], sortOrder: 40 },

  // ── Liability (Αστική Ευθύνη) ───────────────────────────────────────
  { key: "liability.professional", lineOfBusiness: "liability", nameEl: "Επαγγελματική Αστική Ευθύνη", nameEn: "Professional liability", unit: "amount", aliases: ["Επαγγελματική Αστική Ευθύνη", "Επαγγελματική Ευθύνη"], sortOrder: 10 },
  { key: "liability.general", lineOfBusiness: "liability", nameEl: "Γενική Αστική Ευθύνη", nameEn: "General liability", unit: "amount", aliases: ["Γενική Αστική Ευθύνη"], sortOrder: 20 },
  { key: "liability.employer", lineOfBusiness: "liability", nameEl: "Εργοδοτική Αστική Ευθύνη", nameEn: "Employer's liability", unit: "amount", aliases: ["Εργοδοτική Αστική Ευθύνη"], sortOrder: 30 },
]

type EnvelopeSeed = {
  lineOfBusiness: string
  /** '' = baseline benchmark; else a profile segment such as 'homeowner'. */
  profileSegment: string
  version: number
  expectations: EnvelopeExpectation[]
}

const COVERAGE_ENVELOPES: EnvelopeSeed[] = [
  {
    lineOfBusiness: "motor",
    profileSegment: "",
    version: 1,
    expectations: [
      { taxonomyKey: "motor.civil_liability", minLimit: 1_300_000, severityIfMissing: "critical" },
      { taxonomyKey: "motor.fire", severityIfMissing: "recommended" },
      { taxonomyKey: "motor.theft", severityIfMissing: "recommended" },
      { taxonomyKey: "motor.broken_glass", severityIfMissing: "info" },
      { taxonomyKey: "motor.roadside_assistance", severityIfMissing: "info" },
    ],
  },
  {
    lineOfBusiness: "health",
    profileSegment: "",
    version: 1,
    expectations: [
      { taxonomyKey: "health.hospitalization", minLimit: 300_000, severityIfMissing: "critical" },
      { taxonomyKey: "health.surgical", severityIfMissing: "recommended" },
      { taxonomyKey: "health.outpatient", severityIfMissing: "recommended" },
      { taxonomyKey: "health.daily_hospital_allowance", severityIfMissing: "info" },
    ],
  },
  {
    lineOfBusiness: "home",
    profileSegment: "",
    version: 1,
    expectations: [
      { taxonomyKey: "home.fire", severityIfMissing: "critical" },
      { taxonomyKey: "home.earthquake", severityIfMissing: "recommended" },
      { taxonomyKey: "home.civil_liability", severityIfMissing: "recommended" },
      { taxonomyKey: "home.theft", severityIfMissing: "info" },
    ],
  },
  {
    // Greece is seismically active — for homeowners, earthquake escalates to critical.
    lineOfBusiness: "home",
    profileSegment: "homeowner",
    version: 1,
    expectations: [
      { taxonomyKey: "home.fire", severityIfMissing: "critical" },
      { taxonomyKey: "home.earthquake", severityIfMissing: "critical" },
      { taxonomyKey: "home.flood", severityIfMissing: "recommended" },
      { taxonomyKey: "home.civil_liability", severityIfMissing: "recommended" },
      { taxonomyKey: "home.theft", severityIfMissing: "info" },
    ],
  },
  {
    lineOfBusiness: "life",
    profileSegment: "",
    version: 1,
    expectations: [
      { taxonomyKey: "life.death_benefit", severityIfMissing: "critical" },
      { taxonomyKey: "life.permanent_disability", severityIfMissing: "recommended" },
      { taxonomyKey: "life.critical_illness", severityIfMissing: "info" },
    ],
  },
  {
    lineOfBusiness: "travel",
    profileSegment: "",
    version: 1,
    expectations: [
      { taxonomyKey: "travel.medical_expenses", minLimit: 30_000, severityIfMissing: "critical" },
      { taxonomyKey: "travel.repatriation", severityIfMissing: "recommended" },
      { taxonomyKey: "travel.trip_cancellation", severityIfMissing: "info" },
      { taxonomyKey: "travel.lost_luggage", severityIfMissing: "info" },
    ],
  },
  {
    lineOfBusiness: "liability",
    profileSegment: "",
    version: 1,
    expectations: [
      { taxonomyKey: "liability.professional", severityIfMissing: "recommended" },
      { taxonomyKey: "liability.general", severityIfMissing: "info" },
    ],
  },
]

export async function seedCoverageTaxonomy(prisma: PrismaClient): Promise<void> {
  for (const t of COVERAGE_TAXONOMY) {
    await prisma.coverageTaxonomy.upsert({
      where: { key: t.key },
      update: {
        lineOfBusiness: t.lineOfBusiness,
        nameEl: t.nameEl,
        nameEn: t.nameEn,
        unit: t.unit,
        aliases: t.aliases,
        sortOrder: t.sortOrder,
        isActive: true,
      },
      create: {
        key: t.key,
        lineOfBusiness: t.lineOfBusiness,
        nameEl: t.nameEl,
        nameEn: t.nameEn,
        unit: t.unit,
        aliases: t.aliases,
        sortOrder: t.sortOrder,
      },
    })
  }
  console.log(`  Coverage taxonomy: ${COVERAGE_TAXONOMY.length} canonical keys upserted`)
}

export async function seedCoverageEnvelopes(prisma: PrismaClient): Promise<void> {
  for (const e of COVERAGE_ENVELOPES) {
    // findFirst keeps the seed idempotent; the ('' = baseline) sentinel means the
    // compound unique (lineOfBusiness, profileSegment, version) fully covers baselines.
    const existing = await prisma.coverageEnvelope.findFirst({
      where: {
        lineOfBusiness: e.lineOfBusiness,
        profileSegment: e.profileSegment,
        version: e.version,
      },
      select: { id: true },
    })

    // EnvelopeExpectation[] is fully JSON-serializable; the cast satisfies Prisma's
    // InputJsonValue at the Json column boundary (the array lacks an index signature).
    const expectationsJson = e.expectations as unknown as Prisma.InputJsonValue

    if (existing) {
      await prisma.coverageEnvelope.update({
        where: { id: existing.id },
        data: { expectations: expectationsJson, isActive: true },
      })
    } else {
      await prisma.coverageEnvelope.create({
        data: {
          lineOfBusiness: e.lineOfBusiness,
          profileSegment: e.profileSegment,
          version: e.version,
          expectations: expectationsJson,
        },
      })
    }
  }
  console.log(`  Coverage envelopes: ${COVERAGE_ENVELOPES.length} baselines upserted`)
}
