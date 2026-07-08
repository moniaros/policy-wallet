// Server/edge Sentry instrumentation. Guarded so it never breaks a runtime
// that can't host the Node SDK (the original "Replit compatibility" concern):
// set SENTRY_DISABLED=1 to skip, otherwise it registers on Vercel/Node.
export async function register() {
    if (process.env.SENTRY_DISABLED === '1') return
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config')
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config')
    }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs'
