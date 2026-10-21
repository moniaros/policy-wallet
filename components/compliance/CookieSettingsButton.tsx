"use client"

import { COOKIE_PREFERENCES_EVENT } from "@/lib/compliance/consent"

const copy = {
    el: { label: "Ρυθμίσεις cookies" },
    en: { label: "Cookie settings" },
}

export function CookieSettingsButton({ language }: { language: "el" | "en" }) {
    return (
        <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(COOKIE_PREFERENCES_EVENT))}
            className="inline-flex min-h-11 items-center text-inherit underline underline-offset-4 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
            {copy[language].label}
        </button>
    )
}
