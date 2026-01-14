"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { uploadFile, deleteFile } from "@/lib/storage"
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"
import fs from "fs/promises"
import path from "path"
import { GoogleGenerativeAI } from "@google/generative-ai"

const PolicySchema = z.object({
    insurerName: z.string().min(1, "Insurer name is required"),
    policyNumber: z.string().min(1, "Policy number is required"),
    lineOfBusiness: z.enum(["motor", "health", "home", "life", "travel", "liability"]),
    startDate: z.string(),
    endDate: z.string(),
    premiumAmount: z.coerce.number().optional(),
})

export async function createPolicy(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.id) throw new Error("Unauthorized")

    // We need to map Supabase User ID to our local DB User ID
    // Assumption: We synced them properly or use email as lookup if IDs differ.
    // If IDs are synced (ideal), then user.id is correct.
    // If not, we might need: const dbUser = await db.user.findUnique({ where: { email: user.email } })
    // For now, let's assume sync or db lookup by email for safety if ID mismatch is possible.

    // Safer approach: Lookup by email to get the integer/UUID ID used in public.User table if it differs.
    // But earlier we used db.user.create without specifying ID, so it generated a UUID.
    // And we didn't force Supabase ID. 
    // Let's rely on email for robust linking.
    const dbUser = await db.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) throw new Error("User record not found")

    const userId = dbUser.id

    const rawData = {
        insurerName: formData.get("insurerName"),
        policyNumber: formData.get("policyNumber"),
        lineOfBusiness: formData.get("lineOfBusiness"),
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        premiumAmount: formData.get("premiumAmount"),
    }

    const validatedData = PolicySchema.parse(rawData)

    const policy = await db.policy.create({
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

    // Handle files
    // Handle files (Files are now uploaded client-side to Supabase)
    const documentUrls = formData.getAll("documentUrls") as string[]
    const documentNames = formData.getAll("documentNames") as string[]
    const documentSizes = formData.getAll("documentSizes") as string[]

    for (let i = 0; i < documentUrls.length; i++) {
        const fileUrl = documentUrls[i]
        const fileName = documentNames[i] || "Unknown Document"
        const fileSize = parseInt(documentSizes[i] || "0")

        if (fileUrl) {
            await db.policyDocument.create({
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

    // Log Activity
    await (db as any).activityLog.create({
        data: {
            adminUserId: userId,
            adminEmail: user.email || "unknown",
            actionType: "POLICY_CREATED",
            description: `Created policy ${policy.policyNumber} for ${policy.insurerName}`,
            metadata: {
                policyId: policy.id,
                insurerName: policy.insurerName,
                policyNumber: policy.policyNumber
            }
        }
    })

    revalidatePath("/wallet")
    revalidatePath("/wallet")
    return { success: true }
}

export async function uploadPolicyDocument(formData: FormData) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) {
        return { error: "Unauthorized" }
    }

    const userId = authResult.dbUser.id
    const userEmail = authResult.dbUser.email || "unknown"

    const file = formData.get("file") as File
    if (!file) {
        return { error: "No file uploaded" }
    }

    // Production Hardening: Size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
        logger('warn', 'Policy upload rejected: file too large', { userId, size: file.size })
        return { error: "File too large. Maximum size is 10MB." }
    }

    // 1. Upload to storage
    let fileUrl = ""
    try {
        fileUrl = await uploadFile(file, "policies")
    } catch (e) {
        return { error: "Upload failed" }
    }

    // 2. AI Extraction Logic (Gemini)
    let extractedData = {
        insurerName: "AI Processing...",
        policyNumber: "PENDING-" + Date.now(),
        lineOfBusiness: "motor", // Default fallback
        startDate: new Date(),
        endDate: new Date(Date.now() + 31536000000), // +1 year
        coverageSummary: "Processing...",
        premiumAmount: 0
    };

    if (process.env.GEMINI_API_KEY) {
        try {
            console.log("Analyzing document with Gemini...");
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
            // Fallback to placeholder is already set
        }
    }

    // Create policy with extracted or default data
    const policy = await db.policy.create({
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
            status: "active", // Assume active if parsed successfully? Or maybe 'incomplete' if low confidence?
            // For MVP, if we got data, let's say "active" or "action_needed" to verify.
            // Let's stick to 'incomplete' so user reviews it, but we pre-fill the data.
            // Wait, previous code used 'incomplete'. Let's switch to 'action_needed' so they notice it.
        }
    })

    // Create document record
    await db.policyDocument.create({
        data: {
            policyId: policy.id,
            fileUrl: fileUrl,
            fileName: file.name,
            fileSize: file.size,
            source: "policyholder",
            uploadedByUserId: userId,
            processingStatus: "completed"
        }
    })

    // Log Activity
    await (db as any).activityLog.create({
        data: {
            adminUserId: userId,
            adminEmail: userEmail,
            actionType: "POLICY_UPLOADED",
            description: `Uploaded and parsed document ${file.name} for ${policy.insurerName}`,
            metadata: {
                policyId: policy.id,
                fileName: file.name,
                extractedInsurer: policy.insurerName,
                extractedPolicyNumber: policy.policyNumber
            }
        }
    })

    revalidatePath("/wallet")
    return { success: true, policyId: policy.id }
}

export async function getInsurers() {
    return db.insurer.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    })
}

