"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"
import { getCookieBannerCopy } from "@/components/compliance/cookie-banner-copy"
import {
    CONSENT_COOKIE_NAME,
    DEFAULT_CATEGORIES,
    LEGAL_POLICY_VERSIONS,
    emitConsentChanged,
    readConsentFromDocument,
    type ConsentCategories,
    type ConsentCookiePayload,
} from "@/lib/compliance/consent"

function writeCookieConsent(payload: ConsentCookiePayload) {
    const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`
}

export function CookieConsentBanner() {
    // useSearchParams() opts the tree out of static rendering unless it sits
    // under a boundary; the fallback (nothing, for one paint) is harmless for
    // a banner that pops in client-side anyway.
    return (
        <Suspense fallback={null}>
            <CookieConsentBannerInner />
        </Suspense>
    )
}

function CookieConsentBannerInner() {
    // Reads only `language`, never `t`: this banner is mounted in the ROOT
    // layout, so it renders on marketing routes where the dictionary is not
    // loaded. Its copy is co-located instead — see cookie-banner-copy.ts.
    const { language } = useLanguage()

    // …and being in the ROOT layout is also why it needs the path. The /en tree
    // gets its locale from StaticLanguageProvider, which is mounted INSIDE that
    // subtree — this banner sits above it and therefore reads the global
    // provider, whose default is Greek. Result: an English page with a Greek
    // consent sheet covering the CTA on a phone. The route is the honest signal
    // here, and a consent dialog nobody can read is not "clear and plain
    // language" under GDPR Art. 7(2), quite apart from the confusion.
    const pathname = usePathname()
    // Two signals, because the site has two English surfaces: the /en tree
    // (path prefix) and the auth tree, which has no prefix and is pinned by
    // ?lang=en instead. Reading only the path left the English signup form
    // with a Greek consent sheet whose legal links forced ?lang=el — on the
    // highest-intent screen in the funnel.
    const requestedLang = useSearchParams().get("lang")
    const routeLanguage =
        pathname === "/en" || pathname?.startsWith("/en/")
            ? "en"
            : requestedLang === "en"
              ? "en"
              : language
    const copy = getCookieBannerCopy(routeLanguage)
    const [visible, setVisible] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [saving, setSaving] = useState(false)
    const [categories, setCategories] = useState<ConsentCategories>(DEFAULT_CATEGORIES)
    const bannerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const existingConsent = readConsentFromDocument()
        if (!existingConsent) {
            setVisible(true)
            return
        }
        if (existingConsent.categories) {
            setCategories(existingConsent.categories)
        }
    }, [])

    /**
     * Publish how much of the bottom of the screen this banner is occupying.
     *
     * The banner is `fixed inset-x-0 bottom-0 z-[120]` — a full-width strip
     * above everything else. The wallet's "Add policy" floating button is
     * `fixed bottom-6 right-6 z-50`, so until someone dismissed the banner the
     * primary call to action on the page was covered and unclickable. That is
     * the first thing a brand-new customer with an empty wallet tries to press,
     * and the consent banner is showing for exactly that person.
     *
     * Raising the button's z-index would have floated it OVER the consent text,
     * which is not an improvement — consent UI should not be obscured either.
     * So the banner states its height and anything anchored to the bottom sits
     * clear of it; `useLayoutEffect` would be wrong here because the value is
     * consumed by CSS on a separate fixed element, not by this render.
     */
    useEffect(() => {
        const root = document.documentElement
        if (!visible) {
            root.style.removeProperty("--pw-bottom-obstruction")
            return
        }

        const measure = () => {
            const height = bannerRef.current?.offsetHeight ?? 0
            root.style.setProperty("--pw-bottom-obstruction", `${height}px`)
        }
        measure()

        // The card grows when preferences expand, and reflows on rotate.
        const observer = new ResizeObserver(measure)
        if (bannerRef.current) observer.observe(bannerRef.current)
        window.addEventListener("resize", measure)

        return () => {
            observer.disconnect()
            window.removeEventListener("resize", measure)
            root.style.removeProperty("--pw-bottom-obstruction")
        }
    }, [visible, expanded])

    const canSave = useMemo(() => !saving, [saving])

    const persistConsent = async (nextCategories: ConsentCategories, source: "banner_accept_all" | "banner_necessary_only" | "banner_preferences") => {
        setSaving(true)
        const payload: ConsentCookiePayload = {
            consentType: "cookie",
            locale: routeLanguage,
            policyVersion: LEGAL_POLICY_VERSIONS.cookie,
            categories: nextCategories,
            acceptedAt: new Date().toISOString(),
        }

        // Persist immediately so navigation/reload does not redisplay the banner.
        writeCookieConsent(payload)
        // Tell already-mounted listeners (notably GoogleAnalytics) right away, so
        // opting in starts analytics — and opting out stops it — without a reload.
        emitConsentChanged(nextCategories)
        try {
            const response = await fetch("/api/v1/consents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    consentType: "cookie",
                    locale: routeLanguage,
                    source,
                    policyVersion: LEGAL_POLICY_VERSIONS.cookie,
                    categories: nextCategories,
                }),
            })
            if (!response.ok) {
                throw new Error("Failed to persist consent")
            }
        } catch {
            // Keep local cookie fallback; the API call is best-effort for audit logging.
            writeCookieConsent(payload)
        } finally {
            setSaving(false)
            setVisible(false)
        }
    }

    if (!visible) return null

    return (
        // `pointer-events-none` on the wrapper, `pointer-events-auto` on the card.
        //
        // This element is `inset-x-0` — full width — at z-120, but the card
        // inside it is `max-w-4xl mx-auto`. So on a wide screen the strip either
        // side of the card is INVISIBLE and still on top of everything, and it
        // was swallowing clicks: measured at 1280px, `elementFromPoint` over the
        // wallet's "Add policy" button returned this div, not the button. The
        // button looked perfectly clickable and did nothing.
        <div
            ref={bannerRef}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] p-4 md:p-6"
        >
            {/* max-h + scroll: with preferences expanded on a 320x568 phone the
                card ran to 890px and its top 338px — including the collapse
                button — sat above the viewport with no way to reach them.
                dvh, not vh, so the mobile URL bar cannot eat the cap. */}
            <div className="pointer-events-auto mx-auto max-h-[calc(100dvh-2rem)] max-w-4xl overflow-y-auto rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{copy.title}</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setExpanded((current) => !current)}
                            className="min-h-11 rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {expanded ? copy.hidePreferences : copy.managePreferences}
                        </button>
                        <a href={`/privacy?lang=${routeLanguage}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:text-primary-hover dark:text-mint dark:hover:text-mint/80">
                            {copy.privacyLink}
                        </a>
                        <a href={`/terms?lang=${routeLanguage}`} className="inline-flex min-h-11 items-center font-semibold text-primary hover:text-primary-hover dark:text-mint dark:hover:text-mint/80">
                            {copy.termsLink}
                        </a>
                    </div>

                    {expanded ? (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-3">
                            <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.necessaryTitle}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{copy.necessaryDescription}</p>
                                <p className="mt-2 text-micro font-semibold uppercase tracking-wider text-primary dark:text-mint">{copy.alwaysOn}</p>
                            </label>

                            <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.analyticsTitle}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{copy.analyticsDescription}</p>
                                <input
                                    type="checkbox"
                                    className="mt-3 h-4 w-4 accent-primary dark:accent-mint"
                                    checked={categories.analytics}
                                    onChange={(event) =>
                                        setCategories((prev) => ({
                                            ...prev,
                                            analytics: event.target.checked,
                                        }))
                                    }
                                />
                            </label>

                            <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.marketingTitle}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{copy.marketingDescription}</p>
                                <input
                                    type="checkbox"
                                    className="mt-3 h-4 w-4 accent-primary dark:accent-mint"
                                    checked={categories.marketing}
                                    onChange={(event) =>
                                        setCategories((prev) => ({
                                            ...prev,
                                            marketing: event.target.checked,
                                        }))
                                    }
                                />
                            </label>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            disabled={!canSave}
                            onClick={() =>
                                persistConsent(
                                    {
                                        necessary: true,
                                        analytics: false,
                                        marketing: false,
                                    },
                                    "banner_necessary_only"
                                )
                            }
                            className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {copy.necessaryOnly}
                        </button>
                        <button
                            type="button"
                            disabled={!canSave}
                            onClick={() =>
                                persistConsent(
                                    {
                                        necessary: true,
                                        analytics: true,
                                        marketing: true,
                                    },
                                    "banner_accept_all"
                                )
                            }
                            className="min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#1A2420]"
                        >
                            {copy.acceptAll}
                        </button>
                        {expanded ? (
                            <button
                                type="button"
                                disabled={!canSave}
                                onClick={() => persistConsent(categories, "banner_preferences")}
                                className="min-h-11 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-tint disabled:cursor-not-allowed disabled:opacity-60 dark:border-mint/40 dark:text-mint dark:hover:bg-primary/15"
                            >
                                {copy.savePreferences}
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
