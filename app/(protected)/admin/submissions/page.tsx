export const runtime = 'nodejs'

import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

type SearchParams = Promise<{ type?: string }>

const FILTERS = [
    { key: "all", label: "Όλα" },
    { key: "contact", label: "Επικοινωνία" },
    { key: "newsletter", label: "Newsletter" },
] as const

function formatDate(value: Date) {
    return new Intl.DateTimeFormat("el-GR", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value)
}

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: SearchParams }) {
    const { dbUser } = await getAuthenticatedUser()

    if (!dbUser.roles.includes("admin")) {
        redirect("/wallet")
    }

    const { type } = await searchParams
    const activeFilter = type === "contact" || type === "newsletter" ? type : "all"

    const submissions = await db.formSubmission.findMany({
        where: activeFilter === "all" ? undefined : { formType: activeFilter },
        orderBy: { createdAt: "desc" },
        take: 200,
    })

    const unsentCount = submissions.filter((submission) => !submission.emailSent).length

    return (
        <div className="p-6 md:p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">Υποβολές φορμών</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Κάθε υποβολή αποθηκεύεται εδώ πριν σταλεί οποιοδήποτε email, οπότε τίποτα δεν χάνεται αν αποτύχει το
                    Brevo.
                </p>
            </div>

            {unsentCount > 0 ? (
                <div className="mb-6 rounded-xl border border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
                    {unsentCount} υποβολές αποθηκεύτηκαν αλλά η ειδοποίηση email δεν στάλθηκε. Ελέγξτε το{" "}
                    <code className="font-mono">ADMIN_NOTIFICATION_EMAIL</code> και το{" "}
                    <code className="font-mono">BREVO_API_KEY</code>.
                </div>
            ) : null}

            <div className="mb-4 flex gap-2">
                {FILTERS.map((filter) => (
                    <a
                        key={filter.key}
                        href={filter.key === "all" ? "/admin/submissions" : `/admin/submissions?type=${filter.key}`}
                        className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                            activeFilter === filter.key
                                ? "border-transparent bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        {filter.label}
                    </a>
                ))}
            </div>

            {submissions.length === 0 ? (
                <div className="rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">
                    Καμία υποβολή ακόμη.
                </div>
            ) : (
                <div className="space-y-3">
                    {submissions.map((submission) => (
                        <div key={submission.id} className="rounded-2xl border border-border bg-card p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                                    {submission.formType === "contact" ? "Επικοινωνία" : "Newsletter"}
                                </span>
                                <a
                                    href={`mailto:${submission.email}`}
                                    className="text-sm font-medium text-foreground underline-offset-2 hover:underline"
                                >
                                    {submission.email}
                                </a>
                                {submission.name ? (
                                    <span className="text-sm text-muted-foreground">· {submission.name}</span>
                                ) : null}
                                {submission.phone ? (
                                    <span className="text-sm text-muted-foreground">· {submission.phone}</span>
                                ) : null}
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {formatDate(submission.createdAt)}
                                </span>
                                {!submission.emailSent ? (
                                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:text-amber-200">
                                        Δεν στάλθηκε ειδοποίηση
                                    </span>
                                ) : null}
                            </div>

                            {submission.subject ? (
                                <p className="mt-3 text-sm font-medium text-foreground">{submission.subject}</p>
                            ) : null}
                            {submission.message ? (
                                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                    {submission.message}
                                </p>
                            ) : null}
                            {submission.source ? (
                                <p className="mt-2 text-xs text-muted-foreground">Πηγή: {submission.source}</p>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
