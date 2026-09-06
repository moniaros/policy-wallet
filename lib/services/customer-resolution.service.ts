import { hasPasswordCredential, passwordPresence } from "@/lib/services/credential-signals"
import { BaseService } from "./base.service";
import { agentPolicyVisibilityWhere, getGrantedPolicyIds } from "@/lib/agent-visibility";
import { normalizeTaxId, isValidGreekAfm, maskTaxId } from "@/lib/identity/tax-id";
import { normalizeEmail } from "@/lib/identity/normalize-email";

export interface ResolveCustomerInput {
    taxId?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
}

export type CustomerMatchReason = "vat" | "email" | "phone" | "name";

/**
 * Whether an AI analysis can run for this customer if the advisor uploads now.
 *
 * - `granted`    — consent on file; analysis runs.
 * - `attestable` — the account was never activated, so the advisor may attest
 *                  on their behalf (the checkbox in UploadPolicyModal).
 * - `blocked`    — a live account that has not consented. Only the customer can
 *                  unblock this; the advisor can request it but not grant it.
 *
 * Mirrors the decision commitScannedPolicy makes AFTER the upload. Surfacing it
 * BEFORE means the advisor no longer spends a scan, a token budget and ~90s to
 * discover that nothing will be analysed.
 */
export type CandidateAiConsent = "granted" | "attestable" | "blocked";

export function deriveAiConsentState(user: {
    aiProcessingConsentVersion: string | null;
    /** Credential PRESENCE from lib/services/credential-signals.ts — never the hash (A-01). */
    hasPassword: boolean;
    emailVerified: Date | null;
    lastActiveAt: Date | null;
}): CandidateAiConsent {
    if (user.aiProcessingConsentVersion) return "granted";
    // MUST match the canonical activation check in commitScannedPolicy: a user
    // who has EVER been active is a live account and must be asked directly.
    const unactivated = !user.hasPassword && !user.emailVerified && !user.lastActiveAt;
    return unactivated ? "attestable" : "blocked";
}

export interface CustomerCandidate {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    taxIdMasked: string | null;
    policyCount: number;
    status: string;
    matchReason: CustomerMatchReason;
    score: number;
    /** Whether AI analysis will run if the advisor commits a policy now. */
    aiConsent: CandidateAiConsent;
}

export interface CustomerResolution {
    /** The single confident match, when VAT or email resolves unambiguously. */
    exactMatch?: CustomerCandidate;
    /** All matches (incl. the exactMatch), highest score first — feeds the picker. */
    candidates: CustomerCandidate[];
    /** True when a valid VAT and the email point at different customers. */
    conflict: boolean;
}

function normalizePhone(raw?: string | null): string | null {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, "");
    return digits.length >= 7 ? digits : null;
}

/** Compare on the last 8 significant digits to ignore country-code/format noise. */
function phonesMatch(a?: string | null, b?: string | null): boolean {
    const da = normalizePhone(a);
    const db = normalizePhone(b);
    if (!da || !db) return false;
    return da.slice(-8) === db.slice(-8);
}

function nameMatches(candidate?: string | null, query?: string | null): boolean {
    if (!candidate || !query) return false;
    const c = candidate.trim().toLowerCase();
    const q = query.trim().toLowerCase();
    if (!c || !q) return false;
    return c.includes(q) || q.includes(c);
}

/**
 * Resolve an extracted policyholder identity to the agent's existing customers.
 *
 * Matching is strictly scoped to the agent's own (non-inactive) relationships —
 * it never surfaces another agent's customers. Precedence: valid ΑΦΜ > email >
 * phone > name. A valid ΑΦΜ and an email that disagree return no exactMatch and
 * flag `conflict`, so the agent always resolves the ambiguity themselves.
 */
export class CustomerResolutionService extends BaseService {
    async resolveCustomerCandidates(
        agentUserId: string,
        input: ResolveCustomerInput
    ): Promise<CustomerResolution> {
        const taxId = normalizeTaxId(input.taxId);
        // Only a structurally valid ΑΦΜ is trusted as a strong single-match key.
        const canVatMatch = isValidGreekAfm(taxId);
        const email = normalizeEmail(input.email) || null;
        const phone = normalizePhone(input.phone);
        const name = input.name?.trim() || null;

        const or: any[] = [];
        if (taxId) or.push({ customer: { taxId } });
        if (email) or.push({ customer: { email: { equals: email, mode: "insensitive" } } });
        if (name) or.push({ customer: { name: { contains: name, mode: "insensitive" } } });
        if (phone) or.push({ customer: { phoneNumber: { contains: phone } } });

        if (or.length === 0) return { candidates: [], conflict: false };

        const visibilityWhere = agentPolicyVisibilityWhere(
            agentUserId,
            await getGrantedPolicyIds(agentUserId)
        );

        const rels = await this.db.customerRelationship.findMany({
            where: {
                agentUserId,
                status: { notIn: ["inactive", "terminated"] },
                OR: or,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phoneNumber: true,
                        taxId: true,
                        // Whether an AI analysis can actually run for this
                        // customer — see deriveAiConsentState.
                        aiProcessingConsentVersion: true,
                        emailVerified: true,
                        lastActiveAt: true,
                        // Only agent-visible policies, mirroring getCustomers.
                        policiesOwned: { where: visibilityWhere, select: { id: true } },
                    },
                },
            },
            take: 25,
        });

        // Credential PRESENCE for the consent verdict — never the hash (A-01).
        const credentialPresence = await passwordPresence(this.db, rels.map((r) => r.customer.id));
        const candidates: CustomerCandidate[] = [];
        for (const rel of rels) {
            const c = rel.customer;
            let matchReason: CustomerMatchReason | null = null;
            let score = 0;

            const candTax = normalizeTaxId(c.taxId);
            if (canVatMatch && candTax && candTax === taxId) {
                matchReason = "vat";
                score = 100;
            } else if (email && normalizeEmail(c.email) === email) {
                matchReason = "email";
                score = 90;
            } else if (phone && phonesMatch(c.phoneNumber, phone)) {
                matchReason = "phone";
                score = 60;
            } else if (name && nameMatches(c.name, name)) {
                matchReason = "name";
                score = 40;
            }

            if (!matchReason) continue;

            candidates.push({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phoneNumber,
                taxIdMasked: maskTaxId(c.taxId),
                policyCount: c.policiesOwned.length,
                status: rel.status,
                matchReason,
                score,
                aiConsent: deriveAiConsentState({ ...c, hasPassword: credentialPresence.has(c.id) }),
            });
        }

        candidates.sort((a, b) => b.score - a.score);

        const vatMatches = candidates.filter((c) => c.matchReason === "vat");
        const emailMatch = candidates.find((c) => c.matchReason === "email");

        const conflict = Boolean(
            vatMatches.length === 1 && emailMatch && emailMatch.id !== vatMatches[0].id
        );

        let exactMatch: CustomerCandidate | undefined;
        if (vatMatches.length === 1 && !conflict) {
            exactMatch = vatMatches[0];
        } else if (vatMatches.length === 0 && emailMatch) {
            exactMatch = emailMatch;
        }

        return { exactMatch, candidates, conflict };
    }
}

export const customerResolutionService = new CustomerResolutionService();
