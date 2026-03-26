export type ViewerRole = "agent" | "policyholder"

export type ThreadType = "message" | "document_request" | "proposal"

export type DocumentUrgency = "low" | "normal" | "urgent"

export type DocumentRequestStatus = "pending" | "uploaded" | "expired"

export type ProposalStatus = "pending" | "accepted" | "declined" | "expired"

export type ProposalType = "new_policy" | "renewal" | "upgrade" | "bundle"

export type DataConfidence = "confirmed" | "pending" | "agent_suggested"

export interface DocumentRequestData {
    id: string
    threadId: string
    relationshipId: string
    requestedByUserId: string
    documentType: string
    instruction?: string | null
    urgency: DocumentUrgency
    status: DocumentRequestStatus
    dueDate?: string | null
    completedAt?: string | null
    uploadedDocumentUrl?: string | null
    createdAt: string
}

export interface ProposalData {
    id: string
    threadId: string
    relationshipId: string
    createdByUserId: string
    proposalType: ProposalType
    insurerName: string
    lineOfBusiness: string
    premiumAmount: number
    premiumCurrency: string
    coverageSummary: string
    comparisonData?: Record<string, unknown> | null
    plainLanguageSummary?: string | null
    status: ProposalStatus
    clientResponseAt?: string | null
    eSignatureUrl?: string | null
    createdAt: string
}

export interface AgentCardData {
    id: string
    name: string
    agencyName: string
    licenseNumber?: string | null
    phone?: string | null
    email: string
    website?: string | null
    logoUrl?: string | null
    brandColor: string
    verificationStatus: string
    avatar?: string | null
}

export interface TrustSignalData {
    licenseNumber?: string | null
    insurerVerified: boolean
    lastUpdated: string
    dataConfidence: DataConfidence
}

export interface SharedPolicyRoomData {
    relationshipId: string
    agent: AgentCardData
    policies: Array<{
        id: string
        policyNumber?: string
        insurerName: string
        lineOfBusiness: string
        status: string
        endDate: string
        premiumAmount?: number
    }>
    pendingActions: Array<{
        id: string
        title: string
        type: "document_request" | "proposal" | "action"
        urgency?: DocumentUrgency
        dueDate?: string | null
    }>
    sharedDocuments: Array<{
        id: string
        fileName: string
        fileUrl: string
        uploadedAt: string
        uploadedBy: "agent" | "client"
    }>
    documentRequests: DocumentRequestData[]
    proposals: ProposalData[]
}

export interface ProposalComparison {
    currentPremium: number
    proposedPremium: number
    currentCoverage: string
    proposedCoverage: string
    savingsOrAddedValue: number
    savingsLabel: string // e.g. "Εξοικονόμηση €200/έτος"
}

// Document type taxonomy for Greek insurance
export const DOCUMENT_TYPE_TAXONOMY = {
    id_card: { en: "Identity Card", el: "Ταυτότητα" },
    amka: { en: "AMKA Number", el: "ΑΜΚΑ" },
    tax_return: { en: "Tax Return", el: "Φορολογική Δήλωση" },
    policy_scan: { en: "Policy Document Scan", el: "Σάρωση Ασφαλιστηρίου" },
    medical_certificate: { en: "Medical Certificate", el: "Ιατρικό Πιστοποιητικό" },
    drivers_license: { en: "Driver's License", el: "Δίπλωμα Οδήγησης" },
    vehicle_registration: { en: "Vehicle Registration", el: "Άδεια Κυκλοφορίας" },
    bank_statement: { en: "Bank Statement", el: "Τελευταίος Λογαριασμός" },
    property_deed: { en: "Property Deed", el: "Τίτλος Ιδιοκτησίας" },
    other: { en: "Other Document", el: "Άλλο Έγγραφο" },
} as const

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPE_TAXONOMY
