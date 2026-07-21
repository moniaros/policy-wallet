import { db } from "@/lib/db"

type DsrEvidenceOptions = {
    windowHours?: number
    sampleLimit?: number
    pendingSlaHours?: number
}

type StatusCount = {
    status: string
    count: number
}

type FailedRequestSample = {
    kind: "data_export" | "deletion"
    requestId: string
    userId: string | null
    status: string
    requestedAt: string
    errorMessage: string | null
}

type PendingRequestSample = {
    kind: "data_export" | "deletion"
    requestId: string
    userId: string | null
    status: string
    requestedAt: string
    ageHours: number
}

export type DsrEvidenceSnapshot = {
    generatedAt: string
    windowHours: number
    pendingSlaHours: number
    summary: {
        totalOpenRequests: number
        openDataExportRequests: number
        openDeletionRequests: number
        failedInWindow: number
        completedInWindow: number
        pendingBeyondSla: number
    }
    dataExportStatusBreakdown: StatusCount[]
    deletionStatusBreakdown: StatusCount[]
    samples: {
        failedRequests: FailedRequestSample[]
        oldestPending: PendingRequestSample[]
    }
    needsAttention: boolean
}

function buildStatusBreakdown(rows: Array<{ status: string }>): StatusCount[] {
    const map = new Map<string, number>()
    for (const row of rows) {
        map.set(row.status, (map.get(row.status) || 0) + 1)
    }
    return Array.from(map.entries())
        .map(([status, count]) => ({ status, count }))
        .sort((a, b) => a.status.localeCompare(b.status))
}

function ageHours(from: Date, to: Date): number {
    return Math.round(((to.getTime() - from.getTime()) / (60 * 60 * 1000)) * 100) / 100
}

export async function getDsrEvidenceSnapshot(
    options: DsrEvidenceOptions = {}
): Promise<DsrEvidenceSnapshot> {
    const now = new Date()
    const windowHours = options.windowHours ?? 24
    const sampleLimit = options.sampleLimit ?? 20
    const pendingSlaHours = options.pendingSlaHours ?? 24

    const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000)
    const pendingSlaCutoff = new Date(now.getTime() - pendingSlaHours * 60 * 60 * 1000)

    const openDataExportStatuses = ["requested", "processing", "failed"] as const
    const openDeletionStatuses = ["requested", "in_review", "approved", "processing", "failed"] as const

    const [
        dataExportRows,
        deletionRows,
        openDataExportRequests,
        openDeletionRequests,
        completedDataExportsInWindow,
        completedDeletionsInWindow,
        failedDataExportsInWindow,
        failedDeletionsInWindow,
        staleDataExportPending,
        staleDeletionPending,
        failedDataExportSamples,
        failedDeletionSamples,
        oldestPendingDataExports,
        oldestPendingDeletions,
    ] = await Promise.all([
        db.dataExportRequest.findMany({
            select: { status: true },
        }),
        db.deletionRequest.findMany({
            select: { status: true },
        }),
        db.dataExportRequest.count({
            where: {
                status: { in: [...openDataExportStatuses] },
            },
        }),
        db.deletionRequest.count({
            where: {
                status: { in: [...openDeletionStatuses] },
            },
        }),
        db.dataExportRequest.count({
            where: {
                status: "completed",
                completedAt: { gte: windowStart },
            },
        }),
        db.deletionRequest.count({
            where: {
                status: "completed",
                completedAt: { gte: windowStart },
            },
        }),
        db.dataExportRequest.count({
            where: {
                status: "failed",
                updatedAt: { gte: windowStart },
            },
        }),
        db.deletionRequest.count({
            where: {
                status: "failed",
                updatedAt: { gte: windowStart },
            },
        }),
        db.dataExportRequest.count({
            where: {
                status: { in: ["requested", "processing"] },
                requestedAt: { lte: pendingSlaCutoff },
            },
        }),
        db.deletionRequest.count({
            where: {
                status: { in: ["requested", "in_review", "approved", "processing"] },
                requestedAt: { lte: pendingSlaCutoff },
            },
        }),
        db.dataExportRequest.findMany({
            where: {
                status: "failed",
            },
            orderBy: { updatedAt: "desc" },
            take: sampleLimit,
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
                errorMessage: true,
            },
        }),
        db.deletionRequest.findMany({
            where: {
                status: "failed",
            },
            orderBy: { updatedAt: "desc" },
            take: sampleLimit,
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
                errorMessage: true,
            },
        }),
        db.dataExportRequest.findMany({
            where: {
                status: { in: ["requested", "processing"] },
            },
            orderBy: { requestedAt: "asc" },
            take: sampleLimit,
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
            },
        }),
        db.deletionRequest.findMany({
            where: {
                status: { in: ["requested", "in_review", "approved", "processing"] },
            },
            orderBy: { requestedAt: "asc" },
            take: sampleLimit,
            select: {
                id: true,
                userId: true,
                status: true,
                requestedAt: true,
            },
        }),
    ])

    const failedRequests: FailedRequestSample[] = [
        ...failedDataExportSamples.map((row) => ({
            kind: "data_export" as const,
            requestId: row.id,
            userId: row.userId,
            status: row.status,
            requestedAt: row.requestedAt.toISOString(),
            errorMessage: row.errorMessage,
        })),
        ...failedDeletionSamples.map((row) => ({
            kind: "deletion" as const,
            requestId: row.id,
            userId: row.userId,
            status: row.status,
            requestedAt: row.requestedAt.toISOString(),
            errorMessage: row.errorMessage,
        })),
    ].slice(0, sampleLimit)

    const oldestPending: PendingRequestSample[] = [
        ...oldestPendingDataExports.map((row) => ({
            kind: "data_export" as const,
            requestId: row.id,
            userId: row.userId,
            status: row.status,
            requestedAt: row.requestedAt.toISOString(),
            ageHours: ageHours(row.requestedAt, now),
        })),
        ...oldestPendingDeletions.map((row) => ({
            kind: "deletion" as const,
            requestId: row.id,
            userId: row.userId,
            status: row.status,
            requestedAt: row.requestedAt.toISOString(),
            ageHours: ageHours(row.requestedAt, now),
        })),
    ]
        .sort((a, b) => b.ageHours - a.ageHours)
        .slice(0, sampleLimit)

    const summary = {
        totalOpenRequests: openDataExportRequests + openDeletionRequests,
        openDataExportRequests,
        openDeletionRequests,
        failedInWindow: failedDataExportsInWindow + failedDeletionsInWindow,
        completedInWindow: completedDataExportsInWindow + completedDeletionsInWindow,
        pendingBeyondSla: staleDataExportPending + staleDeletionPending,
    }

    const needsAttention = summary.failedInWindow > 0 || summary.pendingBeyondSla > 0

    return {
        generatedAt: now.toISOString(),
        windowHours,
        pendingSlaHours,
        summary,
        dataExportStatusBreakdown: buildStatusBreakdown(dataExportRows),
        deletionStatusBreakdown: buildStatusBreakdown(deletionRows),
        samples: {
            failedRequests,
            oldestPending,
        },
        needsAttention,
    }
}
