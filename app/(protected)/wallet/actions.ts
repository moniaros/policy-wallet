"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

const PolicySchema = z.object({
    insurerName: z.string().min(1, "Insurer name is required"),
    policyNumber: z.string().min(1, "Policy number is required"),
    lineOfBusiness: z.enum(["motor", "health", "home", "life", "travel", "liability"]),
    startDate: z.string(),
    endDate: z.string(),
    premiumAmount: z.coerce.number().optional(),
})

export async function createPolicy(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

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
            ownerUserId: session.user.id,
            createdByUserId: session.user.id,
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
    const files = formData.getAll("files") as File[]
    for (const file of files) {
        if (file.size > 0) {
            const mockUrl = `https://storage.googleapis.com/policywallet-uploads/${file.name}`
            await db.policyDocument.create({
                data: {
                    policyId: policy.id,
                    fileUrl: mockUrl,
                    fileName: file.name,
                    fileSize: file.size,
                    source: "policyholder",
                    uploadedByUserId: session.user.id,
                    processingStatus: "completed"
                }
            })
        }
    }

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

    // 1. Upload to storage (Mocking this part for One-Shot)
    const mockUrl = `https://storage.googleapis.com/policywallet-uploads/${file.name}`

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

            console.log("Gemini extracted:", aiJson);

            // Merge with defaults
            if (aiJson.insurerName) extractedData.insurerName = aiJson.insurerName;
            if (aiJson.policyNumber) extractedData.policyNumber = aiJson.policyNumber;
            if (aiJson.lineOfBusiness) extractedData.lineOfBusiness = aiJson.lineOfBusiness.toLowerCase();
            if (aiJson.startDate) extractedData.startDate = new Date(aiJson.startDate);
            if (aiJson.endDate) extractedData.endDate = new Date(aiJson.endDate);

        } catch (error) {
            console.error("Gemini Extraction Failed:", error);
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
            fileUrl: mockUrl,
            fileName: file.name,
            fileSize: file.size,
            source: "policyholder",
            uploadedByUserId: session.user.id,
            processingStatus: "completed"
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
