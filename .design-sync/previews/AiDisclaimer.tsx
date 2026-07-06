import * as React from "react"
import { AiDisclaimer } from "policy-wallet"

export const BlockGreek = () => (
    <div style={{ maxWidth: 460 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#1c1917" }}>
            Εντοπίστηκε πιθανό κενό στην κάλυψη αστικής ευθύνης. Προτείνεται αύξηση του ορίου
            αποζημίωσης τρίτων.
        </p>
        <AiDisclaimer variant="block" language="el" />
    </div>
)

export const BlockEnglish = () => (
    <div style={{ maxWidth: 460 }}>
        <p style={{ margin: 0, fontSize: 14, color: "#1c1917" }}>
            A potential gap was detected in your third-party liability coverage. Increasing the
            indemnity limit is recommended.
        </p>
        <AiDisclaimer variant="block" language="en" />
    </div>
)

export const InlineGreek = () => (
    <div style={{ maxWidth: 460 }}>
        <AiDisclaimer variant="inline" language="el" />
    </div>
)

export const InlineEnglish = () => (
    <div style={{ maxWidth: 460 }}>
        <AiDisclaimer variant="inline" language="en" />
    </div>
)
