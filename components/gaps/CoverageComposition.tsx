import type { Composition } from "@/lib/gaps/composition"

export interface CompositionCopy {
    /** «Ελέγξαμε {checked} σημεία κάλυψης για αυτό το ασφαλιστήριο.» */
    coverageChecked: string
    coverageCheckedOne: string
    covered: string
    notCovered: string
    indeterminate: string
    /** Rendered when every coverage check was indeterminate. */
    allIndeterminate: string
    recordingChecked: string
    recordingCheckedOne: string
    recorded: string
    notRecorded: string
    /** Rendered instead of the lines when the run's catalogue differs from the current one. */
    catalogueChanged: string
    /** V3: «Ευρήματα από την ανάλυση της {date}. … δεν μπορεί να δηλωθεί τι ακριβώς ελέγχθηκε.» */
    prePlan: string
    prePlanNoDate: string
    reviewFraming: string
}

function fill(template: string, vars: Record<string, string | number>): string {
    return Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), template)
}

/**
 * The composition as two labelled lines — never one number, never a ring.
 *
 * Every numeral sits beside its word; the denominator is the first thing on
 * each line, so a count never appears without it. `indeterminate` renders
 * whenever it is above zero, in the same weight as the other two segments.
 * When the run's catalogue version is not the current one the lines do not
 * render at all and the reader is told why (B2 acceptance 6). Nothing here is
 * a verdict adjective; the closing sentence frames the lines as a prompt to
 * review.
 */
export function CoverageComposition({ composition, copy, className = "" }: { composition: Composition; copy: CompositionCopy; className?: string }) {
    if (composition.kind === "no_run" || composition.kind === "unauthored") return null

    if (composition.kind === "catalogue_mismatch") {
        return (
            <p data-fact="composition.catalogueMismatch" className={`text-sm text-muted-foreground ${className}`}>
                {copy.catalogueChanged}
            </p>
        )
    }

    // V3: findings from a run that predates the plan — dated, never a composition, never a zero.
    if (composition.kind === "pre_plan") {
        return (
            <p data-fact="composition.prePlan" data-composition-state="pre_plan" className={`text-sm text-muted-foreground ${className}`}>
                {composition.runDateLabel ? fill(copy.prePlan, { date: composition.runDateLabel }) : copy.prePlanNoDate}
            </p>
        )
    }

    const { coverage, recording } = composition
    const coverageLead = coverage.checked === 1 ? copy.coverageCheckedOne : fill(copy.coverageChecked, { checked: coverage.checked })
    const recordingLead = recording.checked === 1 ? copy.recordingCheckedOne : fill(copy.recordingChecked, { checked: recording.checked })
    const allIndeterminate = coverage.checked > 0 && coverage.indeterminate === coverage.checked

    return (
        <div className={`space-y-2 text-sm ${className}`} data-fact="composition.lines" data-catalogue-version={composition.catalogueVersion}>
            {coverage.checked > 0 && (
                <p data-fact="composition.coverage">
                    <span className="font-semibold" data-count="composition.coverageChecked">
                        {coverageLead}
                    </span>{" "}
                    {allIndeterminate ? (
                        <span data-count="composition.indeterminate">
                            {fill(copy.allIndeterminate, { count: coverage.indeterminate })}
                        </span>
                    ) : (
                        <span className="text-foreground/80">
                            <span data-count="composition.covered">{fill(copy.covered, { count: coverage.covered })}</span>
                            {" · "}
                            <span data-count="composition.notCovered">{fill(copy.notCovered, { count: coverage.notCovered })}</span>
                            {coverage.indeterminate > 0 && (
                                <>
                                    {" · "}
                                    <span data-count="composition.indeterminate">{fill(copy.indeterminate, { count: coverage.indeterminate })}</span>
                                </>
                            )}
                        </span>
                    )}
                </p>
            )}
            {recording.checked > 0 && (
                <p data-fact="composition.recording" className="text-foreground/80">
                    <span className="font-semibold text-foreground" data-count="composition.recordingChecked">
                        {recordingLead}
                    </span>{" "}
                    <span data-count="composition.recorded">{fill(copy.recorded, { count: recording.recorded })}</span>
                    {" · "}
                    <span data-count="composition.notRecorded">{fill(copy.notRecorded, { count: recording.notRecorded })}</span>
                </p>
            )}
            <p className="text-caption text-muted-foreground">{copy.reviewFraming}</p>
        </div>
    )
}
