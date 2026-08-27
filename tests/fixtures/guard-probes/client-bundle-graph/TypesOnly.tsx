"use client"

/**
 * Guard-probe fixture (control): a type-only import emits no JavaScript and
 * must not count as an edge.
 */
import type { tierRank } from "./entitlements"

export default function ProbeTypesOnly(props: { rank?: typeof tierRank }) {
    void props
    return null
}
