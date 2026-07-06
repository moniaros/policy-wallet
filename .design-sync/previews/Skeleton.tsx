import * as React from "react"
import { Skeleton } from "policy-wallet"

export const Stack = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320 }}>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-32 rounded-xl" />
    </div>
)

export const PolicyCard = () => (
    <div
        style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            maxWidth: 380,
            padding: 20,
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 16,
        }}
    >
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
    </div>
)
