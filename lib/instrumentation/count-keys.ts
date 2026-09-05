/**
 * The instrumentation vocabulary — the machine mirror of
 * docs/transformation/INSTRUMENTATION-PLAN.md.
 *
 * `data-count="<namespace>.<key>"` marks the element that renders a COUNT (a
 * cardinality); `data-fact="<namespace>.<key>"` marks the element that renders
 * any other fact (money, days, an index value). The namespace is the fact's
 * OWNER, never the surface that happens to render it — `portfolio.expiredCount`
 * is the same fact on the dashboard hero and the risk-profile watch, which is
 * the entire point: one key rendering two values IS the §6.7 defect, made
 * measurable.
 *
 * Every key used anywhere in app/, components/ or lib/ must be registered here
 * (guard: tests/unit/count-instrumentation-registry.test.tsx). A key coined at
 * a render site without a registry entry is exactly how the vocabulary forks —
 * add it HERE and to the plan document in the same change, with its definition.
 *
 * SUBJECT-SCOPED keys legitimately render once per subject on one page (one
 * per branch tile, one per renewal row, one per severity chip). Those elements
 * carry `data-count-subject` / `data-fact-subject` with the subject's stable
 * id, and the count-consistency scan groups by key+subject — without the
 * subject, every list would read as a contradiction.
 */

