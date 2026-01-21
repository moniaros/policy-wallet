import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Note: if you want to override the automatic release value, do not set a
    // `release` value here - use the environment variable `SENTRY_RELEASE`, so
    // that it will also get attached to your source maps

    environment: process.env.NODE_ENV || 'development',

    // Ignore common errors that aren't actionable
    ignoreErrors: [
        // Browser extensions
        'top.GLOBALS',
        // Random plugins/extensions
        'originalCreateNotification',
        'canvas.contentDocument',
        'MyApp_RemoveAllHighlights',
        // Facebook borked
        'fb_xd_fragment',
        // ISP "optimizing" proxy - `Cache-Control: no-transform` seems to reduce this. (thanks @acdha)
        'bmi_SafeAddOnload',
        'EBCallBackMessageReceived',
        // See http://blog.errorception.com/2012/03/tale-of-unfindable-js-error.html
        'Can\'t find variable: ZiteReader',
        'jigsaw is not defined',
        'ComboSearch is not defined',
        // Network errors
        'NetworkError',
        'Network request failed',
        'Failed to fetch',
        // Aborted requests
        'AbortError',
        'The operation was aborted',
    ],

    beforeSend(event, hint) {
        // Filter out errors from development
        if (process.env.NODE_ENV === 'development') {
            console.error('Sentry Event (dev):', event);
            return null; // Don't send to Sentry in development
        }

        // Check if it's an exception and if so, show the error in console
        if (event.exception) {
            console.error('Error captured by Sentry:', hint.originalException || hint.syntheticException);
        }

        return event;
    },
});
