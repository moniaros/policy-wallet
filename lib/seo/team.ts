/**
 * Founders / team registry for E-E-A-T.
 *
 * Empty until real people are approved for publication — the /company team
 * section, Organization.founder and Person JSON-LD all render only when
 * entries exist here. Never add placeholder or invented people: fake
 * E-E-A-T signals are worse for trust (and rich-result eligibility) than
 * absent ones.
 */

export type TeamMember = {
    /** Stable slug used for the Person @id anchor. */
    slug: string
    name: string
    role: { el: string; en: string }
    bio: { el: string; en: string }
    /** Optional credentials line, e.g. certifications. */
    credentials?: { el: string; en: string }
    /** Optional public profile for Person.sameAs (e.g. LinkedIn). */
    profileUrl?: string
    founder?: boolean
}

export const teamMembers: TeamMember[] = []

export function getFounders(): TeamMember[] {
    return teamMembers.filter((member) => member.founder)
}
