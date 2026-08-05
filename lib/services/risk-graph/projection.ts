/**
 * Projecting the graph from what we already store.
 *
 * Pure: `LifeContext` in, graph out. No DB, no clock, no new tables — which is
 * what makes this backwards compatible by construction. Every existing surface
 * keeps reading `LifeContext` exactly as before; the graph is an additional view
 * over the same facts, and deleting this module changes nothing downstream.
 *
 * **The honest limitation, stated once.** The profile stores COUNTS, not
 * objects: `propertiesOwned: 2` says how many, never which. So the projection
 * synthesises two property nodes with generated ids. That is real progress — a
 * risk can now anchor to `property:2` and be reasoned about independently — but
 * the nodes are not yet distinguishable to the customer, and any per-object
 * attribute (rebuild cost, seismic zone, occupancy) is unknown until intake
 * gains per-object entry. Nodes carry `synthetic: true` so no surface can
 * mistake a generated node for a described one.
 */

import type { LifeContext } from "@/lib/services/gap-engine/life-context"
import {
    ACTIVITY_LABELS,
    CONDITION_LABELS,
    outstandingDebt,
    totalDependents,
} from "@/lib/services/gap-engine/life-context"
import type { GraphEdge, GraphNode, NodeType, PersonalRiskGraph } from "./types"
import { NODE_ROOT_OF, NODE_TYPES } from "./types"

/** Counts above this are collapsed — nobody needs 50 individually-modelled cars. */
const MAX_SYNTHETIC_PER_TYPE = 12

interface Builder {
    nodes: GraphNode[]
    edges: GraphEdge[]
}

function add(
    b: Builder,
    id: string,
    type: NodeType,
    label: { en: string; el: string },
    attributes: GraphNode["attributes"] = {},
    confidence: GraphNode["confidence"] = "declared"
): string {
    b.nodes.push({ id, type, root: NODE_ROOT_OF[type], label, attributes, confidence })
    return id
}

function link(b: Builder, type: GraphEdge["type"], from: string, to: string, attributes?: GraphEdge["attributes"]) {
    b.edges.push({ type, from, to, ...(attributes ? { attributes } : {}) })
}

/** `n` synthetic nodes of one type, capped, each with a stable ordinal id. */
function synthesise(
    b: Builder,
    count: number,
    type: NodeType,
    label: (i: number) => { en: string; el: string },
    attributes: (i: number) => GraphNode["attributes"] = () => ({})
): string[] {
    const n = Math.min(Math.max(0, Math.floor(count)), MAX_SYNTHETIC_PER_TYPE)
    const ids: string[] = []
    for (let i = 1; i <= n; i++) {
        ids.push(
            add(b, `${type}:${i}`, type, label(i), { ...attributes(i), synthetic: true }, "derived")
        )
    }
    return ids
}

/**
 * Build the graph.
 *
 * Only ESTABLISHED facts become nodes. A factor the customer has never been
 * asked about produces nothing — an absent node means "we have not established
 * this", never "this does not exist", and §risks reads that distinction rather
 * than treating emptiness as denial.
 */
