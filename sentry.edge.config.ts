import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    environment: process.env.NODE_ENV || 'development',

    beforeSend(event, hint) {
        // Filter out errors from development
        if (process.env.NODE_ENV === 'development') {
            console.error('Sentry Event (dev - edge):', event);
            return null; // Don't send to Sentry in development
        }

        return event;
    },
});
