import { OPEN_GAP_STATUSES } from "@/lib/wallet/gap-status"
import { hasPasswordCredential, passwordPresence } from "@/lib/services/credential-signals"
import { BaseService } from "./base.service";
import { agentPolicyVisibilityWhere, getGrantedPolicyIds, isPolicyVisibleToAgent } from "@/lib/agent-visibility";
import { agentMaySeeCustomerIdentity, isPhantomCustomer } from "@/lib/agent-consent";
import { effectivePolicyStatus, isPolicyCoverageActive, isCoveredByEndDate, resolvePolicyLifecycle } from "@/lib/policy-status";
import { normalizeTaxId } from "@/lib/identity/tax-id";
import { normalizeEmail } from "@/lib/identity/normalize-email";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { policyRowIdentity } from "@/lib/wallet/policy-identity"
import { resolvePolicyStatusKey } from "@/lib/wallet/policy-status-view"
import { resolveInsurerDisplay } from "@/lib/wallet/insurer-registry"

export interface CustomerFilters {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface CreateCustomerData {
    email: string;
    /**
     * `email` is the synthetic, non-deliverable placeholder because the
     * customer has none (lib/validations/agent-intake.ts customerEmailIdentity).
     * Written onto the phantom so every sender and the invite flow refuse it.
     */
    contactEmailMissing?: boolean;
    name: string;
    phoneNumber?: string;
    taxId?: string;
    notes?: string;
}

export class CustomerService extends BaseService {

    /**
     * Get paginated list of customers for an agent
     */
    async getCustomers(agentUserId: string, filters: CustomerFilters = {}) {
        const { search, status, page = 1, limit = 10 } = filters;
        const skip = (page - 1) * limit;

        // Policies the agent may see: their own uploads + owner-granted ones.
        const visibilityWhere = agentPolicyVisibilityWhere(
            agentUserId,
            await getGrantedPolicyIds(agentUserId)
        );

        const where: Prisma.CustomerRelationshipWhereInput = {
            agentUserId,
            // Terminated relationships (GDPR erasure or explicit removal) leave the
            // book entirely; an explicit status filter still cannot resurface them.
            ...(status ? { status } : { status: { not: 'terminated' } }),
            ...(search && {
                OR: [
                    { customer: { name: { contains: search, mode: 'insensitive' } } },
                    { customer: { email: { contains: search, mode: 'insensitive' } } },
                ]
            })
        };

        const [total, customers] = await Promise.all([
            this.db.customerRelationship.count({ where }),
            this.db.customerRelationship.findMany({
                where,
                include: {
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            // Whether `email` is the synthetic no-email placeholder.
                            contactEmailMissing: true,
                            image: true,
                            phoneNumber: true,
                            createdAt: true,
                            // Consent signals — an unconsented real account must
                            // not leak its name/phone/image (see agent-consent).
                            emailVerified: true,
                            // Only what the agent may see: policies they
                            // uploaded, or ones the owner explicitly granted.
                            // coverageEndDate (denormalized) lets us judge "in
                            // force" without deserializing the heavy acordData
                            // JSON per policy on every customer-list render.
                            policiesOwned: {
                                where: visibilityWhere,
                                select: { id: true, status: true, coverageEndDate: true }
                            },
                        }
                    },
                    opportunities: {
                        where: { status: 'open' },
                        select: { id: true }
                    }
                },
                orderBy: { lastInteractionAt: 'desc' },
                skip,
                take: limit,
            })
        ]);

