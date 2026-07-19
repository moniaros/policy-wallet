/**
 * Trust badges for Greek insurers used on the landing page hero section.
 * Each badge uses the insurer's brand color and a distinctive icon shape.
 * No "use client": purely static markup, server-rendered on the landing.
 */

interface InsurerBadge {
    name: string
    color: string
    bgColor: string
}

const GREEK_INSURERS: InsurerBadge[] = [
    { name: "Ethniki", color: "#003DA5", bgColor: "#E8EEF7" },
    { name: "Interamerican", color: "#E31937", bgColor: "#FDEDEF" },
    { name: "NN Hellas", color: "#FF6200", bgColor: "#FFF2E8" },
    { name: "Generali", color: "#C8102E", bgColor: "#FAE8EB" },
    { name: "Eurolife", color: "#00529B", bgColor: "#E6EEF5" },
    { name: "Allianz", color: "#003781", bgColor: "#E6EDF5" },
]

function InsurerLogo({ insurer }: { insurer: InsurerBadge }) {
    return (
        <div
            className="group relative flex h-10 items-center gap-2 rounded-lg border border-slate-200/80 bg-white/90 px-4 py-2 backdrop-blur-sm transition-all duration-300 hover:border-slate-300 hover:shadow-md"
            style={{ ['--brand' as string]: insurer.color }}
        >
            {/* Brand dot indicator */}
            <span
                className="h-2.5 w-2.5 rounded-full transition-transform duration-300 group-hover:scale-125"
                style={{ backgroundColor: insurer.color }}
            />
            <span className="text-xs font-bold tracking-wide text-slate-700 transition-colors duration-300 group-hover:text-slate-900">
                {insurer.name}
            </span>
            {/* Subtle color bar on hover */}
            <span
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ backgroundColor: insurer.color }}
            />
        </div>
    )
}

export function TrustBadges() {
    return (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {GREEK_INSURERS.map((insurer) => (
                <InsurerLogo key={insurer.name} insurer={insurer} />
            ))}
        </div>
    )
}
