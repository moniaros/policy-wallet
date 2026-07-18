/**
 * Shared prompt builders for the policy-analysis pipeline.
 *
 * Single source of truth for the business prompts used by every AI provider
 * (Gemini / Anthropic / OpenAI). Providers keep their own schema plumbing —
 * Gemini runs JSON mode with the schema embedded in the prompt (see
 * json-mode-schema.ts), Anthropic and OpenAI use schema-constrained
 * generation — but the task instructions themselves must not drift per
 * provider. Before this module each provider carried its own copy, and they
 * had already diverged (three different lineOfBusiness enums, DD-MM-YYYY vs
 * YYYY-MM-DD date rules, a legacy output contract predating the Zod schemas).
 */

import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"
import { extractionCitationsEnabled, CITATIONS_PROMPT_SECTION } from "./extraction-citations"
import type {
    AIPolicyExtractionResponse,
    GapDefinitionForAI,
    PolicyMetadata,
    RiskProfileInput,
} from "./ai-service.interface"

const isoDate = (value: Date) => value.toISOString().split("T")[0]

// ── Extraction ──────────────────────────────────────────────────────

/**
 * Canonical extraction prompt. The output shape is the provider's schema
 * (ExtractionSchema) — the prompt deliberately does not restate it.
 */
export function buildExtractionPrompt(): string {
    return `You are an expert insurance document parser for Greek-market policies.

TASK: Read the ENTIRE document — policy schedule, General Terms (Γενικοί Όροι), Special Conditions (Ειδικοί Όροι), appendices and endorsements — and extract ALL insurance data into the structured JSON shape you are given. Do not summarize. Do not skip sections.

ACCURACY RULES:
- Extract only what the document states. Do NOT infer, assume, or invent values.
- If a value is not explicitly in the document, leave the field out.
- Dates: always YYYY-MM-DD.
- Amounts: numbers only — no currency symbols, no thousands separators.
- premiumAmount is the premium the customer PAYS for the policy term (Ολικά Ασφάλιστρα / Πληρωτέο Ποσό, including taxes and fees). It is NEVER the sum insured or a coverage limit (ασφαλιζόμενο κεφάλαιο, όριο κάλυψης). If the document shows an installment plan, report the total premium for the term and capture the plan in premiumFrequency.
- lineOfBusiness MUST be exactly one of: ${WRITE_BRANCH_IDS.join(", ")}.

LANGUAGE:
- Plain string fields: keep the document's original language (Greek stays Greek).
- Fields the schema defines as an {en, el} object: provide BOTH English and Greek.
- Never emit an {en, el} object where the schema expects a plain string.

FINE PRINT & HIDDEN VALUE (inside acordData):
- finePrintClauses: clauses that limit coverage, impose obligations, or hide exclusions — hunt the Γενικοί Όροι, Ειδικοί Όροι, Εξαιρέσεις and Απαλλαγές sections.
- perksAndBenefits: every free service, assistance hotline, prevention program, discount, or gift — including the phone number to use it.
- notableConditions: waiting periods, auto-renewal terms, claim-filing deadlines (προθεσμία αναγγελίας), notification obligations, sub-limits, co-payments.${
        extractionCitationsEnabled() ? `\n${CITATIONS_PROMPT_SECTION}` : ""
    }`
}

// ── Gap analysis ────────────────────────────────────────────────────

function formatGapDefinitions(gapDefinitions: GapDefinitionForAI[]): string {
    return gapDefinitions.map((g) => `- ${g.slug}: ${g.checkCriteria}`).join("\n")
}

const GAP_RESULT_RULES = `For EVERY gap listed above, return exactly one gapResults entry with the same slug.
Base isDetected only on the information provided. If the information is insufficient to decide, set isDetected to false and state what is missing in the explanation.
Respond in Greek (Ελληνικά) only. explanation and suggestion must be plain Greek strings.`

/** Gap analysis from the structured extraction result (no PDF re-send). */
export function buildGapAnalysisPromptFromContext(
    ctx: AIPolicyExtractionResponse,
    gapDefinitions: GapDefinitionForAI[]
): string {
    return `You are an expert insurance analyst. Analyze the following pre-extracted policy data to identify coverage gaps.

Extracted Policy Data:
- Insurer: ${ctx.insurerName} | Policy: ${ctx.policyNumber} | Type: ${ctx.lineOfBusiness}
- Period: ${ctx.startDate} to ${ctx.endDate} | Premium: ${ctx.premiumAmount}
- Summary: ${ctx.coverageSummary || "N/A"}
- Exclusions: ${ctx.exclusions?.join(", ") || "None extracted"}
${ctx.acordData ? `- ACORD Data: ${JSON.stringify(ctx.acordData)}` : ""}

Potential Gaps to Check:
${formatGapDefinitions(gapDefinitions)}

${GAP_RESULT_RULES}`
}

