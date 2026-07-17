import { BaseService } from "./base.service";
import { agentPolicyVisibilityWhere, getGrantedPolicyIds, isPolicyVisibleToAgent } from "@/lib/agent-visibility";
import { agentMaySeeCustomerIdentity } from "@/lib/agent-consent";
import { effectivePolicyStatus, isPolicyCoverageActive, isCoveredByEndDate } from "@/lib/policy-status";
import { normalizeTaxId } from "@/lib/identity/tax-id";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";

export interface CustomerFilters {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
}

export interface CreateCustomerData {
    email: string;
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
            ...(status && { status }),
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
                            image: true,
                            phoneNumber: true,
                            createdAt: true,
                            // Consent signals — an unconsented real account must
                            // not leak its name/phone/image (see agent-consent).
                            password: true,
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

        return {
            data: customers.map(rel => {
                // Identity (name/phone/image) only for consented / phantom /
                // already-managed customers. Email stays — the agent typed it.
                const showIdentity = agentMaySeeCustomerIdentity(
                    rel,
                    rel.customer,
                    rel.customer.policiesOwned.length
                );
                return {
                    id: rel.customer.id,
                    relationshipId: rel.id,
                    name: showIdentity ? rel.customer.name : null,
                    email: rel.customer.email,
                    image: showIdentity ? rel.customer.image : null,
                    phoneNumber: showIdentity ? rel.customer.phoneNumber : null,
                    status: rel.status,
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
        const visibilityWhere = agentPolicyVisibilityWhere(
            agentUserId,
            await getGrantedPolicyIds(agentUserId)
        );

        const relationship = await this.db.customerRelationship.findFirst({
            where: {
                agentUserId,
                policyholderUserId: customerId
            },
            include: {
                customer: {
                    include: {
                        policiesOwned: {
                            where: visibilityWhere,
                            orderBy: { startDate: 'desc' },
                            include: {
                                gapInstances: {
                                    where: { status: 'open' }
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
            relationship.customer,
            relationship.customer.policiesOwned.length
        );

        return {
            customer: {
                id: relationship.customer.id,
                name: showIdentity ? relationship.customer.name : null,
                email: relationship.customer.email,
                phone: showIdentity ? relationship.customer.phoneNumber : null,
                image: showIdentity ? relationship.customer.image : null,
            },
            relationship: {
                id: relationship.id,
                status: relationship.status,
                joinedAt: relationship.createdAt,
                lastInteraction: relationship.lastInteractionAt,
            },
            policies: relationship.customer.policiesOwned.map(p => ({
                id: p.id,
                number: p.policyNumber,
                insurer: p.insurerName,
                type: p.lineOfBusiness,
                // Lifecycle truth — the stored column is never recomputed.
                status: effectivePolicyStatus(p),
                premium: p.premiumAmount,
                startDate: p.startDate,
                expiresAt: p.endDate,
                gaps: p.gapInstances.length,
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

        // 1. Check if user exists
        let user = await this.db.user.findUnique({
            where: { email: data.email }
        });

        if (!user) {
            // Create phantom user
            user = await this.db.user.create({
                data: {
                    email: data.email,
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
            // Backfill ΑΦΜ only when the existing record has none — never
            // overwrite a value the customer or another source already set.
            await this.db.user.update({
                where: { id: user.id },
                data: { taxId },
            });
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

        // 3. Create relationship. Status must reflect the CUSTOMER's reality:
        // a manually-added phantom (no password / never verified / never seen)
        // has not activated anything, so calling the relationship 'active'
        // ("activated" in the UI) inflates the activation rate and misrepresents
        // the customer. Only an already-activated account is 'active'; everyone
        // else is 'pending_activation' until they join.
        const isActivatedAccount = Boolean(user.password || user.emailVerified || user.lastActiveAt);
        const relationship = await this.db.customerRelationship.create({
            data: {
                agentUserId,
                policyholderUserId: user.id,
                status: isActivatedAccount ? 'active' : 'pending_activation',
                lastInteractionAt: new Date()
            }
        });

        await this.logActivity(agentUserId, 'CUSTOMER_ADDED', `Added customer ${data.name}`, {
            customerId: user.id,
            relationshipId: relationship.id
        });

        return relationship;
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
                priority: opp.gapInstance?.severity === 'critical' || opp.gapInstance?.severity === 'high' ? 1 : 2,
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
