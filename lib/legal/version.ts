/**
 * The legal content version, alone.
 *
 * `lib/compliance/consent.ts` needs this one string to stamp a consent cookie,
 * and it used to import it from `legal-content.ts` — which carries the full
 * Greek and English text of every policy. Because the cookie banner is a
 * client component on every page, that import shipped ~60 KB of legal prose
 * to the marketing home. The constant lives here; `legal-content.ts`
 * re-exports it so the legal pages read the same value.
 */
export const LEGAL_CONTENT_VERSION = "GR-GA-2026.03"
