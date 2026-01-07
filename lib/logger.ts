type LogLevel = 'info' | 'warn' | 'error';

export function logger(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const payload = {
        timestamp,
        level,
        message,
        ...meta
    };

    // In production, this could send to Axiom, Datadog, or Sentry
    if (level === 'error') {
        console.error(JSON.stringify(payload));
    } else if (level === 'warn') {
        console.warn(JSON.stringify(payload));
    } else {
        console.log(JSON.stringify(payload));
    }
}
