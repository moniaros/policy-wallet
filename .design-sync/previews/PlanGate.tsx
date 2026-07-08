import * as React from "react"
import { PlanGate, Card, CardHeader, CardTitle, CardDescription, CardContent } from "policy-wallet"

const CoverageReport = () => (
    <Card style={{ maxWidth: 380 }}>
        <CardHeader>
            <CardTitle>Ανάλυση κενών κάλυψης</CardTitle>
            <CardDescription>Χαρτοφυλάκιο 8 συμβολαίων · Score προστασίας 72/100</CardDescription>
        </CardHeader>
        <CardContent>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Αστική ευθύνη</span><strong>Επαρκής</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Νομική προστασία</span><strong>Κενό</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Οδική βοήθεια</span><strong>Μερική</strong>
                </div>
            </div>
        </CardContent>
    </Card>
)

export const Gated = () => (
    <div style={{ width: 380 }}>
        <PlanGate userPlan="free" requiredPlan="pro" featureLabel="Ανάλυση κενών κάλυψης AI">
            <CoverageReport />
        </PlanGate>
    </div>
)

export const Unlocked = () => (
    <div style={{ width: 380 }}>
        <PlanGate userPlan="pro" requiredPlan="pro" featureLabel="Ανάλυση κενών κάλυψης AI">
            <CoverageReport />
        </PlanGate>
    </div>
)
