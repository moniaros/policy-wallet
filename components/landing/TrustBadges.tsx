import { Bike, Briefcase, Car, Heart, Home, PawPrint, Plane, Umbrella } from "lucide-react"

/**
 * What we can read, shown as insurance branches rather than insurer logos.
 *
 * This used to be a wall of six real insurer names (Ethniki, Interamerican,
 * NN Hellas, Generali, Eurolife, Allianz) styled in each company's own brand
 * colour. Two problems with that, and both are the kind that only surface
 * after launch:
 *
 *  - A branded logo wall reads as "these companies endorse us". None of them
 *    do, and the whole product story is that we are not connected to any
 *    insurer. The strongest version of this section says exactly that.
 *  - The chips were `bg-white/90` with `dark:text-slate-200`, so in dark mode
 *    the labels rendered near-white on white — around 1.2:1, unreadable.
 *
 * Branches are ours to claim, carry the same "we handle your kind of policy"
 * message, and cannot mislead anyone about who we work with.
 *
 * Server component: static markup, no JS shipped.
 */

interface BranchChip {
    Icon: typeof Car
    el: string
    en: string
}

const BRANCHES: BranchChip[] = [
    { Icon: Car, el: "Αυτοκίνητο", en: "Car" },
    { Icon: Home, el: "Σπίτι", en: "Home" },
    { Icon: Heart, el: "Υγεία", en: "Health" },
    { Icon: Umbrella, el: "Ζωή", en: "Life" },
    { Icon: Plane, el: "Ταξίδι", en: "Travel" },
    { Icon: Briefcase, el: "Επιχείρηση", en: "Business" },
    { Icon: Bike, el: "Σκάφος", en: "Boat" },
    { Icon: PawPrint, el: "Κατοικίδιο", en: "Pet" },
]

export function TrustBadges({ isGreek }: { isGreek: boolean }) {
    return (
        <ul className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {BRANCHES.map((branch) => (
                <li
                    key={branch.en}
                    className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3.5 dark:border-slate-700 dark:bg-slate-800"
                >
                    <branch.Icon
                        aria-hidden
                        className="h-4 w-4 flex-shrink-0 text-primary dark:text-[#A7F3D0]"
                    />
                    <span className="text-body-sm font-semibold text-neutral-700 dark:text-slate-100">
                        {isGreek ? branch.el : branch.en}
                    </span>
                </li>
            ))}
        </ul>
    )
}