export async function getInsuranceTypes() {
    return db.insuranceType.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
    })
}

export async function sharePolicy(policyId: string, agentEmail: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    // 1. Find the agent
    const agent = await db.user.findUnique({
        where: { email: agentEmail }
    })

    if (!agent) {
        // Create Invite for non-existing user
        const invite = await db.invite.create({
            data: {
                inviterUserId: authResult.dbUser.id,
                inviteeEmail: agentEmail,
                token: Math.random().toString(36).substring(7),
                inviteType: 'share',
                scope: `policy:${policyId}`,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        })

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const link = `${baseUrl}/invite/${invite.token}`

        // Log interaction
        await (db as any).activityLog.create({
            data: {
                adminUserId: authResult.dbUser.id,
                adminEmail: authResult.dbUser.email || "unknown",
                actionType: "POLICY_SHARE_INVITE",
                description: `Invited ${agentEmail} to share policy ${policyId}`,
                metadata: { policyId, agentEmail }
            }
        })

        revalidatePath(`/wallet/${policyId}`)
        return { success: true, message: "Invitation sent to new user.", link }
    }

    // Optional: Verify role
    // if (!agent.roles.includes('agent')) return { error: "This user is not an agent." }

    // 2. Create Access Grant
    // We treat policy sharing as a scoped grant
    await db.accessGrant.create({
        data: {
            granterUserId: authResult.dbUser.id,
            granteeUserId: agent.id,
            scope: `policy:${policyId}`,
            permissions: "read",
            status: "active"
        }
    })

    // 3. Ensure a Relationship exists (so they show up in Agent's Customer list)
    // We use upsert to avoid error if exists
    // Note: status might need to be 'active' if they accepted, but here we force 'active' or 'pending'?
    // Let's check if relationship exists first.
    const existingRel = await db.customerRelationship.findUnique({
        where: {
            agentUserId_policyholderUserId: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id
            }
        }
    })

    if (!existingRel) {
        await db.customerRelationship.create({
            data: {
                agentUserId: agent.id,
                policyholderUserId: authResult.dbUser.id,
                status: "active", // Auto-activate since customer initiated sharing
                activationStatus: "active"
            }
        })
    }

    // 4. Log
    await (db as any).activityLog.create({
        data: {
            adminUserId: authResult.dbUser.id,
            adminEmail: authResult.dbUser.email || "unknown",
            actionType: "POLICY_SHARED",
            description: `Shared policy ${policyId} with ${agentEmail}`,
            metadata: { policyId, agentEmail }
        }
    })

    revalidatePath(`/wallet/${policyId}`)
    return { success: true }
}