/** Page-level counts: at most ONE value per page, however many render sites. */
export const COUNT_KEYS: Record<string, string> = {
    // portfolio.* — the wallet's contents. "Held" = every stored row except
    // status 'deleted' (a soft-deleted policy must neither render nor count).
    "portfolio.policyCount": "Policies held (status ≠ deleted), whatever their lifecycle state.",
    "portfolio.activeCount": "Lifecycle 'active' (resolvePolicyLifecycle): in force, >30 days out, identity complete.",
    "portfolio.expiredCount": "Lifecycle 'expired': the extracted end date has passed.",
    "portfolio.expiringCount": "Lifecycle 'expiring_soon': in force, within the canonical 30-day window.",
    "portfolio.expiringWithin45Count": "The risk watch's 45-day forward window. Deliberately NOT expiringCount — different window, different fact; the copy states the window.",
    "portfolio.attentionCount": "ATTENTION_KEYS statuses (expiring_soon, expired, action_needed, unknown_duration).",
    "portfolio.attentionCollapsedCount": "Attention notices hidden behind the wallet's 'show more' toggle (attention notices minus the two shown).",
    "portfolio.neverAnalysedCount": "No lastAnalyzedAt — the engine has never read the document.",
    "portfolio.failedCount": "Latest analysis failed (acordData.processingError).",
    "portfolio.renewalsNext180Count": "Policies with a resolved end date within the next 180 days.",
    "portfolio.coverageActiveCount": "isPolicyCoverageActive: provides coverage today (includes expiring_soon, action_needed, unknown_duration; excludes expired/cancelled/analyzing). NOT activeCount — labels must distinguish.",
    "portfolio.policiesWithFindingsCount": "Policies carrying at least one open gap instance.",
    "portfolio.premiumUnknownDurationCount": "Policies excluded from the premium total: no readable term.",
    "portfolio.premiumNoAmountCount": "In-force policies contributing 0 to the premium total: no extracted premium.",
    "portfolio.premiumOtherCurrencyCount": "In-force policies excluded from the premium total: another currency.",

    // gap.* — open findings. The universe is ACTIVE COVERAGE (gapsOnActiveCoverage):
    // a lapsed policy's findings stay on that policy's own page.
    "gap.openCount": "Open gap instances (open/detected/acknowledged) on policies that provide coverage today.",
    "gap.severityCount": "SUBJECT-SCOPED by severity (critical|high|medium|low): the severity tally chips. The four values sum to gap.openCount.",

    // recommendation.* — active recommendation instances (getActiveRecommendations).
    "recommendation.openCount": "Active recommendation instances, deduplicated by concept.",

    // notification.* — shared chrome, so the badge renders on EVERY page.
    // Every badge site saturates identically («9+» above 9, which the collector
    // extracts as 9); keep that threshold in lockstep across sites, because a
    // surface rendering the EXACT count above 9 next to a saturated badge reads
    // as 12-vs-9 — to the metric and to the customer alike.
    "notification.unreadCount":
        "Unread notifications. Render sites: the shell's mobile-header bell badge, the agent nav's " +
        "more-tab badge (both saturated), and the desktop user-menu row (exact — the lg breakpoint " +
        "keeps it from ever being visible beside a saturated badge).",

    // plan.* — the dashboard protection plan (setup steps only).
    "plan.stepsDone": "Setup steps completed.",
    "plan.stepsTotal": "Setup steps total (five).",

    // needs.* — Layer 1 of the needs → coverage → gap model: what the customer
    // SAID matters (deriveProtectionPriorities). Deliberately its own namespace,
    // never a gap or recommendation count.
    "needs.priorityCount":
        "Derived protection priorities (deriveProtectionPriorities) whose importance is NOT `watch` — high, medium and " +
        "needs_review — over the WHOLE derived set, the same number on every surface (priorityCount() in " +
        "lib/protection/priority-count.ts). Never a count of rendered rows: the home card shows three rows and still " +
        "reports the whole number, and the map's lead sentence carries no number at all.",
    "needs.unsureCount": "Onboarding screens answered «δεν είμαι σίγουρος/η» — the honest lower-confidence signal.",

    // attention.* — the composed needs → risk → coverage view (lib/protection/
    // attention-areas.ts). Counts of AREAS in a state, never a score and never
    // summable with each other into one number. Each is taken over the rows THE
    // SURFACE RENDERS — the map's rows (activated + needs_review), the home
    // card's shown rows (its top three), the lens' activated rows — so the
    // number beside a list is always the list's own. Two surfaces may
    // therefore legitimately differ; one surface may not contradict itself.
    "attention.areaCount": "Attention areas THIS surface renders as rows — equals the rows on the page, never the ten-area universe.",
    "attention.unknownCount": "Of the rows this surface renders, those whose alignment is «Δεν το ξεκαθαρίσαμε ακόμη» — a deciding fact is still unknown.",
    "attention.coveredCount": "Of the rows this surface renders, those that «φαίνεται να καλύπτονται» — a held policy the catalogue accepts, limits read or not.",

    // household.* — the customer's household as the risk graph records it.
    "household.memberCount": "1 + dependants.",
    "household.dependantCount":
        "Dependants. Two derivations carry ONE key on purpose: the risk-graph stat (byType.dependent.length) " +
        "and the life_dependents recommendation reason's leading numeral (totalDependents, via " +
        "reason-count-keys.ts) — if they disagree on a page, that is a real finding.",
    "household.assetCount": "Asset nodes in the risk graph.",
    "household.obligationCount": "Obligation nodes in the risk graph.",

    // riskGraph.* — the 'what we are protecting' panel.
    "riskGraph.nodeCount": "Every node in the personal risk graph (includes the person and the household).",
    "riskGraph.riskCount": "Risk rows rendered by the panel (the 'all' chip).",
    "riskGraph.stateCount": "SUBJECT-SCOPED by panel state (unprotected|partially_protected|unknown|not_held|protected).",

    // profile.* — the understanding of the customer, not their cover.
    "profile.lowConfidenceDimensionCount": "Dimensions resting on unanswered questions (confidence low, applicable).",

    // branch.* — SUBJECT-SCOPED by top-level branch id.
    "branch.policyCount": "Policies held in this branch family (status ≠ deleted).",
    "branch.recommendationCount": "Active recommendations filtered to this branch family — a SUBSET of recommendation.openCount, never the same key.",

    // policy.* — SUBJECT-SCOPED by policy id.
    "policy.renewalCheckpointCount": "deriveRenewalChecklist length for this policy — points to check before renewing.",

    // review.* — a risk review's opening snapshot (historical, not live).
    "review.findingsAtOpen": "Findings recorded when the review opened.",

    // timeline.* — the activity history (settings › Ιστορικό δραστηριότητας;
    // /timeline itself was removed by V2-P2-03). The universe is the
    // getTimeline window (60 newest entries), NOT the account's lifetime.
    "timeline.entryCount": "Entries in the activity-history window — the «Όλα» filter chip.",
    "timeline.kindCount": "SUBJECT-SCOPED by entry kind: one kind's tally in the filter strip. The values sum to timeline.entryCount.",
    "timeline.groupSize": "SUBJECT-SCOPED by group id: how many identical consecutive entries a collapsed row stands for (T-06 grouping).",

    // entitlement.* — plan limits. NEVER portfolio facts: «έως 10 ασφαλιστήρια»
    // grouped with the policy count is exactly the false contradiction the
    // value scan reported.
    "entitlement.policyLimit": "The tier's policy cap.",
    "entitlement.freeInsightLimit": "How many insights the free tier unlocks.",

    // ── RESERVED (in the plan, no render site instruments them yet) ──
    // Registered so the plan and this file never disagree about the agreed
    // vocabulary; delete the RESERVED tag when a surface first uses one.
    "portfolio.analysedCount": "RESERVED — plan key; no surface renders it yet.",
    "portfolio.unreadCount": "RESERVED — plan key. NOTE: §2.8's dashboard «2 unread» was portfolio.neverAnalysedCount (policies the engine never read), not this.",
    "document.count": "RESERVED — plan key; no surface renders a document count yet.",
    "gap.riskCategoryCount": "RESERVED — plan key. NOTE: §2.8's «9 κατηγορίες» line is recommendation.openCount (heroAreasMany counts recommendations, worded as categories).",
}

