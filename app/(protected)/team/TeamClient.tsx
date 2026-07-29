"use client"

import { useMemo, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { EmptyState } from "@/components/ui/EmptyState"
import { toast } from "sonner"
import {
    Users, UserPlus, Crown, Shield, User, ArrowRightLeft,
    TrendingUp, Euro, Briefcase, Building2, MoreVertical,
    ChevronDown, X, AlertCircle, Loader2
} from "lucide-react"
import type { TeamOverview } from "@/lib/services/team.service"
import { TableShell } from "@/components/ui/TableShell"
import { SortableColumn, MobileSortControl, useTableSort, applySort } from "@/components/ui/SortableColumn"
import {
    createAgencyAction, inviteMemberAction, removeMemberAction,
    updateRoleAction, transferCustomerAction
} from "./actions"

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

export function TeamClient({ team, pipeline }: Props) {
    const { language } = useLanguage()
    const t = copy[language === "el" ? "el" : "en"]

    const fmt = (n: number) =>
        new Intl.NumberFormat(language === "el" ? "el-GR" : "en-GB", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(n)

    if (!team) {
        return <CreateAgencyView t={t} />
    }


    return (
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-page-wide mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
                {/* Header */}
                <div className="mb-10 text-center sm:text-left">
                    <span className="pw-kicker inline-block mb-2">{t.kicker}</span>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-3">
                        {t.title}
                    </h1>
                    <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
                        {t.subtitle}
                    </p>
                </div>

                {/* Team Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        icon={<Users className="w-5 h-5 text-primary dark:text-mint" />}
                        label={t.totalMembers}
                        value={String(team.stats.totalMembers)}
                        color="primary"
                    />
                    <StatCard
                        icon={<Briefcase className="w-5 h-5 text-muted-foreground" />}
                        label={t.totalCustomers}
                        value={String(team.stats.totalCustomers)}
                        color="slate"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
                        label={t.totalPipeline}
                        value={fmt(team.stats.totalPipeline)}
                        color="amber"
                    />
                    <StatCard
                        icon={<Euro className="w-5 h-5 text-primary dark:text-mint" />}
                        label={t.totalWon}
                        value={fmt(team.stats.totalWon)}
                        color="primary"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

function StatCard({ icon, label, value, color }: {
    icon: React.ReactNode
    label: string
    value: string
    color: string
}) {
    const bgMap: Record<string, string> = {
        primary: "bg-primary-soft dark:bg-primary/15",
        slate: "bg-muted",
        amber: "bg-amber-50 dark:bg-amber-900/20",
    }
    return (
        <div className="pw-card pw-pad">
            <div className="flex items-center gap-3 mb-2">
                <div className={`w-9 h-9 rounded-xl ${bgMap[color] ?? bgMap.slate} flex items-center justify-center`}>
                    {icon}
                </div>
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
            <p className="text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    )
}

function MembersPanel({ team, t, fmt }: { team: TeamOverview; t: typeof copy.en; fmt: (n: number) => string }) {
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
            role === "owner" ? <Crown className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                : role === "manager" ? <Shield className="w-3.5 h-3.5 text-primary dark:text-mint" aria-hidden="true" />
                    : <User className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
        return <span role="img" aria-label={label} title={label} className="inline-flex">{icon}</span>
    }

    const statusBadge = (status: string) => {
        if (status === "invited") return <span className="text-kicker font-black text-amber-700 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase tracking-widest">{t.invited}</span>
        if (status === "suspended") return <span className="text-kicker font-black text-red-700 dark:text-rose-200 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full uppercase tracking-widest">{t.suspended}</span>
        return null
    }

    return (
        <div className="pw-card pw-pad">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary dark:text-mint" />
                    {t.members}
                </h3>
                <button
                    onClick={() => setShowInvite(!showInvite)}
                    className="text-kicker font-black text-primary hover:text-primary-hover dark:text-mint uppercase tracking-widest flex items-center gap-1"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    {t.invite}
                </button>
            </div>

            {/* Invite form */}
            {showInvite && (
                <div className="mb-5 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 space-y-3">
                    <input
                        type="email"
                        aria-label={t.email}
                        placeholder={t.email}
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="pw-input pw-input-sm"
                    />
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as "member" | "manager")}
                        className="pw-input pw-input-sm"
                    >
                        <option value="member">{t.member}</option>
                        <option value="manager">{t.manager}</option>
                    </select>
                    {inviteError && (
                        <p className="text-xs text-red-700 dark:text-red-300 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {inviteError}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowInvite(false)}
                            className="flex-1 px-3 py-2 text-xs font-bold text-neutral-500 dark:text-neutral-400 hover:text-neutral-700"
                        >
                            {t.cancel}
                        </button>
                        <button
                            onClick={handleInvite}
                            disabled={inviteLoading || !inviteEmail}
                            className="pw-primary-button flex-1"
                        >
                            {inviteLoading ? "..." : t.invite}
                        </button>
                    </div>
                </div>
            )}

            {/* Members list */}
            <div className="space-y-3">
                {team.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors relative">
                        {m.photoUrl ? (
                            <img src={m.photoUrl} alt={m.name} className="w-10 h-10 rounded-xl object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sm font-black text-neutral-500 dark:text-neutral-400">
                                {m.name.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                                {roleIcon(m.role)}
                                {statusBadge(m.status)}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-kicker font-bold text-neutral-500 dark:text-neutral-400">
                                    {m.customerCount} {t.customers}
                                </span>
                                <span className="text-kicker font-bold text-primary dark:text-mint">
                                    {fmt(m.wonValue)}
                                </span>
                            </div>
                        </div>
                        {m.role !== "owner" && (
                            <button
                                onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        )}

                        {/* Context menu */}
                        {menuOpen === m.id && (
                            <div className="absolute right-0 top-full z-10 mt-1 w-44 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                                <button
                                    onClick={() =>
                                        runMemberAction(m.userId, () =>
                                            updateRoleAction(
                                                m.userId,
                                                m.role === "manager" ? "member" : "manager"
                                            )
                                        )
                                    }
                                    disabled={memberBusy === m.userId}
                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {memberBusy === m.userId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <ArrowRightLeft className="w-3.5 h-3.5" />
                                    )}
                                    {t.changeRole}
                                </button>
                                <button
                                    onClick={() => runMemberAction(m.userId, () => removeMemberAction(m.userId))}
                                    disabled={memberBusy === m.userId}
                                    className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-700 dark:text-rose-200 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {memberBusy === m.userId ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <X className="w-3.5 h-3.5" />
                                    )}
                                    {t.remove}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function PipelinePanel({ pipeline, team, t, fmt }: {
    pipeline: PipelineItem[]
    team: TeamOverview
    t: typeof copy.en
    fmt: (n: number) => string
}) {
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
    const statusColor: Record<string, string> = {
        open: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
        contacted: "bg-mint/25 text-primary dark:bg-primary/15 dark:text-mint",
        quoted: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
        won: "bg-primary-soft text-[#166534] dark:bg-primary/15 dark:text-mint",
        lost: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
    }

    return (
        <div className="pw-card pw-pad">
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest mb-5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary dark:text-mint" />
                {t.sharedPipeline}
            </h3>

            {pipeline.length === 0 ? (
                <EmptyState
                    className="!border-0 !bg-transparent !shadow-none dark:!bg-transparent"
                    icon={TrendingUp}
                    headline={t.noOpps}
                    description={t.noOppsDesc}
                />
            ) : (
                <>
                {/* thead is sr-only below lg, so the column headers cannot be used
                    on a phone — this drives the same sort state. */}
                <MobileSortControl
                    sort={sort}
                    onSort={toggle}
                    onClear={() => setSort(null)}
                    columns={[{ key: "customer", label: t.customer }, { key: "agent", label: t.agent }, { key: "lob", label: t.lob }, { key: "status", label: t.status }, { key: "value", label: t.value }]}
                    label={t.sortLabel}
                    defaultLabel={t.defaultOrder}
                    className="mb-3"
                />
                <TableShell label={t.title}>
                    <table className="pw-stacked-table w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-100 dark:border-neutral-800">
                                <SortableColumn columnKey="customer" sort={sort} onSort={toggle} label={t.customer} align="left" className="pb-3" />
                                <SortableColumn columnKey="agent" sort={sort} onSort={toggle} label={t.agent} align="left" className="pb-3" />
                                <SortableColumn columnKey="lob" sort={sort} onSort={toggle} label={t.lob} align="left" className="pb-3" />
                                <SortableColumn columnKey="status" sort={sort} onSort={toggle} label={t.status} align="left" className="pb-3" />
                                <SortableColumn columnKey="value" sort={sort} onSort={toggle} label={t.value} align="right" className="pb-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPipeline.map((item) => (
                                <tr key={item.id} className="border-b border-neutral-50 dark:border-neutral-800/50">
                                    <td data-label={t.customer} className="py-3 font-bold text-foreground">{item.customerName}</td>
                                    <td data-label={t.agent} className="py-3">
                                        <div className="flex items-center gap-2">
                                            {item.agentPhoto ? (
                                                <img src={item.agentPhoto} alt="" className="w-6 h-6 rounded-lg object-cover" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-kicker font-black text-neutral-500 dark:text-neutral-400">
                                                    {item.agentName.charAt(0)}
                                                </div>
                                            )}
                                            <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.agentName}</span>
                                        </div>
                                    </td>
                                    <td data-label={t.lob} className="py-3 text-neutral-500 dark:text-neutral-400 capitalize">{(item.lineOfBusiness || "—").replace(/_/g, " ")}</td>
                                    <td data-label={t.status} className="py-3">
                                        <span className={`text-kicker font-black uppercase tracking-widest px-2 py-1 rounded-full ${statusColor[item.status] || statusColor.open}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td data-label={t.value} className="py-3 text-right font-bold text-foreground">
                                        {item.estimatedPremium ? fmt(item.wonPremium || item.estimatedPremium) : "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableShell>
                </>
            )}
        </div>
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
        <div className="pw-page-shell min-h-screen">
            <div className="max-w-lg mx-auto px-4 py-16">
                <div className="pw-card pw-pad-roomy text-center">
                    <div className="w-16 h-16 rounded-2xl bg-primary-soft dark:bg-primary/15 flex items-center justify-center mx-auto mb-6">
                        <Building2 className="w-8 h-8 text-primary dark:text-mint" />
                    </div>
                    <h2 className="text-2xl font-black text-foreground mb-2">
                        {t.noTeam}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                        {t.noTeamDesc}
                    </p>

                    <div className="space-y-3 text-left">
                        <div>
                            <label className="block text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">{t.agencyName} *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="pw-input"
                                placeholder="Ασφαλιστικό Πρακτορείο..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="team-phone" className="block text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">{t.phone}</label>
                                <input
                                    id="team-phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="pw-input"
                                />
                            </div>
                            <div>
                                <label htmlFor="team-taxId" className="block text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">{t.taxId}</label>
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
                            <label htmlFor="team-website" className="block text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">{t.website}</label>
                            <input
                                    id="team-website"
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="pw-input"
                            />
                        </div>
                        <div>
                            <label htmlFor="team-address" className="block text-kicker font-black text-neutral-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">{t.address}</label>
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
                        <p className="mt-4 text-xs text-red-700 dark:text-red-300 font-bold flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {error}
                        </p>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={loading || !name.trim()}
                        className="mt-6 w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-6 py-4 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? "..." : t.createAgency}
                    </button>
                </div>
            </div>
        </div>
    )
}
