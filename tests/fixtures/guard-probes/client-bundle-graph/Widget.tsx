"use client"

/**
 * Guard-probe fixture: the authentic defect shape — a "use client" component
 * importing a harmless-looking constant from a module that imports the db.
 */
import { TIER_ORDER } from "./entitlements"

export default function ProbeWidget() {
    return (
        <ul>
            {TIER_ORDER.map((tier) => (
                <li key={tier}>{tier}</li>
            ))}
        </ul>
    )
}
