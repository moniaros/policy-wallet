"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ChipToggle } from "@/components/ui/form/ChipToggle"
import { ACTIVITY_LABELS, HIGH_RISK_ACTIVITIES } from "@/lib/services/gap-engine/life-context"
import {
    Baby,
    Briefcase,
    Building2,
    Car,
    Heart,
    Home,
    Info,
    PawPrint,
    Plane,
    Plus,
    ShieldCheck,
    Trash2,
    User,
    X,
} from "lucide-react"

interface RiskProfileWizardProps {
    initialData?: {
        maritalStatus?: string | null
        dependentsCount?: number
        employmentStatus?: string | null
        ownsHome?: boolean
        mortgageAmount?: number | null
        hasPets?: boolean
        vehiclesCount?: number
        annualIncome?: number | null
        occupation?: string | null
        travelsFrequently?: boolean
        hasLoans?: boolean
        loanAmount?: number | null
        smokingStatus?: string | null
        lifeEvents?: Array<{ type: string; date: string }>
        // Health & Lifestyle
        gender?: string | null
        heightCm?: number | null
        weightKg?: number | null
        chronicConditions?: string[] | null
        familyMedicalHistory?: string[] | null
        drivingRecord?: string | null
        activityLevel?: string | null
        // Life Context factors
        childrenCount?: number
        residenceType?: string | null
        propertiesOwned?: number | null
        rentsOutProperty?: boolean
        ownsBoat?: boolean
        ownsBusiness?: boolean
        businessEmployees?: number
        savingsAmount?: number | null
        valuablesValue?: number | null
        activities?: string[] | null
        cyberExposure?: string | null
        retirementPlanning?: boolean
        isBuildingManager?: boolean
    }
    language?: "en" | "el"
}

const LIFE_EVENT_TYPES = [
    { value: "new_baby", label: { en: "New baby", el: "Νέο μωρό" }, icon: Baby },
    { value: "marriage", label: { en: "Marriage", el: "Γάμος" }, icon: Heart },
    { value: "home_purchase", label: { en: "Home purchase", el: "Αγορά κατοικίας" }, icon: Home },
    { value: "new_job", label: { en: "New job", el: "Νέα εργασία" }, icon: Briefcase },
    { value: "retirement", label: { en: "Retirement", el: "Συνταξιοδότηση" }, icon: User },
    { value: "new_vehicle", label: { en: "New vehicle", el: "Νέο όχημα" }, icon: Car },
]

/**
 * Field key -> the label the wizard shows for it, so a rejected field can be
 * named in the reader's language rather than as a schema key.
 */
const FIELD_LABELS: Record<string, { el: string; en: string }> = {
    dependentsCount: { el: "Εξαρτώμενα μέλη", en: "Dependants" },
    mortgageAmount: { el: "Υπόλοιπο στεγαστικού", en: "Mortgage amount" },
    vehiclesCount: { el: "Οχήματα", en: "Vehicles" },
    dateOfBirth: { el: "Ημερομηνία γέννησης", en: "Date of birth" },
    annualIncome: { el: "Ετήσιο εισόδημα", en: "Annual income" },
    occupation: { el: "Επάγγελμα", en: "Occupation" },
    loanAmount: { el: "Ύψος δανείων", en: "Loan amount" },
    lifeEvents: { el: "Γεγονότα ζωής", en: "Life events" },
    heightCm: { el: "Ύψος", en: "Height" },
    weightKg: { el: "Βάρος", en: "Weight" },
    chronicConditions: { el: "Χρόνιες παθήσεις", en: "Chronic conditions" },
    familyMedicalHistory: { el: "Οικογενειακό ιστορικό", en: "Family history" },
    childrenCount: { el: "Παιδιά", en: "Children" },
    residenceType: { el: "Κατοικία", en: "Residence" },
    ownsBoat: { el: "Σκάφος", en: "Boat" },
    propertiesOwned: { el: "Ακίνητα", en: "Properties owned" },
    businessEmployees: { el: "Εργαζόμενοι", en: "Employees" },
    savingsAmount: { el: "Αποταμιεύσεις", en: "Savings" },
    valuablesValue: { el: "Τιμαλφή", en: "Valuables" },
    activities: { el: "Δραστηριότητες", en: "Activities" },
    cyberExposure: { el: "Διαδικτυακή έκθεση", en: "Online exposure" },
    coverHeldElsewhere: { el: "Καλύψεις εκτός PolicyWallet", en: "Cover held elsewhere" },
    isBuildingManager: { el: "Διαχειριστής πολυκατοικίας", en: "Building manager" },
    // Bookkeeping rather than a question, but it is schema-constrained and a
    // rejection has to name something the reader can act on rather than a key.
    answeredFields: { el: "Απαντημένα πεδία", en: "Answered fields" },
}

