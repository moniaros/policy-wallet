import * as React from "react"
import { BrandSectionHeader } from "policy-wallet"

export const LeftWithSubtitle = () => (
    <div style={{ maxWidth: 560 }}>
        <BrandSectionHeader
            title="Το χαρτοφυλάκιό σας"
            subtitle="Όλα τα ασφαλιστήρια συμβόλαιά σας συγκεντρωμένα σε ένα σημείο, με ανάλυση κάλυψης και εντοπισμό κενών."
            align="left"
        />
    </div>
)

export const Centered = () => (
    <div style={{ maxWidth: 560 }}>
        <BrandSectionHeader
            title="Βαθμός Προστασίας"
            subtitle="Η τεχνητή νοημοσύνη αξιολογεί την κάλυψή σας και προτείνει βελτιώσεις."
            align="center"
        />
    </div>
)

export const TitleOnly = () => (
    <div style={{ maxWidth: 560 }}>
        <BrandSectionHeader title="Προτεινόμενες καλύψεις" align="left" />
    </div>
)
