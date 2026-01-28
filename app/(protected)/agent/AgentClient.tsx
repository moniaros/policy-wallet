"use client"

import { MobileAppShell } from "@/components/layout/MobileAppShell"
import { useIsMobile } from "@/hooks/useResponsive"
import type { Policy } from "@/components/wallet/types"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AgentClientProps {
    policies: Policy[]
    user: {
        id: string
        name: string
        email: string
        photoUrl?: string
    }
    agent?: {
        id: string
        name: string
        phone: string
        email: string
        company: string
        photoUrl?: string
    }
}

export function AgentClient({ policies, user, agent }: AgentClientProps) {
    const isMobile = useIsMobile()
    const router = useRouter()

    useEffect(() => {
        if (!isMobile) {
            // Redirect desktop users back to dashboard or wallet, as this is a mobile-only route for now
            // Or render a desktop agent contact view if we had one
            router.push('/dashboard')
        }
    }, [isMobile, router])

    if (!isMobile) return null // Avoid flash of content

    return (
        <MobileAppShell
            policies={policies}
            user={user}
            agent={agent}
        />
    )
}
