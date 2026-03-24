import { requireApiUser } from "@/lib/api-auth"
import { db as prisma } from "@/lib/db"

export const runtime = "nodejs"

// SSE endpoint for real-time collaboration updates
export async function GET(req: Request) {
    const result = await requireApiUser()
    if ("error" in result) {
        return new Response("Unauthorized", { status: 401 })
    }
    const auth = result.auth

    const { searchParams } = new URL(req.url)
    const relationshipId = searchParams.get("relationshipId")

    const encoder = new TextEncoder()
    let closed = false

    const stream = new ReadableStream({
        start(controller) {
            // Send initial connection event
            controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
            )

            // Poll for new activity every 5 seconds
            const interval = setInterval(async () => {
                if (closed) {
                    clearInterval(interval)
                    return
                }

                try {
                    const fiveSecondsAgo = new Date(Date.now() - 5000)

                    const where: Record<string, unknown> = {
                        lastActivityAt: { gte: fiveSecondsAgo },
                        relationship: {
                            OR: [
                                { agentUserId: auth.dbUser.id },
                                { policyholderUserId: auth.dbUser.id },
                            ],
                        },
                    }
                    if (relationshipId) where.relationshipId = relationshipId

                    const recentThreads = await prisma.collaborationThread.findMany({
                        where,
                        select: {
                            id: true,
                            status: true,
                            threadType: true,
                            lastActivityAt: true,
                            messages: {
                                orderBy: { createdAt: "desc" },
                                take: 1,
                                select: {
                                    id: true,
                                    body: true,
                                    senderUserId: true,
                                    createdAt: true,
                                },
                            },
                        },
                    })

                    for (const thread of recentThreads) {
                        const latestMessage = thread.messages[0]
                        if (latestMessage && latestMessage.senderUserId !== auth.dbUser.id) {
                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({
                                        type: "thread:new_message",
                                        threadId: thread.id,
                                        message: latestMessage,
                                    })}\n\n`
                                )
                            )
                        }
                    }
                } catch {
                    // Ignore polling errors
                }
            }, 5000)

            // Heartbeat every 30 seconds
            const heartbeat = setInterval(() => {
                if (closed) {
                    clearInterval(heartbeat)
                    return
                }
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`))
                } catch {
                    clearInterval(heartbeat)
                    clearInterval(interval)
                }
            }, 30000)

            // Handle client disconnect
            req.signal.addEventListener("abort", () => {
                closed = true
                clearInterval(interval)
                clearInterval(heartbeat)
                controller.close()
            })
        },
    })

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    })
}
