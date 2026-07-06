import * as React from "react"
import { PageHeader, Button } from "policy-wallet"

// PageHeader is a framer-motion element that mounts at initial={{ opacity: 0, y: -10 }}
// and animates to opacity 1. The static capture snapshots before the animation
// settles, so the header paints invisible. Force the motion div to its resting
// state (opacity 1, no transform/translate) so it renders deterministically.
const settled = `.ph-preview > div { opacity: 1 !important; transform: none !important; translate: none !important; }`

export const TitleAndSubtitle = () => (
    <div className="ph-preview">
        <style>{settled}</style>
        <PageHeader
            sticky={false}
            title="Το Πορτοφόλι μου"
            subtitle="8 ενεργά συμβόλαια · Επόμενη λήξη 12/03/2027"
        />
    </div>
)

export const WithActions = () => (
    <div className="ph-preview">
        <style>{settled}</style>
        <PageHeader
            sticky={false}
            title="Το Πορτοφόλι μου"
            subtitle="8 ενεργά συμβόλαια"
            actions={
                <div style={{ display: "flex", gap: 8 }}>
                    <Button variant="outline">Εξαγωγή</Button>
                    <Button>Προσθήκη συμβολαίου</Button>
                </div>
            }
        />
    </div>
)
