/**
 * Portfolio-Based Gap Detection Rules
 *
 * Complements profile-gap-rules with checks that look at the actual policy
 * portfolio (dates, extracted coverage data, duplicates) and account state
 * (agent connection). Pure functions — no DB access, fully testable.
 *
 * Each rule produces the full "smart card" content: the detected risk, a
 * plain-language explanation, SOURCE EVIDENCE quoting the user's own policy
 * data, a suggested next action, and where "Review this" should navigate.
 * Tone: factual and helpful, never salesy — cite what we saw, suggest a
 * check, let the user decide.
 */

import type { GapSeverity } from "./profile-gap-rules"
import { normalizeBranch, branchFamilyId } from "@/lib/insurance/taxonomy"

export interface SmartCardContent {
    /** What we saw in the user's own data — always cites concrete facts. */
    evidence: { en: string; el: string }
    /** One concrete, non-salesy next step. */
    nextAction: { en: string; el: string }
    /** Where "Review this" navigates; null = expand the card in place. */
    reviewHref: string | null
}

export interface PortfolioGap extends SmartCardContent {
    ruleId: string
    lineOfBusiness: string
    severity: GapSeverity
    name: { en: string; el: string }
    reason: { en: string; el: string }
}

export interface PortfolioPolicyFacts {
    id: string
    lineOfBusiness: string
    status: string
    insurerName: string | null
    policyNumber: string | null
    startDate: Date | null
    endDate: Date | null
    acordData?: any
}

