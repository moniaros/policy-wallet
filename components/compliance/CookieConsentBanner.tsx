"use client"

import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import {
    CONSENT_COOKIE_NAME,
    DEFAULT_CATEGORIES,
    LEGAL_POLICY_VERSIONS,
    type ConsentCategories,
    type ConsentCookiePayload,
} from "@/lib/compliance/consent"

function readCookieConsent(): ConsentCookiePayload | null {
    if (typeof document === "undefined") return null

    const match = document.cookie
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))

    if (!match) return null
    const raw = match.split("=")[1]
    if (!raw) return null

    try {
        return JSON.parse(decodeURIComponent(raw)) as ConsentCookiePayload
    } catch {
        return null
    }
}

function writeCookieConsent(payload: ConsentCookiePayload) {
    const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : ""
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=31536000; SameSite=Lax${secureFlag}`
}

export function CookieConsentBanner() {
    const { language, t } = useLanguage()
    const copy = t.compliance.cookieBanner
    const [visible, setVisible] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const [saving, setSaving] = useState(false)
    const [categories, setCategories] = useState<ConsentCategories>(DEFAULT_CATEGORIES)

    useEffect(() => {
        const existingConsent = readCookieConsent()
        if (!existingConsent) {
            setVisible(true)
            return
        }
        if (existingConsent.categories) {
            setCategories(existingConsent.categories)
        }
    }, [])

    const canSave = useMemo(() => !saving, [saving])

    const persistConsent = async (nextCategories: ConsentCategories, source: "banner_accept_all" | "banner_necessary_only" | "banner_preferences") => {
        setSaving(true)
        const payload: ConsentCookiePayload = {
            consentType: "cookie",
            locale: language,
            policyVersion: LEGAL_POLICY_VERSIONS.cookie,
            categories: nextCategories,
            acceptedAt: new Date().toISOString(),
        }

        // Persist immediately so navigation/reload does not redisplay the banner.
        writeCookieConsent(payload)
        try {
            const response = await fetch("/api/v1/consents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    consentType: "cookie",
                    locale: language,
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
        <div className="fixed inset-x-0 bottom-0 z-[120] p-4 md:p-6">
            <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200/70 bg-white/95 p-5 shadow-2xl backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/95">
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{copy.title}</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{copy.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                            type="button"
                            onClick={() => setExpanded((current) => !current)}
                            className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            {expanded ? copy.hidePreferences : copy.managePreferences}
                        </button>
                        <a href={`/privacy?lang=${language}`} className="font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                            {copy.privacyLink}
                        </a>
                        <a href={`/terms?lang=${language}`} className="font-semibold text-teal-700 hover:text-teal-800 dark:text-teal-300 dark:hover:text-teal-200">
                            {copy.termsLink}
                        </a>
                    </div>

                    {expanded ? (
                        <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 md:grid-cols-3">
                            <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.necessaryTitle}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{copy.necessaryDescription}</p>
                                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-300">{copy.alwaysOn}</p>
                            </label>

                            <label className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.analyticsTitle}</p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{copy.analyticsDescription}</p>
                                <input
                                    type="checkbox"
                                    className="mt-3 h-4 w-4 accent-teal-600"
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
                                    className="mt-3 h-4 w-4 accent-teal-600"
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
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
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
                            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {copy.acceptAll}
                        </button>
                        {expanded ? (
                            <button
                                type="button"
                                disabled={!canSave}
                                onClick={() => persistConsent(categories, "banner_preferences")}
                                className="rounded-xl border border-teal-300 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-700 dark:text-teal-300 dark:hover:bg-teal-900/30"
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
