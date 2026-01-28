import { BaseService } from "./base.service"
import { z } from "zod"
import { uploadFile, deleteFile } from "@/lib/storage"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { logger } from "@/lib/logger"
import fs from "fs/promises"
import { Policy, AccessGrant, CustomerRelationship, NotificationEvent } from "@prisma/client"

// Types
export interface PolicyShare {
    id: string
    email: string
    name: string | null
    image: string | null
    grantedAt: Date
}
export interface CreatePolicyInput {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount?: number
    documentUrls?: string[]
    documentNames?: string[]
    documentSizes?: string[]
}

export interface ShareResult {
    success: boolean
    message?: string
    link?: string
    error?: string
}

const PolicySchema = z.object({
    insurerName: z.string().min(1, "Insurer name is required"),
    policyNumber: z.string().min(1, "Policy number is required"),
    lineOfBusiness: z.enum([
        "motor", "health", "home", "life", "travel", "liability",
        "pet", "breakdown", "legal_expenses", "income_protection",
        "gadget", "bicycle", "business", "cyber", "motorbike",
        "public_liability", "renters", "other"
    ]),
    startDate: z.string(),
    endDate: z.string(),
    premiumAmount: z.coerce.number().optional(),
})

export class PolicyService extends BaseService {

    /**
     * Creates a new policy for a user.
     * Handles validation, document association, and activity logging.
     * 
     * @param userId - The ID of the policy owner
     * @param data - The policy data including document metadata
     * @returns The created policy
     */
    async create(userId: string, data: CreatePolicyInput): Promise<Policy> {
        return this.withTransaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } })
            if (!user) throw new Error("User not found")

            // Validate Data
            const validatedData = PolicySchema.parse({
                insurerName: data.insurerName,
                policyNumber: data.policyNumber,
                lineOfBusiness: data.lineOfBusiness,
                startDate: data.startDate,
                endDate: data.endDate,
                premiumAmount: data.premiumAmount,
            })

            const policy = await tx.policy.create({
                data: {
                    ownerUserId: userId,
                    createdByUserId: userId,
                    insurerName: validatedData.insurerName,
                    policyNumber: validatedData.policyNumber,
                    lineOfBusiness: validatedData.lineOfBusiness,
                    startDate: new Date(validatedData.startDate),
                    endDate: new Date(validatedData.endDate),
                    premiumAmount: validatedData.premiumAmount,
                    status: "active",
                }
            })

            // Handle Document Metadata (URLs)
            if (data.documentUrls && data.documentUrls.length > 0) {
                const urls = data.documentUrls
                const names = data.documentNames || []
                const sizes = data.documentSizes || []

                for (let i = 0; i < urls.length; i++) {
                    const fileUrl = urls[i]
                    const rawFileName = names[i] || "Unknown Document"
                    const fileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, '_')
                    const fileSize = parseInt(sizes[i] || "0")

                    // Simple extension check
                    const lowerName = fileName.toLowerCase()
                    const hasValidExt =
                        lowerName.endsWith('.pdf') ||
                        lowerName.endsWith('.jpg') ||
                        lowerName.endsWith('.jpeg') ||
                        lowerName.endsWith('.png') ||
                        lowerName.endsWith('.webp')

                    if (!hasValidExt) {
                        console.warn(`Skipping document with invalid extension: ${fileName}`)
                        continue
                    }

                    if (fileUrl) {
                        await tx.policyDocument.create({
                            data: {
                                policyId: policy.id,
                                fileUrl: fileUrl,
                                fileName: fileName,
                                fileSize: fileSize,
                                source: "policyholder",
                                uploadedByUserId: userId,
                                processingStatus: "completed"
                            }
                        })
                    }
                }
            }

            // Log Activity
            await this.logActivity(
                userId,
                "POLICY_CREATED",
                `Created policy ${policy.policyNumber} for ${policy.insurerName}`,
                {
                    policyId: policy.id,
                    insurerName: policy.insurerName,
                    policyNumber: policy.policyNumber
                }
            )

            return policy
        })
    }

    /**
     * Uploads and parses a policy document using AI extraction.
     * 
     * @param userId - The ID of the uploader
     * @param file - The file object to upload
     * @returns The created policy and extraction status
     */
    async uploadAndParse(userId: string, file: File): Promise<{ policy: Policy; extracted: boolean; policyId: string }> {
        // Validation
        if (!file) throw new Error("No file uploaded")
        if (file.size > 10 * 1024 * 1024) throw new Error("File too large. Maximum size is 10MB.")

        const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
        if (!allowedTypes.includes(file.type)) throw new Error("Invalid file type. Only PDF, JPG, PNG, and WEBP are allowed.")

        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')

        // 1. Upload to storage
        let fileUrl = ""
        try {
            fileUrl = await uploadFile(file, "policies")
        } catch (e) {
            throw new Error("Upload failed")
        }

        // 2. AI Extraction Logic
        let extractedData = {
            insurerName: "AI Processing...",
            policyNumber: "PENDING-" + Date.now(),
            lineOfBusiness: "motor",
            startDate: new Date(),
            endDate: new Date(Date.now() + 31536000000), // +1 year
            coverageSummary: "Processing...",
            premiumAmount: 0
        };

        if (process.env.GEMINI_API_KEY) {
            try {
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                const arrayBuffer = await file.arrayBuffer();
                const base64Data = Buffer.from(arrayBuffer).toString("base64");

                const prompt = `
                Analyze this insurance policy document and extract the following JSON. 
                Do not include Markdown formatting, just the raw JSON.
                Fields: 
                - insurerName (string)
                - policyNumber (string)
                - lineOfBusiness (one of: motor, health, home, life, travel, liability)
                - startDate (YYYY-MM-DD)
                - endDate (YYYY-MM-DD)
                - premiumAmount (number)
                - coverageSummary (string): A short, clear summary of key coverages and limits (max 200 chars).
                
                If a field is missing, make a best guess or use null.
                `;

                const imagePart = {
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type === "application/pdf" ? "application/pdf" : file.type,
                    },
                };

                const result = await model.generateContent([prompt, imagePart]);
                const response = await result.response;
                const text = response.text();

                // Robust JSON extraction
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : text.replace(/```json/g, "").replace(/```/g, "").trim();
                const aiJson = JSON.parse(jsonStr);

                logger('info', 'AI extraction successful', { userId, fileName: file.name })

                // Merge with defaults
                if (aiJson.insurerName) extractedData.insurerName = aiJson.insurerName;
                if (aiJson.policyNumber) extractedData.policyNumber = aiJson.policyNumber;
                if (aiJson.lineOfBusiness) extractedData.lineOfBusiness = aiJson.lineOfBusiness.toLowerCase();
                if (aiJson.startDate) extractedData.startDate = new Date(aiJson.startDate);
                if (aiJson.endDate) extractedData.endDate = new Date(aiJson.endDate);
                if (aiJson.coverageSummary) extractedData.coverageSummary = aiJson.coverageSummary;
                if (aiJson.premiumAmount) (extractedData as any).premiumAmount = aiJson.premiumAmount;

            } catch (error) {
                logger('error', 'AI extraction failed', { userId, error, fileName: file.name })
            }
        }

        // Transaction to create Policy and Document
        const result = await this.withTransaction(async (tx) => {
            const policy = await tx.policy.create({
                data: {
                    ownerUserId: userId,
                    createdByUserId: userId,
                    insurerName: extractedData.insurerName,
                    policyNumber: extractedData.policyNumber,
                    lineOfBusiness: extractedData.lineOfBusiness as any,
                    startDate: extractedData.startDate,
                    endDate: extractedData.endDate,
                    coverageSummary: extractedData.coverageSummary,
                    premiumAmount: (extractedData as any).premiumAmount || 0,
                    status: "active", // Or 'action_needed' per discussion
                }
            })

            await tx.policyDocument.create({
                data: {
                    policyId: policy.id,
                    fileUrl: fileUrl,
                    fileName: sanitizedFileName,
                    fileSize: file.size,
                    source: "policyholder",
                    uploadedByUserId: userId,
                    processingStatus: "completed"
                }
            })

            return policy
        })

        // Log
        await this.logActivity(
            userId,
            "POLICY_UPLOADED",
            `Uploaded and parsed document ${file.name} for ${result.insurerName}`,
            {
                policyId: result.id,
                fileName: file.name,
                extractedInsurer: result.insurerName,
                extractedPolicyNumber: result.policyNumber
            }
        )

        return { policy: result, extracted: true, policyId: result.id }
    }

    /**
     * Deletes a policy.
     * Handles both Owner Deletion (full cleanup) and Shared User Removal (revoke access).
     * 
     * @param policyId - The ID of the policy to delete
     * @param userId - The ID of the user requesting deletion
     */
    async delete(policyId: string, userId: string): Promise<void> {
        return this.withTransaction(async (tx) => {
            const policy = await tx.policy.findUnique({
                where: { id: policyId },
                include: { documents: true }
            })

            if (!policy) throw new Error("Policy not found")

            // Case 1: Owner - Full Delete
            if (policy.ownerUserId === userId) {
                // Delete physical files
                // Note: File deletion is external side-effect, should ideally valid if transaction commits
                // But typically we do it best-effort.
                for (const doc of policy.documents) {
                    await deleteFile(doc.fileUrl)
                }

                // Cleanup related data
                await tx.opportunity.deleteMany({ where: { policyId: policy.id } })

                // Delete Policy (Cascades)
                await tx.policy.delete({ where: { id: policy.id } })

                await this.logActivity(
                    userId,
                    "POLICY_DELETED",
                    `Deleted policy ${policy.policyNumber}`,
                    { policyId, insurer: policy.insurerName }
                )
                return
            }

            // Case 2: Shared Access - Remove Grant
            const grant = await tx.accessGrant.findFirst({
                where: {
                    granteeUserId: userId,
                    scope: `policy:${policyId}`,
                    status: 'active' // Or just find any status to revoke
                }
            })

            if (grant) {
                await tx.accessGrant.update({
                    where: { id: grant.id },
                    data: { status: 'revoked', revokedAt: new Date() }
                })

                await this.logActivity(
                    userId,
                    "POLICY_ACCESS_REVOKED",
                    `Revoked access to shared policy ${policyId}`,
                    { policyId }
                )
                return
            }

            throw new Error("Unauthorized: You do not have permission to delete this policy")
        })
    }

    /**
     * Shares a policy with another user via email.
     * If user exists, grants access. If not, creates an invite.
     * 
     * @param policyId - The policy ID
     * @param ownerUserId - The owner initiating the share
     * @param agentEmail - The email of the recipient
     */
    async share(policyId: string, ownerUserId: string, agentEmail: string): Promise<ShareResult> {
        return this.withTransaction(async (tx) => {
            const agent = await tx.user.findUnique({ where: { email: agentEmail } })

            // Log Owner info
            const owner = await tx.user.findUnique({ where: { id: ownerUserId } })

            if (!agent) {
                // Create Invitation
                const invite = await tx.invite.create({
                    data: {
                        inviterUserId: ownerUserId,
                        inviteeEmail: agentEmail,
                        token: Math.random().toString(36).substring(7), // Simple token generation
                        inviteType: 'share',
                        scope: `policy:${policyId}`,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    }
                })

                const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
                const link = `${baseUrl}/invite/${invite.token}`

                await this.logActivity(
                    ownerUserId,
                    "POLICY_SHARE_INVITE",
                    `Invited ${agentEmail} to share policy ${policyId}`,
                    { policyId, agentEmail }
                )

                return { success: true, message: "Invitation sent to new user.", link }
            }

            // Create Access Grant
            await tx.accessGrant.create({
                data: {
                    granterUserId: ownerUserId,
                    granteeUserId: agent.id,
                    scope: `policy:${policyId}`,
                    permissions: "read",
                    status: "active"
                }
            })

            // Ensure Relationship
            const existingRel = await tx.customerRelationship.findUnique({
                where: {
                    agentUserId_policyholderUserId: {
                        agentUserId: agent.id,
                        policyholderUserId: ownerUserId
                    }
                }
            })

            if (!existingRel) {
                await tx.customerRelationship.create({
                    data: {
                        agentUserId: agent.id,
                        policyholderUserId: ownerUserId,
                        status: "active",
                        activationStatus: "active"
                    }
                })
            }

            // Get Policy Info for Notification
            const policy = await tx.policy.findUnique({
                where: { id: policyId },
                select: { policyNumber: true, insurerName: true, lineOfBusiness: true }
            })

            // Create Notification
            await tx.notificationEvent.create({
                data: {
                    userId: agent.id,
                    eventType: 'policy_shared',
                    channel: 'in_app',
                    title: 'New Policy Shared With You',
                    message: `${owner?.name || 'A customer'} has shared their ${policy?.lineOfBusiness || 'insurance'} policy from ${policy?.insurerName || 'an insurer'} with you.`,
                    relatedObjectType: 'policy',
                    relatedObjectId: policyId
                }
            })

            await this.logActivity(
                ownerUserId,
                "POLICY_SHARED",
                `Shared policy ${policyId} with ${agentEmail}`,
                { policyId, agentEmail }
            )

            return { success: true }
        })
    }

    /**
     * Gets all users who have been granted access to a policy.
     * 
     * @param policyId - The policy ID
     * @param userId - The user checking (usually owner)
     */
    async getShares(policyId: string, userId: string): Promise<any[]> {
        const grants = await this.db.accessGrant.findMany({
            where: {
                granterUserId: userId,
                scope: `policy:${policyId}`,
                status: 'active'
            },
            include: {
                grantee: {
                    select: { email: true, name: true, image: true }
                }
            }
        })

        return grants.map(g => ({
            id: g.id,
            email: g.grantee.email,
            name: g.grantee.name,
            image: g.grantee.image,
            grantedAt: g.grantedAt
        }))
    }

    /**
     * Revokes a specific access grant.
     * 
     * @param grantId - The ID of the access grant to revoke
     * @param userId - The user revoking (must be granter)
     */
    async revokeShare(grantId: string, userId: string): Promise<void> {
        await this.withTransaction(async (tx) => {
            const grant = await tx.accessGrant.findUnique({
                where: { id: grantId }
            })

            if (!grant || grant.granterUserId !== userId) {
                throw new Error("Unauthorized or grant not found")
            }

            await tx.accessGrant.update({
                where: { id: grantId },
                data: { status: 'revoked', revokedAt: new Date() }
            })
        })
    }
}