/** High-risk pursuits that change accident and liability exposure. */
// Ids and labels both come from the engine, so intake and every server-side
// reader (the risk graph names the activity producing an injury risk) cannot
// drift apart — and adding an activity is one edit, not two.
const ACTIVITY_OPTIONS = HIGH_RISK_ACTIVITIES.map((value) => ({
    value,
    el: ACTIVITY_LABELS[value].el,
    en: ACTIVITY_LABELS[value].en,
}))

/**
 * Controls whose state is DEFINITE the moment they are rendered.
 *
 * A checkbox is either ticked or not — leaving it alone is a real answer ("no
 * pets"), and it writes `false`, the same value the column defaults to. So these
 * must be reported as answered or the engine can never tell a deliberate "no"
 * from silence, and the risk sits in `needs_review` however carefully the form
 * was filled in.
 *
 * Selects, text and number inputs are deliberately NOT here. They have an empty
 * state, and rendering one is not the same as answering it.
 */
const DEFINITE_WIZARD_FIELDS = [
    "ownsHome", "rentsOutProperty", "ownsBoat", "ownsBusiness", "hasLoans",
    "hasPets", "travelsFrequently", "retirementPlanning", "isBuildingManager",
    // Multi-selects: an empty list is the answer "none of these".
    "activities", "chronicConditions", "familyMedicalHistory",
]

/**
 * What the customer has actually answered.
 *
 * Reporting every RENDERED field as answered was wrong in exactly the way the
 * engine exists to avoid. Leaving the residence select on "Επιλέξτε…" marked
 * `residence` as known-with-no-value, and both property risks then resolved to
 * `not_applicable` — the engine stating that this person owns no home and rents
 * nowhere, on the strength of a question they had skipped. Skipped means
 * `needs_review`, which is the whole point of tracking knownness.
 */
export function answeredFieldsFrom(values: Record<string, unknown>): string[] {
    const answered = [...DEFINITE_WIZARD_FIELDS]
    for (const [field, value] of Object.entries(values)) {
        if (value === "" || value === null || value === undefined) continue
        answered.push(field)
    }
    return [...new Set(answered)]
}

