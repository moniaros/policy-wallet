import { IBM_Plex_Sans, Inter } from "next/font/google"

/**
 * The app's fonts, declared ONCE.
 *
 * There were ten separate `next/font` calls across the tree: the root layout's
 * Inter, four more Inter instances with static weights that duplicated it, and
 * four IBM_Plex_Sans instances on auth pages. Each call is its own font
 * loading — the duplicates fetched Inter again rather than reusing the root's,
 * and nine of the ten omitted `display: "swap"`, so text stayed INVISIBLE until
 * the font arrived. On the Greek subset, on the auth screens a new user sees
 * first, that is a blank page on a slow connection.
 *
 * Both families keep the Greek subset — the product's default language is
 * Greek and the Latin-only subset renders Greek as tofu.
 */
export const inter = Inter({
    subsets: ["latin", "greek"],
    variable: "--font-inter",
    display: "swap",
})

/**
 * Used by four auth pages. It is NOT in the design tokens — `--font-heading`
 * and `--font-body` in globals.css both resolve to Inter — so this is a second
 * family loaded for four screens. Consolidating it onto Inter is a visual
 * decision for the design owner, not a refactor; until then it is at least
 * declared once, with swap, instead of four times without.
 */
export const ibmPlexSans = IBM_Plex_Sans({
    subsets: ["latin", "greek"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-ibm-plex-sans",
    display: "swap",
})
