"use client"

/**
 * Guard-probe fixture: the alias form. The real defect imported via "@/lib/…",
 * so the resolver's "@/" branch is load-bearing — a resolver that silently
 * loses alias imports reports a clean graph over a broken one.
 */
import { db } from "@/tests/fixtures/guard-probes/client-bundle-graph/db"

export default function ProbeAliasWidget() {
    return <span>{String(Boolean(db))}</span>
}
