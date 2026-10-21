import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { homepagePanelsCopy } from "@/lib/i18n/homepage-panels"
import { localizeHref } from "@/lib/seo/locale-links"
import type { LandingLocale } from "@/types/landing-content"
import styles from "./homepage-panels.module.css"

export function HomeCategoryCards({ locale }: { locale: LandingLocale }) {
    const copy = homepagePanelsCopy[locale]
    const categories = [
        { id: "motor", href: "/product/motor", title: copy.motor, body: copy.motorBody },
        { id: "home", href: "/product/property", title: copy.home, body: copy.homeBody },
        { id: "health", href: "/product/health", title: copy.health, body: copy.healthBody },
        { id: "business", href: "/product/business", title: copy.business, body: copy.businessBody },
    ]
    return <section id="insurance-categories" aria-labelledby="categories-heading" className={`${styles.section} ${styles.categorySection}`}>
        <div className={styles.container}>
            <div className={styles.sectionIntro}><h2 id="categories-heading" className={styles.heading}>{copy.categoriesHeading}</h2><p>{copy.categoriesIntro}</p></div>
            <div className={styles.categories}>
                {categories.map(category => <Link className={styles.category} key={category.id} href={localizeHref(category.href, locale)}>
                    <div className={styles.categoryImage}><Image src={`/images/presentation/category-${category.id}.webp`} alt="" fill sizes="(max-width: 599px) calc(100vw - 48px), (max-width: 1199px) 45vw, 23vw" /></div>
                    <div className={styles.categoryCopy}><h3>{category.title}</h3><p>{category.body}</p><span className={styles.textLink}>{copy.categoryLink}<ArrowRight aria-hidden size={20} /></span></div>
                </Link>)}
            </div>
            <Link href={localizeHref("/product", locale)} className={styles.allLink}>{copy.allCategories}<ArrowRight aria-hidden size={20} /></Link>
        </div>
    </section>
}
