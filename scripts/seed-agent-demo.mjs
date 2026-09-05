/**
 * seed-agent-demo.mjs — Wire up the "agent views a connected customer's analyzed MOTOR policy" demo.
 *
 * PREREQUISITE: both accounts must already be signed up via the app (they must exist in
 * Supabase auth.users so they can log in). This script does NOT create logins — see the
 * instructions printed at the end if an account is missing.
 *
 * What it does (idempotent — safe to re-run):
 *   1. Force-confirms both emails in auth.users (so "email not confirmed" can't block login).
 *   2. Ensures an ACTIVE CustomerRelationship (agent ↔ customer) + an active policy-scoped AccessGrant.
 *   3. Creates/updates a clean ANALYZED motor Policy owned by the customer, using the REAL values
 *      extracted from docs/policies/motor_ethniki_1.pdf (ΕΘΝΙΚΗ, €104.87, policy #63708952).
 *   4. Seeds two REAL motor gaps (theft, legal) with Greek + English explanations/suggestions.
 *
 * Usage:
 *   node scripts/seed-agent-demo.mjs <agentEmail> <customerEmail>
 * or set DEMO_AGENT_EMAIL / DEMO_CUSTOMER_EMAIL env vars.
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnv(p) {
  try {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const v = m[2].replace(/^["']|["']$/g, "").trim();
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {
    // env file may not exist — vars can come from the shell instead
  }
}
loadEnv(".env.local");
loadEnv(".env");

const agentEmail = (process.argv[2] || process.env.DEMO_AGENT_EMAIL || "").trim().toLowerCase();
const customerEmail = (process.argv[3] || process.env.DEMO_CUSTOMER_EMAIL || "").trim().toLowerCase();

if (!agentEmail || !customerEmail) {
  console.error("Usage: node scripts/seed-agent-demo.mjs <agentEmail> <customerEmail>");
  process.exit(1);
}

const db = new PrismaClient();

async function requireUser(email, label) {
  const u = await db.user.findUnique({ where: { email }, select: { id: true, email: true, roles: true } });
  if (!u) {
    console.error(`\n✗ No public.User row for ${label} (${email}).`);
    console.error(`  → That account hasn't been signed up yet. Sign it up via the app first, then re-run.`);
    process.exit(2);
  }
  const auth = await db.$queryRawUnsafe(
    `select id, (email_confirmed_at is not null) as confirmed from auth.users where lower(email)=lower($1) limit 1`, email);
  if (!auth.length) {
    console.error(`\n✗ ${label} (${email}) exists in Prisma but NOT in Supabase auth.users → cannot log in.`);
    console.error(`  → Sign this account up through the app's /auth/signup page (creates the auth user), then re-run.`);
    process.exit(2);
  }
  return { ...u, authConfirmed: auth[0].confirmed };
}

async function main() {
  const agent = await requireUser(agentEmail, "AGENT");
  const customer = await requireUser(customerEmail, "CUSTOMER");

  // 1) Make sure both can actually sign in (force-confirm email).
  const conf = await db.$executeRawUnsafe(
    `update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now()
     where lower(email) in (lower($1), lower($2)) and email_confirmed_at is null`, agentEmail, customerEmail);
  console.log(`✓ Email-confirm check done (rows updated: ${conf}).`);

  // 2) Relationship (active) + policy-scoped access grant (mirrors the real sharePolicy flow).
  const relationship = await db.customerRelationship.upsert({
    where: { agentUserId_policyholderUserId: { agentUserId: agent.id, policyholderUserId: customer.id } },
    update: { status: "active", activationStatus: "active", lastInteractionAt: new Date() },
    create: { agentUserId: agent.id, policyholderUserId: customer.id, status: "active", activationStatus: "active" },
  });
  console.log(`✓ CustomerRelationship active (${relationship.id}).`);

  // 3) Policy — REAL extracted values from motor_ethniki_1.pdf.
  const POLICY_NUMBER = "63708952";
  const acordData = {
    policy: { insurer: "ΕΘΝΙΚΗ", premium: { amount: 104.87, currency: "EUR" } },
    coverages: [
      { name: "Αστική Ευθύνη (Σωματικές Βλάβες)", limit: "€1.300.000" },
      { name: "Αστική Ευθύνη (Υλικές Ζημιές)", limit: "€1.300.000" },
      { name: "Φροντίδα Ατυχήματος", limit: "Συμπεριλαμβάνεται" },
      { name: "Οδική Βοήθεια", limit: "Συμπεριλαμβάνεται" },
    ],
  };
  const coverageSummary =
    "Ασφαλιστήριο αυτοκινήτου ΕΘΝΙΚΗ — καλύπτει αστική ευθύνη προς τρίτους (σωματικές βλάβες & υλικές ζημιές), " +
    "φροντίδα ατυχήματος και οδική βοήθεια. Ετήσιο ασφάλιστρο €104,87.";

  // Dates: keep the policy comfortably ACTIVE regardless of demo date.
  const now = new Date();
  const startDate = new Date(now.getTime() - 60 * 86400000);   // ~2 months ago
  const endDate = new Date(now.getTime() + 305 * 86400000);    // ~10 months out → "active"

  const existing = await db.policy.findFirst({ where: { ownerUserId: customer.id, policyNumber: POLICY_NUMBER }, select: { id: true } });
  const policyData = {
    ownerUserId: customer.id,
    createdByUserId: customer.id, // customer self-uploaded (faithful to the story)
    policyNumber: POLICY_NUMBER,
    insurerName: "ΕΘΝΙΚΗ",
    lineOfBusiness: "motor",
    startDate, endDate,
    status: "active",
    premiumAmount: 104.87,
    premiumCurrency: "EUR",
    coverageSummary,
    lastAnalyzedAt: new Date(),
    acordData,
  };
  const policy = existing
    ? await db.policy.update({ where: { id: existing.id }, data: policyData })
    : await db.policy.create({ data: policyData });
  console.log(`✓ Policy ${existing ? "updated" : "created"} (${policy.id}) — ΕΘΝΙΚΗ / €104.87 / #${POLICY_NUMBER}.`);

  // 4) Gap definitions (use seeded ones; upsert so the script works on a fresh DB too).
  const defs = [
    {
      slug: "motor-theft", name: "Missing Theft Protection", title: "Missing Theft Protection",
      description: "Motor policy lacks theft cover.", lineOfBusiness: "motor",
      severity: "high", defaultSeverity: "high", ruleId: "motor-theft-rule", detectionLogic: {},
    },
    {
      slug: "motor-legal", name: "No Legal Protection", title: "No Legal Protection",
      description: "Motor policy lacks legal protection cover.", lineOfBusiness: "motor",
      severity: "medium", defaultSeverity: "medium", ruleId: "motor-legal-rule", detectionLogic: {},
    },
  ];
  const defIds = {};
  for (const d of defs) {
    const def = await db.gapDefinition.upsert({ where: { slug: d.slug }, update: {}, create: d });
    defIds[d.slug] = def.id;
  }

  const gaps = [
    {
      slug: "motor-theft", severity: "high",
      aiExplanation: "This motor policy covers third-party liability but does NOT include theft (κλοπή) cover. If the vehicle is stolen or broken into, there is no compensation.",
      aiExplanationEl: "Το συμβόλαιο καλύπτει αστική ευθύνη αλλά ΔΕΝ περιλαμβάνει κάλυψη κλοπής. Σε περίπτωση κλοπής ή διάρρηξης του οχήματος δεν προβλέπεται αποζημίωση.",
      aiSuggestion: "Add an ολική/μερική κλοπή (total/partial theft) rider. Typical annual cost €40–80 for this vehicle class — it closes the largest exposure on the contract.",
      aiSuggestionEl: "Προσθέστε κάλυψη ολικής/μερικής κλοπής. Ετήσιο κόστος συνήθως €40–80 για αυτή την κατηγορία οχήματος — καλύπτει το μεγαλύτερο κενό του συμβολαίου.",
    },
    {
      slug: "motor-legal", severity: "medium",
      aiExplanation: "There is no legal protection (νομική προστασία) coverage. Legal costs from a traffic dispute or claim recovery would be paid out of pocket.",
      aiExplanationEl: "Δεν υπάρχει κάλυψη νομικής προστασίας. Τα έξοδα για τροχαία διαφορά ή διεκδίκηση αποζημίωσης θα βαρύνουν τον ασφαλισμένο.",
      aiSuggestion: "Add a legal protection rider (~€15–25/year) so attorney and court costs are covered in a dispute.",
      aiSuggestionEl: "Προσθέστε κάλυψη νομικής προστασίας (~€15–25/έτος) ώστε να καλύπτονται δικηγορικά και δικαστικά έξοδα σε περίπτωση διαφοράς.",
    },
  ];

  // Idempotent: clear prior demo gaps for this policy, then recreate.
  await db.gapInstance.deleteMany({ where: { policyId: policy.id, gapDefinitionId: { in: Object.values(defIds) } } });
  // Every gap row records the run that produced it (B0.2). A demo row gets a
  // completed demo run rather than a provenance hole.
  const demoRun = await db.policyAnalysisRun.create({
    data: {
      policyId: policy.id, userId: customer.id, provider: "seed", model: "seed-agent-demo",
      status: "completed", startedAt: new Date(), finishedAt: new Date(),
    },
    select: { id: true },
  });
  for (const g of gaps) {
    await db.gapInstance.create({
      data: {
        policyId: policy.id, userId: customer.id, gapDefinitionId: defIds[g.slug],
        analysisRunId: demoRun.id, lineOfBusiness: "motor",
        severity: g.severity, status: "open",
        aiExplanation: g.aiExplanation, aiExplanationEl: g.aiExplanationEl,
        aiSuggestion: g.aiSuggestion, aiSuggestionEl: g.aiSuggestionEl, detectedAt: new Date(),
      },
    });
  }
  console.log(`✓ Seeded ${gaps.length} real motor gaps (theft=high, legal=medium).`);

  // Belt-and-suspenders: also create an active policy-scoped AccessGrant (page accepts relationship OR grant).
  const scope = `policy:${policy.id}`;
  const grant = await db.accessGrant.findFirst({ where: { granterUserId: customer.id, granteeUserId: agent.id, scope, status: "active" }, select: { id: true } });
  if (!grant) {
    await db.accessGrant.create({ data: { granterUserId: customer.id, granteeUserId: agent.id, scope, permissions: "read", status: "active" } });
  }
  console.log(`✓ Active AccessGrant ensured (${scope}).`);

  console.log("\n========================================================");
  console.log("DEMO READY. Log in as the AGENT and open:");
  console.log(`  /customers/${customer.id}/policy/${policy.id}`);
  console.log("--------------------------------------------------------");
  console.log(`  AGENT login    : ${agent.email}`);
  console.log(`  CUSTOMER (owner): ${customer.email}  (id: ${customer.id})`);
  console.log(`  Policy id       : ${policy.id}`);
  console.log("========================================================");
}

main()
  .catch((e) => { console.error("FAILED:", e); process.exit(1); })
  .finally(() => db.$disconnect());
