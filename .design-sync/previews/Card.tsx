import * as React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button } from "policy-wallet"

export const PolicySummary = () => (
    <Card style={{ maxWidth: 380 }}>
        <CardHeader>
            <CardTitle>Ασφάλεια Αυτοκινήτου</CardTitle>
            <CardDescription>ΕΘΝΙΚΗ Ασφαλιστική · Συμβόλαιο 63708952</CardDescription>
        </CardHeader>
        <CardContent>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Ετήσιο ασφάλιστρο</span><strong>€104,87</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Λήξη</span><strong>12/03/2027</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Κάλυψη</span><strong>Αστική ευθύνη + Πυρός</strong>
                </div>
            </div>
        </CardContent>
        <CardFooter style={{ gap: 8 }}>
            <Button size="sm">Ανάλυση AI</Button>
            <Button size="sm" variant="outline">Λεπτομέρειες</Button>
        </CardFooter>
    </Card>
)

export const Minimal = () => (
    <Card style={{ maxWidth: 320, padding: 24 }}>
        <p style={{ margin: 0, fontSize: 14 }}>
            Απλή κάρτα περιεχομένου — χωρίς κεφαλίδα ή υποσέλιδο.
        </p>
    </Card>
)