export async function getPolicyShares(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return []

    // Get grants where scope includes this policy
    const grants = await db.accessGrant.findMany({
        where: {
            granterUserId: authResult.dbUser.id,
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

export async function revokeShare(grantId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    await db.accessGrant.update({
        where: { id: grantId, granterUserId: authResult.dbUser.id },
        data: { status: 'revoked', revokedAt: new Date() }
    })

    revalidatePath("/wallet")
    revalidatePath("/wallet")
    return { success: true }
}

function parseAnalysisDate(d: string | undefined): Date | undefined {
    if (!d) return undefined;
    const date = new Date(d);
    return isNaN(date.getTime()) ? undefined : date;
}

export async function analyzeGaps(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        include: { documents: true }
    })

    if (!policy) return { error: "Policy not found" }

    // Authorization: Allow Owner OR Authorized Agent
    const isOwner = policy.ownerUserId === authResult.dbUser.id
    if (!isOwner) {
        // Check for AccessGrant (Portfolio Scope) or CustomerRelationship
        const hasAccess = await db.accessGrant.findFirst({
            where: {
                granterUserId: policy.ownerUserId,
                granteeUserId: authResult.dbUser.id,
                status: 'active'
            }
        })

        // Check Relationship as fallback if Grants aren't fully migrated/used yet
        const hasRelationship = !hasAccess ? await db.customerRelationship.findFirst({
            where: {
                agentUserId: authResult.dbUser.id,
                policyholderUserId: policy.ownerUserId,
                // status: 'active' // Assuming existence implies some level of access, or check specific status
            }
        }) : null

        if (!hasAccess && !hasRelationship) return { error: "Unauthorized access to this policy" }
    }

    const normalizedLOB = policy.lineOfBusiness.toLowerCase().replace(' protection', '').trim();
    const gaps = await db.gapDefinition.findMany({
        where: {
            lineOfBusiness: {
                equals: normalizedLOB,
                mode: 'insensitive'
            },
            isActive: true
        }
    })

    if (gaps.length === 0) return { success: true, count: 0, message: "No applicable gap definitions." }

    // Clear existing gaps to re-analyze
    await db.gapInstance.deleteMany({ where: { policyId } })

    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            // Prepare Document if available
            let imagePart = null;
            if (policy.documents.length > 0) {
                const doc = policy.documents[0];
                try {
                    let buffer: Buffer;

                    if (doc.fileUrl.startsWith('http')) {
                        console.log(`[Analysis] Fetching remote file from: ${doc.fileUrl}`);
                        const response = await fetch(doc.fileUrl);
                        if (!response.ok) throw new Error(`Failed to fetch remote file: ${response.statusText}`);
                        const arrayBuffer = await response.arrayBuffer();
                        buffer = Buffer.from(arrayBuffer);
                    } else {
                        // Normalize fileUrl - strip leading slash to be safe
                        let relativePath = doc.fileUrl.startsWith('/') ? doc.fileUrl.slice(1) : doc.fileUrl;
                        const filePath = path.join(process.cwd(), "public", relativePath);
                        console.log(`[Analysis] Reading local file from: ${filePath}`);
                        buffer = await fs.readFile(filePath);
                    }

                    // Better MIME detection - Default to PDF as requested
                    let mimeType = "application/pdf";
                    const lowerName = doc.fileName.toLowerCase();
                    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) mimeType = "image/jpeg";
                    else if (lowerName.endsWith(".png")) mimeType = "image/png";
                    else if (lowerName.endsWith(".webp")) mimeType = "image/webp";

                    imagePart = {
                        inlineData: {
                            data: buffer.toString("base64"),
                            mimeType
                        }
                    };
                    logger('info', 'Analysis: Reading document success', { fileUrl: doc.fileUrl, mimeType });
                } catch (e: any) {
                    logger('error', 'Analysis: Document read failed', { error: e.message, fileUrl: doc.fileUrl });
                    // Throw to ensure we don't silently fail analysis
                    return { success: false, error: `Failed to read document: ${e.message}` };
                }
            }

            const prompt = `
            You are an expert insurance analyst. Your task is to analyze the provided policy document and database metadata.

            CRITICAL: The provided DOCUMENT is the ABSOLUTE SOURCE OF TRUTH. 
            The "Current Metadata" provided below may be incomplete or incorrect (e.g., 0.00 euros or missing dates).
            You must FIRST extract the actual details from the document.

            Step 1: Data Verification
            - Extract Insurer, Policy Number, Dates, and Premium from the DOCUMENT.
            - If the document is missing or unreadable, fall back to the Current Metadata only as a last resort.
            - If the document shows a premium of "200" but metadata says "0", rely on the document.

            Step 2: Gap Analysis
            - Using the VERIFIED data from Step 1 (NOT the raw metadata), check for the following gaps.
            - Provide a clear explanation based on the document's clauses.

            Current Metadata (Reference Only):
            Insurer: ${policy.insurerName}
            Policy Number: ${policy.policyNumber}
            Type: ${policy.lineOfBusiness}
            Dates: ${policy.startDate.toISOString().split('T')[0]} to ${policy.endDate.toISOString().split('T')[0]}
            Premium: ${policy.premiumAmount}
            Summary: ${policy.coverageSummary || "N/A"}

            Potential Gaps to Check:
            ${gaps.map(g => `- Slug: ${g.slug} (${g.name}): ${(g.detectionLogic as any)?.check || g.description}`).join('\n')}

            IMPORTANT: Return ONLY a JSON object with this exact structure:
            {
                "verifiedMetadata": {
                    "insurerName": "string",
                    "policyNumber": "string",
                    "lineOfBusiness": "motor|health|home|life|travel|liability",
                    "startDate": "YYYY-MM-DD",
                    "endDate": "YYYY-MM-DD",
                    "premiumAmount": number,
                    "coverageSummary": "string (professional summary of coverages)"
                },
                "gapResults": [
                    {
                        "slug": "gap-slug",
                        "isDetected": boolean,
                        "explanation": { "en": "string", "el": "string" },
                        "suggestion": { "en": "string", "el": "string" }
                    }
                ],
                "acordData": {
                    "acordStandard": "V1.0",
                    "policy": {
                        "insurer": "...",
                        "number": "...",
                        "type": "...",
                        "premium": { "amount": 0, "currency": "EUR" },
                        "effectiveDate": "YYYY-MM-DD",
                        "expirationDate": "YYYY-MM-DD"
                    },
                    "coverages": [ { "name": "...", "limit": "...", "deductible": "..." } ]
                }
            }
            `;

            const parts: any[] = [prompt];
            if (imagePart) parts.push(imagePart);

            const result = await model.generateContent(parts);
            const response = await result.response;
            const text = response.text();

            // Robust JSON extraction
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return a valid JSON object");
            const analysis = JSON.parse(jsonMatch[0]);

            const { verifiedMetadata, gapResults, acordData } = analysis;

            // Update Policy with verified data
            await (db.policy as any).update({
                where: { id: policyId },
                data: {
                    insurerName: verifiedMetadata.insurerName || policy.insurerName,
                    policyNumber: verifiedMetadata.policyNumber || policy.policyNumber,
                    lineOfBusiness: verifiedMetadata.lineOfBusiness || policy.lineOfBusiness,
                    startDate: parseAnalysisDate(verifiedMetadata.startDate) || policy.startDate,
                    endDate: parseAnalysisDate(verifiedMetadata.endDate) || policy.endDate,
                    premiumAmount: typeof verifiedMetadata.premiumAmount === 'number' ? (verifiedMetadata.premiumAmount as any) : policy.premiumAmount,
                    coverageSummary: verifiedMetadata.coverageSummary || policy.coverageSummary,
                    acordData: acordData || (policy as any).acordData || {},
                    lastAnalyzedAt: new Date()
                }
            })

            let detectedCount = 0;
            for (const item of gapResults) {
                if (item.isDetected) {
                    const def = gaps.find(g => g.slug === item.slug)
                    if (def) {
                        await db.gapInstance.create({
                            data: {
                                policyId: policyId,
                                gapDefinitionId: def.id,
                                severity: def.defaultSeverity || "medium",
                                status: item.isDetected ? "open" : "resolved",
                                aiExplanation: item.explanation?.en || item.explanation || "No explanation provided",
                                aiExplanationEl: item.explanation?.el || item.explanation || "Δεν δόθηκε εξήγηση",
                                aiSuggestion: item.suggestion?.en || item.suggestion || "No suggestion",
                                aiSuggestionEl: item.suggestion?.el || item.suggestion || "Καμία πρόταση",
                                detectedAt: new Date()
                            }
                        })
                        detectedCount++;
                    }
                }
            }

            // Log session
            try {
                await (db as any).activityLog.create({
                    data: {
                        adminUserId: authResult.dbUser.id,
                        adminEmail: authResult.dbUser.email || "unknown",
                        actionType: "POLICY_ANALYZED",
                        description: `Analyzed and updated policy ${policyId} - ${detectedCount} gaps found`,
                        metadata: { policyId, detectedCount, updated: true }
                    }
                })
            } catch (l) { /* ignore log errors */ }

            revalidatePath(`/wallet/${policyId}`)
            return { success: true, count: detectedCount }

        } catch (e) {
            console.error("AI Gap Analysis failed", e)
            return { error: `Analysis failed: ${e instanceof Error ? e.message : String(e)}` }
        }
    } else {
        return { error: "AI Service Unavailable" }
    }
}