export function projectRiskGraph(ctx: LifeContext): PersonalRiskGraph {
    const b: Builder = { nodes: [], edges: [] }

    // ── Party ────────────────────────────────────────────────────────
    const self = add(b, "person:self", "person", { en: "You", el: "Εσείς" }, {
        age: ctx.age,
        maritalStatus: ctx.maritalStatus,
        employmentStatus: ctx.employmentStatus,
    })

    const household = add(b, "household:main", "household", { en: "Your household", el: "Το νοικοκυριό σας" }, {
        members: 1 + totalDependents(ctx),
    }, "derived")
    link(b, "member_of", self, household)

    // Dependants are Persons in a dependency relationship, not a separate kind
    // of thing — a child who becomes independent must keep their identity.
    if (ctx.known.dependents || ctx.known.children) {
        const dependants = synthesise(
            b,
            totalDependents(ctx),
            "dependent",
            (i) => ({ en: `Dependant ${i}`, el: `Εξαρτώμενο μέλος ${i}` })
        )
        for (const id of dependants) {
            link(b, "member_of", id, household)
            link(b, "depends_on", id, self, { kind: "financial" })
        }
    }

    if (ctx.known.pets && ctx.hasPets) {
        // "Yes, I have pets" is the fact; the count is detail on top of it. A
        // stored count of 0 (or a stale negative) produced no pet node at all,
        // so `pet_costs` — which applies on the yes alone — pointed at nothing.
        const pets = synthesise(
            b,
            Math.max(1, ctx.petsCount ?? 1),
            "pet",
            (i) => ({ en: `Pet ${i}`, el: `Κατοικίδιο ${i}` })
        )
        for (const id of pets) link(b, "owns", self, id)
    }

    // Employing people IS a business fact. Requiring `ownsBusiness` as well left
    // someone who declared five employees holding `employer_liability` — which
    // applies on the headcount alone — anchored to nothing at all.
    const employs = ctx.known.employees && ctx.businessEmployees > 0
    if ((ctx.known.businessOwnership && ctx.ownsBusiness) || employs) {
        const business = add(b, "business:main", "business", { en: "Your business", el: "Η επιχείρησή σας" }, {
            employees: ctx.businessEmployees,
        })
        link(b, "operates", self, business)
        if (employs) {
            link(b, "employs", business, self, { count: ctx.businessEmployees })
        }
    }

    // ── Assets ───────────────────────────────────────────────────────
    if (ctx.known.propertyOwnership || ctx.known.residence) {
        const owned = ctx.propertiesOwned
        // Which owned property the letting refers to.
        //
        // Reserving property 1 as the home is only right when they OWN where
        // they live. Someone renting in the city while letting the flat they
        // inherited owns exactly one property, all of it let — and the old
        // `i > 1` rule marked none of it, so `landlord_letting` applied to them
        // and anchored to nothing at all.
        const firstLet = ctx.residenceType === "owned" && owned > 1 ? 2 : 1
        const properties = synthesise(
            b,
            owned,
            "property",
            (i) => ({ en: `Property ${i}`, el: `Ακίνητο ${i}` }),
            (i) => ({
                occupancy: i === 1 && ctx.residenceType === "owned" ? "owner_occupied" : "unknown",
                isLet: ctx.rentsOutProperty && i >= firstLet ? true : null,
            })
        )
        for (const id of properties) link(b, "owns", self, id)
        if (ctx.residenceType === "owned" && properties[0]) {
            link(b, "houses", properties[0], household)
        }
    }

    // Saying you let property out IS saying you have property to let.
    //
    // Property nodes otherwise come only from the ownership and residence
    // answers, so a customer who answered the letting question and skipped
    // those — or who answered `propertiesOwned: 0` while letting a place they
    // do not count as "owned" — held `landlord_letting` with nothing to point
    // at. Derived rather than declared: we know it exists, not how many.
    if (ctx.known.tenants && ctx.rentsOutProperty && !b.nodes.some((n) => n.attributes.isLet === true)) {
        const let_ = add(
            b,
            "property:let",
            "property",
            { en: "The property you let", el: "Το ακίνητο που εκμισθώνετε" },
            { occupancy: "let", isLet: true },
            "derived"
        )
        link(b, "owns", self, let_)
    }

    // A tenant's home is a node they do NOT own — which is precisely the
    // exposure: the building is someone else's, the contents are theirs.
    if (ctx.residenceType === "rented") {
        const rented = add(b, "property:rented", "property", { en: "Your rented home", el: "Η ενοικιαζόμενη κατοικία σας" }, {
            occupancy: "rented",
            ownedBySubject: false,
        })
        link(b, "custodian_of", self, rented, { basis: "lease" })
        link(b, "houses", rented, household)
    }

    if (ctx.known.vehicles) {
        const vehicles = synthesise(
            b,
            ctx.vehiclesCount,
            "vehicle",
            (i) => ({ en: `Vehicle ${i}`, el: `Όχημα ${i}` }),
            () => ({ inCirculation: true })
        )
        for (const id of vehicles) {
            link(b, "owns", self, id)
            link(b, "uses", self, id, { primary: true })
        }
    }

    if (ctx.known.boat && ctx.ownsBoat) {
        const vessel = add(b, "vessel:1", "vessel", { en: "Your boat", el: "Το σκάφος σας" }, {})
        link(b, "owns", self, vessel)
    }

    if (ctx.known.valuables && (ctx.valuablesValue ?? 0) > 0) {
        const valuable = add(b, "valuable:all", "valuable", { en: "Valuables", el: "Τιμαλφή" }, {
            value: ctx.valuablesValue,
        })
        link(b, "owns", self, valuable)
        // Valuables live in the home, which is what makes a contents policy able
        // to cover them — and what makes them share the home's fate.
        const container = ctx.residenceType === "rented" ? "property:rented" : "property:1"
        if (b.nodes.some((n) => n.id === container)) link(b, "houses", container, valuable)
    }

    if (ctx.known.cyberExposure && (ctx.cyberExposure === "moderate" || ctx.cyberExposure === "high")) {
        const digital = add(b, "digital_asset:accounts", "digital_asset", { en: "Online accounts", el: "Διαδικτυακοί λογαριασμοί" }, {
            exposure: ctx.cyberExposure,
        })
        link(b, "owns", self, digital)
        add(b, "cyber_exposure:main", "cyber_exposure", { en: "Online financial activity", el: "Διαδικτυακή οικονομική δραστηριότητα" }, {
            level: ctx.cyberExposure,
        })
        link(b, "engages_in", self, "cyber_exposure:main")
    }

    // ── Obligations ──────────────────────────────────────────────────
    if (ctx.known.mortgage && (ctx.mortgageAmount ?? 0) > 0) {
        const mortgage = add(b, "mortgage:1", "mortgage", { en: "Your mortgage", el: "Το στεγαστικό σας δάνειο" }, {
            outstanding: ctx.mortgageAmount,
        })
        link(b, "owes", self, mortgage)
        // Secured on the first property, which is the only one we can identify.
        if (b.nodes.some((n) => n.id === "property:1")) {
            link(b, "secured_on", mortgage, "property:1", { lenderRequiresFireCover: true })
        }
    }

    if (ctx.known.loans && (ctx.loanAmount ?? 0) > 0) {
        const loan = add(b, "loan:1", "loan", { en: "Your loans", el: "Τα δάνειά σας" }, {
            outstanding: ctx.loanAmount,
        })
        link(b, "owes", self, loan)
    }

    // ── Flows ────────────────────────────────────────────────────────
    // Earning is the fact; the amount is an attribute of it. Requiring a figure
    // meant an employed customer who skipped the income question held
    // `income_interruption` — which applies on employment alone — with nothing
    // in their life to point at.
    const earns =
        ctx.employmentStatus === "employed" || ctx.employmentStatus === "self_employed"
    if (earns || (ctx.known.income && ctx.annualIncome != null)) {
        const income = add(b, "income:main", "income", { en: "Your income", el: "Το εισόδημά σας" }, {
            annualAmount: ctx.annualIncome,
            amountKnown: ctx.known.income && ctx.annualIncome != null,
            kind: ctx.employmentStatus,
        })
        link(b, "earns", self, income)
        for (const node of b.nodes.filter((n) => n.type === "dependent")) {
            link(b, "depends_on", node.id, income, { kind: "financial" })
        }
    }

    if (ctx.known.savings && ctx.savingsAmount != null) {
        const savings = add(b, "savings:main", "savings", { en: "Your savings", el: "Οι αποταμιεύσεις σας" }, {
            amount: ctx.savingsAmount,
            // Savings REDUCE exposure. A graph that only accumulates risk is a
            // sales funnel with extra steps.
            reducesExposure: true,
        })
        link(b, "owns", self, savings)
    }

    // ── Conditions & exposures ───────────────────────────────────────
    if (ctx.known.health && (ctx.chronicConditions?.length ?? 0) > 0) {
        for (const condition of ctx.chronicConditions ?? []) {
            // The stored value is an id, not copy. Rendering it raw showed a
            // Greek reader "diabetes" where the app already knows «Διαβήτης» —
            // and unknown ids still pass through, so free text survives.
            const label = CONDITION_LABELS[condition] ?? { en: condition, el: condition }
            const id = add(b, `health_condition:${condition}`, "health_condition", label, {
                // Art. 9 special category. Present because the customer declared
                // it on a consented surface; never inferred.
                specialCategory: true,
            })
            link(b, "has_condition", self, id)
        }
    }

    // Working for yourself is itself an occupation node, job title or not.
    // Requiring the free-text title left `professional_liability` — which
    // applies on self-employment alone — anchored to nothing, so the one risk
    // that most needs to point at something produced no evidence at all.
    if (ctx.occupation || ctx.isSelfEmployed || ctx.ownsBusiness) {
        const label = ctx.occupation
            ? { en: ctx.occupation, el: ctx.occupation }
            : { en: "Your professional work", el: "Η επαγγελματική σας δραστηριότητα" }
        const occupation = add(b, "occupation:main", "occupation", label, {
            selfEmployed: ctx.isSelfEmployed,
            titleKnown: ctx.occupation != null,
        }, ctx.occupation ? "declared" : "derived")
        link(b, "has_condition", self, occupation)
    }

    if (ctx.known.hobbies) {
        for (const activity of ctx.activities) {
            const label = ACTIVITY_LABELS[activity] ?? { en: activity, el: activity }
            const id = add(b, `activity:${activity}`, "activity", label, {})
            link(b, "engages_in", self, id)
        }
    }

    if (ctx.known.travelFrequency && ctx.travelsFrequently) {
        const travel = add(b, "travel:frequent", "travel", { en: "Frequent travel abroad", el: "Συχνά ταξίδια στο εξωτερικό" }, {
            frequency: "frequent",
        })
        link(b, "engages_in", self, travel)
    }

    const byType = Object.fromEntries(NODE_TYPES.map((t) => [t, [] as string[]])) as Record<NodeType, string[]>
    for (const node of b.nodes) byType[node.type].push(node.id)

    return { nodes: b.nodes, edges: b.edges, byType }
}

// ── Selectors ────────────────────────────────────────────────────────

export function nodesOfType(graph: PersonalRiskGraph, type: NodeType): GraphNode[] {
    return graph.nodes.filter((n) => n.type === type)
}

export function getNode(graph: PersonalRiskGraph, id: string): GraphNode | undefined {
    return graph.nodes.find((n) => n.id === id)
}

/** Edges out of a node, optionally filtered by type. */
export function edgesFrom(
    graph: PersonalRiskGraph,
    nodeId: string,
    type?: GraphEdge["type"]
): GraphEdge[] {
    return graph.edges.filter((e) => e.from === nodeId && (!type || e.type === type))
}

/**
 * How exposed the household is, counted in nodes rather than policies.
 *
 * Useful as a headline: "we are tracking 9 things in your life" is a statement
 * about them, where "you hold 3 policies" is a statement about their shopping.
 */
export function graphSummary(graph: PersonalRiskGraph) {
    return {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        assets: graph.nodes.filter((n) => n.root === "asset").length,
        obligations: graph.nodes.filter((n) => n.root === "obligation").length,
        dependants: graph.byType.dependent.length,
        synthetic: graph.nodes.filter((n) => n.attributes.synthetic === true).length,
    }
}
