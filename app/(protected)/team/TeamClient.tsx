"use client"

import { useId, useMemo, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { branchLabel } from "@/lib/insurance/taxonomy"
import { EmptyState } from "@/components/ui/EmptyState"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { StatGrid, StatTile } from "@/components/ui/StatTile"
import { toast } from "sonner"
import {
    Users, UserPlus, Crown, Shield, User, ArrowRightLeft,
    TrendingUp, Euro, Briefcase, Building2, MoreVertical,
    X, AlertCircle, Loader2
} from "lucide-react"
import type { TeamOverview } from "@/lib/services/team.service"
import { TableShell } from "@/components/ui/TableShell"
import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
import {
    createAgencyAction, inviteMemberAction, removeMemberAction,
    updateRoleAction, transferCustomerAction
} from "./actions"
import { resolveLocale } from "@/lib/i18n/format"

const copy = {
    en: {
        kicker: "AGENCY",
        title: "Team Management",
        subtitle: "Manage your agency team, assign customers, and track performance.",
        noTeam: "No Agency Created",
        noTeamDesc: "Create an agency to invite team members, share customers, and track pipeline across your brokerage.",
        createAgency: "Create Agency",
        agencyName: "Agency Name",
        website: "Website",
        phone: "Phone",
        address: "Address",
        taxId: "Tax ID (ΑΦΜ)",
        members: "Team Members",
        invite: "Invite Member",
        email: "Email address",
        role: "Role",
        owner: "Owner",
        manager: "Manager",
        member: "Member",
        invited: "Invited",
        active: "Active",
        suspended: "Suspended",
        customers: "Customers",
        pipeline: "Pipeline",
        won: "Won",
        remove: "Remove",
        changeRole: "Change Role",
        actionFailed: "That didn't go through. Please try again.",
        teamStats: "Team Overview",
        totalMembers: "Total Members",
        totalCustomers: "Total Customers",
        totalPipeline: "Pipeline Value",
        totalWon: "Won Revenue",
        sharedPipeline: "Shared Pipeline",
        agent: "Advisor",
        customer: "Customer",
        sortLabel: "Sort",
        defaultOrder: "Default order",
        status: "Status",
        value: "Value",
        lob: "LoB",
        noOpps: "No opportunities in the pipeline yet.",
        noOppsDesc: "Opportunities appear here as your team logs cross-sell and coverage prospects for shared clients.",
        transfer: "Transfer",
        transferCustomer: "Transfer Customer",
        transferTo: "Transfer to",
        cancel: "Cancel",
        confirm: "Confirm",
    },
    el: {
        kicker: "ΠΡΑΚΤΟΡΕΙΟ",
        title: "Διαχείριση ομάδας",
        subtitle: "Διαχειριστείτε την ομάδα σας, αναθέστε πελάτες και παρακολουθήστε την απόδοση.",
        noTeam: "Δεν έχει δημιουργηθεί πρακτορείο",
        noTeamDesc: "Δημιουργήστε ένα πρακτορείο για να προσκαλέσετε μέλη, να μοιραστείτε πελάτες και να παρακολουθείτε τη ροή εργασίας.",
        createAgency: "Δημιουργία πρακτορείου",
        agencyName: "Όνομα πρακτορείου",
        website: "Ιστοσελίδα",
        phone: "Τηλέφωνο",
        address: "Διεύθυνση",
        taxId: "ΑΦΜ",
        members: "Μέλη ομάδας",
        invite: "Πρόσκληση μέλους",
        email: "Διεύθυνση email",
        role: "Ρόλος",
        owner: "Ιδιοκτήτης",
        manager: "Διαχειριστής",
        member: "Μέλος",
        invited: "Προσκεκλημένο",
        active: "Ενεργό",
        suspended: "Αναστολή",
        customers: "Πελάτες",
        pipeline: "Σωλήνας",
        won: "Κερδ.",
        remove: "Αφαίρεση",
        changeRole: "Αλλαγή ρόλου",
        actionFailed: "Η ενέργεια δεν ολοκληρώθηκε. Δοκιμάστε ξανά.",
        teamStats: "Επισκόπηση ομάδας",
        totalMembers: "Σύνολο μελών",
        totalCustomers: "Σύνολο πελατών",
        totalPipeline: "Αξία Pipeline",
        totalWon: "Κερδισμένα έσοδα",
        sharedPipeline: "Κοινό pipeline",
        agent: "Σύμβουλος",
        customer: "Πελάτης",
        sortLabel: "Ταξινόμηση",
        defaultOrder: "Προεπιλεγμένη σειρά",
        status: "Κατάσταση",
        value: "Αξία",
        lob: "Κλάδος",
        noOpps: "Δεν υπάρχουν ευκαιρίες ακόμα.",
        noOppsDesc: "Οι ευκαιρίες εμφανίζονται εδώ καθώς η ομάδα σας καταγράφει προοπτικές cross-sell και κάλυψης για κοινούς πελάτες.",
        transfer: "Μεταφορά",
        transferCustomer: "Μεταφορά πελάτη",
        transferTo: "Μεταφορά σε",
        cancel: "Ακύρωση",
        confirm: "Επιβεβαίωση",
    },
}

interface PipelineItem {
    id: string
    status: string
    lineOfBusiness: string | null
    estimatedPremium: number | null
    wonPremium: number | null
    customerName: string
    agentName: string
    agentId: string
    agentPhoto: string | null
    updatedAt: string
    notes: string | null
}

interface Props {
    team: TeamOverview | null
    pipeline: PipelineItem[]
}

type TeamSortKey = "customer" | "agent" | "lob" | "status" | "value"

// State pills on the status TOKENS, the state as a word: no palette literals,
// no CSS uppercase (Greek capitals drop the tonos).
const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold"

export function TeamClient({ team, pipeline }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]

    const fmt = (n: number) =>
        new Intl.NumberFormat(resolveLocale(language), {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(n)

    if (!team) {
        return <CreateAgencyView t={t} />
    }


    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-page-wide space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8">
                {/* Header — what the screen is. The «ΠΡΑΚΤΟΡΕΙΟ» eyebrow is gone:
                    the heading carries its own weight, and CSS uppercase strips
                    the tonos off Greek. */}
                <div className="min-w-0">
                    <h1 className="text-h3 font-semibold tracking-tight text-foreground">{t.title}</h1>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.subtitle}</p>
                </div>

                {/* Four fact tiles on the shared StatTile — the accent tints the
                    glyph only; the number stays in the text colour. The local
                    StatCard this page carried was a second implementation of it. */}
                <StatGrid>
                    <StatTile icon={Users} label={t.totalMembers} value={team.stats.totalMembers} accent="brand" />
                    <StatTile icon={Briefcase} label={t.totalCustomers} value={team.stats.totalCustomers} />
                    <StatTile icon={TrendingUp} label={t.totalPipeline} value={fmt(team.stats.totalPipeline)} />
                    <StatTile icon={Euro} label={t.totalWon} value={fmt(team.stats.totalWon)} accent="positive" />
                </StatGrid>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Team Members */}
                    <div className="lg:col-span-1">
                        <MembersPanel team={team} t={t} fmt={fmt} />
                    </div>

                    {/* Shared Pipeline */}
                    <div className="lg:col-span-2">
                        <PipelinePanel pipeline={pipeline} team={team} t={t} fmt={fmt} />
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Sub-components ──

function MembersPanel({ team, t, fmt }: { team: TeamOverview; t: typeof copy.en; fmt: (n: number) => string }) {
    const { t: gt } = useLanguage()
    const headingId = useId()
    const [showInvite, setShowInvite] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<"member" | "manager">("member")
    const [inviteLoading, setInviteLoading] = useState(false)
    const [inviteError, setInviteError] = useState("")
    const [menuOpen, setMenuOpen] = useState<string | null>(null)
    // Which member row has a role change / removal in flight. Both are
    // destructive server actions with no optimistic UI, so without this the
    // menu sat inert after the click and a second click fired them twice.
    const [memberBusy, setMemberBusy] = useState<string | null>(null)

    /** Runs a member mutation with a busy guard and a surfaced failure. */
    const runMemberAction = async (userId: string, action: () => Promise<unknown>) => {
        if (memberBusy) return
        setMemberBusy(userId)
        try {
            await action()
            setMenuOpen(null)
        } catch {
            toast.error(t.actionFailed)
        } finally {
            setMemberBusy(null)
        }
    }

    const handleInvite = async () => {
        if (!inviteEmail) return
        setInviteLoading(true)
        setInviteError("")
        const result = await inviteMemberAction(inviteEmail, inviteRole)
        setInviteLoading(false)
        if (result.error) {
            setInviteError(result.error)
        } else {
            setInviteEmail("")
            setShowInvite(false)
        }
    }

    const roleLabel = (role: string) => {
        if (role === "owner") return t.owner
        if (role === "manager") return t.manager
        return t.member
    }

    // The role was shown only as an unlabelled icon — a screen reader announced
    // nothing and a sighted user had to guess (is Crown owner? Shield manager?).
    // Carry the localised role label as the icon's accessible name + a hover
    // tooltip; the inner SVG is decorative once the wrapper names the role.
    const roleIcon = (role: string) => {
        const label = roleLabel(role)
        const icon =
            role === "owner" ? <Crown className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden="true" />
                : role === "manager" ? <Shield className="h-3.5 w-3.5 text-primary dark:text-mint" aria-hidden="true" />
                    : <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        return <span role="img" aria-label={label} title={label} className="inline-flex">{icon}</span>
    }

    const statusBadge = (status: string) => {
        if (status === "invited") return <span className={`${pill} bg-status-warning-tint text-status-warning`}>{t.invited}</span>
        if (status === "suspended") return <span className={`${pill} bg-status-danger-tint text-status-danger`}>{t.suspended}</span>
        return null
    }

    return (
        <section className="pw-card pw-pad" aria-labelledby={headingId}>
            <CardHead
                icon={Users}
                title={t.members}
                id={headingId}
                meta={
                    <button
                        type="button"
                        onClick={() => setShowInvite(!showInvite)}
                        aria-expanded={showInvite}
                        className="pw-soft-button"
                    >
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        {t.invite}
                    </button>
                }
            />

            {/* Invite form — a sub-card inside the card. */}
            {showInvite && (
                <div className="pw-subcard mt-4 space-y-3 p-3 sm:p-4">
                    <input
                        type="email"
                        aria-label={t.email}
                        placeholder={t.email}
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pw-input pw-input-sm"
                    />
                    <select
                        aria-label={t.role}
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "member" | "manager")}
                        className="pw-input pw-input-sm"
                    >
                        <option value="member">{t.member}</option>
                        <option value="manager">{t.manager}</option>
                    </select>
                    {inviteError && (
                        <p role="alert" className="flex items-center gap-1 text-caption font-semibold text-status-danger">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {inviteError}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowInvite(false)}
                            className="pw-soft-button flex-1"
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="button"
                            onClick={handleInvite}
                            disabled={inviteLoading || !inviteEmail}
                            aria-busy={inviteLoading}
                            className="pw-primary-button flex-1"
                        >
                            {inviteLoading ? "..." : t.invite}
                        </button>
                    </div>
                </div>
            )}

            {/* Members list — each member a sub-card row: avatar · name with the
                role glyph and state pill · facts as a caption · the row menu. */}
            <ul className="mt-4 space-y-2">
                {team.members.map((m) => (
                    <li key={m.id} className="pw-subcard relative flex min-h-11 items-center gap-3 p-3">
                        {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                        ) : (
                            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary dark:bg-primary/15 dark:text-mint">
                                {m.name.charAt(0)}
                            </span>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">{m.name}</p>
                                {roleIcon(m.role)}
                                {statusBadge(m.status)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-caption text-muted-foreground">
                                <span>
                                    {m.customerCount} {t.customers}
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">
                                    {fmt(m.wonValue)}
                                </span>
                            </div>
                        </div>
                        {m.role !== "owner" && (
                            <button
                                type="button"
                                onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                                aria-label={`${gt.common.actions}: ${m.name}`}
                                aria-expanded={menuOpen === m.id}
                                className="pw-soft-button h-11 w-11 shrink-0 px-0"
                            >
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                            </button>
                        )}

                        {/* Context menu — a floating surface, so its shadow answers
                            to state rather than resting on a card. */}
                        {menuOpen === m.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-2xl border border-border bg-card p-1 shadow-xl">
                                <button
                                    type="button"
                                    onClick={() =>
                                        runMemberAction(m.userId, () =>
                                            updateRoleAction(
                                                m.userId,
                                                m.role === "manager" ? "member" : "manager"
                                            )
                                        )
                                    }
                                    disabled={memberBusy === m.userId}
                                    className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {memberBusy === m.userId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                                    )}
                                    {t.changeRole}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runMemberAction(m.userId, () => removeMemberAction(m.userId))}
                                    disabled={memberBusy === m.userId}
                                    className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-status-danger transition-colors hover:bg-status-danger-tint disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {memberBusy === m.userId ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                    ) : (
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    )}
                                    {t.remove}
                                </button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    )
}

function PipelinePanel({ pipeline, team, t, fmt }: {
    pipeline: PipelineItem[]
    team: TeamOverview
    t: typeof copy.en
    fmt: (n: number) => string
}) {
    const headingId = useId()
    // Stage and line labels come from the dictionary and the taxonomy — a raw
    // `won` / `motor_liability` slug is not a word a customer-facing table shows.
    const { t: gt, language } = useLanguage()
    const stageLabel = gt.agentPages.opportunities.status as Record<string, string>
    const { sort, toggle, setSort } = useTableSort<TeamSortKey>()
    const sortedPipeline = useMemo(
        () => applySort<PipelineItem, TeamSortKey>(pipeline, sort, {
            customer: (r) => r.customerName,
            agent: (r) => r.agentName,
            lob: (r) => r.lineOfBusiness,
            status: (r) => r.status,
            // The value column shows won premium, falling back to estimated.
            value: (r) => r.wonPremium ?? r.estimatedPremium,
        }),
        [pipeline, sort]
    )
    // Pipeline stage pills on the status TOKENS: info = in conversation,
    // warning = waiting on a quote, success = won, danger = lost, neutral = open.
    const statusTone: Record<string, string> = {
        open: "bg-muted text-foreground",
        contacted: "bg-status-info-tint text-status-info",
        quoted: "bg-status-warning-tint text-status-warning",
        won: "bg-status-success-tint text-status-success",
        lost: "bg-status-danger-tint text-status-danger",
    }
    const isEmpty = pipeline.length === 0

    return (
        <section className={`pw-card ${isEmpty ? "pw-pad" : "overflow-hidden"}`} aria-labelledby={headingId}>
            <div className={isEmpty ? undefined : "pw-pad pb-0"}>
                <CardHead
                    icon={TrendingUp}
                    title={t.sharedPipeline}
                    id={headingId}
                    meta={isEmpty ? undefined : <span className="tabular-nums">{pipeline.length}</span>}
                />
                {/* thead is sr-only below lg, so the column headers cannot be used
                    on a phone — this drives the same sort state. */}
                {!isEmpty && (
                    <MobileSortControl
                        sort={sort}
                        onSort={toggle}
                        onClear={() => setSort(null)}
                        columns={[{ key: "customer", label: t.customer }, { key: "agent", label: t.agent }, { key: "lob", label: t.lob }, { key: "status", label: t.status }, { key: "value", label: t.value }]}
                        label={t.sortLabel}
                        defaultLabel={t.defaultOrder}
                        className="mt-3"
                    />
                )}
            </div>

            {isEmpty ? (
                <EmptyState
                    className="!border-0 !bg-transparent px-0 py-6 !shadow-none"
                    icon={TrendingUp}
                    headline={t.noOpps}
                    description={t.noOppsDesc}
                />
            ) : (
                <TableShell label={t.title}>
                    <table className="pw-stacked-table w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={t.customer} align="left" />
                                <SortableColumn columnKey="agent" sort={sort} onSort={toggle} label={t.agent} align="left" />
                                <SortableColumn columnKey="lob" sort={sort} onSort={toggle} label={t.lob} align="left" />
                                <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={t.status} align="left" />
                                <SortableColumn columnKey="value" sort={sort} onSort={toggle} label={t.value} align="right" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPipeline.map((item) => (
                                <tr key={item.id} className="border-b border-border/60 transition-colors hover:bg-muted/40">
                                    <td data-label={t.customer} className="px-4 py-3 font-semibold text-foreground">{item.customerName}</td>
                                    <td data-label={t.agent} className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {item.agentPhoto ? (
                                                <img src={item.agentPhoto} alt="" className="h-6 w-6 rounded-full object-cover" />
                                            ) : (
                                                <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-muted text-caption font-semibold text-foreground">
                                                    {item.agentName.charAt(0)}
                                                </span>
                                            )}
                                            <span className="text-sm text-muted-foreground">{item.agentName}</span>
                                        </div>
                                    </td>
                                    <td data-label={t.lob} className="px-4 py-3 text-muted-foreground">{item.lineOfBusiness ? branchLabel(item.lineOfBusiness, language === "en" ? "en" : "el") : "—"}</td>
                                    <td data-label={t.status} className="px-4 py-3">
                                        <span className={`${pill} ${statusTone[item.status] || statusTone.open}`}>
                                            {stageLabel[item.status] ?? item.status}
                                        </span>
                                    </td>
                                    <td data-label={t.value} className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                                        {item.estimatedPremium ? fmt(item.wonPremium || item.estimatedPremium) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableShell>
            )}
        </section>
    )
}

function CreateAgencyView({ t }: { t: typeof copy.en }) {
    const [name, setName] = useState("")
    const [website, setWebsite] = useState("")
    const [phone, setPhone] = useState("")
    const [address, setAddress] = useState("")
    const [taxId, setTaxId] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleCreate = async () => {
        if (!name.trim()) return
        setLoading(true)
        setError("")
        const result = await createAgencyAction({ name, website, phone, address, taxId })
        setLoading(false)
        if (result.error) setError(result.error)
    }

    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-lg px-4 pb-10 pt-6 sm:px-6 lg:pt-8">
                <section className="pw-card pw-pad-roomy text-center">
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft dark:bg-primary/15">
                        <Building2 className="h-7 w-7 text-primary dark:text-mint" aria-hidden="true" />
                    </div>
                    {/* This branch is a whole PAGE, not a card inside one — it is
                        what an agent or admin without a team lands on. Its title
                        was an <h2>, so the route rendered no <h1> at all and a
                        screen-reader user had nothing naming the page. */}
                    <h1 className="mt-5 text-h3 font-semibold tracking-tight text-foreground">
                        {t.noTeam}
                    </h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                        {t.noTeamDesc}
                    </p>

                    <div className="mt-8 space-y-3 text-left">
                        <div>
                            <label htmlFor="team-name" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.agencyName} *</label>
                            <input id="team-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pw-input"
                                placeholder="Ασφαλιστικό Πρακτορείο..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="team-phone" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.phone}</label>
                                <input
                                    id="team-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pw-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="team-taxId" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.taxId}</label>
                                <input
                                    id="team-taxId"
                                    type="text"
                                    value={taxId}
                                    onChange={(e) => setTaxId(e.target.value)}
                                    className="pw-input"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="team-website" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.website}</label>
                            <input
                                    id="team-website"
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="pw-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="team-address" className="mb-1.5 block text-caption font-medium text-muted-foreground">{t.address}</label>
                            <input
                                    id="team-address"
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="pw-input"
                            />
                        </div>
                    </div>

                    {error && (
                        <p role="alert" className="mt-4 flex items-center justify-center gap-1 text-caption font-semibold text-status-danger">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /> {error}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                        aria-busy={loading}
                        className="pw-primary-button mt-6 w-full"
                    >
                        {loading ? "..." : t.createAgency}
                    </button>
                </section>
            </div>
        </div>
    )
}
