import type { RecordNeed, RecordStatus, RecordStatusResult } from "@/lib/wallet/record-status"

export interface RecordStatusCopy {
    underExamination: string
    needsData: string
    awaitingConfirmation: string
    confirmed: string
    /** «Επιβεβαίωση συμβούλου» — the confirmed state with its actor declared (A-06). */
    confirmedByAgent: string
    inactive: string
    needConsent: string
    needPlan: string
    needTokens: string
    needDocument: string
    needPermission: string
    /** «Στοιχεία που δεν διαβάστηκαν: {fields}» */
    needFields: string
    needTechnical: string
    /** «Η κατάσταση περιγράφει τον φάκελο, όχι την ασφάλισή σας.» */
    describesRecord: string
}

const LABEL_KEY: Record<RecordStatus, keyof RecordStatusCopy> = {
    under_examination: "underExamination",
    needs_data: "needsData",
    awaiting_confirmation: "awaitingConfirmation",
    confirmed: "confirmed",
    inactive: "inactive",
}

const NEED_KEY: Record<RecordNeed, keyof RecordStatusCopy> = {
    consent: "needConsent",
    plan: "needPlan",
    tokens: "needTokens",
    document: "needDocument",
    permission: "needPermission",
    fields: "needFields",
    technical: "needTechnical",
}

export function recordStatusLabel(result: Pick<RecordStatusResult, "status" | "confirmedBy">, copy: RecordStatusCopy): string {
    if (result.status === "confirmed" && result.confirmedBy === "agent") return copy.confirmedByAgent
    return copy[LABEL_KEY[result.status]]
}

export function recordNeedLine(result: RecordStatusResult, copy: RecordStatusCopy): string | null {
    if (!result.need) return null
    const line = copy[NEED_KEY[result.need]]
    return result.need === "fields" ? line.replace("{fields}", result.missingFields.join(", ")) : line
}

/**
 * The status as TEXT, in one neutral shape for all five states. Colour is not
 * a carrier here at all: the same border and ground for every status, so a
 * reader who cannot see colour and a reader who can are told the same thing.
 * The status describes the record; the optional second line says what the
 * record needs, and nothing here can be read as a verdict on the person.
 */
export function RecordStatusLabel({
    result,
    copy,
    withNeed = true,
    className = "",
}: {
    result: RecordStatusResult
    copy: RecordStatusCopy
    withNeed?: boolean
    className?: string
}) {
    const need = withNeed ? recordNeedLine(result, copy) : null
    return (
        <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
            <span
                data-fact="record.status"
                data-record-status={result.status}
                className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
                {recordStatusLabel(result, copy)}
            </span>
            {need && (
                <span data-fact="record.need" className="text-caption text-muted-foreground">
                    {need}
                </span>
            )}
        </span>
    )
}
