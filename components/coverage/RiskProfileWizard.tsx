"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
    Baby,
    Briefcase,
    Car,
    Heart,
    Home,
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

export function RiskProfileWizard({ initialData, language = "en" }: RiskProfileWizardProps) {
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
                }),
            })

            if (!response.ok) throw new Error("Failed to save profile")

            toast.success(t("Το προφίλ ενημερώθηκε", "Profile updated"))
            router.refresh()
        } catch (err) {
            console.error(err)
            toast.error(t("Αποτυχία αποθήκευσης", "Failed to save"))
        } finally {
            setLoading(false)
        }
    }

    const inputClass =
        "mt-1 block w-full rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.05] px-3 py-2.5 text-sm text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
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
                        {t("Προφίλ Κινδύνου", "Risk Profile")}
                    </h2>
                    <p className="text-xs text-black/55 dark:text-white/60">
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
                        <input id="riskprofilewizard-f2" type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} className={inputClass} placeholder={t("π.χ. Μηχανικός", "e.g. Engineer")} />
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
                    <p className="text-xs font-semibold text-black/50 dark:text-white/50 uppercase tracking-widest mb-3">
                        {t("Υγεία & Τρόπος Ζωής", "Health & Lifestyle")}
                    </p>

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
                                <p className="text-xs text-black/45 dark:text-white/45 mt-1">
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
                                    <label key={c.value} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${checked ? "border-primary bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint" : "border-black/10 dark:border-white/15 text-black/60 dark:text-white/60"}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => setChronicConditions(
                                                e.target.checked
                                                    ? [...chronicConditions, c.value]
                                                    : chronicConditions.filter((x) => x !== c.value)
                                            )}
                                            className="sr-only"
                                        />
                                        {lang === "el" ? c.el : c.en}
                                    </label>
                                )
                            })}
                        </div>
                        <p className="text-xs text-black/40 dark:text-white/40 mt-1.5">
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
                                    <label key={c.value} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${checked ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" : "border-black/10 dark:border-white/15 text-black/60 dark:text-white/60"}`}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(e) => setFamilyMedicalHistory(
                                                e.target.checked
                                                    ? [...familyMedicalHistory, c.value]
                                                    : familyMedicalHistory.filter((x) => x !== c.value)
                                            )}
                                            className="sr-only"
                                        />
                                        {lang === "el" ? c.el : c.en}
                                    </label>
                                )
                            })}
                        </div>
                        <p className="text-xs text-black/40 dark:text-white/40 mt-1.5">
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
                            <Home className="h-4 w-4 text-black/50 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Ιδιόκτητη κατοικία", "Own a home")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasPets} onChange={(e) => setHasPets(e.target.checked)} className={checkboxClass} />
                            <PawPrint className="h-4 w-4 text-black/50 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Κατοικίδια", "Have pets")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={travelsFrequently} onChange={(e) => setTravelsFrequently(e.target.checked)} className={checkboxClass} />
                            <Plane className="h-4 w-4 text-black/50 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Ταξιδεύω συχνά", "Travel frequently")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={hasLoans} onChange={(e) => setHasLoans(e.target.checked)} className={checkboxClass} />
                            <Briefcase className="h-4 w-4 text-black/50 dark:text-white/50" />
                            <span className="text-sm text-black/75 dark:text-white/75">{t("Δάνεια", "Have loans")}</span>
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
                            <Plus className="h-3 w-3" />
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
                                        <span className="text-xs text-black/50 dark:text-white/50">
                                            {event.date}
                                        </span>
                                        <button type="button" onClick={() => removeLifeEvent(i)} aria-label={t("Αφαίρεση γεγονότος", "Remove event")} className="text-red-400 hover:text-red-600 cursor-pointer">
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
                                <label htmlFor="newEventType" className="text-xs text-black/50 dark:text-white/50">{t("Τύπος", "Type")}</label>
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
                                <label htmlFor="newEventMonth" className="text-xs text-black/50 dark:text-white/50">{t("Ημερομηνία", "Date")}</label>
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
                            <button type="button" onClick={addLifeEvent} className="px-3 py-2.5 rounded-xl bg-primary text-white dark:text-[#1A2420] text-sm font-semibold hover:bg-primary-hover cursor-pointer">
                                {t("OK", "OK")}
                            </button>
                            <button type="button" onClick={() => setShowAddEvent(false)} aria-label={t("Ακύρωση", "Cancel")} className="p-2.5 text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {lifeEvents.length === 0 && !showAddEvent && (
                        <p className="text-xs text-black/40 dark:text-white/40">
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
                        className="w-full py-3.5 bg-primary text-white dark:text-[#1A2420] rounded-xl font-semibold transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                    >
                        <ShieldCheck className="h-4 w-4" />
                        {loading
                            ? t("Αποθήκευση...", "Saving...")
                            : t("Αποθήκευση & Ανανέωση Βαθμολογίας", "Save & Update Protection Score")}
                    </button>
                </div>
            </form>
        </div>
    )
}