/** Gap analysis with the document attached (fallback when no extraction context exists). */
export function buildGapAnalysisPromptFromDocument(
    metadata: PolicyMetadata,
    gapDefinitions: GapDefinitionForAI[]
): string {
    return `You are an expert insurance analyst with deep knowledge of ACORD standards and European insurance policies.
TASK: Analyze the provided policy document and metadata to identify coverage gaps.
CRITICAL: The DOCUMENT is the SOURCE OF TRUTH. Current metadata may be incomplete or incorrect — verify against the document.
Step 1: Verify insurer, policy number, dates, and premium from the DOCUMENT. If the document is missing, use the current metadata.
Step 2: Check for gaps.

Current Metadata (Reference Only):
Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
Dates: ${isoDate(metadata.startDate)} to ${isoDate(metadata.endDate)}
Premium: ${metadata.premiumAmount ?? "N/A"} | Summary: ${metadata.coverageSummary || "N/A"}

Potential Gaps to Check:
${formatGapDefinitions(gapDefinitions)}

${GAP_RESULT_RULES}`
}

// ── Clarity ─────────────────────────────────────────────────────────

export interface ClarityChecklistPillar {
    key: string
    title: { en: string; el: string }
    description: { en: string; el: string }
    checks: string[]
}

function formatChecklist(checklist: ClarityChecklistPillar[]): string {
    return checklist
        .map((pillar) => `- ${pillar.key}: ${pillar.title.en} | checks: ${pillar.checks.join(", ")}`)
        .join("\n")
}

const CLARITY_GOAL = `Goal: 1) Plain-language insights 2) Savings opportunities 3) Coverage gaps 4) Checklist scoring
5) Fine print warnings 6) Hidden perks and free services.
Respond in Greek (Ελληνικά) only. All text fields must be in Greek.`

const CLARITY_SPECIAL_FOCUS = `SPECIAL FOCUS — Fine Print & Hidden Value:
- Identify clauses, restrictions, and conditions that most consumers would be SURPRISED by (look at Γενικοί/Ειδικοί Όροι, Εξαιρέσεις, Απαλλαγές material).
- Highlight ALL free prevention services, assistance phone numbers, and gifts.
- Flag auto-renewal traps, claim-filing deadlines, and notification obligations.`

const CLARITY_SCORING_RULES = `Checklist scoring: for each pillar, checksTotal must equal the number of checks listed for that pillar, checksPassed the count satisfied by this policy, and successPct = round(checksPassed / checksTotal × 100).`

/** Clarity report from the structured extraction result (no PDF re-send). */
export function buildClarityPromptFromContext(
    ctx: AIPolicyExtractionResponse,
    checklist: ClarityChecklistPillar[]
): string {
    return `You are an insurance clarity analyst for policyholders.
${CLARITY_GOAL}
Use the extracted data below as source of truth. If details are missing, say so and lower confidence.

${CLARITY_SPECIAL_FOCUS}

Extracted Policy Data:
- Insurer: ${ctx.insurerName} | Policy: ${ctx.policyNumber} | Type: ${ctx.lineOfBusiness}
- Period: ${ctx.startDate} to ${ctx.endDate} | Premium: ${ctx.premiumAmount}
- Summary: ${ctx.coverageSummary || "N/A"}
- Exclusions: ${ctx.exclusions?.join(", ") || "None extracted"}
${ctx.acordData ? `- ACORD Data: ${JSON.stringify(ctx.acordData)}` : ""}

Checklist pillars:
${formatChecklist(checklist)}

${CLARITY_SCORING_RULES}`
}

/** Clarity report with the document attached (fallback when no extraction context exists). */
export function buildClarityPromptFromDocument(
    metadata: PolicyMetadata,
    checklist: ClarityChecklistPillar[]
): string {
    return `You are an insurance clarity analyst for policyholders.
${CLARITY_GOAL}
Use the document as source of truth. If details are missing, say so and lower confidence.

${CLARITY_SPECIAL_FOCUS}

Current metadata:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Period: ${isoDate(metadata.startDate)} to ${isoDate(metadata.endDate)}
- Premium: ${metadata.premiumAmount ?? "N/A"} | Summary: ${metadata.coverageSummary || "N/A"}

Checklist pillars:
${formatChecklist(checklist)}

${CLARITY_SCORING_RULES}`
}

