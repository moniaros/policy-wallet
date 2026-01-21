/**
 * Instrumentation for Sentry
 * 
 * This file is used to initialize Sentry on the server side.
 * It runs before the Next.js server starts.
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config')
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config')
    }
}