export async function deletePolicy(policyId: string) {
    const authResult = await getAuthenticatedUserOrNull()
    if (!authResult) return { error: "Unauthorized" }

    const policy = await db.policy.findUnique({
        where: { id: policyId },
        include: { documents: true }
    })

    if (!policy) return { error: "Policy not found" }

    // Case 1: Owner - Full Delete
    if (policy.ownerUserId === authResult.dbUser.id) {
        // 1. Delete physical files
        for (const doc of policy.documents) {
            await deleteFile(doc.fileUrl)
        }

        // 2. Clean up related data that might not cascade
        // Opportunities refer to policy
        await db.opportunity.deleteMany({
            where: { policyId: policy.id }
        })

        // 3. Delete Policy (Cascades to PolicyDocuments, GapInstances)
        await db.policy.delete({
            where: { id: policy.id }
        })

        // Log
        try {
            await (db as any).activityLog.create({
                data: {
                    adminUserId: authResult.dbUser.id,
                    adminEmail: authResult.dbUser.email || "unknown",
                    actionType: "POLICY_DELETED",
                    description: `Deleted policy ${policy.policyNumber}`,
                    metadata: { policyId, insurer: policy.insurerName }
                }
            })
        } catch (e) { /* ignore */ }

        revalidatePath("/wallet")
        return { success: true }
    }

    // Case 2: Not Owner - Remove Access
    // Check for AccessGrant where I am the grantee
    const grant = await db.accessGrant.findFirst({
        where: {
            granteeUserId: authResult.dbUser.id,
            scope: `policy:${policyId}`,
            status: 'active'
        }
    })

    if (grant) {
        // Revoke/Delete the grant
        await db.accessGrant.update({
            where: { id: grant.id },
            data: { status: 'revoked', revokedAt: new Date() }
        })

        revalidatePath("/wallet")
        return { success: true, message: "Policy removed from your shared wallet" }
    }

    return { error: "You are not authorized to delete this policy" }
}
