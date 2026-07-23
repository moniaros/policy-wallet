"use client"

interface InsuredPeopleCardProps {
    names: string[]
    copy: {
        insuredPeople: string
        noInsuredPeople: string
    }
}

/** Everyone the policy covers, deduplicated from the extracted data. */
export function InsuredPeopleCard({ names, copy }: InsuredPeopleCardProps) {
    return (
        <div className="pw-card pw-pad">
            <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-black/60 dark:text-white/70">
                {copy.insuredPeople}
            </h3>

            {names.length === 0 ? (
                <p className="text-sm text-black/65 dark:text-white/70">{copy.noInsuredPeople}</p>
            ) : (
                <ul className="space-y-2">
                    {names.map((name) => (
                        <li
                            key={name}
                            className="rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-sm text-black/80 dark:border-white/15 dark:bg-white/5 dark:text-white/85"
                        >
                            {name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
