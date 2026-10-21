import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { presentationCopy } from "@/lib/i18n/presentation"
import { homepagePanelsCopy } from "@/lib/i18n/homepage-panels"
import { PRIMARY_ACTION, pick } from "@/lib/marketing/positioning"
import { authHref, localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import { AudienceScreen } from "../AudienceScreen"
import styles from "../homepage-panels.module.css"

export function WhoItIsFor({ locale }: { locale: LandingLocale }) {
    const copy = presentationCopy[locale]
    const panels = homepagePanelsCopy[locale]
    return <section id="solutions" aria-labelledby="solutions-heading" className={styles.section}>
        <div className={styles.container}>
            <h2 id="solutions-heading" className={styles.heading}>{copy.audiencesHeading}</h2>
            <div className={styles.audiences}>
                <article className={styles.personal}>
                    <div className={styles.audienceCopy}>
                        <h3>{copy.individualTitle}</h3>
                        <p>{copy.individualBody}</p>
                        <Link href={authHref("/auth/signup?role=policyholder&source=landing_audience", locale)} className="pw-primary-button">{pick(PRIMARY_ACTION, locale)}<ArrowRight aria-hidden className="size-4" /></Link>
                    </div>
                    <div className={styles.screenStage}>
                        <div className={styles.screenFrame}><p className={styles.screenLabel}>{panels.walletLabel}</p><AudienceScreen locale={locale} kind="wallet" /></div>
                    </div>
                    <p className={styles.sample}>{panels.sample}</p>
                </article>
                <article className={styles.professional}>
                    <div className={styles.audienceCopy}>
                        <h3>{copy.professionalTitle}</h3>
                        <p>{copy.professionalBody}</p>
                        <Link href={localizeHref("/solutions/agents", locale)} className="pw-primary-button-inverse">{copy.professionalLink}<ArrowRight aria-hidden className="size-4" /></Link>
                    </div>
                    <div className={styles.screenStage}>
                        <div className={styles.screenFrame}><p className={styles.screenLabel}>{panels.agentLabel}</p><AudienceScreen locale={locale} kind="agent" /></div>
                    </div>
                    <p className={styles.sample}>{panels.sample}</p>
                </article>
            </div>
        </div>
    </section>
}
