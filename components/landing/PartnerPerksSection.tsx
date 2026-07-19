/**
 * Marketing presentation of LIVE partner offers (landing #perks, /perks page,
 * pricing). Renders NOTHING when the list is empty — the honesty rule: only
 * admin-activated, currently-valid partners ever appear on marketing surfaces.
 * Data comes from getPublicPartnerOffers() in the server page; this component
 * is purely presentational (client-safe, no server imports).
 */

import { Gift } from "lucide-react"
import type { PartnerOfferView } from "@/lib/partner-offers/matching"

const OFFER_TYPE_LABEL: Record<string, { el: string; en: string }> = {
    free_service: { el: "Δωρεάν υπηρεσία", en: "Free service" },
    discount: { el: "Έκπτωση", en: "Discount" },
    gift: { el: "Δώρο", en: "Gift" },
}

export function PartnerPerksSection({
    offers,
    isGreek,
    id = "perks",
}: {
    offers: PartnerOfferView[]
    isGreek: boolean
    id?: string
}) {
    if (offers.length === 0) return null
    const t = (el: string, en: string) => (isGreek ? el : en)
    const lang = isGreek ? "el" : "en"

    return (
        <section id={id} className="px-6 py-20 lg:px-12">
            <div className="mx-auto max-w-[1240px]">
                <div className="mb-10 text-center">
                    <p className="pw-kicker mb-3 inline-flex items-center gap-1.5">
                        <Gift className="h-4 w-4" />
                        {t("Παροχές συνεργατών", "Partner benefits")}
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight text-[#0F172A] dark:text-white sm:text-4xl">
                        {t("Περισσότερα από ένα πορτοφόλι", "More than a wallet")}
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-[#475569] dark:text-slate-400">
                        {t(
                            "Τα πληρωμένα πλάνα περιλαμβάνουν υπηρεσίες πρόληψης και προνόμια από επιλεγμένους συνεργάτες.",
                            "Paid plans include prevention services and privileges from selected partners."
                        )}
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {offers.map((offer) => (
                        <div key={offer.id} className="pw-card p-5">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B] dark:text-slate-400">
                                    {offer.vendorName}
                                </span>
                                <span className="whitespace-nowrap rounded-full bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-[#166534] dark:bg-[#29685B]/15 dark:text-[#A7F3D0]">
                                    {(OFFER_TYPE_LABEL[offer.offerType] ?? OFFER_TYPE_LABEL.free_service)[lang]}
                                </span>
                            </div>
                            <h3 className="text-base font-semibold text-[#0F172A] dark:text-white">
                                {offer.title[lang]}
                            </h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-[#475569] dark:text-slate-400">
                                {offer.description[lang]}
                            </p>
                        </div>
                    ))}
                </div>
                <p className="mt-6 text-center text-xs text-[#64748B] dark:text-slate-400">
                    {t(
                        "Οι παροχές προσφέρονται από τρίτους συνεργάτες και ενδέχεται να αλλάξουν.",
                        "Benefits are provided by third-party partners and may change."
                    )}
                </p>
            </div>
        </section>
    )
}