        // Credential PRESENCE for the identity rule — never the hash (A-01).
        const credentialPresence = await passwordPresence(this.db, customers.map((rel) => rel.customer.id));
        return {
            data: customers.map(rel => {
                // Identity (name/phone/image) only for consented / phantom /
                // already-managed customers. Email stays — the agent typed it.
                const showIdentity = agentMaySeeCustomerIdentity(
                    rel,
                    { ...rel.customer, hasPassword: credentialPresence.has(rel.customer.id) },
                    rel.customer.policiesOwned.length
                );
                return {
                    id: rel.customer.id,
                    relationshipId: rel.id,
                    name: showIdentity ? rel.customer.name : null,
                    email: rel.customer.email,
                    contactEmailMissing: rel.customer.contactEmailMissing,
                    image: showIdentity ? rel.customer.image : null,
                    phoneNumber: showIdentity ? rel.customer.phoneNumber : null,
                    status: rel.status,
                    // The consent/invite stage, distinct from `status`: a
                    // pending_activation row is "invited" only when an invite
                    // actually went out.
                    activationStatus: rel.activationStatus,
                    joinedAt: rel.customer.createdAt,
                    policyCount: rel.customer.policiesOwned.length,
                    activePolicyCount: rel.customer.policiesOwned.filter(p => isCoveredByEndDate(p)).length,
                    openOpportunities: rel.opportunities.length,
                    lastInteraction: rel.lastInteractionAt,
                };
            }),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get detailed customer profile
     */
    async getCustomerProfile(agentUserId: string, customerId: string) {
        // Prisma DROPS an undefined where-condition rather than matching
        // nothing, so `policyholderUserId: undefined` below would return
        // whichever of this agent's customers sorts first — and the page
        // would then attach uploads to that person. Refuse a missing id here,
        // at the one place every profile read goes through.
        if (!agentUserId || !customerId) {
            throw new AppError({
                code: 'VALIDATION',
                message: "Customer id is required",
                statusCode: 400
            });
        }

        const visibilityWhere = agentPolicyVisibilityWhere(
            agentUserId,
            await getGrantedPolicyIds(agentUserId)
        );

        const relationship = await this.db.customerRelationship.findFirst({
            where: {
                agentUserId,
                policyholderUserId: customerId,
                status: { not: 'terminated' }
            },
            include: {
                customer: {
                    include: {
                        policiesOwned: {
                            where: visibilityWhere,
                            orderBy: { startDate: 'desc' },
                            include: {
                                gapInstances: {
                                    // The LIVE set (open + detected + acknowledged, not
                                    // superseded): 'open' alone under-counted the profile's
                                    // findings and applied no supersession scope (A-15).
                                    where: { status: { in: [...OPEN_GAP_STATUSES] }, supersededAt: null },
                                },
                                // One completed run is enough to know a branded
                                // report can be generated for this policy.
                                analysisRuns: {
                                    where: { status: { in: ['completed', 'completed_with_warnings'] } },
                                    select: { id: true },
                                    take: 1,
                                }
                            }
                        }
                    }
                },
                opportunities: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        policy: { select: { policyNumber: true, insurerName: true } },
                        gapInstance: { include: { definition: true } }
                    }
                }
            }
        });

        if (!relationship) {
            throw new AppError({
                code: 'NOT_FOUND',
                message: "Customer not found or access denied",
                statusCode: 404
            });
        }

        // Identity (name/phone/image) only for consented / phantom /
        // already-managed customers — a bare relationship is not consent.
        const showIdentity = agentMaySeeCustomerIdentity(
            relationship,
            { ...relationship.customer, hasPassword: await hasPasswordCredential(this.db, relationship.customer.id) },
            relationship.customer.policiesOwned.length
        );

        // GDPR read-access audit: record that this agent viewed this customer's
        // profile, queryable by targetUserId for a right-of-access report.
        // Best-effort — the audit log must never fail or block the read.
        try {
            const agent = await this.db.user.findUnique({
                where: { id: agentUserId },
                select: { email: true },
            });
            await this.db.activityLog.create({
                data: {
                    adminUserId: agentUserId,
                    adminEmail: agent?.email ?? "",
                    actionType: "AGENT_VIEWED_CUSTOMER",
                    description: "Agent viewed customer profile",
                    targetUserId: customerId,
                },
            });
        } catch {
            // audit log is best-effort; never let it break a read
        }

