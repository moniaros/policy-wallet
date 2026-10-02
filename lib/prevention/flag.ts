/** Local/dev pilot. No provider calls or new tracking when disabled. */
export function preventionHubEnabled(): boolean {
    return process.env.PREVENTION_HUB_ENABLED === '1'
}

export function preventionPersonalizationEnabled(): boolean {
    return preventionHubEnabled() && process.env.PREVENTION_PERSONALIZATION_ENABLED === '1'
}
