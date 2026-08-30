/**
 * First-run state (§8.11). No new User column (A-16): policyholder onboarding
 * completion has always lived in PolicyholderProfile.preferences (JSON) —
 * `app/onboarding/actions.ts` writes `onboardingCompleted(At)` there. The
 * AgentProfile column is the agents' separate mechanism.
 */
export function firstRunDone(preferences: unknown): boolean {
    if (!preferences || typeof preferences !== "object") return false
    const p = preferences as Record<string, unknown>
    return p.onboardingCompleted === true || Boolean(p.onboardingCompletedAt)
}
