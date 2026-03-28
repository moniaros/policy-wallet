import type { LucideIcon } from "lucide-react"
import {
    Car,
    Heart,
    Home,
    PawPrint,
    ShieldCheck,
    TrendingUp,
    Users,
} from "lucide-react"

export interface ProductCategory {
    id: string
    href: string
    icon: LucideIcon
    labelEl: string
    labelEn: string
    tagEl: string
    tagEn: string
    headlineEl: string
    headlineEn: string
    descEl: string
    descEn: string
    surface: string
    border: string
    tagBg: string
}

export const productCategories = [
    {
        id: "motor",
        href: "/product/motor",
        icon: Car,
        labelEl: "Αυτοκίνητο",
        labelEn: "Motor",
        tagEl: "Οχήματα",
        tagEn: "Vehicles",
        headlineEl: "Έλεγχος αγοραίας αξίας και κενών οδικής βοήθειας.",
        headlineEn: "Real-time market value tracking and roadside gap detection.",
        descEl: "Παρακολουθήστε αν η ασφαλιστική αποζημίωση ακολουθεί την αξία του οχήματός σας και εντοπίστε κενά πριν τα χρειαστείτε.",
        descEn: "Know exactly if your payout keeps pace with your car's real value and catch dangerous roadside gaps before a breakdown.",
        surface: "bg-[#D7E4ED]",
        border: "border-[#C1D5E0]",
        tagBg: "bg-[#C1D5E0] text-[#1A3A4A]",
    },
    {
        id: "property",
        href: "/product/property",
        icon: Home,
        labelEl: "Ακίνητο",
        labelEn: "Property",
        tagEl: "Περιουσία",
        tagEn: "Real estate",
        headlineEl: "Rebuild Cost Guard και ΕΝΦΙΑ compliance σε δευτερόλεπτα.",
        headlineEn: "Rebuild Cost Guard and ENFIA tax compliance in seconds.",
        descEl: "Εντοπίστε υπο-ασφάλιση ακινήτου πριν καταστροφή σβήσει την αξία που χτίσατε χρόνια.",
        descEn: "Catch under-coverage before a disaster erases the equity you spent years building.",
        surface: "bg-[#DCEBDA]",
        border: "border-[#C3D9C1]",
        tagBg: "bg-[#C3D9C1] text-[#1A3A1A]",
    },
    {
        id: "health",
        href: "/product/health",
        icon: Heart,
        labelEl: "Υγεία",
        labelEn: "Health",
        tagEl: "Ζωή & Υγεία",
        tagEn: "Life & Health",
        headlineEl: "Out-of-Pocket αποτύπωση και direct-billing κατευθύνσεις.",
        headlineEn: "Out-of-pocket caps and direct-billing hospital linkups.",
        descEl: "Ξέρετε πόσο θα πληρώσετε πριν μπείτε σε νοσοκομείο, όχι αφού λάβετε τον λογαριασμό.",
        descEn: "Know your maximum exposure before you walk into a hospital, not after the bill arrives.",
        surface: "bg-[#EBE5D9]",
        border: "border-[#D9CFC3]",
        tagBg: "bg-[#D9CFC3] text-[#3A2A1A]",
    },
    {
        id: "cyber",
        href: "/product/cyber",
        icon: ShieldCheck,
        labelEl: "Κυβερνοασφάλεια",
        labelEn: "Cyber",
        tagEl: "Ψηφιακή Ασφάλεια",
        tagEn: "Digital security",
        headlineEl: "Ransomware κάλυψη και Business Interruption ανάλυση.",
        headlineEn: "Ransomware coverage verified, Business Interruption tracked.",
        descEl: "Η ομάδα αντιμετώπισης περιστατικών είναι πάντα ένα tap μακριά. Χωρίς αναζήτηση σε λήξαντα έγγραφα.",
        descEn: "Your incident response team, one tap away. No more hunting through expired PDFs during a breach.",
        surface: "bg-[#E8E4F0]",
        border: "border-[#D0CBDF]",
        tagBg: "bg-[#D0CBDF] text-[#2A1A3A]",
    },
    {
        id: "group-health",
        href: "/product/group-health",
        icon: Users,
        labelEl: "Ομαδική Υγεία",
        labelEn: "Group Health",
        tagEl: "Εταιρικό",
        tagEn: "Corporate",
        headlineEl: "Συντονισμός εταιρικών παροχών με ατομική κάλυψη.",
        headlineEn: "Coordinate corporate benefits with personal coverage.",
        descEl: "Σταματήστε να πληρώνετε δύο φορές για το ίδιο πράγμα. Χαρτογραφήστε τα κενά ανάμεσα σε εταιρικό και ατομικό.",
        descEn: "Stop double-paying for overlapping benefits. Map blind spots between your employer plan and personal policy.",
        surface: "bg-[#F2E3DF]",
        border: "border-[#E2C9C3]",
        tagBg: "bg-[#E2C9C3] text-[#3A1A1A]",
    },
    {
        id: "group-pension",
        href: "/product/group-pension",
        icon: TrendingUp,
        labelEl: "Ομαδική Σύνταξη",
        labelEn: "Group Pension",
        tagEl: "Συνταξιοδότηση",
        tagEn: "Retirement",
        headlineEl: "Φορολογικές εκπτώσεις και προβολές αποταμίευσης.",
        headlineEn: "Tax deductions and fund performance projections.",
        descEl: "Ξέρετε πότε να αποχωρήσετε, πόσα έχετε συγκεντρώσει και τι φορολογικές εκπτώσεις σας ανήκουν.",
        descEn: "Know when to retire, how much you've vested, and exactly what tax deductions you're entitled to.",
        surface: "bg-[#E7EDD7]",
        border: "border-[#D0DAB9]",
        tagBg: "bg-[#D0DAB9] text-[#2A3A1A]",
    },
    {
        id: "pet",
        href: "/product/pet",
        icon: PawPrint,
        labelEl: "Κατοικίδια",
        labelEn: "Pet",
        tagEl: "Ζώα Συντροφιάς",
        tagEn: "Companion animals",
        headlineEl: "Έλεγχος Leishmania και εξαιρούμενων προϋπαρχουσών παθήσεων.",
        headlineEn: "Leishmania verification and pre-existing condition exclusion audit.",
        descEl: "Ξέρετε ακριβώς τι καλύπτεται και τι δεν καλύπτεται πριν ο κτηνίατρος σας δώσει τον λογαριασμό.",
        descEn: "Know exactly what's covered and what isn't before the vet hands you the bill.",
        surface: "bg-[#D7E4ED]",
        border: "border-[#C1D5E0]",
        tagBg: "bg-[#C1D5E0] text-[#1A3A4A]",
    },
] as const satisfies readonly ProductCategory[]

export type ProductCategoryId = (typeof productCategories)[number]["id"]

export function getProductCategory(id: ProductCategoryId) {
    return productCategories.find((category) => category.id === id)
}