export function RiskProfileWizard({ initialData, language = "el" }: RiskProfileWizardProps) {
    const fieldLabel = (key: string) =>
        FIELD_LABELS[key]?.[language === "el" ? "el" : "en"] ?? key
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const lang = language

    const t = (el: string, en: string) => (lang === "el" ? el : en)

    // Form state
    const [maritalStatus, setMaritalStatus] = useState(initialData?.maritalStatus || "single")
    const [dependentsCount, setDependentsCount] = useState<number | "">(initialData?.dependentsCount ?? "")
    const [employmentStatus, setEmploymentStatus] = useState(initialData?.employmentStatus || "employed")
    const [ownsHome, setOwnsHome] = useState(initialData?.ownsHome ?? false)
    const [mortgageAmount, setMortgageAmount] = useState<number | "">(
        initialData?.mortgageAmount ? Number(initialData.mortgageAmount) : ""
    )
    const [hasPets, setHasPets] = useState(initialData?.hasPets ?? false)
    const [vehiclesCount, setVehiclesCount] = useState<number | "">(initialData?.vehiclesCount ?? "")
    const [annualIncome, setAnnualIncome] = useState<number | "">(
        initialData?.annualIncome ? Number(initialData.annualIncome) : ""
    )
    const [occupation, setOccupation] = useState(initialData?.occupation || "")
    const [travelsFrequently, setTravelsFrequently] = useState(initialData?.travelsFrequently ?? false)
    const [hasLoans, setHasLoans] = useState(initialData?.hasLoans ?? false)
    const [loanAmount, setLoanAmount] = useState<number | "">(
        initialData?.loanAmount ? Number(initialData.loanAmount) : ""
    )
    const [smokingStatus, setSmokingStatus] = useState(initialData?.smokingStatus || "")
    const [lifeEvents, setLifeEvents] = useState<Array<{ type: string; date: string }>>(
        initialData?.lifeEvents || []
    )
    const [showAddEvent, setShowAddEvent] = useState(false)
    const [newEventType, setNewEventType] = useState("")
    const [newEventDate, setNewEventDate] = useState("")

    // Health & Lifestyle state
    const [gender, setGender] = useState(initialData?.gender || "")
    const [heightCm, setHeightCm] = useState<number | "">(initialData?.heightCm ?? "")
    const [weightKg, setWeightKg] = useState<number | "">(initialData?.weightKg ?? "")
    const [chronicConditions, setChronicConditions] = useState<string[]>(
        initialData?.chronicConditions ?? []
    )
    const [familyMedicalHistory, setFamilyMedicalHistory] = useState<string[]>(
        initialData?.familyMedicalHistory ?? []
    )
    const [drivingRecord, setDrivingRecord] = useState(initialData?.drivingRecord || "")
    const [activityLevel, setActivityLevel] = useState(initialData?.activityLevel || "")

    // Life Context factors.
    // NOTE the defaults: "" and false, never a guessed value. `maritalStatus`
    // and `employmentStatus` above default to "single"/"employed", so a reader
    // who never touched either select still had both written as declarations —
    // and "employed" alone was enough to make a whole score category apply.
    const [childrenCount, setChildrenCount] = useState<number | "">(initialData?.childrenCount ?? "")
    const [residenceType, setResidenceType] = useState(initialData?.residenceType || "")
    const [propertiesOwned, setPropertiesOwned] = useState<number | "">(initialData?.propertiesOwned ?? "")
    const [rentsOutProperty, setRentsOutProperty] = useState(initialData?.rentsOutProperty ?? false)
    const [ownsBoat, setOwnsBoat] = useState(initialData?.ownsBoat ?? false)
    const [ownsBusiness, setOwnsBusiness] = useState(initialData?.ownsBusiness ?? false)
    const [businessEmployees, setBusinessEmployees] = useState<number | "">(initialData?.businessEmployees ?? "")
    const [savingsAmount, setSavingsAmount] = useState<number | "">(
        initialData?.savingsAmount ? Number(initialData.savingsAmount) : ""
    )
    const [valuablesValue, setValuablesValue] = useState<number | "">(
        initialData?.valuablesValue ? Number(initialData.valuablesValue) : ""
    )
    const [activities, setActivities] = useState<string[]>(initialData?.activities ?? [])
    const [cyberExposure, setCyberExposure] = useState(initialData?.cyberExposure || "")
    const [retirementPlanning, setRetirementPlanning] = useState(initialData?.retirementPlanning ?? false)
    const [isBuildingManager, setIsBuildingManager] = useState(initialData?.isBuildingManager ?? false)

    function toggleActivity(value: string) {
        setActivities((prev) =>
            prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
        )
    }

    function addLifeEvent() {
        if (!newEventType || !newEventDate) return
        setLifeEvents((prev) => [...prev, { type: newEventType, date: newEventDate }])
        setNewEventType("")
        setNewEventDate("")
        setShowAddEvent(false)
    }

    function removeLifeEvent(index: number) {
        setLifeEvents((prev) => prev.filter((_, i) => i !== index))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch("/api/v1/risk-profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    maritalStatus,
                    dependentsCount: dependentsCount === "" ? 0 : Number(dependentsCount),
                    employmentStatus,
                    ownsHome,
                    mortgageAmount: mortgageAmount === "" ? undefined : Number(mortgageAmount),
                    hasPets,
                    vehiclesCount: vehiclesCount === "" ? 0 : Number(vehiclesCount),
                    annualIncome: annualIncome === "" ? undefined : Number(annualIncome),
                    occupation: occupation || undefined,
                    travelsFrequently,
                    hasLoans,
                    loanAmount: loanAmount === "" ? undefined : Number(loanAmount),
                    smokingStatus: smokingStatus || undefined,
                    lifeEvents: lifeEvents.length > 0 ? lifeEvents : undefined,
                    gender: gender || undefined,
                    heightCm: heightCm === "" ? undefined : Number(heightCm),
                    weightKg: weightKg === "" ? undefined : Number(weightKg),
                    chronicConditions,
                    familyMedicalHistory,
                    drivingRecord: drivingRecord || undefined,
                    activityLevel: activityLevel || undefined,
                    // Life Context factors
                    childrenCount: childrenCount === "" ? 0 : Number(childrenCount),
                    residenceType: residenceType || undefined,
                    propertiesOwned: propertiesOwned === "" ? undefined : Number(propertiesOwned),
                    rentsOutProperty,
                    ownsBoat,
                    ownsBusiness,
                    businessEmployees: businessEmployees === "" ? 0 : Number(businessEmployees),
                    savingsAmount: savingsAmount === "" ? undefined : Number(savingsAmount),
                    valuablesValue: valuablesValue === "" ? undefined : Number(valuablesValue),
                    activities,
                    cyberExposure: cyberExposure || undefined,
                    retirementPlanning,
                    isBuildingManager,
                    // Only what they actually answered. A skipped select stays
                    // unknown rather than becoming a declaration of "none".
                    answeredFields: answeredFieldsFrom({
                        maritalStatus, dependentsCount, childrenCount, employmentStatus,
                        occupation, annualIncome, savingsAmount, residenceType,
                        propertiesOwned, mortgageAmount, loanAmount, vehiclesCount,
                        businessEmployees, valuablesValue, cyberExposure,
                        gender, heightCm, weightKg, drivingRecord, activityLevel,
                        smokingStatus,
                    }),
                }),
            })

            if (!response.ok) {
                // The route validates with Zod and returns `parsed.error.issues`
                // — field-level detail. Discarding it left the reader with
                // "Failed to save" on a twenty-field form spanning several steps,
                // with no way to know WHICH field was rejected. Height out of
                // range and a malformed life-event date looked identical, and the
                // only recourse was to guess or abandon — abandoning the health
                // data they had just entered.
                const body = await response.json().catch(() => null)
                const issues = Array.isArray(body?.error?.details) ? body.error.details : []
                const fields = [
                    ...new Set(
                        issues
                            .map((i: { path?: unknown[] }) => String(i?.path?.[0] ?? ""))
                            .filter(Boolean)
                            .map((f: string) => fieldLabel(f))
                    ),
                ]
                toast.error(
                    fields.length > 0
                        ? t(
                              `Ελέγξτε: ${fields.join(", ")}`,
                              `Check: ${fields.join(", ")}`
                          )
                        : t("Αποτυχία αποθήκευσης", "Failed to save")
                )
                return
            }

            toast.success(t("Το προφίλ ενημερώθηκε", "Profile updated"))
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error(t("Αποτυχία αποθήκευσης", "Failed to save"))
        } finally {
            setLoading(false)
        }
    }

    // Every field in the wizard shares this. It carried no dark variant, so in
    // dark mode the surface flipped to near-black while the text stayed black —
    // 1.1:1, i.e. the user could not see what they were typing, on the flow that
    // feeds the whole gap engine.
    const inputClass = "pw-input pw-input-sm mt-1 block border-black/10 bg-black/[0.03] text-black dark:border-white/15 dark:bg-white/5 dark:text-white"
    const checkboxClass =
        "rounded border-black/20 dark:border-white/25 text-primary focus:ring-primary"
    const labelClass = "block text-sm font-medium text-black/75 dark:text-white/75"

    return (
        <div className="pw-card pw-pad">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft dark:bg-primary/15">
                    <ShieldCheck className="h-5 w-5 text-primary dark:text-mint" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        {t("Προφίλ κινδύνου", "Risk Profile")}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {t(
                            "Βοηθήστε μας να κατανοήσουμε τις ανάγκες σας για καλύτερη ανίχνευση κενών.",
                            "Help us understand your needs for better gap detection."
                        )}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row 1: Personal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="maritalStatus" className={labelClass}>
                            {t("Οικογενειακή κατάσταση", "Marital status")}
                        </label>
                        <select id="maritalStatus" value={maritalStatus} onChange={(e) => setMaritalStatus(e.target.value)} className={inputClass}>
                            <option value="single">{t("Ανύπαντρος/η", "Single")}</option>
                            <option value="married">{t("Παντρεμένος/η", "Married")}</option>
                            <option value="divorced">{t("Διαζευγμένος/η", "Divorced")}</option>
                            <option value="widowed">{t("Χήρος/α", "Widowed")}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="riskprofilewizard-f1" className={labelClass}>
                            {t("Εξαρτώμενα μέλη", "Dependents")}
                        </label>
                        <input id="riskprofilewizard-f1" type="number" min="0" max="20" value={dependentsCount} onChange={(e) => setDependentsCount(e.target.value as any)} className={inputClass} placeholder="0" />
                    </div>
                </div>

                {/* Row 2: Employment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="employmentStatus" className={labelClass}>
                            {t("Κατάσταση απασχόλησης", "Employment status")}
                        </label>
                        <select id="employmentStatus" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} className={inputClass}>
                            <option value="employed">{t("Μισθωτός", "Employed")}</option>
                            <option value="self_employed">{t("Ελεύθερος επαγγελματίας", "Self-employed")}</option>
                            <option value="retired">{t("Συνταξιούχος", "Retired")}</option>
                            <option value="unemployed">{t("Άνεργος", "Unemployed")}</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="riskprofilewizard-f2" className={labelClass}>
                            {t("Επάγγελμα", "Occupation")}
                        </label>
                        <input id="riskprofilewizard-f2" type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClass} placeholder={t("π.χ. μηχανικός", "e.g. Engineer")} />
                    </div>
                </div>

                {/* Row 3: Financial */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="riskprofilewizard-f3" className={labelClass}>
                            {t("Ετήσιο εισόδημα (€)", "Annual income (€)")}
                        </label>
                        <input id="riskprofilewizard-f3" type="number" min="0" value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value as any)} className={inputClass} placeholder="30000" />
                    </div>
                    <div>
                        <label htmlFor="smokingStatus" className={labelClass}>
                            {t("Κάπνισμα", "Smoking status")}
                        </label>
                        <select id="smokingStatus" value={smokingStatus} onChange={(e) => setSmokingStatus(e.target.value)} className={inputClass}>
                            <option value="">{t("Επιλέξτε...", "Select...")}</option>
                            <option value="non_smoker">{t("Μη καπνιστής", "Non-smoker")}</option>
                            <option value="smoker">{t("Καπνιστής", "Smoker")}</option>
                            <option value="former_smoker">{t("Πρώην καπνιστής", "Former smoker")}</option>
                        </select>
                    </div>
                </div>

                {/* Row 4: Health & Lifestyle */}
                <div className="pt-3 border-t border-black/8 dark:border-white/10">
                    <p className="text-xs font-semibold text-black/60 dark:text-white/50 uppercase tracking-widest mb-3">
                        {t("Υγεία & Τρόπος ζωής", "Health & Lifestyle")}
                    </p>

                    {/* Special-category (health) data — GDPR Art. 9. The wizard
                        collected chronic conditions and family history with no
                        purpose statement or optionality at the point of
                        collection. This states why we ask, that it is optional,
                        and that it is used only to tailor coverage suggestions. */}
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 dark:border-primary/25 dark:bg-primary/10">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-mint" aria-hidden="true" />
                        <p className="text-caption leading-relaxed text-black/70 dark:text-white/70">
                            {t(
                                "Τα στοιχεία υγείας είναι προαιρετικά. Τα χρησιμοποιούμε μόνο για να προσαρμόσουμε τις προτάσεις κάλυψης υγείας και ζωής στις ανάγκες σας — δεν κοινοποιούνται σε ασφαλιστές χωρίς τη ρητή συγκατάθεσή σας. Μπορείτε να τα αφήσετε κενά ή να τα διαγράψετε αργότερα.",
                                "Health details are optional. We use them only to tailor health and life coverage suggestions to your needs — they are not shared with insurers without your explicit consent. You can leave them blank or remove them later."
                            )}
                        </p>
                    </div>

                    {/* Gender + Activity level */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="gender" className={labelClass}>
                                {t("Φύλο", "Gender")}
                            </label>
                            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
                                <option value="">{t("Επιλέξτε...", "Select...")}</option>
                                <option value="male">{t("Άνδρας", "Male")}</option>
                                <option value="female">{t("Γυναίκα", "Female")}</option>
                                <option value="prefer_not_to_say">{t("Προτιμώ να μην αναφέρω", "Prefer not to say")}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="activityLevel" className={labelClass}>
                                {t("Επίπεδο δραστηριότητας", "Activity level")}
                            </label>
                            <select id="activityLevel" value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className={inputClass}>
                                <option value="">{t("Επιλέξτε...", "Select...")}</option>
                                <option value="sedentary">{t("Καθιστικός", "Sedentary")}</option>
                                <option value="moderate">{t("Μέτρια ενεργός", "Moderately active")}</option>
                                <option value="active">{t("Ενεργός", "Active")}</option>
                                <option value="very_active">{t("Πολύ ενεργός", "Very active")}</option>
                            </select>
                        </div>
                    </div>

                    {/* Height + Weight */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="riskprofilewizard-f4" className={labelClass}>{t("Ύψος (cm)", "Height (cm)")}</label>
                            <input id="riskprofilewizard-f4"
                                type="number" min="50" max="250"
                                value={heightCm}
                                onChange={(e) => setHeightCm(e.target.value as any)}
                                className={inputClass}
                                placeholder="170"
                            />
                        </div>
                        <div>
                            <label htmlFor="riskprofilewizard-f5" className={labelClass}>{t("Βάρος (kg)", "Weight (kg)")}</label>
                            <input id="riskprofilewizard-f5"
                                type="number" min="20" max="500"
                                value={weightKg}
                                onChange={(e) => setWeightKg(e.target.value as any)}
                                className={inputClass}
                                placeholder="75"
                            />
                            {heightCm !== "" && weightKg !== "" && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    {t("ΔΜΣ", "BMI")}: {(Number(weightKg) / ((Number(heightCm) / 100) ** 2)).toFixed(1)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Chronic conditions */}
                    <div className="mb-4">
                        <label className={labelClass + " mb-1.5 block"}>
                            {t("Χρόνιες παθήσεις", "Chronic conditions")}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: "diabetes", en: "Diabetes", el: "Διαβήτης" },
                                { value: "hypertension", en: "Hypertension", el: "Υπέρταση" },
                                { value: "heart_disease", en: "Heart disease", el: "Καρδιοπάθεια" },
                                { value: "asthma", en: "Asthma", el: "Άσθμα" },
                                { value: "cancer", en: "Cancer", el: "Καρκίνος" },
                                { value: "mental_health", en: "Mental health condition", el: "Ψυχική διαταραχή" },
                                { value: "musculoskeletal", en: "Musculoskeletal", el: "Μυοσκελετικά" },
                            ].map((c) => {
                                const checked = chronicConditions.includes(c.value)
                                return (
                                    <ChipToggle
                                        key={c.value}
                                        label={lang === "el" ? c.el : c.en}
                                        checked={checked}
                                        accent="primary"
                                        onChange={(next) => setChronicConditions(
                                            next ? [...chronicConditions, c.value] : chronicConditions.filter((x) => x !== c.value)
                                        )}
                                    />
                                )
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                            {t("Επιλέξτε όλα όσα ισχύουν. Αφήστε κενό εάν δεν υπάρχουν.", "Select all that apply. Leave blank if none.")}
                        </p>
                    </div>

                    {/* Family medical history */}
                    <div className="mb-4">
                        <label className={labelClass + " mb-1.5 block"}>
                            {t("Οικογενειακό ιατρικό ιστορικό", "Family medical history")}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { value: "heart_disease", en: "Heart disease", el: "Καρδιοπάθεια" },
                                { value: "cancer", en: "Cancer", el: "Καρκίνος" },
                                { value: "diabetes", en: "Diabetes", el: "Διαβήτης" },
                                { value: "stroke", en: "Stroke", el: "Εγκεφαλικό" },
                                { value: "hypertension", en: "Hypertension", el: "Υπέρταση" },
                                { value: "mental_illness", en: "Mental illness", el: "Ψυχική ασθένεια" },
                            ].map((c) => {
                                const checked = familyMedicalHistory.includes(c.value)
                                return (
                                    <ChipToggle
                                        key={c.value}
                                        label={lang === "el" ? c.el : c.en}
                                        checked={checked}
                                        accent="warning"
                                        onChange={(next) => setFamilyMedicalHistory(
                                            next ? [...familyMedicalHistory, c.value] : familyMedicalHistory.filter((x) => x !== c.value)
                                        )}
                                    />
                                )
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                            {t("Κληρονομικές παθήσεις σε γονείς ή αδέλφια.", "Hereditary conditions in parents or siblings.")}
                        </p>
                    </div>

                    {/* Driving record — only show if they have vehicles */}
                    {(vehiclesCount !== "" && Number(vehiclesCount) > 0) && (
                        <div>
                            <label htmlFor="drivingRecord" className={labelClass}>
                                {t("Οδηγικό ιστορικό", "Driving record")}
                            </label>
                            <select id="drivingRecord" value={drivingRecord} onChange={(e) => setDrivingRecord(e.target.value)} className={inputClass}>
                                <option value="">{t("Επιλέξτε...", "Select...")}</option>
                                <option value="clean">{t("Καθαρό ιστορικό", "Clean record")}</option>
                                <option value="minor_violations">{t("Μικρές παραβάσεις", "Minor violations")}</option>
                                <option value="major_violations">{t("Σοβαρές παραβάσεις", "Major violations")}</option>
                                <option value="accidents">{t("Ατυχήματα", "Accidents")}</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Row 5: Property & Assets */}
                <div className="space-y-3">
                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={ownsHome} onChange={(e) => setOwnsHome(e.target.checked)} className={checkboxClass} />
                            <Home className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Ιδιόκτητη κατοικία", "Own a home")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} className={checkboxClass} />
                            <PawPrint className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Κατοικίδια", "Have pets")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={travelsFrequently} onChange={(e) => setTravelsFrequently(e.target.checked)} className={checkboxClass} />
                            <Plane className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Ταξιδεύω συχνά", "Travel frequently")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasLoans} onChange={(e) => setHasLoans(e.target.checked)} className={checkboxClass} />
                            <Briefcase className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Δάνεια", "Have loans")}</span>
                        </label>
                        {/* The διαχειριστής role carries personal liability for the
                            common areas and is not implied by owning the flat — it
                            falls to tenants just as readily. */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={isBuildingManager} onChange={(e) => setIsBuildingManager(e.target.checked)} className={checkboxClass} />
                            <Building2 className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Διαχειριστής πολυκατοικίας", "Manager of a block of flats")}</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="riskprofilewizard-f6" className={labelClass}>{t("Αριθμός οχημάτων", "Vehicles")}</label>
                            <input id="riskprofilewizard-f6" type="number" min="0" max="10" value={vehiclesCount} onChange={(e) => setVehiclesCount(e.target.value as any)} className={inputClass} placeholder="0" />
                        </div>
                        {ownsHome && (
                            <div>
                                <label htmlFor="riskprofilewizard-f7" className={labelClass}>{t("Στεγαστικό δάνειο (€)", "Mortgage (€)")}</label>
                                <input id="riskprofilewizard-f7" type="number" min="0" value={mortgageAmount} onChange={(e) => setMortgageAmount(e.target.value as any)} className={inputClass} placeholder="0" />
                            </div>
                        )}
                        {hasLoans && (
                            <div>
                                <label htmlFor="riskprofilewizard-f8" className={labelClass}>{t("Ποσό δανείων (€)", "Loan amount (€)")}</label>
                                <input id="riskprofilewizard-f8" type="number" min="0" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value as any)} className={inputClass} placeholder="0" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 5b: Life Context — household, work and lifestyle.
                    Single column by default and two from `sm`, matching the rest
                    of the form; the dependent inputs only render once the
                    question above them is answered "yes", so a reader who owns no
                    business never sees an employee count. */}
                <div className="space-y-3">
                    <p className="text-kicker font-bold uppercase tracking-widest text-black/60 dark:text-white/55">
                        {t("Η κατάστασή σας", "Your situation")}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="residenceType" className={labelClass}>{t("Η κατοικία σας είναι", "Your home is")}</label>
                            <select id="residenceType" value={residenceType} onChange={(e) => setResidenceType(e.target.value)} className={inputClass}>
                                <option value="">{t("Επιλέξτε…", "Select…")}</option>
                                <option value="owned">{t("Ιδιόκτητη", "Owned by you")}</option>
                                <option value="rented">{t("Ενοικιαζόμενη", "Rented")}</option>
                                <option value="family">{t("Οικογενειακή", "Family-owned")}</option>
                                <option value="company">{t("Παρέχεται από εργοδότη", "Provided by employer")}</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="riskprofilewizard-children" className={labelClass}>{t("Παιδιά", "Children")}</label>
                            <input id="riskprofilewizard-children" type="number" min="0" max="20" value={childrenCount} onChange={(e) => setChildrenCount(e.target.value as any)} className={inputClass} placeholder="0" />
                        </div>
                        {residenceType === "owned" && (
                            <div>
                                <label htmlFor="riskprofilewizard-properties" className={labelClass}>{t("Ακίνητα που σας ανήκουν", "Properties you own")}</label>
                                <input id="riskprofilewizard-properties" type="number" min="0" max="100" value={propertiesOwned} onChange={(e) => setPropertiesOwned(e.target.value as any)} className={inputClass} placeholder="1" />
                            </div>
                        )}
                        <div>
                            <label htmlFor="riskprofilewizard-savings" className={labelClass}>{t("Αποταμιεύσεις (€)", "Savings (€)")}</label>
                            <input id="riskprofilewizard-savings" type="number" min="0" value={savingsAmount} onChange={(e) => setSavingsAmount(e.target.value as any)} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                            <label htmlFor="riskprofilewizard-valuables" className={labelClass}>{t("Αξία τιμαλφών (€)", "Valuables (€)")}</label>
                            <input id="riskprofilewizard-valuables" type="number" min="0" value={valuablesValue} onChange={(e) => setValuablesValue(e.target.value as any)} className={inputClass} placeholder="0" />
                        </div>
                        <div>
                            <label htmlFor="cyberExposure" className={labelClass}>{t("Διαδικτυακές συναλλαγές", "Online financial activity")}</label>
                            <select id="cyberExposure" value={cyberExposure} onChange={(e) => setCyberExposure(e.target.value)} className={inputClass}>
                                <option value="">{t("Επιλέξτε…", "Select…")}</option>
                                <option value="low">{t("Ελάχιστες", "Minimal")}</option>
                                <option value="moderate">{t("Τακτικές", "Regular")}</option>
                                <option value="high">{t("Εκτεταμένες", "Extensive")}</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={rentsOutProperty} onChange={(e) => setRentsOutProperty(e.target.checked)} className={checkboxClass} />
                            <Home className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Εκμισθώνω ακίνητο", "I let out property")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={ownsBoat} onChange={(e) => setOwnsBoat(e.target.checked)} className={checkboxClass} />
                            <Plane className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Έχω σκάφος", "I own a boat")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={ownsBusiness} onChange={(e) => setOwnsBusiness(e.target.checked)} className={checkboxClass} />
                            <Briefcase className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Έχω επιχείρηση", "I own a business")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={retirementPlanning} onChange={(e) => setRetirementPlanning(e.target.checked)} className={checkboxClass} />
                            <User className="h-4 w-4 text-black/60 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Έχω συνταξιοδοτικό πρόγραμμα", "I have a pension plan")}</span>
                        </label>
                    </div>

                    {ownsBusiness && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="riskprofilewizard-employees" className={labelClass}>{t("Άτομα που απασχολείτε", "People you employ")}</label>
                                <input id="riskprofilewizard-employees" type="number" min="0" value={businessEmployees} onChange={(e) => setBusinessEmployees(e.target.value as any)} className={inputClass} placeholder="0" />
                            </div>
                        </div>
                    )}

                    <fieldset>
                        <legend className={labelClass}>{t("Αθλήματα και δραστηριότητες", "Sports and activities")}</legend>
                        <p className="mb-2 text-caption text-muted-foreground">
                            {t(
                                "Πολλά ασφαλιστήρια ζωής και υγείας εξαιρούν τραυματισμούς από αυτές — γι' αυτό ρωτάμε.",
                                "Many life and health policies exclude injuries from these — that is why we ask."
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {ACTIVITY_OPTIONS.map((option) => {
                                const selected = activities.includes(option.value)
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => toggleActivity(option.value)}
                                        className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 text-caption font-medium transition-colors ${
                                            selected
                                                ? "border-primary bg-primary text-white dark:text-[#1A2420]"
                                                : "border-black/12 text-black/65 hover:bg-black/4 dark:border-white/15 dark:text-white/65 dark:hover:bg-white/6"
                                        }`}
                                    >
                                        {t(option.el, option.en)}
                                    </button>
                                )
                            })}
                        </div>
                    </fieldset>
                </div>

                {/* Life Events */}
                <div className="pt-3 border-t border-black/8 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                        <label className={labelClass}>
                            {t("Γεγονότα ζωής", "Life events")}
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowAddEvent(true)}
                            className="text-xs font-semibold text-primary dark:text-mint hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            <Plus className="inline-flex min-h-[24px] items-center h-3 w-3" />
                            {t("Προσθήκη", "Add event")}
                        </button>
                    </div>

                    {lifeEvents.length > 0 && (
                        <div className="space-y-2 mb-3">
                            {lifeEvents.map((event, i) => {
                                const eventType = LIFE_EVENT_TYPES.find((t) => t.value === event.type)
                                const Icon = eventType?.icon || User
                                return (
                                    <div key={i} className="flex items-center gap-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] p-2.5">
                                        <Icon className="h-4 w-4 text-primary dark:text-mint flex-shrink-0" />
                                        <span className="text-sm text-black dark:text-white flex-1">
                                            {eventType?.label[lang] || event.type}
                                        </span>
                                        <span className="text-xs text-black/60 dark:text-white/50">
                                            {event.date}
                                        </span>
                                        <button type="button" onClick={() => removeLifeEvent(i)} aria-label={t("Αφαίρεση γεγονότος", "Remove event")} className="text-red-400 hover:text-red-700 cursor-pointer">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {showAddEvent && (
                        <div className="flex items-end gap-2 mb-3 rounded-xl border border-primary/30 bg-primary-tint dark:bg-primary/15 p-3">
                            <div className="flex-1">
                                <label htmlFor="newEventType" className="text-xs text-black/60 dark:text-white/50">{t("Τύπος", "Type")}</label>
                                <select id="newEventType" value={newEventType} onChange={(e) => setNewEventType(e.target.value)} className={inputClass}>
                                    <option value="">{t("Επιλέξτε...", "Select...")}</option>
                                    {LIFE_EVENT_TYPES.map((et) => (
                                        <option key={et.value} value={et.value}>
                                            {et.label[lang]}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label htmlFor="newEventMonth" className="text-xs text-black/60 dark:text-white/50">{t("Ημερομηνία", "Date")}</label>
                                <div className="flex gap-1.5">
                                    <select
                                        id="newEventMonth"
                                        value={newEventDate ? newEventDate.split("-")[1] || "" : ""}
                                        onChange={(e) => {
                                            const year = newEventDate ? newEventDate.split("-")[0] : String(new Date().getFullYear())
                                            setNewEventDate(e.target.value ? `${year}-${e.target.value}` : "")
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="">{t("Μήνας", "Month")}</option>
                                        {Array.from({ length: 12 }, (_, i) => {
                                            const m = String(i + 1).padStart(2, "0")
                                            return <option key={m} value={m}>{new Date(2000, i).toLocaleString(lang === "el" ? "el" : "en", { month: "short" })}</option>
                                        })}
                                    </select>
                                    <select
                                        aria-label={t("Έτος", "Year")}
                                        value={newEventDate ? newEventDate.split("-")[0] || "" : ""}
                                        onChange={(e) => {
                                            const month = newEventDate ? newEventDate.split("-")[1] : "01"
                                            setNewEventDate(e.target.value ? `${e.target.value}-${month || "01"}` : "")
                                        }}
                                        className={inputClass}
                                    >
                                        <option value="">{t("Έτος", "Year")}</option>
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const y = String(new Date().getFullYear() - i)
                                            return <option key={y} value={y}>{y}</option>
                                        })}
                                    </select>
                                </div>
                            </div>
                            <button type="button" onClick={addLifeEvent} className="pw-primary-button">
                                {t("OK", "OK")}
                            </button>
                            <button type="button" onClick={() => setShowAddEvent(false)} aria-label={t("Ακύρωση", "Cancel")} className="p-2.5 text-muted-foreground hover:text-black dark:hover:text-white cursor-pointer">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {lifeEvents.length === 0 && !showAddEvent && (
                        <p className="text-xs text-muted-foreground">
                            {t(
                                "Προσθέστε σημαντικά γεγονότα ζωής για ακριβέστερη ανίχνευση κενών.",
                                "Add major life events for more accurate gap detection."
                            )}
                        </p>
                    )}
                </div>

                {/* Submit */}
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="pw-primary-button w-full"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        {loading
                            ? t("Αποθήκευση...", "Saving...")
                            : t("Αποθήκευση & Ανανέωση βαθμολογίας", "Save & Update Protection Score")}
                    </button>
                </div>
            </form>
        </div>
    )
}
