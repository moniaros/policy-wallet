import { z } from "zod"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { rateLimit } from "@/lib/rate-limit"

// PUBLIC_ENDPOINT_AUTH_STRATEGY: rate_limit + zod_payload_validation + hubspot_crm_sink

const waitlistSchema = z.object({
    email: z.string().email(),
    profile_type: z.enum(["individual", "family", "small_business"]).optional().default("individual"),
    waitlist_intent: z.enum(["save_money", "organize_policies", "health_coverage", "avoid_missed_renewals"]).nullable().optional(),
    source_context: z.string().trim().max(64).optional().default("exit_intent"),
    referrer_source: z.enum(["organic", "facebook", "tech_blog", "direct", "email", "partner"]).optional().default("direct"),
    device_type: z.enum(["mobile", "tablet", "desktop"]).optional().default("desktop"),
    time_on_page: z.number().int().min(0).max(86400).optional().default(0),
    primary_cta_interacted: z.boolean().optional().default(false),
    locale: z.enum(["el", "en"]).optional().default("el"),
})

type WaitlistPayload = z.infer<typeof waitlistSchema>

type HubSpotSearchResult = {
    results: Array<{ id: string }>
}

function getHubSpotToken() {
    return process.env.HUBSPOT_ACCESS_TOKEN || ""
}

function buildLeadContext(payload: WaitlistPayload) {
    return [
        "PolicyWallet Waitlist Lead",
        `source_context=${payload.source_context}`,
        `profile_type=${payload.profile_type}`,
        `waitlist_intent=${payload.waitlist_intent || "none"}`,
        `referrer_source=${payload.referrer_source}`,
        `device_type=${payload.device_type}`,
        `time_on_page=${payload.time_on_page}`,
        `primary_cta_interacted=${payload.primary_cta_interacted}`,
        `locale=${payload.locale}`,
        `captured_at=${new Date().toISOString()}`,
    ].join(" | ")
}

async function hubSpotRequest<T>(path: string, token: string, init: RequestInit): Promise<T> {
    const response = await fetch(`https://api.hubapi.com${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...(init.headers || {}),
        },
    })

    if (!response.ok) {
        const raw = await response.text()
        let details: unknown = raw
        try {
            details = JSON.parse(raw)
        } catch {
            // Keep raw text when JSON parsing fails.
        }

        const error = new Error("HubSpot API request failed") as Error & { status?: number; details?: unknown }
        error.status = response.status
        error.details = details
        throw error
    }

    if (response.status === 204) {
        return {} as T
    }

    return await response.json() as T
}

async function findContactIdByEmail(email: string, token: string) {
    const result = await hubSpotRequest<HubSpotSearchResult>(
        "/crm/v3/objects/contacts/search",
        token,
        {
            method: "POST",
            body: JSON.stringify({
                filterGroups: [
                    {
                        filters: [
                            {
                                propertyName: "email",
                                operator: "EQ",
                                value: email,
                            },
                        ],
                    },
                ],
                properties: ["email"],
                limit: 1,
            }),
        }
    )

    return result.results[0]?.id || null
}

async function createAssociatedLeadNote(contactId: string, context: string, token: string) {
    try {
        await hubSpotRequest(
            "/crm/v3/objects/notes",
            token,
            {
                method: "POST",
                body: JSON.stringify({
                    properties: {
                        hs_timestamp: `${Date.now()}`,
                        hs_note_body: context,
                    },
                    associations: [
                        {
                            to: { id: contactId },
                            types: [
                                {
                                    associationCategory: "HUBSPOT_DEFINED",
                                    associationTypeId: 202,
                                },
                            ],
                        },
                    ],
                }),
            }
        )
    } catch (error) {
        // Note association should never fail the lead capture flow.
        console.warn("HubSpot note association failed", error)
    }
}

async function upsertWaitlistContact(payload: WaitlistPayload, token: string) {
    const context = buildLeadContext(payload)
    const existingContactId = await findContactIdByEmail(payload.email, token)
    const richProperties = {
        email: payload.email,
        lifecyclestage: "lead",
        hs_lead_status: "NEW",
        company: "PolicyWallet Waitlist",
        jobtitle: `waitlist_${payload.profile_type}`,
        notes: context,
    }

    const fallbackProperties = {
        email: payload.email,
    }

    try {
        if (existingContactId) {
            await hubSpotRequest(
                `/crm/v3/objects/contacts/${existingContactId}`,
                token,
                {
                    method: "PATCH",
                    body: JSON.stringify({ properties: richProperties }),
                }
            )
            await createAssociatedLeadNote(existingContactId, context, token)
            return existingContactId
        }

        const created = await hubSpotRequest<{ id: string }>(
            "/crm/v3/objects/contacts",
            token,
            {
                method: "POST",
                body: JSON.stringify({ properties: richProperties }),
            }
        )
        await createAssociatedLeadNote(created.id, context, token)
        return created.id
    } catch (error) {
        const typed = error as Error & { status?: number; details?: unknown }
        if (typed.status !== 400) {
            throw error
        }

        if (existingContactId) {
            await hubSpotRequest(
                `/crm/v3/objects/contacts/${existingContactId}`,
                token,
                {
                    method: "PATCH",
                    body: JSON.stringify({ properties: fallbackProperties }),
                }
            )
            return existingContactId
        }

        const created = await hubSpotRequest<{ id: string }>(
            "/crm/v3/objects/contacts",
            token,
            {
                method: "POST",
                body: JSON.stringify({ properties: fallbackProperties }),
            }
        )
        return created.id
    }
}

export async function POST(req: Request) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous"
    const limitCheck = await rateLimit(ip as string, 8, 10 * 60 * 1000)
    if (!limitCheck.success) return limitCheck.error!

    try {
        const parsed = waitlistSchema.safeParse(await req.json())
        if (!parsed.success) {
            return createApiError("VALIDATION_ERROR", "Invalid waitlist payload", 400, parsed.error.issues)
        }

        const hubspotToken = getHubSpotToken()
        if (!hubspotToken) {
            return createApiError("INTEGRATION_NOT_CONFIGURED", "Waitlist sink is not configured", 503)
        }

        const hubspotContactId = await upsertWaitlistContact(parsed.data, hubspotToken)
        return createApiResponse(
            {
                persisted: true,
                provider: "hubspot",
                hubspot_contact_id: hubspotContactId,
            },
            parsed.data.locale
        )
    } catch (error) {
        const typed = error as Error & { status?: number; details?: unknown }
        const status = typed.status && typed.status >= 400 && typed.status < 600 ? typed.status : 502
        return createApiError(
            "CRM_SYNC_FAILED",
            "Failed to persist waitlist lead",
            status,
            typed.details || typed.message
        )
    }
}