/** Facts that are quantities but not cardinalities (money, days, indices). */
export const FACT_KEYS: Record<string, string> = {
    // policy.* — SUBJECT-SCOPED by policy id when rendered in a list.
    "policy.daysRemaining": "resolvePolicyLifecycle daysUntilExpiry — never re-derived client-side.",
    "policy.endDate": "resolvePolicyLifecycle endDate, Athens-formatted.",
    "policy.premium": "The policy's premium as extracted.",
    "policy.insurer": "Insurer display name (via policy-identity).",
    "policy.number": "Policy number (via policy-identity).",
    "policy.startDate": "Extracted start date.",

    // portfolio.*
    "portfolio.totalAnnualPremium": "calculatePremiumFootprintDetailed total, majority currency.",
    "portfolio.branchPremium": "SUBJECT-SCOPED by branch: the per-branch premium chip.",

    // profile.*
    "profile.healthIndex": "Customer health index (how well we understand them).",
    "profile.healthComponent": "SUBJECT-SCOPED by component id: one health-index component value.",
    "profile.daysSinceAssessment": "Days since the position was last assessed.",

    // asset.* — the insured thing itself. Reserved by the plan for the §7.3
    // reframe; `identifier` went live first (P5-wallet-01): the plate /
    // address short form / pet's name, resolved ONLY by policyAssetIdentifier
    // (lib/wallet/policy-identity.ts). SUBJECT-SCOPED by the POLICY id — no
    // asset entity exists yet, and the policy row is where it renders. Render
    // sites: the renewal-timeline row, the wallet card's LOB line and the
    // wallet table's secondary line — one identity, one key, all three.
    "asset.identifier": "The asset identifier (plate/address/pet name) via policyAssetIdentifier — never a raw acordData read.",

    // riskDimension.* — SUBJECT-SCOPED by dimension id.
    "riskDimension.score": "One dimension's 0-100 reading.",
    "gap.findingsProvenance": "Which analysis run the listed findings come from, dated, and whether the latest attempt is that run (B0.3). One per findings list.",

    // review.*
    "review.scoreAtOpen": "Score recorded when the review opened (historical).",

    // timeline.* — SUBJECT-SCOPED by entry id.
    "timeline.scoreDelta": "The score movement a score_change entry states; only rendered when both sides were comparable (comparableScores).",

    // LEGACY — the policy-detail surface was instrumented before the plan's
    // names settled (docs/evidence/policy-detail-mobile baselines reference
    // these spellings). Registered as-is so the guard sees them; renaming them
    // is a deliberate follow-up that must regenerate those baselines, not a
    // side effect of this registry. Do not use for NEW instrumentation.
    "policy.insurerName": "LEGACY spelling of policy.insurer (PolicyHead).",
    "policy.policyNumber": "LEGACY spelling of policy.number (PolicyHead).",
    "policy.premiumAmount": "LEGACY spelling of policy.premium (KeyDatesCard).",
    "policy.expiryDate": "LEGACY spelling of policy.endDate (PolicyHead).",
    "policy.status": "Policy lifecycle status (PolicyHead).",
    "policy.insuredSubject": "The insured vehicle/property line (PolicyHead).",
    "policy.attention": "The head's attention banner (PolicyHead).",
}

/**
 * Keys that render once per SUBJECT on a page and therefore REQUIRE
 * `data-count-subject` / `data-fact-subject` on the same element.
 */
export const SUBJECT_SCOPED_KEYS: ReadonlySet<string> = new Set([
    "gap.severityCount",
    "riskGraph.stateCount",
    "branch.policyCount",
    "branch.recommendationCount",
    "policy.renewalCheckpointCount",
    "asset.identifier",
    "policy.daysRemaining",
    "policy.endDate",
    "policy.premium",
    "policy.insurer",
    "policy.number",
    "portfolio.branchPremium",
    "profile.healthComponent",
    "riskDimension.score",
    "timeline.kindCount",
    "timeline.groupSize",
    "timeline.scoreDelta",
])

export function isRegisteredCountKey(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(COUNT_KEYS, key)
}

export function isRegisteredFactKey(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(FACT_KEYS, key)
}
