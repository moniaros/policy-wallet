"use client"

import { useEffect, useRef, useCallback, useState } from "react"

export type CollaborationEvent =
    | { type: "thread:new_message"; threadId: string; message: unknown }
    | { type: "thread:status_changed"; threadId: string; status: string }
    | { type: "proposal:response"; proposalId: string; status: string }
    | { type: "document:uploaded"; requestId: string; documentUrl: string }

interface UseCollaborationSocketOptions {
    relationshipId?: string
    enabled?: boolean
    onEvent?: (event: CollaborationEvent) => void
}

export function useCollaborationSocket({
    relationshipId,
    enabled = true,
    onEvent,
}: UseCollaborationSocketOptions) {
    const [isConnected, setIsConnected] = useState(false)
    const eventSourceRef = useRef<EventSource | null>(null)
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const reconnectAttemptsRef = useRef(0)
    const maxReconnectAttempts = 10

    const connect = useCallback(() => {
        if (!enabled) return

        const params = new URLSearchParams()
        if (relationshipId) params.set("relationshipId", relationshipId)

        const url = `/api/v1/collaboration/events?${params}`
        const eventSource = new EventSource(url)
        eventSourceRef.current = eventSource

        eventSource.onopen = () => {
            setIsConnected(true)
            reconnectAttemptsRef.current = 0
        }

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as CollaborationEvent
                onEvent?.(data)
            } catch {
                // ignore malformed messages
            }
        }

        eventSource.onerror = () => {
            setIsConnected(false)
            eventSource.close()
            eventSourceRef.current = null

            // Exponential backoff reconnect
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
                reconnectAttemptsRef.current++
                reconnectTimeoutRef.current = setTimeout(connect, delay)
            }
        }
    }, [enabled, relationshipId, onEvent])

    useEffect(() => {
        connect()
        return () => {
            eventSourceRef.current?.close()
            eventSourceRef.current = null
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
        }
    }, [connect])

    const disconnect = useCallback(() => {
        eventSourceRef.current?.close()
        eventSourceRef.current = null
        setIsConnected(false)
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
        }
    }, [])

    return { isConnected, disconnect }
}
