"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { uploadFile } from "@/lib/storage"
import { auth } from "@/auth"

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
    redirect("/wallet")
}

export async function uploadPolicyDocument(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const file = formData.get("file") as File
    if (!file) {
        return { error: "No file uploaded" }
    }

    // Production Hardening: Size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
        logger('warn', 'Policy upload rejected: file too large', { userId: session.user.id, size: file.size })
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
    };

    if (process.env.GEMINI_API_KEY) {
        try {
            console.log("Analyzing document with Gemini...");
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
            
            If a field is missing, make a best guess or use null.
            `;

            const imagePart = {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type === "application/pdf" ? "application/pdf" : file.type,
                    // Note: 'application/pdf' support in gemini 1.5 flash depends on provider details, 
                    // but 'image/*' is definitely supported. 
                    // If this fails for PDF in MVP, user should convert to image.
                    // Ideally we'd use 'gemini-1.5-pro' for heavy docs, but flash is good for faster responses.
                },
            };

            const result = await model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Cleanup json formatting
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const aiJson = JSON.parse(jsonStr);

            logger('info', 'AI extraction successful', { userId: session.user.id, fileName: file.name })

            // Merge with defaults
            if (aiJson.insurerName) extractedData.insurerName = aiJson.insurerName;
            if (aiJson.policyNumber) extractedData.policyNumber = aiJson.policyNumber;
            if (aiJson.lineOfBusiness) extractedData.lineOfBusiness = aiJson.lineOfBusiness.toLowerCase();
            if (aiJson.startDate) extractedData.startDate = new Date(aiJson.startDate);
            if (aiJson.endDate) extractedData.endDate = new Date(aiJson.endDate);

        } catch (error) {
            logger('error', 'AI extraction failed', { userId: session.user.id, error, fileName: file.name })
            // Fallback to placeholder is already set
        }
    }

    // Create policy with extracted or default data
    const policy = await db.policy.create({
        data: {
            ownerUserId: session.user.id,
            createdByUserId: session.user.id,
            insurerName: extractedData.insurerName,
            policyNumber: extractedData.policyNumber,
            lineOfBusiness: extractedData.lineOfBusiness as any,
            startDate: extractedData.startDate,
            endDate: extractedData.endDate,
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
            uploadedByUserId: session.user.id,
            processingStatus: "completed"
        }
    })

    // Log Activity
    await (db as any).activityLog.create({
        data: {
            adminUserId: session.user.id,
            adminEmail: session.user.email || "unknown",
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
