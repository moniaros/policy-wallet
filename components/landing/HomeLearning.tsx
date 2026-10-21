import Image from "next/image"
import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"
import { homepagePanelsCopy } from "@/lib/i18n/homepage-panels"
import { localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import styles from "./homepage-panels.module.css"

export function HomeLearning({ locale }: { locale: LandingLocale }) {
    const copy = homepagePanelsCopy[locale]
    return <section id="learn" aria-labelledby="learn-heading" className={styles.section}>
        <div className={styles.container}>
            <h2 id="learn-heading" className={styles.heading}>{copy.learnHeading}</h2>
            <div className={styles.learning}>
                <Link href={localizeHref("/guides", locale)} className={styles.learningCard}>
                    <div className={styles.learningImage}><Image src="/images/guide-still-life.webp" fill sizes="(max-width: 767px) 100vw, 48vw" alt="" /></div>
                    <div className={styles.learningCopy}><h3>{copy.guidesTitle}</h3><p>{copy.guidesBody}</p><span className={styles.textLink}>{copy.guidesLink}<ArrowRight aria-hidden size={20} /></span></div>
                </Link>
                <Link href={localizeHref("/lexiko", locale)} className={styles.learningCard}>
                    <div className={styles.glossaryArt} aria-hidden="true"><BookOpen size={42} strokeWidth={1.2} /><div>{copy.glossaryWords.map(word => <span key={word}>{word}</span>)}</div></div>
                    <div className={styles.learningCopy}><h3>{copy.glossaryTitle}</h3><p>{copy.glossaryBody}</p><span className={styles.textLink}>{copy.glossaryLink}<ArrowRight aria-hidden size={20} /></span></div>
                </Link>
            </div>
        </div>
    </section>
}
