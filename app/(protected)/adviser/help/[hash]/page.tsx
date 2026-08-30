export const runtime = "nodejs"

import Link from "next/link"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { getTranslations } from "@/lib/i18n"
import { loadFindingsContext } from "@/lib/app/home-model"
import { loadAdviserModel } from "@/lib/app/adviser-model"
import { PRIMARY_NAV, SECONDARY_NAV } from "@/lib/app/navigation"
import { AppSection } from "@/src/design-system/app-layout"
import { LargeTitleNav } from "@/src/design-system/shell"
import { buttonClassName } from "@/src/design-system/primitives"
import { HelpScreen } from "./HelpScreen"

/** /adviser/help/[hash] (§8.8) — the finding arrives with the person; no adviser or no finding gets an honest sentence, never a directory. */
export default async function HelpPage({ params }: { params: Promise<{ hash: string }> }) {
    const { hash: rawHash } = await params
    // Next delivers dynamic params percent-encoded; the hash carries «|» separators.
    const hash = decodeURIComponent(rawHash)
    const { dbUser } = await getAuthenticatedUser()
    const lang = (dbUser.preferredLanguage as "el" | "en") || "el"
    const t = getTranslations(lang)
    const brand = { href: PRIMARY_NAV[0].href, label: t.app.nav.brand }

    const [model, ctx] = await Promise.all([loadAdviserModel(dbUser.id, lang), loadFindingsContext(dbUser.id, lang)])
    const finding = ctx.findings.find((f) => f.hash === hash) ?? null

    if (!model.adviser || !finding) {
        const adviserHref = SECONDARY_NAV.find((e) => e.id === "adviser")?.href ?? "/adviser"
        return (
            <>
                <LargeTitleNav title={t.app.adviser.help.title} back={{ href: PRIMARY_NAV[1].href, label: t.app.see.title }} brand={brand} />
                <AppSection id="consent">
                    <p className="text-g-app-body text-fg-primary">{model.adviser ? t.app.adviser.help.gone : t.app.adviser.help.noAdviser}</p>
                    <Link href={model.adviser ? PRIMARY_NAV[1].href : adviserHref} className={buttonClassName({ variant: "primary", size: "md" }, "mt-g-4")}>
                        {model.adviser ? t.app.see.title : t.app.adviser.title}
                    </Link>
                </AppSection>
            </>
        )
    }

    const otherPolicies = ctx.composed.filter((p) => p.id !== finding.object.policyId && p.lifecycle !== "expired").length
    return <HelpScreen finding={finding} adviserName={model.adviser.name} otherPolicies={otherPolicies} />
}