        return {
            customer: {
                id: relationship.customer.id,
                name: showIdentity ? relationship.customer.name : null,
                email: relationship.customer.email,
                contactEmailMissing: relationship.customer.contactEmailMissing,
                phone: showIdentity ? relationship.customer.phoneNumber : null,
                image: showIdentity ? relationship.customer.image : null,
            },
            relationship: {
                id: relationship.id,
                status: relationship.status,
                activationStatus: relationship.activationStatus,
                joinedAt: relationship.createdAt,
                lastInteraction: relationship.lastInteractionAt,
            },
            policies: relationship.customer.policiesOwned.map(p => ({
                id: p.id,
                number: p.policyNumber,
                // The registry's display name — the same resolver the customer's wallet applies —
                // so one insurer has one name on both sides (PW-BRIDGE-01 A-21). A placeholder
                // resolves to "" and falls back to the raw sentinel, which the identity module then
                // refuses to render.
                insurer: resolveInsurerDisplay(p.insurerName).displayName || p.insurerName,
                type: p.lineOfBusiness,
                // The wallet's ONE status pipeline (lifecycle + identity/extraction rules), not the
                // bare lifecycle: the customer saw «ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ» where the agent saw «Ενεργό» (A-20).
                status: resolvePolicyStatusKey(p),
                premium: p.premiumAmount,
                startDate: p.startDate,
                // ...and the date beside that status has to come from the same
                // resolution. This read `p.endDate`, the stored column, which
                // resolvePolicyLifecycle treats as the LAST fallback behind a
                // renewal re-upload and the extracted envelope. So a renewed
                // policy showed the agent its resolved status next to its
                // pre-renewal expiry date — the one date an insurance servicing
                // workflow actually runs on.
                expiresAt: resolvePolicyLifecycle(p).endDate ?? p.endDate,
                gaps: p.gapInstances.length,
                hasAnalysis: p.analysisRuns.length > 0,
                // What tells THIS policy apart from the client's other one on the
                // same line. Resolved here, server-side, the way the dashboard
                // does it — the client view had a `carPlate` field that nothing
                // ever populated, so its plate line could not render.
                assetLabel: policyRowIdentity(p).value,
                createdByUserId: p.createdByUserId
            })),
            opportunities: relationship.opportunities.map(o => ({
                id: o.id,
                status: o.status,
                notes: o.notes,
                createdAt: o.createdAt,
                severity: o.gapInstance?.severity,
                policyId: o.policyId,
                gapInstanceId: o.gapInstanceId,
                relatedPolicy: o.policy?.policyNumber,
                relatedGap: o.gapInstance?.definition.title
            }))
        };
    }

    /**
     * Create a new customer (manual entry)
     */
    async createCustomer(agentUserId: string, data: CreateCustomerData) {
        const taxId = normalizeTaxId(data.taxId);
        // Same key auth signs the customer up under — see lib/identity/normalize-email.
        const email = normalizeEmail(data.email);
        if (!email) {
            throw new AppError({ code: 'VALIDATION', message: "Email is required", statusCode: 400 });
        }

        // 1. Check if user exists
        let user = await this.db.user.findUnique({
            where: { email }
        });

        // Whether the agent's ΑΦΜ was dropped because the account is not theirs
        // to annotate (see below).
        let taxIdIgnored = false;

        if (!user) {
            // Create phantom user
            user = await this.db.user.create({
                data: {
                    email,
                    // A no-email customer (D3) is keyed on the synthetic address
                    // and flagged, so every sender and the invite flow refuse it.
                    contactEmailMissing: data.contactEmailMissing === true,
                    name: data.name,
                    phoneNumber: data.phoneNumber,
                    taxId,
                    roles: 'policyholder', // Default role
                    password: null, // No password, phantom user
                    emailVerified: null,
                    policyholderProfile: {
                        create: {}
                    }
                }
            });
        } else if (taxId && !user.taxId) {
            // Backfill ΑΦΜ only onto a PHANTOM the agent side owns (no
            // password, never email-verified — nobody else to consent), and
            // only when the record has none. This runs BEFORE any relationship
            // exists, so for an activated account it would let anyone who
            // knows an email write a tax id onto a stranger's profile.
            if (isPhantomCustomer({ hasPassword: await hasPasswordCredential(this.db, user.id), emailVerified: user.emailVerified })) {
                await this.db.user.update({
                    where: { id: user.id },
                    data: { taxId },
                });
            } else {
                taxIdIgnored = true;
            }
        }

        // 2. Check if relationship exists
        const existingRel = await this.db.customerRelationship.findUnique({
            where: {
                agentUserId_policyholderUserId: {
                    agentUserId,
                    policyholderUserId: user.id
                }
            }
        });

        if (existingRel) {
            throw AppError.conflict("Customer already exists in your list");
        }

        // 3. Create relationship as PENDING — never unilaterally 'active'.
        // An agent adding a customer (phantom or a real, already-activated
        // account) is not consent from that person to THIS agent, so calling the
        // relationship 'active' ("activated" in the UI, and counted in the
        // agent's activation stats) misrepresents a real user who never agreed.
        // It becomes 'active' only when the customer accepts (redeemInviteCode /
        // invite signup). Identity consent is gated separately by
        // activationStatus (see lib/agent-consent.ts), which stays at its default
        // until the customer accepts.
        const relationship = await this.db.customerRelationship.create({
            data: {
                agentUserId,
                policyholderUserId: user.id,
                status: 'pending_activation',
                lastInteractionAt: new Date()
            }
        });

        await this.logActivity(agentUserId, 'CUSTOMER_ADDED', `Added customer ${data.name}`, {
            customerId: user.id,
            relationshipId: relationship.id
        });

        return { ...relationship, taxIdIgnored };
    }

    /**
     * Get Dashboard Stats for Mission Control
     */
    async getDashboardStats(agentUserId: string) {
        // Relationship counts by status — one grouped query. (The old `overview`
        // and `recentActivity` blocks were computed and then discarded by the
        // only caller, which reads .summary — including an expensive
        // acordData-laden policy scan and a conversionRate:0 placeholder.)
        const statusGroups = await this.db.customerRelationship.groupBy({
            by: ['status'],
            where: { agentUserId },
            _count: { _all: true }
        });

        const statusCount = (status: string) =>
            statusGroups.find((g) => g.status === status)?._count._all ?? 0;

        return {
            summary: {
                activated: statusCount('active'),
                invited: statusCount('pending_activation'),
                inactive: statusCount('inactive')
            }
        };
    }

    /**
     * Get Actionable Priorities for Agent
     */
    async getAgentPriorities(agentUserId: string) {
        const priorities: Array<{
            id: string;
            type: 'open_opportunity' | 'follow_up' | 'pending_invite';
            customerId: string;
            customerName: string;
            message: string;
            priority: number;
            dueDate: Date | null;
        }> = [];

        // 1. Open Opportunities
        const openOpps = await this.db.opportunity.findMany({
            where: {
                ownerAgentUserId: agentUserId,
                status: 'open'
            },
            include: {
                relationship: {
                    include: { customer: true }
                },
                gapInstance: {
                    include: { definition: true }
                }
            },
            take: 5
        });

        openOpps.forEach(opp => {
            priorities.push({
                id: opp.id,
                type: 'open_opportunity',
                customerId: opp.relationship.policyholderUserId,
                customerName: opp.relationship.customer?.name || 'Unknown',
                message: `New risk gap detected: ${opp.gapInstance?.definition.title || 'Coverage Gap'}`,
                // Severity is not an ordering axis (PW-TRANSPARENCY-02 B1).
                priority: 2,
                dueDate: opp.nextActionAt ?? opp.createdAt,
            });
        });

        // 2. Follow-up Needed (7 days inactivity)
        const followUps = await this.db.customerRelationship.findMany({
            where: {
                agentUserId,
                status: 'active',
                lastInteractionAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            },
            include: { customer: true },
            take: 5
        });

        followUps.forEach(rel => {
            priorities.push({
                id: rel.id,
                type: 'follow_up',
                customerId: rel.policyholderUserId,
                customerName: rel.customer?.name || 'Unknown',
                message: "Customer hasn't been contacted in over a week.",
                priority: 3,
                dueDate: rel.lastInteractionAt ? new Date(rel.lastInteractionAt.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
            });
        });

        // 3. Pending Invites (3+ days)
        const pendingInvites = await this.db.invite.findMany({
            where: {
                inviterUserId: agentUserId,
                consumedAt: null,
                createdAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
            },
            take: 5
        });

        pendingInvites.forEach(inv => {
            priorities.push({
                id: inv.id,
                type: 'pending_invite',
                customerId: '',
                customerName: inv.inviteeEmail,
                message: "Invitation sent 3+ days ago but not yet opened.",
                priority: 4,
                dueDate: inv.expiresAt,
            });
        });

        return priorities.sort((a, b) => a.priority - b.priority);
    }
}