// ── Q&A ─────────────────────────────────────────────────────────────

export function buildQaPrompt(
    metadata: PolicyMetadata,
    question: string,
    acordData?: unknown
): string {
    const acordContext = acordData
        ? `\n\nDetailed Policy Data (ACORD):\n${JSON.stringify(acordData, null, 2)}`
        : ""

    return `You are an insurance advisor helping a policyholder understand their insurance policy.
Answer in the language of the question (a Greek question gets a Greek answer).
Base your answer ONLY on the policy data provided. If the information is not available, say so plainly.
If the question is about coverage, state clearly what IS covered and what is NOT.
Use simple language that a non-expert can understand.

Policy Information:
- Insurer: ${metadata.insurerName} | Policy: ${metadata.policyNumber} | Type: ${metadata.lineOfBusiness}
- Period: ${isoDate(metadata.startDate)} to ${isoDate(metadata.endDate)}
- Premium: ${metadata.premiumAmount ?? "N/A"} | Summary: ${metadata.coverageSummary || "N/A"}${acordContext}

User Question: ${question}`
}

// ── Risk profile ────────────────────────────────────────────────────

export function buildRiskProfilePrompt(
    profile: RiskProfileInput,
    existingPolicies: PolicyMetadata[]
): string {
    const policySummary = existingPolicies.length > 0
        ? existingPolicies.map(p =>
            `- ${p.lineOfBusiness} (${p.insurerName}): premium ${p.premiumAmount ?? "unknown"}€, expires ${isoDate(p.endDate)}`
        ).join("\n")
        : "No policies currently held."

    const age = profile.dateOfBirth
        ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

    return `You are an informational insurance-analysis assistant for the Greek market. Analyze this person's risk profile and current insurance portfolio for educational purposes.

## Risk Profile
- Age: ${age ?? "Unknown"}
- Marital status: ${profile.maritalStatus || "Unknown"}
- Dependents: ${profile.dependentsCount}
- Employment: ${profile.employmentStatus || "Unknown"}
- Occupation: ${profile.occupation || "Unknown"}
- Annual income: ${profile.annualIncome ? `€${profile.annualIncome}` : "Unknown"}
- Owns home: ${profile.ownsHome ? "Yes" : "No"}
- Mortgage: ${profile.mortgageAmount ? `€${profile.mortgageAmount}` : "None"}
- Vehicles: ${profile.vehiclesCount}
- Has pets: ${profile.hasPets ? "Yes" : "No"}
- Travels frequently: ${profile.travelsFrequently ? "Yes" : "No"}
- Has loans: ${profile.hasLoans ? "Yes" : "No"}${profile.loanAmount ? ` (€${profile.loanAmount})` : ""}
- Smoking status: ${profile.smokingStatus || "Unknown"}
- Life events: ${profile.lifeEvents?.length ? profile.lifeEvents.map(e => `${e.type} (${e.date})`).join(", ") : "None reported"}
- Gender: ${profile.gender || "Unknown"}
- BMI: ${profile.heightCm && profile.weightKg ? (profile.weightKg / ((profile.heightCm / 100) ** 2)).toFixed(1) : "Unknown"}
- Activity level: ${profile.activityLevel || "Unknown"}
- Chronic conditions: ${profile.chronicConditions?.length ? profile.chronicConditions.join(", ") : "None reported"}
- Family medical history: ${profile.familyMedicalHistory?.length ? profile.familyMedicalHistory.join(", ") : "None reported"}
- Driving record: ${profile.drivingRecord || "Unknown"}

## Current Insurance Portfolio
${policySummary}

## Instructions
1. Consider the Greek insurance market context (mandatory motor, ENFIA property requirements, ESY public health)
2. Identify the most critical coverage gaps given this person's specific situation
3. Provide factual, informational observations about coverage gaps and overlaps; do not give personalized financial or insurance advice or tell the user what they "should" buy. Phrase findings as observations (e.g. "this profile appears to lack ...", "this policy may not cover ...").
4. Be bilingual: provide both English and Greek for all text fields
5. Consider life stage, income level, and family situation when assessing urgency
6. Limit insights to max 5, prioritized gaps to max 5, strengths to max 3`
}