export interface PortfolioContext {
    hasAgent: boolean
    now?: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

function lobLabel(lob: string): { en: string; el: string } {
    const branch = normalizeBranch(lob)
    // Unrecognized lines keep the raw value so evidence never claims a
    // branch we didn't actually detect.
    if (branch.id === "other") return { en: lob, el: lob }
    return { en: branch.label.en.toLowerCase(), el: branch.genitiveEl }
}

function clean(value: string | null | undefined): string | null {
    if (!value) return null
    if (value === "__PENDING_EXTRACTION__") return null
    if (value.startsWith("PENDING-")) return null
    return value
}

/** "Interamerican (POL-123)" / fallback to whatever identifier exists. */
function policyRef(p: PortfolioPolicyFacts): string {
    const insurer = clean(p.insurerName)
    const number = clean(p.policyNumber)
    if (insurer && number) return `${insurer} (${number})`
    return insurer || number || lobLabel(p.lineOfBusiness).en
}

function formatDate(date: Date, locale: string): string {
    return date.toLocaleDateString(locale)
}

function isActive(p: PortfolioPolicyFacts): boolean {
    return p.status === "active"
}

// ── Rules ────────────────────────────────────────────────────────────

function expiringMotorRule(
    policies: PortfolioPolicyFacts[],
    now: Date
): PortfolioGap | null {
    const expiring = policies
        .filter(
            (p) =>
                isActive(p) &&
                branchFamilyId(p.lineOfBusiness) === "motor" &&
                p.endDate &&
                p.endDate.getTime() > now.getTime() &&
                p.endDate.getTime() - now.getTime() <= 30 * DAY_MS
        )
        .sort((a, b) => a.endDate!.getTime() - b.endDate!.getTime())[0]

    if (!expiring) return null

    const daysLeft = Math.ceil((expiring.endDate!.getTime() - now.getTime()) / DAY_MS)
    const ref = policyRef(expiring)

    return {
        ruleId: "motor_expiring_soon",
        lineOfBusiness: expiring.lineOfBusiness,
        severity: daysLeft <= 7 ? "critical" : "high",
        name: {
            en: "Motor policy expiring soon",
            el: "Το συμβόλαιο αυτοκινήτου λήγει σύντομα",
        },
        reason: {
            en: "Driving without active cover is illegal in Greece and even one day's lapse leaves you personally liable for any accident.",
            el: "Η κυκλοφορία χωρίς ενεργή ασφάλιση είναι παράνομη στην Ελλάδα και ακόμα και μία ημέρα κενού σας αφήνει προσωπικά υπεύθυνους για οποιοδήποτε ατύχημα.",
        },
        evidence: {
            en: `Your policy ${ref} expires on ${formatDate(expiring.endDate!, "en-GB")} — in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
            el: `Το συμβόλαιό σας ${ref} λήγει στις ${formatDate(expiring.endDate!, "el-GR")} — σε ${daysLeft} ${daysLeft === 1 ? "ημέρα" : "ημέρες"}.`,
        },
        nextAction: {
            en: "Check the renewal terms before the expiry date, or ask your insurer for the renewal notice.",
            el: "Ελέγξτε τους όρους ανανέωσης πριν από τη λήξη ή ζητήστε το ειδοποιητήριο ανανέωσης από τον ασφαλιστή σας.",
        },
        reviewHref: `/wallet/${expiring.id}`,
    }
}

const LOW_HEALTH_LIMIT_HIGH = 30_000
const LOW_HEALTH_LIMIT_MEDIUM = 100_000

function lowHealthCoverageRule(
    policies: PortfolioPolicyFacts[]
): PortfolioGap | null {
    const candidate = policies
        .filter((p) => {
            if (!isActive(p) || branchFamilyId(p.lineOfBusiness) !== "health") return false
            const limit = Number(p.acordData?.health?.annualLimit)
            return Number.isFinite(limit) && limit > 0 && limit < LOW_HEALTH_LIMIT_MEDIUM
        })
        .sort(
            (a, b) =>
                Number(a.acordData?.health?.annualLimit) -
                Number(b.acordData?.health?.annualLimit)
        )[0]

    if (!candidate) return null

    const limit = Number(candidate.acordData.health.annualLimit)
    const ref = policyRef(candidate)
    const limitFmtEl = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(limit)
    const limitFmtEn = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(limit)

    return {
        ruleId: "health_low_coverage",
        lineOfBusiness: "health",
        severity: limit < LOW_HEALTH_LIMIT_HIGH ? "high" : "medium",
        name: {
            en: "Health coverage limit looks low",
            el: "Το όριο κάλυψης υγείας φαίνεται χαμηλό",
        },
        reason: {
            en: "A single serious hospitalisation in a private Greek hospital can exceed a low annual limit, leaving the rest out of pocket.",
            el: "Μία σοβαρή νοσηλεία σε ιδιωτικό νοσοκομείο μπορεί να ξεπεράσει ένα χαμηλό ετήσιο όριο, αφήνοντας το υπόλοιπο σε δική σας επιβάρυνση.",
        },
        evidence: {
            en: `Your health policy ${ref} has an annual limit of ${limitFmtEn}, based on the document you uploaded.`,
            el: `Το συμβόλαιο υγείας ${ref} έχει ετήσιο όριο ${limitFmtEl}, σύμφωνα με το έγγραφο που ανεβάσατε.`,
        },
        nextAction: {
            en: "Check whether the limit matches the hospital class you would actually use — an upgrade quote is worth comparing.",
            el: "Ελέγξτε αν το όριο αντιστοιχεί στη θέση νοσηλείας που θα χρησιμοποιούσατε — αξίζει μια σύγκριση με αναβαθμισμένο όριο.",
        },
        reviewHref: `/wallet/${candidate.id}`,
    }
}

function duplicateCoverageRules(
    policies: PortfolioPolicyFacts[]
): PortfolioGap[] {
    const active = policies.filter(isActive)
    const byLob = new Map<string, PortfolioPolicyFacts[]>()
    for (const p of active) {
        const lob = p.lineOfBusiness.toLowerCase()
        byLob.set(lob, [...(byLob.get(lob) || []), p])
    }

    const gaps: PortfolioGap[] = []
    for (const [lob, group] of byLob) {
        if (group.length < 2) continue

        // Overlapping validity periods (unknown dates count as overlapping)
        const overlapping = group.filter((p) =>
            group.some(
                (q) =>
                    q.id !== p.id &&
                    (!p.startDate || !q.endDate || p.startDate <= q.endDate) &&
                    (!q.startDate || !p.endDate || q.startDate <= p.endDate)
            )
        )
        if (overlapping.length < 2) continue

        const [first, second] = overlapping
        const label = lobLabel(lob)

        gaps.push({
            ruleId: `duplicate_coverage_${lob}`,
            lineOfBusiness: lob,
            severity: "medium",
            name: {
                en: `Possible duplicate ${label.en} coverage`,
                el: `Πιθανή διπλή κάλυψη ${label.el}`,
            },
            reason: {
                en: "Two policies covering the same risk over the same period usually means paying twice — insurers rarely pay out twice for the same loss.",
                el: "Δύο συμβόλαια για τον ίδιο κίνδυνο την ίδια περίοδο συνήθως σημαίνει διπλή πληρωμή — οι ασφαλιστές σπάνια αποζημιώνουν δύο φορές για την ίδια ζημιά.",
            },
            evidence: {
                en: `You have ${overlapping.length} active ${label.en} policies with overlapping periods: ${policyRef(first)} and ${policyRef(second)}.`,
                el: `Έχετε ${overlapping.length} ενεργά συμβόλαια ${label.el} με επικαλυπτόμενες περιόδους: ${policyRef(first)} και ${policyRef(second)}.`,
            },
            nextAction: {
                en: "Compare what each policy actually covers — if they overlap fully, keeping one may be enough.",
                el: "Συγκρίνετε τι ακριβώς καλύπτει το καθένα — αν επικαλύπτονται πλήρως, ίσως αρκεί το ένα.",
            },
            reviewHref: "/wallet",
        })
    }
    return gaps
}

function unclearExclusionsRule(
    policies: PortfolioPolicyFacts[]
): PortfolioGap | null {
    const unclear = policies.filter((p) => {
        if (!isActive(p)) return false
        const extraction = p.acordData?.extraction
        if (!extraction) return false // never analyzed — nothing to flag
        const exclusions = p.acordData?.exclusions
        return !Array.isArray(exclusions) || exclusions.length === 0
    })

    if (unclear.length === 0) return null

    const cited = unclear.slice(0, 2).map(policyRef).join(", ")
    const first = unclear[0]

    return {
        ruleId: "unclear_exclusions",
        lineOfBusiness: first.lineOfBusiness,
        severity: "low",
        name: {
            en: "Exclusions could not be clearly identified",
            el: "Οι εξαιρέσεις δεν εντοπίστηκαν με σαφήνεια",
        },
        reason: {
            en: "Exclusions are where claims get denied. When they can't be read clearly from the document, it's worth confirming them before you need to claim.",
            el: "Στις εξαιρέσεις κρίνονται οι απορρίψεις αποζημιώσεων. Όταν δεν διαβάζονται καθαρά από το έγγραφο, αξίζει να τις επιβεβαιώσετε πριν τις χρειαστείτε.",
        },
        evidence: {
            en: `The AI analysis of ${cited} did not find a readable exclusions section${unclear.length > 2 ? ` (and ${unclear.length - 2} more)` : ""}.`,
            el: `Η ανάλυση AI για ${cited} δεν εντόπισε αναγνώσιμη ενότητα εξαιρέσεων${unclear.length > 2 ? ` (και ${unclear.length - 2} ακόμα)` : ""}.`,
        },
        nextAction: {
            en: "Open the policy and check the document's exclusions section — or upload a clearer copy.",
            el: "Ανοίξτε το ασφαλιστήριο και δείτε την ενότητα εξαιρέσεων στο έγγραφο — ή ανεβάστε ένα πιο ευανάγνωστο αντίγραφο.",
        },
        // The extraction review is agent-only now — the policyholder deep
        // link goes to the policy detail page instead.
        reviewHref: `/wallet/${first.id}`,
    }
}

function noAgentRule(
    policies: PortfolioPolicyFacts[],
    hasAgent: boolean
): PortfolioGap | null {
    const activeCount = policies.filter(isActive).length
    if (hasAgent || activeCount === 0) return null

    return {
        ruleId: "no_agent_connected",
        lineOfBusiness: "other",
        severity: "low",
        name: {
            en: "No advisor connected",
            el: "Χωρίς συνδεδεμένο σύμβουλο",
        },
        reason: {
            en: "A licensed advisor can sanity-check gaps like the ones on this page and handle renewals and claims on your behalf — you control what they see.",
            el: "Ένας πιστοποιημένος σύμβουλος μπορεί να επιβεβαιώσει κενά όπως αυτά της σελίδας και να αναλάβει ανανεώσεις και αποζημιώσεις για εσάς — εσείς ελέγχετε τι βλέπει.",
        },
        evidence: {
            en: `You have ${activeCount} active ${activeCount === 1 ? "policy" : "policies"} in your wallet and no connected insurance advisor.`,
            el: `Έχετε ${activeCount} ${activeCount === 1 ? "ενεργό συμβόλαιο" : "ενεργά συμβόλαια"} στο πορτοφόλι σας και κανέναν συνδεδεμένο ασφαλιστικό σύμβουλο.`,
        },
        nextAction: {
            en: "If you already work with an advisor, connect them with their invite code — access is revocable at any time.",
            el: "Αν συνεργάζεστε ήδη με σύμβουλο, συνδέστε τον με τον κωδικό πρόσκλησής του — η πρόσβαση ανακαλείται ανά πάσα στιγμή.",
        },
        reviewHref: "/agent",
    }
}

// ── Entry point ──────────────────────────────────────────────────────

/**
 * Analyzed home policy whose extraction explicitly shows no earthquake
 * cover. Requires the property section to exist (analysis ran) so the rule
 * never fires on un-analyzed documents.
 */
function homeNoEarthquakeRule(policies: PortfolioPolicyFacts[]): PortfolioGap | null {
    const candidate = policies.find(
        (p) =>
            isActive(p) &&
            branchFamilyId(p.lineOfBusiness) === "home" &&
            p.acordData?.property &&
            p.acordData.property.earthquakeCoverageIncluded === false
    )
    if (!candidate) return null

    const ref = policyRef(candidate)
    return {
        ruleId: "home_no_earthquake",
        lineOfBusiness: candidate.lineOfBusiness,
        severity: "medium",
        name: {
            en: "Home policy appears to lack earthquake cover",
            el: "Η κατοικία φαίνεται χωρίς κάλυψη σεισμού",
        },
        reason: {
            en: "Earthquake cover is usually an optional add-on in Greek home policies — many basic packages leave it out.",
            el: "Η κάλυψη σεισμού είναι συνήθως προαιρετική προσθήκη στα ελληνικά συμβόλαια κατοικίας — πολλά βασικά πακέτα δεν την περιλαμβάνουν.",
        },
        evidence: {
            en: `The analysis of your policy ${ref} did not find earthquake coverage in the extracted terms.`,
            el: `Η ανάλυση του συμβολαίου σας ${ref} δεν εντόπισε κάλυψη σεισμού στους όρους που εξήχθησαν.`,
        },
        nextAction: {
            en: "Ask your insurer or advisor to confirm whether earthquake cover is included, and what adding it would cost.",
            el: "Ζητήστε από τον ασφαλιστή ή τον σύμβουλό σας να επιβεβαιώσει αν περιλαμβάνεται κάλυψη σεισμού και τι θα κόστιζε η προσθήκη της.",
        },
        reviewHref: `/wallet/${candidate.id}`,
    }
}

/**
 * A home policy whose own document names a rebuild cost ABOVE the sum insured.
 *
 * Four surfaces promised this check and nothing performed it: the home branch
 * page said "we compare the insured amount with the square metres and the
 * details in your profile", a guide said the AI "automatically flags whether the
 * reconstruction sum appears inadequate", and the glossary said PolicyWallet
 * "flags when the sum insured appears low relative to the property". The
 * product's own education calls underinsurance "the most important — and most
 * neglected — step of every renewal", and explains the average clause correctly:
 * insure a €200,000 rebuild for €100,000 and a €20,000 loss pays €10,000,
 * because every claim is reduced by the underinsurance ratio.
 *
 * This compares only figures the DOCUMENT states — insuredValue against
 * estimatedRebuildCost. No €/m² rate is applied: the guides deliberately decline
 * to hardcode one, pointing readers at the AADE minimum per square metre
 * instead, and inventing a rate here would be exactly the kind of fabricated
 * benchmark the rest of the engine avoids. Where the document gives a size but
 * no rebuild cost, the product cannot conclude, and now says so instead of
 * claiming otherwise.
 */
function homeUnderinsuredRule(policies: PortfolioPolicyFacts[]): PortfolioGap | null {
    const candidate = policies.find((p) => {
        if (!isActive(p) || branchFamilyId(p.lineOfBusiness) !== "home") return false
        const property = p.acordData?.property
        const insured = Number(property?.insuredValue)
        const rebuild = Number(property?.estimatedRebuildCost)
        if (!Number.isFinite(insured) || !Number.isFinite(rebuild)) return false
        if (insured <= 0 || rebuild <= 0) return false
        // A rounding difference is not underinsurance; a material shortfall is.
        return insured < rebuild * 0.95
    })
    if (!candidate) return null

    const property = candidate.acordData.property
    const insured = Number(property.insuredValue)
    const rebuild = Number(property.estimatedRebuildCost)
    const shortfallPct = Math.round((1 - insured / rebuild) * 100)
    const ref = policyRef(candidate)
    const insuredFmtEl = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(insured)
    const insuredFmtEn = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(insured)
    const rebuildFmtEl = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(rebuild)
    const rebuildFmtEn = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(rebuild)

    return {
        ruleId: "home_underinsured",
        lineOfBusiness: candidate.lineOfBusiness,
        severity: "high",
        name: {
            en: "Sum insured is below the rebuild cost stated in the policy",
            el: "Το ασφαλισμένο κεφάλαιο είναι κάτω από το κόστος ανακατασκευής που αναφέρει το ασφαλιστήριο",
        },
        reason: {
            en: "Greek home policies apply an average clause: if the sum insured is below the rebuild cost, EVERY claim — not only a total loss — is reduced by the same proportion.",
            el: "Τα ελληνικά ασφαλιστήρια κατοικίας εφαρμόζουν αναλογικό όρο: αν το ασφαλισμένο κεφάλαιο υπολείπεται του κόστους ανακατασκευής, ΚΑΘΕ αποζημίωση — όχι μόνο η ολική ζημιά — μειώνεται στην ίδια αναλογία.",
        },
        evidence: {
            en: `Your policy ${ref} states a sum insured of ${insuredFmtEn} against a rebuild cost of ${rebuildFmtEn} — about ${shortfallPct}% short. On those figures a €10,000 loss would be settled at roughly ${new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(10000 * (insured / rebuild))}.`,
            el: `Το ασφαλιστήριό σας ${ref} αναφέρει ασφαλισμένο κεφάλαιο ${insuredFmtEl} έναντι κόστους ανακατασκευής ${rebuildFmtEl} — υπολείπεται περίπου ${shortfallPct}%. Με αυτά τα νούμερα, ζημιά 10.000 € θα αποζημιωνόταν περίπου με ${new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(10000 * (insured / rebuild))}.`,
        },
        nextAction: {
            en: "Ask your insurer or advisor to reassess the sum insured against today's rebuild cost before the next renewal.",
            el: "Ζητήστε από τον ασφαλιστή ή τον σύμβουλό σας να επανεκτιμήσει το ασφαλισμένο κεφάλαιο με βάση το σημερινό κόστος ανακατασκευής πριν την επόμενη ανανέωση.",
        },
        reviewHref: `/wallet/${candidate.id}`,
    }
}

/**
 * Analyzed motor policy whose extraction explicitly shows no roadside
 * assistance. Same analysis-ran guard as the earthquake rule.
 */
function motorNoRoadsideRule(policies: PortfolioPolicyFacts[]): PortfolioGap | null {
    const candidate = policies.find(
        (p) =>
            isActive(p) &&
            branchFamilyId(p.lineOfBusiness) === "motor" &&
            p.acordData?.vehicle &&
            p.acordData.vehicle.hasRoadsideAssistance === false
    )
    if (!candidate) return null

    const ref = policyRef(candidate)
    return {
        ruleId: "motor_no_roadside",
        lineOfBusiness: candidate.lineOfBusiness,
        severity: "medium",
        name: {
            en: "Motor policy appears to lack roadside assistance",
            el: "Το αυτοκίνητο φαίνεται χωρίς οδική βοήθεια",
        },
        reason: {
            en: "A breakdown without roadside assistance means paying for towing out of pocket — often more than the cover itself costs.",
            el: "Μια βλάβη χωρίς οδική βοήθεια σημαίνει μεταφορά με δικά σας έξοδα — συχνά ακριβότερη από το ίδιο το κόστος της κάλυψης.",
        },
        evidence: {
            en: `The analysis of your policy ${ref} did not find roadside assistance in the extracted coverages.`,
            el: `Η ανάλυση του συμβολαίου σας ${ref} δεν εντόπισε οδική βοήθεια στις καλύψεις που εξήχθησαν.`,
        },
        nextAction: {
            en: "Check whether roadside assistance exists as a separate contract, or ask your insurer about adding it.",
            el: "Ελέγξτε αν έχετε οδική βοήθεια ως ξεχωριστό συμβόλαιο ή ρωτήστε τον ασφαλιστή σας για την προσθήκη της.",
        },
        reviewHref: `/wallet/${candidate.id}`,
    }
}

export function evaluatePortfolioRules(
    policies: PortfolioPolicyFacts[],
    context: PortfolioContext
): PortfolioGap[] {
    const now = context.now ?? new Date()
    const gaps: PortfolioGap[] = []

    const expiring = expiringMotorRule(policies, now)
    if (expiring) gaps.push(expiring)

    const lowHealth = lowHealthCoverageRule(policies)
    if (lowHealth) gaps.push(lowHealth)

    const noEarthquake = homeNoEarthquakeRule(policies)
    if (noEarthquake) gaps.push(noEarthquake)

    const underinsured = homeUnderinsuredRule(policies)
    if (underinsured) gaps.push(underinsured)

    const noRoadside = motorNoRoadsideRule(policies)
    if (noRoadside) gaps.push(noRoadside)

    gaps.push(...duplicateCoverageRules(policies))

    const unclear = unclearExclusionsRule(policies)
    if (unclear) gaps.push(unclear)

    const noAgent = noAgentRule(policies, context.hasAgent)
    if (noAgent) gaps.push(noAgent)

    return gaps
}

// ── Evidence for profile-based rules ─────────────────────────────────

/**
 * Why the profile rule fired, in the user's own facts. Keyed by the rule ids
 * defined in profile-gap-rules.ts; unknown rules get a generic portfolio scan
 * line so every card can show its source.
 */
const PROFILE_RULE_FACTS: Record<string, { en: string; el: string }> = {
    homeowner_no_home: {
        en: "your profile says you own your home",
        el: "στο προφίλ σας δηλώνετε ιδιόκτητη κατοικία",
    },
    mortgage_no_life: {
        en: "your profile lists an active mortgage",
        el: "στο προφίλ σας δηλώνετε ενεργό στεγαστικό δάνειο",
    },
    dependents_no_life: {
        en: "your profile lists dependents",
        el: "στο προφίλ σας δηλώνετε εξαρτώμενα μέλη",
    },
    loans_no_life: {
        en: "your profile lists outstanding loans",
        el: "στο προφίλ σας δηλώνετε ενεργά δάνεια",
    },
    vehicles_no_motor: {
        en: "your profile lists at least one vehicle",
        el: "στο προφίλ σας δηλώνετε τουλάχιστον ένα όχημα",
    },
    no_health: {
        en: "no private health policy was found",
        el: "δεν βρέθηκε ιδιωτικό συμβόλαιο υγείας",
    },
}

export function buildProfileGapEvidence(
    ruleId: string,
    lineOfBusiness: string,
    activePolicyCount: number
): SmartCardContent {
    const label = lobLabel(lineOfBusiness)
    const fact = PROFILE_RULE_FACTS[ruleId]

    const scanEn = `We checked your ${activePolicyCount} active ${activePolicyCount === 1 ? "policy" : "policies"} — none covers ${label.en}`
    const scanEl = `Ελέγξαμε ${activePolicyCount === 1 ? "το 1 ενεργό συμβόλαιό σας" : `τα ${activePolicyCount} ενεργά συμβόλαιά σας`} — κανένα δεν καλύπτει ${label.el === lineOfBusiness ? `τον κλάδο «${lineOfBusiness}»` : `τον κλάδο ${label.el}`}`

    return {
        evidence: {
            en: fact ? `${scanEn}, while ${fact.en}.` : `${scanEn}.`,
            el: fact ? `${scanEl}, ενώ ${fact.el}.` : `${scanEl}.`,
        },
        nextAction: {
            en: "Consider whether this coverage fits your situation — there is no obligation, but it's worth an informed look.",
            el: "Εξετάστε αν αυτή η κάλυψη ταιριάζει στην κατάστασή σας — δεν υπάρχει καμία υποχρέωση, αξίζει όμως μια ενημερωμένη ματιά.",
        },
        reviewHref: null,
    }
}
