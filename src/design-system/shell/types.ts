import type { NavEntry } from "@/lib/app/navigation"

/** A registry entry with its label resolved by the server layout. */
export interface ShellNavItem extends NavEntry {
    label: string
}

export interface ShellLabels {
    /** aria-label of the primary navigation landmarks. */
    primary: string
    skip: string
    brand: string
    yourAccount: string
    /** «Ενημερώσεις — 3 νέες» — the bell's accessible name, already pluralised. */
    updates: string
}

export interface ShellUser {
    name: string
    href: string
    /** «Πρόγραμμα: Family» — already resolved through planTierName. */
    planLine: string
}
