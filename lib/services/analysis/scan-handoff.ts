/** Authenticated, short-lived scan handoff. No extraction is persisted before ingestion. */
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AIPolicyExtractionResponse } from '../ai/ai-service.interface'

const MAX_TOKEN_BYTES = 1_000_000
const TTL_MS = 60 * 60 * 1000
function secret() { return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET }
function sign(payload: string, key: string) {
    return createHmac('sha256', key).update('pw-agent-scan-v1:').update(payload).digest('base64url')
}
export function sealScan(input: { actorId: string; hash: string; version: string; extraction: AIPolicyExtractionResponse }, now = Date.now()): string | null {
    const key = secret()
    if (!key) return null // Reuse is optional; never substitute an unsigned artifact.
    const payload = Buffer.from(JSON.stringify({ ...input, expires: now + TTL_MS })).toString('base64url')
    if (payload.length > MAX_TOKEN_BYTES) return null
    return `${payload}.${sign(payload, key)}`
}
export function openScan(token: string, expected: { actorId: string; hash: string; version: string }, now = Date.now()): AIPolicyExtractionResponse | null {
    const key = secret()
    if (!key || token.length > MAX_TOKEN_BYTES + 100) return null
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [payload, signature] = parts
    const wanted = Buffer.from(sign(payload, key))
    const supplied = Buffer.from(signature)
    if (wanted.length !== supplied.length || !timingSafeEqual(wanted, supplied)) return null
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
        if (data.actorId !== expected.actorId || data.hash !== expected.hash || data.version !== expected.version || !Number.isFinite(data.expires) || data.expires <= now) return null
        return data.extraction && typeof data.extraction === 'object' ? data.extraction : null
    } catch { return null }
}
