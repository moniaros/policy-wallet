import { useState, useEffect } from "react";
import {
    ChevronLeft, ChevronRight, Car, Heart, Building2, PawPrint,
    Shield, Anchor, Stethoscope, Phone, Download, Share2,
    AlertTriangle, Check, X, Sparkles, FileText, Upload,
    Users, MessageSquare, Bell, RefreshCw, ExternalLink,
    TrendingUp, TrendingDown, Clock, Calendar, Info,
    MapPin, User, CreditCard, Zap, Star, BarChart2,
    Navigation, Waves, ChevronDown
} from "lucide-react";
import {
    RadialBarChart, RadialBar, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell
} from "recharts";

// ─── TOKENS ────────────────────────────────────────────────────────────────
const T = {
    bg: "#F8FAFC", card: "#FFFFFF", border: "#E2E8F0",
    blue: "#2563EB", blueD: "#1D4ED8", blueL: "#EFF6FF", blueMid: "#BFDBFE",
    green: "#10B981", greenL: "#ECFDF5", greenD: "#065F46",
    amber: "#F59E0B", amberL: "#FFFBEB", amberD: "#92400E",
    red: "#EF4444", redL: "#FEF2F2", redD: "#991B1B",
    purple: "#8B5CF6", purpleL: "#F5F3FF",
    sky: "#0EA5E9", skyL: "#F0F9FF",
    t900: "#0F172A", t700: "#334155", t600: "#475569", t400: "#94A3B8", t200: "#E2E8F0", t100: "#F1F5F9",
};

// ─── POLICY DATA ────────────────────────────────────────────────────────────
const POLICIES = {
    motor: {
        id: "motor", type: "Motor", label: "Car Insurance", icon: Car, iconColor: T.blue, iconBg: T.blueL,
        insurer: "Interamerican", number: "MTR-2024-1234", status: "expiring",
        premium: "€340", period: "year", expires: "15 Mar 2026", renewalIn: 12,
        acordData: {
            vehicle: {
                make: "Toyota", model: "Corolla", year: 2019, plate: "ΑΑΑ-1234",
                estimatedMarketValue: 14500, insuredValue: 18000, deductible: 300,
                hasRoadsideAssistance: true, namedDrivers: ["Νίκος Παπαδόπουλος", "Ελένη Παπαδοπούλου"],
                greenCardExpiryDate: "15 Mar 2026", greenCardDaysLeft: 12,
                coverageTier: "Comprehensive"
            },
        },
        emergency: { roadsidePhone: "10400", accidentPhone: "2109999999" },
        gaps: [{ severity: "amber", title: "Market value gap", desc: "Your vehicle is insured for €3,500 more than its estimated market value. You're overpaying by ~€28/yr.", cta: "Review with Agent" }],
        covered: ["Third-party liability (up to €1.22M per incident)", "Own damage (Comprehensive)", "Fire and natural disasters", "Theft and attempted theft", "Glass breakage — windscreen & windows", "Roadside Assistance (Οδική Βοήθεια) — 24/7", "Personal accident coverage (driver)", "Legal protection — up to €15,000"],
        notCovered: ["Wear and tear / mechanical breakdown", "Racing or off-road use", "Driving without a valid licence", "Under the influence of alcohol/drugs", "Commercial use of the vehicle", "Trailers (unless separately listed)"],
    },
    health: {
        id: "health", type: "Health", label: "Health Plan", icon: Heart, iconColor: T.green, iconBg: T.greenL,
        insurer: "Generali", number: "HLT-2024-5678", status: "active",
        premium: "€890", period: "year", expires: "1 Jan 2027", renewalIn: 310,
        acordData: {
            health: {
                annualLimit: 30000, roomAndBoardLimit: 250, outOfPocketMax: 2000,
                hospitalClass: "B+", coordinationCentreName: "Υγεία Α.Ε.", coordinationCentrePhone: "2106932000",
                directBillingAvailable: true, checkupUsed: false, checkupDeadline: "31 Dec 2025",
                waitingPeriodMonths: 3
            },
        },
        gaps: [{ severity: "blue", title: "Unused annual check-up", desc: "Your plan includes a free annual check-up. You haven't used it this year — deadline is 31 Dec 2025.", cta: "Book Check-up" }],
        outOfPocketData: [{ name: "Covered", value: 28000, fill: T.green }, { name: "Out of Pocket", value: 2000, fill: T.redL }],
        covered: ["Hospitalisation (Class B+ room)", "Surgery — inpatient and day surgery", "Diagnostic tests (CT, MRI, blood tests)", "Emergency outpatient care", "Ambulance transport", "Prescribed medication (during hospitalisation)", "Annual preventive check-up (1x/year — unused)", "Maternity — standard delivery"],
        notCovered: ["Pre-existing conditions (first 3 months)", "Psychiatric treatment (first 12 months)", "Dental treatment", "Cosmetic surgery", "IVF and fertility treatments", "Experimental treatments", "Medical tourism", "Eyeglasses and contact lenses"],
    },
    home: {
        id: "home", type: "Home", label: "Home Insurance", icon: Building2, iconColor: T.amber, iconBg: T.amberL,
        insurer: "AXA", number: "HOM-2024-9012", status: "active",
        premium: "€210", period: "year", expires: "20 Jun 2026", renewalIn: 115,
        acordData: {
            property: {
                address: "Πατησίων 45, Αθήνα 10434", squareMeters: 92,
                yearBuilt: 1987, insuredValue: 120000, estimatedRebuildCost: 147200,
                replacementCostBenchmark: 1600, fireCoverageIncluded: true,
                earthquakeCoverageIncluded: true, floodCoverageIncluded: false,
                mortgageeBank: "Alpha Bank", mortgageeRef: "MTG-2019-003441",
                assistancePhone: "2101234567"
            },
        },
        enfia: { fire: true, earthquake: true, flood: false },
        gaps: [{ severity: "red", title: "Missing Flood coverage — ENFIA risk", desc: "Your property is not covered for flood damage. You do not qualify for the ENFIA tax deduction (all 3 perils required). Adding flood coverage costs ~€18/yr and saves you on ENFIA.", cta: "Ask Your Agent" }],
        covered: ["Fire and explosion", "Earthquake — structural damage", "Lightning strike", "Smoke damage", "Burst pipes and water damage", "Theft and burglary", "Liability to third parties", "24/7 technical home assistance"],
        notCovered: ["Flood and surface water (NOT covered — see gap)", "Subsidence and ground movement", "War and civil unrest", "Gradual deterioration and maintenance", "Unoccupied property (>60 days)", "High-value items without additional schedule", "Business use of property"],
    },
    life: {
        id: "life", type: "Investment Life", label: "Investment Life", icon: TrendingUp, iconColor: T.sky, iconBg: T.skyL,
        insurer: "Metlife", number: "LIF-2024-3344", status: "active",
        premium: "€150", period: "month", expires: "1 Jan 2045", renewalIn: null,
        acordData: {
            lifeAndInvestment: {
                deathBenefit: 100000, cashValue: 18740, guaranteedPortion: 0.4,
                unitLinkedPortion: 0.6, maturityDate: "1 Jan 2045", taxFreeMaturityEligible: true,
                ytdGrowth: 4.2, targetValue: 95000, beneficiaries: ["Ελένη Παπαδοπούλου (σύζυγος)", "Κωνσταντίνος Παπαδόπουλος (υιός)"],
                surrenderPenaltyActive: true, premiumHolidayAvailable: true
            },
        },
        goalData: [
            { year: "2024", value: 18740 }, { year: "2026", value: 22000 }, { year: "2028", value: 28000 },
            { year: "2030", value: 36000 }, { year: "2032", value: 46000 }, { year: "2035", value: 62000 },
            { year: "2038", value: 78000 }, { year: "2040", value: 88000 }, { year: "2045", value: 95000 },
        ],
        gaps: [{ severity: "amber", title: "Purchasing power erosion", desc: "At 2.5% average inflation, your €95,000 target in 2045 will be worth only ~€62,000 in today's money. Consider increasing monthly premium.", cta: "Review with Agent" }],
        covered: ["Death benefit — €100,000 lump sum to beneficiaries", "Total permanent disability cover", "Tax-free maturity benefit (eligible after 10 years — ✓)", "Investment growth on unit-linked funds", "Guaranteed minimum return on 40% of premium", "Premium waiver on critical illness (first 90 days)"],
        notCovered: ["Suicide (first 2 years)", "Death in active military conflict", "Pre-existing terminal illness", "Accidents under the influence", "Criminal acts"],
    },
    pet: {
        id: "pet", type: "Pet", label: "Pet Insurance", icon: PawPrint, iconColor: T.purple, iconBg: T.purpleL,
        insurer: "ERGO", number: "PET-2024-7788", status: "active",
        premium: "€180", period: "year", expires: "10 Sep 2026", renewalIn: 197,
        acordData: {
            pet: {
                name: "Μπάμπης", species: "Dog", breed: "Golden Retriever", age: 4,
                microchip: "941000020304050", annualLimit: 3000, annualSpent: 840,
                leishmaniaCovered: false,
                preExistingConditionsExcluded: ["Hip Dysplasia", "Elbow Dysplasia"],
                directVetPayment: true, waitingPeriodDays: 30
            },
        },
        breedRadar: [
            { condition: "Hip Dysplasia", risk: 85, covered: false }, { condition: "Cancer", risk: 70, covered: true },
            { condition: "Leishmania", risk: 80, covered: false }, { condition: "Skin Conditions", risk: 60, covered: true },
            { condition: "Eye Disease", risk: 45, covered: true }, { condition: "Cardiac", risk: 35, covered: true },
        ],
        gaps: [
            { severity: "red", title: "Leishmania NOT covered — high Greece risk", desc: "Leishmania (Κάλαζαρ) is prevalent in Greece, especially in Attica. Treatment costs €800–2,500. Your current plan excludes this condition.", cta: "Add Leishmania Cover" },
            { severity: "amber", title: "Hip Dysplasia excluded", desc: "Hip Dysplasia is pre-existing and excluded from your policy. Consider a specialist assessment — physiotherapy may be covered under wellness add-on.", cta: "Review Options" },
        ],
        covered: ["Accidents and injuries (unlimited during hospitalisation)", "Illness — general internal medicine", "Cancer treatment (chemotherapy, surgery)", "Skin conditions and allergies", "Eye and ear treatment", "Dental extractions (accident-related)", "Surgical procedures (elective and emergency)", "Direct payment to network vets"],
        notCovered: ["Leishmania / Κάλαζαρ (NOT covered — see gap)", "Hip Dysplasia (pre-existing exclusion)", "Elbow Dysplasia (pre-existing exclusion)", "Routine vaccinations and parasite prevention", "Grooming and cosmetic procedures", "Breeding-related conditions", "Experimental treatments", "Conditions arising in first 30 days"],
    },
    doctor: {
        id: "doctor", type: "Doctor Liability", label: "Civil Liability", icon: Stethoscope, iconColor: "#0891B2", iconBg: "#ECFEFF",
        insurer: "Allianz", number: "PRO-2024-9900", status: "active",
        premium: "€1200", period: "year", expires: "30 Nov 2026", renewalIn: 278,
        acordData: {
            professional: {
                speciality: "Παθολόγος", coverageLimit: 500000,
                retroactiveCoverageFrom: "1 Jan 2018", claimsMode: "claims-made",
                defenceCostsIncluded: true, retroactiveYears: 6,
                unprotectedYears: [], licenceYear: 2012
            },
        },
        gaps: [{ severity: "amber", title: "Retroactive gap: 2012–2018", desc: "Your policy provides retroactive cover from 2018. Your licence was issued in 2012. The 6-year gap (2012–2018) is unprotected for claims that emerge now relating to treatment given then.", cta: "Discuss with Agent" }],
        covered: ["Medical malpractice — negligence claims", "Patient bodily injury arising from treatment", "Legal defence costs (included in limit)", "Court-appointed expert fees", "Claims relating to records and prescriptions", "Retroactive cover from 1 Jan 2018", "Claims-made basis: covers claims filed during policy period"],
        notCovered: ["Criminal acts or intentional harm", "Claims relating to practice before 2018 (retroactive gap)", "Aesthetic / cosmetic procedures (unless listed)", "Treatment under the influence of substances", "Claims not reported during policy period (claims-made)", "Joint liability with hospital or clinic (separate policy required)"],
    },
    marine: {
        id: "marine", type: "Marine / Yacht", label: "Yacht Insurance", icon: Anchor, iconColor: "#0369A1", iconBg: "#F0F9FF",
        insurer: "Lloyd's of London", number: "MAR-2024-5566", status: "active",
        premium: "€890", period: "year", expires: "1 Apr 2026", renewalIn: 35,
        acordData: {
            marine: {
                vesselName: "Αιγαίον", vesselType: "Sailing yacht", lengthM: 11.5,
                yearBuilt: 2008, homePort: "Μαρίνα Βουλιαγμένης", insuredValue: 85000,
                cruisingArea: "Ελληνικά χωρικά ύδατα + Ανατολική Μεσόγειος",
                cruisingAreaWarrantyMet: true, tenderCovered: true, tenderValue: 3500,
                mooringCovered: true, thirdPartyLimit: 500000, crewCovered: true
            },
        },
        gaps: [{ severity: "blue", title: "Cruising area verified ✓", desc: "Your current cruising area (Greek waters + Eastern Mediterranean) matches your policy warranty. No area mismatch detected.", cta: null }],
        covered: ["Hull and machinery — all risks", "Fire, explosion, sinking", "Collision damage (own vessel)", "Third-party liability (up to €500,000)", "Salvage and towing costs", "Personal effects (up to €2,500)", "Tender/dinghy (Avon 3.0m — included)", "Mooring and marina liability", "Crew personal accident (up to 6 persons)", "Emergency repatriation"],
        notCovered: ["Racing (unless sanctioned by insurer)", "Wear, tear, and gradual deterioration", "Navigating outside warranted cruising area", "Wilful misconduct or deliberate acts", "War and piracy (beyond standard exclusion zone)", "Unlicensed operation", "Damage during haul-out (separate policy required)"],
    },
};

const LOB_LIST = ["motor", "health", "home", "life", "pet", "doctor", "marine"];

// ─── SHARED ATOMS ──────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = { active: { bg: T.greenL, text: T.greenD, border: "#A7F3D0", label: "Active" }, expiring: { bg: T.amberL, text: T.amberD, border: "#FCD34D", label: "Expiring" }, expired: { bg: T.redL, text: T.redD, border: "#FCA5A5", label: "Expired" } };
    const s = map[status] || map.active;
    return <span style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}`, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 999, letterSpacing: "0.03em", textTransform: "uppercase" }}>{s.label}</span>;
};

const GapBanner = ({ gap, onAsk }) => {
    const colorMap = { red: { bg: T.redL, border: "#FCA5A5", icon: T.red, text: "#991B1B", sub: "#B91C1C" }, amber: { bg: T.amberL, border: "#FCD34D", icon: T.amber, text: T.amberD, sub: "#78350F" }, blue: { bg: T.blueL, border: T.blueMid, icon: T.blue, text: "#1E40AF", sub: "#1D4ED8" } };
    const c = colorMap[gap.severity] || colorMap.amber;
    return (
        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12 }}>
            {gap.severity === "blue" ? <Check size={16} color={c.icon} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={16} color={c.icon} strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 3 }}>{gap.title}</div>
                <div style={{ fontSize: 11, color: c.sub, lineHeight: 1.55 }}>{gap.desc}</div>
                {gap.cta && <button onClick={() => onAsk && onAsk(gap)} style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: c.text, background: "rgba(255,255,255,0.6)", border: `1px solid ${c.border}`, borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>{gap.cta} →</button>}
            </div>
        </div>
    );
};

const FieldRow = ({ label, value, highlight }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 12, color: T.t400, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: highlight || T.t900 }}>{value}</span>
    </div>
);

const CoverageItem = ({ text, covered }) => (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.t100}` }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: covered ? T.greenL : T.redL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
            {covered ? <Check size={10} color={T.greenD} strokeWidth={2.5} /> : <X size={10} color={T.red} strokeWidth={2.5} />}
        </div>
        <span style={{ fontSize: 12, color: covered ? T.t700 : T.t400, lineHeight: 1.5 }}>{text}</span>
    </div>
);

const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: T.t400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, marginTop: 20 }}>{children}</div>
);

const CallCard = ({ name, phone, color, bg, Icon: Ico }) => (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ico size={18} color={color} strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.t400, marginBottom: 2 }}>{name}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.t900, letterSpacing: "0.01em" }}>{phone}</div>
        </div>
        <a href={`tel:${phone}`} style={{ width: 38, height: 38, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none" }}>
            <Phone size={16} color="white" strokeWidth={1.5} />
        </a>
    </div>
);

// ─── LOB-SPECIFIC DETAIL SECTIONS ──────────────────────────────────────────

const MotorDetail = ({ data }) => {
    const { vehicle } = data.acordData;
    const daysLeft = vehicle.greenCardDaysLeft;
    return (
        <>
            <SectionLabel>Emergency Contacts</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <CallCard name="Οδική Βοήθεια" phone={data.emergency.roadsidePhone} color={T.green} bg={T.greenL} Icon={Navigation} />
                <CallCard name="Δήλωση Ατυχήματος" phone={data.emergency.accidentPhone} color={T.red} bg={T.redL} Icon={AlertTriangle} />
            </div>

            <SectionLabel>Vehicle Details</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Vehicle" value={`${vehicle.make} ${vehicle.model} (${vehicle.year})`} />
                <FieldRow label="Licence Plate" value={vehicle.plate} />
                <FieldRow label="Coverage" value={vehicle.coverageTier} />
                <FieldRow label="Insured Value" value={`€${vehicle.insuredValue.toLocaleString()}`} />
                <FieldRow label="Market Value (est.)" value={`€${vehicle.estimatedMarketValue.toLocaleString()}`} highlight={T.amber} />
                <FieldRow label="Deductible" value={`€${vehicle.deductible}`} />
                <FieldRow label="Roadside Assist" value={vehicle.hasRoadsideAssistance ? "Included ✓" : ""} highlight={vehicle.hasRoadsideAssistance ? T.green : T.red} />
            </div>

            <SectionLabel>Green Card / Πράσινη Κάρτα</SectionLabel>
            <div style={{ background: daysLeft <= 14 ? T.amberL : T.greenL, border: `1px solid ${daysLeft <= 14 ? "#FCD34D" : "#A7F3D0"}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 14 ? T.amberD : T.greenD }}>Expires {vehicle.greenCardExpiryDate}</div>
                    <div style={{ fontSize: 11, color: T.t400, marginTop: 2 }}>{daysLeft} days remaining</div>
                </div>
                <button style={{ background: T.blue, color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <Download size={13} strokeWidth={2} /> Download
                </button>
            </div>

            <SectionLabel>Named Drivers</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {vehicle.namedDrivers.map(d => (
                    <div key={d} style={{ background: T.blueL, border: `1px solid ${T.blueMid}`, borderRadius: 999, padding: "5px 14px", fontSize: 12, fontWeight: 600, color: T.blue, display: "flex", alignItems: "center", gap: 6 }}>
                        <User size={12} strokeWidth={1.5} />{d}
                    </div>
                ))}
            </div>

            <SectionLabel>Market Value Analysis</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 11, color: T.t400, marginBottom: 8 }}>Insured vs Estimated Market Value</div>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", marginBottom: 6 }}>
                    {[{ label: "Insured", val: vehicle.insuredValue, color: T.blue }, { label: "Market", val: vehicle.estimatedMarketValue, color: T.amber }].map(({ label, val, color }) => (
                        <div key={label} style={{ flex: 1, textAlign: "center" }}>
                            <div style={{ background: color, borderRadius: "6px 6px 0 0", height: Math.round(val / 500) + "px", maxHeight: 60, minHeight: 20, margin: "0 auto", width: "60%" }} />
                            <div style={{ fontSize: 10, color: T.t400, marginTop: 4 }}>{label}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color }}>{`€${(val / 1000).toFixed(0)}k`}</div>
                        </div>
                    ))}
                </div>
                <div style={{ fontSize: 11, color: T.amberD, background: T.amberL, borderRadius: 8, padding: "6px 10px", marginTop: 8 }}>⚠ Overinsured by €3,500 — potential saving of ~€28/yr</div>
            </div>
        </>
    );
};

const HealthDetail = ({ data }) => {
    const { health } = data.acordData;
    const spentPct = Math.round(((health.annualLimit - health.outOfPocketMax) / health.annualLimit) * 100);
    return (
        <>
            <SectionLabel>Coordination Centre — Συντονιστικό Κέντρο</SectionLabel>
            <CallCard name="Συντονιστικό Κέντρο — Υγεία Α.Ε." phone={health.coordinationCentrePhone} color={T.green} bg={T.greenL} Icon={Heart} />
            <div style={{ marginTop: 8, fontSize: 11, color: T.t400, lineHeight: 1.5, padding: "0 4px" }}>
                Always call the Συντονιστικό Κέντρο before non-emergency hospitalisation to confirm coverage and arrange pre-authorisation.
            </div>

            <SectionLabel>Plan Overview</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Annual Limit" value={`€${health.annualLimit.toLocaleString()}`} />
                <FieldRow label="Room & Board" value={`€${health.roomAndBoardLimit}/day (Class B+)`} />
                <FieldRow label="Out-of-Pocket Max" value={`€${health.outOfPocketMax.toLocaleString()}`} highlight={T.amber} />
                <FieldRow label="Hospital Class" value={health.hospitalClass} />
                <FieldRow label="Direct Billing" value={health.directBillingAvailable ? "Available ✓" : "Not available"} highlight={health.directBillingAvailable ? T.green : T.red} />
                <FieldRow label="Waiting Period" value={`${health.waitingPeriodMonths} months (new conditions)`} />
            </div>

            <SectionLabel>Out-of-Pocket Simulation</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 90, height: 90, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.outOfPocketData} cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={2} dataKey="value">
                                {data.outOfPocketData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.t900, marginBottom: 8 }}>5-day surgery scenario</div>
                    {[{ label: "Insurer pays", val: `€${(28000).toLocaleString()}`, color: T.green }, { label: "You pay (max)", val: `€${(2000).toLocaleString()}`, color: T.red }].map(({ label, val, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                                <span style={{ fontSize: 11, color: T.t400 }}>{label}</span>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color }}>{val}</span>
                        </div>
                    ))}
                </div>
            </div>

            <SectionLabel>Annual Check-up Tracker</SectionLabel>
            <div style={{ background: T.amberL, border: `1px solid #FCD34D`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bell size={18} color={T.amber} strokeWidth={1.5} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.amberD }}>Check-up not yet used</div>
                    <div style={{ fontSize: 11, color: "#78350F", marginTop: 2 }}>Included in your plan · Deadline {health.checkupDeadline}</div>
                </div>
                <button style={{ background: T.amber, color: "white", border: "none", borderRadius: 10, padding: "7px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Book →</button>
            </div>
        </>
    );
};

const HomeDetail = ({ data }) => {
    const { property } = data.acordData;
    const enfia = data.enfia;
    const coverageGap = property.estimatedRebuildCost - property.insuredValue;
    return (
        <>
            <SectionLabel>ENFIA Tax Deduction Eligibility</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.t900, marginBottom: 12 }}>
                    3 perils required · {Object.values(enfia).filter(Boolean).length}/3 covered
                </div>
                {[{ label: "Fire Coverage", key: "fire" }, { label: "Earthquake Coverage", key: "earthquake" }, { label: "Flood Coverage", key: "flood" }].map(({ label, key }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.t100}` }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: enfia[key] ? T.greenL : T.redL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {enfia[key] ? <Check size={12} color={T.greenD} strokeWidth={2.5} /> : <X size={12} color={T.red} strokeWidth={2.5} />}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.t700 }}>{label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: enfia[key] ? T.green : T.red }}>{enfia[key] ? "Covered" : "Not Covered"}</span>
                    </div>
                ))}
                <div style={{ marginTop: 12, background: enfia.fire && enfia.earthquake && enfia.flood ? T.greenL : T.redL, borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, color: enfia.fire && enfia.earthquake && enfia.flood ? T.greenD : T.redD, textAlign: "center" }}>
                    {enfia.fire && enfia.earthquake && enfia.flood ? "✓ ENFIA Deduction Eligible" : "✗ Not Eligible — Missing Flood Coverage"}
                </div>
            </div>

            <SectionLabel>Property Details</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Address" value={property.address} />
                <FieldRow label="Size" value={`${property.squareMeters} m²`} />
                <FieldRow label="Year Built" value={String(property.yearBuilt)} />
                <FieldRow label="Insured Value" value={`€${property.insuredValue.toLocaleString()}`} />
                <FieldRow label="Est. Rebuild Cost" value={`€${property.estimatedRebuildCost.toLocaleString()}`} highlight={T.amber} />
                <FieldRow label="Coverage Gap" value={`€${coverageGap.toLocaleString()} underinsured`} highlight={T.red} />
                <FieldRow label="Mortgagee" value={`${property.mortgageeBank} · ${property.mortgageeRef}`} />
            </div>

            <SectionLabel>Replacement Cost Gauge</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: T.t400 }}>Insured</span>
                    <span style={{ fontSize: 11, color: T.t400 }}>Benchmark (€1,600/m²)</span>
                </div>
                <div style={{ background: T.t100, borderRadius: 999, height: 10, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, background: T.blue, borderRadius: 999, width: `${Math.round((property.insuredValue / property.estimatedRebuildCost) * 100)}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.blue }}>€{property.insuredValue.toLocaleString()}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>€{property.estimatedRebuildCost.toLocaleString()}</span>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: T.redD, background: T.redL, borderRadius: 8, padding: "6px 10px" }}>
                    ⚠ {Math.round((property.insuredValue / property.estimatedRebuildCost) * 100)}% of replacement cost covered — risk of shortfall in total loss
                </div>
            </div>

            <SectionLabel>24/7 Home Assistance</SectionLabel>
            <CallCard name="Technical Assistance — AXA" phone={property.assistancePhone} color={T.amber} bg={T.amberL} Icon={Building2} />
        </>
    );
};

const LifeDetail = ({ data }) => {
    const { lifeAndInvestment: li } = data.acordData;
    const allocData = [
        { name: "Guaranteed", value: li.guaranteedPortion * 100, fill: T.green },
        { name: "Unit-Linked", value: li.unitLinkedPortion * 100, fill: T.blue },
    ];
    return (
        <>
            <SectionLabel>Fund Overview</SectionLabel>
            <div style={{ background: `linear-gradient(135deg,${T.sky},#0284C7)`, borderRadius: 16, padding: 18, color: "white", marginBottom: 4 }}>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Current Fund Value</div>
                <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em" }}>€{li.cashValue.toLocaleString()}</div>
                <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                    <div><div style={{ fontSize: 11, opacity: 0.7 }}>YTD Growth</div><div style={{ fontSize: 16, fontWeight: 700 }}>{li.ytdGrowth > 0 ? "+" : ""}{li.ytdGrowth}%</div></div>
                    <div><div style={{ fontSize: 11, opacity: 0.7 }}>Target (2045)</div><div style={{ fontSize: 16, fontWeight: 700 }}>€{(li.targetValue / 1000).toFixed(0)}k</div></div>
                    <div><div style={{ fontSize: 11, opacity: 0.7 }}>Death Benefit</div><div style={{ fontSize: 16, fontWeight: 700 }}>€{(li.deathBenefit / 1000).toFixed(0)}k</div></div>
                </div>
            </div>

            <SectionLabel>Goal Timeline</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ height: 140 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.goalData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.t200} />
                            <XAxis dataKey="year" tick={{ fontSize: 9, fill: T.t400 }} />
                            <YAxis tick={{ fontSize: 9, fill: T.t400 }} tickFormatter={v => `€${v / 1000}k`} />
                            <Tooltip formatter={v => `€${v.toLocaleString()}`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            <Line type="monotone" dataKey="value" stroke={T.sky} strokeWidth={2.5} dot={{ fill: T.sky, r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ fontSize: 11, color: T.t400, textAlign: "center", marginTop: 4 }}>Projected growth to maturity · 2045</div>
            </div>

            <SectionLabel>Fund Allocation</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
                <div style={{ width: 80, height: 80, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={allocData} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value">
                                {allocData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ flex: 1 }}>
                    {allocData.map(({ name, value, fill }) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 10, height: 10, borderRadius: 3, background: fill }} />
                                <span style={{ fontSize: 12, color: T.t600 }}>{name}</span>
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.t900 }}>{value}%</span>
                        </div>
                    ))}
                    <div style={{ fontSize: 11, color: T.green, background: T.greenL, borderRadius: 8, padding: "4px 8px", marginTop: 4 }}>✓ Tax-free maturity eligible</div>
                </div>
            </div>

            <SectionLabel>Beneficiaries</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {li.beneficiaries.map((b, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "10px 14px" }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={14} color={T.blue} strokeWidth={1.5} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: T.t700 }}>{b}</span>
                    </div>
                ))}
            </div>

            {li.surrenderPenaltyActive && (
                <div style={{ marginTop: 16, background: T.amberL, border: `1px solid #FCD34D`, borderRadius: 12, padding: "10px 14px", fontSize: 11, color: T.amberD }}>
                    ⚠ Surrender penalty applies if you cancel before year 10. Contact your agent before making changes.
                </div>
            )}
        </>
    );
};

const PetDetail = ({ data }) => {
    const { pet } = data.acordData;
    const spentPct = Math.round((pet.annualSpent / pet.annualLimit) * 100);
    const radarData = data.breedRadar.map(({ condition, risk }) => ({ condition, risk }));
    return (
        <>
            <SectionLabel>Leishmania / Κάλαζαρ Coverage</SectionLabel>
            <div style={{ background: pet.leishmaniaCovered ? T.greenL : T.redL, border: `1px solid ${pet.leishmaniaCovered ? "#A7F3D0" : "#FCA5A5"}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: pet.leishmaniaCovered ? T.green : T.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {pet.leishmaniaCovered ? <Check size={22} color="white" strokeWidth={2.5} /> : <X size={22} color="white" strokeWidth={2.5} />}
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: pet.leishmaniaCovered ? T.greenD : T.redD }}>Leishmania — {pet.leishmaniaCovered ? "COVERED" : "NOT COVERED"}</div>
                    <div style={{ fontSize: 11, color: pet.leishmaniaCovered ? "#065F46" : "#B91C1C", marginTop: 2 }}>
                        {pet.leishmaniaCovered ? "Your policy includes Leishmania (Κάλαζαρ) treatment." : "High prevalence in Attica — treatment €800–2,500"}
                    </div>
                </div>
            </div>

            <SectionLabel>Pet Details</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Name" value={pet.name} />
                <FieldRow label="Species / Breed" value={`${pet.species} · ${pet.breed}`} />
                <FieldRow label="Age" value={`${pet.age} years`} />
                <FieldRow label="Microchip" value={pet.microchip} />
                <FieldRow label="Direct Vet Payment" value={pet.directVetPayment ? "Available ✓" : "No"} highlight={pet.directVetPayment ? T.green : T.t400} />
                <FieldRow label="Waiting Period" value={`${pet.waitingPeriodDays} days (new conditions)`} />
            </div>

            <SectionLabel>Annual Limit — {spentPct}% Used</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: T.t400 }}>Spent this year</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.t900 }}>€{pet.annualSpent} / €{pet.annualLimit}</span>
                </div>
                <div style={{ background: T.t100, borderRadius: 999, height: 8, overflow: "hidden" }}>
                    <div style={{ background: spentPct > 80 ? T.amber : T.green, height: "100%", borderRadius: 999, width: `${spentPct}%`, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, color: T.t400, marginTop: 6 }}>€{pet.annualLimit - pet.annualSpent} remaining</div>
            </div>

            <SectionLabel>Breed Health Radar — {pet.breed}</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                            <PolarGrid stroke={T.t200} />
                            <PolarAngleAxis dataKey="condition" tick={{ fontSize: 9, fill: T.t400 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                            <Radar name="Risk" dataKey="risk" stroke={T.purple} fill={T.purple} fillOpacity={0.25} strokeWidth={1.5} />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {data.breedRadar.map(({ condition, covered }) => (
                        <div key={condition} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: covered ? T.greenL : T.redL, color: covered ? T.greenD : T.redD }}>
                            {covered ? "✓" : "✗"} {condition}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

const DoctorDetail = ({ data }) => {
    const { professional: p } = data.acordData;
    const totalYears = new Date().getFullYear() - p.licenceYear;
    const retroYears = new Date().getFullYear() - new Date(p.retroactiveCoverageFrom).getFullYear();
    const gapYears = totalYears - retroYears;
    return (
        <>
            <SectionLabel>Coverage Overview</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Speciality" value={p.speciality} />
                <FieldRow label="Coverage Limit" value={`€${p.coverageLimit.toLocaleString()}`} />
                <FieldRow label="Defence Costs" value={p.defenceCostsIncluded ? "Included in limit" : "Separate"} highlight={T.green} />
                <FieldRow label="Policy Basis" value="Claims-Made" />
                <FieldRow label="Retroactive From" value={p.retroactiveCoverageFrom} />
                <FieldRow label="Licence Issued" value={String(p.licenceYear)} />
            </div>

            <SectionLabel>Career Protection Timeline</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 12 }}>
                    {[...Array(totalYears)].map((_, i) => {
                        const year = p.licenceYear + i;
                        const protected_ = year >= new Date(p.retroactiveCoverageFrom).getFullYear();
                        return (
                            <div key={year} title={String(year)} style={{ flex: 1, height: 20, background: protected_ ? T.green : T.red, marginRight: 1, borderRadius: i === 0 ? '6px 0 0 6px' : i === totalYears - 1 ? '0 6px 6px 0' : 0 }} />
                        );
                    })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.t400 }}>
                    <span>{p.licenceYear}</span><span>{new Date().getFullYear()}</span>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, background: T.green, borderRadius: 2 }} /><span style={{ fontSize: 11, color: T.t600 }}>Protected ({retroYears}yr)</span></div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 10, height: 10, background: T.red, borderRadius: 2 }} /><span style={{ fontSize: 11, color: T.t600 }}>Gap ({gapYears}yr unprotected)</span></div>
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: T.amberD, background: T.amberL, borderRadius: 8, padding: "6px 10px" }}>
                    ⚠ Claims relating to 2012–2018 practice filed today may not be covered. Discuss retroactive extension.
                </div>
            </div>
        </>
    );
};

const MarineDetail = ({ data }) => {
    const { marine: m } = data.acordData;
    return (
        <>
            <SectionLabel>Vessel Details</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Vessel Name" value={m.vesselName} />
                <FieldRow label="Type" value={m.vesselType} />
                <FieldRow label="Length" value={`${m.lengthM}m`} />
                <FieldRow label="Year Built" value={String(m.yearBuilt)} />
                <FieldRow label="Home Port" value={m.homePort} />
                <FieldRow label="Insured Value" value={`€${m.insuredValue.toLocaleString()}`} />
                <FieldRow label="Third-party Limit" value={`€${m.thirdPartyLimit.toLocaleString()}`} />
            </div>

            <SectionLabel>Cruising Area Warranty</SectionLabel>
            <div style={{ background: m.cruisingAreaWarrantyMet ? T.greenL : T.redL, border: `1px solid ${m.cruisingAreaWarrantyMet ? "#A7F3D0" : "#FCA5A5"}`, borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: m.cruisingAreaWarrantyMet ? T.greenD : T.redD, marginBottom: 4 }}>
                    {m.cruisingAreaWarrantyMet ? "✓ Cruising Area Compliant" : "⚠ Area Mismatch Detected"}
                </div>
                <div style={{ fontSize: 11, color: T.t600 }}>{m.cruisingArea}</div>
                {m.cruisingAreaWarrantyMet && <div style={{ fontSize: 11, color: T.greenD, marginTop: 6 }}>Your current sailing area matches your policy warranty. No action required.</div>}
            </div>

            <SectionLabel>Additional Coverage</SectionLabel>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                <FieldRow label="Tender/Dinghy" value={m.tenderCovered ? `Covered — €${m.tenderValue.toLocaleString()}` : "Not covered"} highlight={m.tenderCovered ? T.green : T.red} />
                <FieldRow label="Mooring Liability" value={m.mooringCovered ? "Included ✓" : "Not covered"} highlight={m.mooringCovered ? T.green : T.red} />
                <FieldRow label="Crew Coverage" value={m.crewCovered ? "Up to 6 persons" : "Not covered"} highlight={m.crewCovered ? T.green : T.red} />
            </div>
        </>
    );
};

// ─── DETAIL ROUTER ─────────────────────────────────────────────────────────
const LobDetailSection = ({ policy }) => {
    switch (policy.id) {
        case "motor": return <MotorDetail data={policy} />;
        case "health": return <HealthDetail data={policy} />;
        case "home": return <HomeDetail data={policy} />;
        case "life": return <LifeDetail data={policy} />;
        case "pet": return <PetDetail data={policy} />;
        case "doctor": return <DoctorDetail data={policy} />;
        case "marine": return <MarineDetail data={policy} />;
        default: return null;
    }
};

// ─── POLICY LIST SCREEN ─────────────────────────────────────────────────────
const PolicyList = ({ onSelect }) => {
    const groups = {
        "Motor": LOB_LIST.filter(id => id === "motor").map(id => POLICIES[id]),
        "Health": LOB_LIST.filter(id => id === "health").map(id => POLICIES[id]),
        "Home & Property": LOB_LIST.filter(id => id === "home").map(id => POLICIES[id]),
        "Life & Investment": LOB_LIST.filter(id => id === "life").map(id => POLICIES[id]),
        "Pet": LOB_LIST.filter(id => id === "pet").map(id => POLICIES[id]),
        "Professional": LOB_LIST.filter(id => ["doctor", "marine"].includes(id)).map(id => POLICIES[id]),
    };
    return (
        <div style={{ padding: "18px 16px 100px" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em", marginBottom: 4 }}>My Wallet</div>
            <div style={{ fontSize: 12, color: T.t400, marginBottom: 18 }}>7 policies · 1 expiring</div>

            {Object.entries(groups).map(([group, policies]) => (
                <div key={group} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.t400, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{group}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {policies.map(p => {
                            const Icon = p.icon;
                            return (
                                <div key={p.id} onClick={() => onSelect(p)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "14px 16px", cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: p.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <Icon size={20} color={p.iconColor} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: T.t900 }}>{p.label}</div>
                                                <div style={{ fontSize: 11, color: T.t400, marginTop: 1 }}>{p.insurer} · {p.number}</div>
                                            </div>
                                        </div>
                                        <StatusBadge status={p.status} />
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                        {[["Expires", p.expires], ["Premium", `€${p.premium}/${p.period}`]].map(([l, v]) => (
                                            <div key={l} style={{ background: T.bg, borderRadius: 8, padding: "7px 10px" }}>
                                                <div style={{ fontSize: 10, color: T.t400, marginBottom: 1 }}>{l}</div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: p.status === "expiring" && l === "Expires" ? T.amber : T.t900 }}>{v}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {p.gaps?.some(g => g.severity === "red" || g.severity === "amber") && (
                                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                                            <AlertTriangle size={12} color={p.gaps[0].severity === "red" ? T.red : T.amber} strokeWidth={1.5} />
                                            <span style={{ fontSize: 11, color: p.gaps[0].severity === "red" ? T.red : T.amber, fontWeight: 600 }}>
                                                {p.gaps.filter(g => g.severity !== "blue").length} gap{p.gaps.filter(g => g.severity !== "blue").length > 1 ? "s" : ""} detected
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── POLICY DETAIL SCREEN ──────────────────────────────────────────────────
const PolicyDetail = ({ policy, onBack }) => {
    const [tab, setTab] = useState("covered");
    const Icon = policy.icon;

    return (
        <div style={{ background: T.bg, minHeight: "100vh" }}>
            {/* Sub-header */}
            <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 60, zIndex: 30 }}>
                <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: T.blue, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
                    <ChevronLeft size={16} strokeWidth={2} /> My Wallet
                </button>
            </div>

            {/* Policy hero */}
            <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "20px 16px 16px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: policy.iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={26} color={policy.iconColor} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                            <div style={{ fontSize: 17, fontWeight: 800, color: T.t900, letterSpacing: "-0.01em" }}>{policy.label}</div>
                            <StatusBadge status={policy.status} />
                        </div>
                        <div style={{ fontSize: 12, color: T.t400 }}>{policy.insurer} · {policy.number}</div>
                    </div>
                </div>

                {/* Key fields strip */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
                    {[
                        ["Premium", `€${policy.premium}/${policy.period}`],
                        ["Expires", policy.expires],
                        ["Renews in", policy.renewalIn ? `${policy.renewalIn}d` : "N/A"],
                    ].map(([l, v]) => (
                        <div key={l} style={{ background: T.bg, borderRadius: 10, padding: "9px 10px", textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: T.t400, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{l}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: policy.status === "expiring" && l === "Renews in" ? T.amber : T.t900 }}>{v}</div>
                        </div>
                    ))}
                </div>

                {/* Action row */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                    {[
                        { label: "Share", Icon: Share2, variant: "secondary" },
                        { label: "Download", Icon: Download, variant: "secondary" },
                        { label: "Analyse", Icon: Sparkles, variant: "primary" },
                        { label: "Renew", Icon: RefreshCw, variant: policy.status === "expiring" ? "primary" : "secondary" },
                    ].map(({ label, Icon: BIcon, variant }) => (
                        <button key={label} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                            borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                            border: `1px solid ${variant === "primary" ? T.blue : T.border}`,
                            background: variant === "primary" ? T.blue : T.card,
                            color: variant === "primary" ? "white" : T.t700
                        }}>
                            <BIcon size={13} strokeWidth={1.5} />{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable body */}
            <div style={{ padding: "0 16px 100px" }}>

                {/* Gap alerts */}
                {policy.gaps?.length > 0 && (
                    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                        {policy.gaps.map((gap, i) => (
                            <GapBanner key={i} gap={gap} onAsk={() => { }} />
                        ))}
                    </div>
                )}

                {/* LoB-specific fields */}
                <LobDetailSection policy={policy} />

                {/* Coverage tabs */}
                <div style={{ marginTop: 20 }}>
                    <div style={{ display: "flex", gap: 0, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: 4, marginBottom: 14 }}>
                        {[["covered", "What's Covered"], ["notcovered", "What's NOT Covered"]].map(([id, label]) => (
                            <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", background: tab === id ? (id === "covered" ? T.greenL : T.redL) : "transparent", color: tab === id ? (id === "covered" ? T.greenD : T.redD) : T.t600, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4px 16px" }}>
                        {(tab === "covered" ? policy.covered : policy.notCovered).map((item, i) => (
                            <CoverageItem key={i} text={item} covered={tab === "covered"} />
                        ))}
                    </div>
                </div>

                {/* Contact insurer */}
                <div style={{ marginTop: 16, background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.t900 }}>Contact {policy.insurer}</div>
                        <div style={{ fontSize: 11, color: T.t400, marginTop: 2 }}>Policy #{policy.number}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, border: `1px solid #A7F3D0`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <Phone size={15} color={T.greenD} strokeWidth={1.5} />
                        </button>
                        <button style={{ width: 36, height: 36, borderRadius: 10, background: T.blueL, border: `1px solid ${T.blueMid}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                            <MessageSquare size={15} color={T.blue} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Ask Agent */}
                <button style={{ width: "100%", marginTop: 10, background: T.blue, color: "white", border: "none", borderRadius: 14, padding: "14px", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Users size={16} strokeWidth={1.5} /> Ask Your Agent
                </button>
            </div>
        </div>
    );
};

// ─── BOTTOM NAV ────────────────────────────────────────────────────────────
const BottomNav = ({ active, onTab }) => {
    const tabs = [
        { id: "home", label: "Home", Icon: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg> },
        { id: "wallet", label: "My Wallet", Icon: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 12h.01" /></svg> },
        { id: "docs", label: "Documents", Icon: FileText },
        { id: "agent", label: "Agent", Icon: Users },
        { id: "profile", label: "Profile", Icon: () => <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
    ];
    return (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: T.card, borderTop: `1px solid ${T.border}`, display: "flex", padding: "8px 0 20px", zIndex: 50 }}>
            {tabs.map(({ id, label, Icon }) => {
                const isActive = active === id || ((active === "policy-detail" || active === "wallet") && id === "wallet");
                return (
                    <button key={id} onClick={() => onTab(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0", position: "relative" }}>
                        {isActive && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, background: T.blue, borderRadius: 999 }} />}
                        <div style={{ color: isActive ? T.blue : T.t400 }}><Icon size={22} strokeWidth={1.5} /></div>
                        <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, color: isActive ? T.blue : T.t400 }}>{label}</span>
                    </button>
                );
            })}
        </div>
    );
};

// ─── TOP NAV ──────────────────────────────────────────────────────────────
const TopNav = () => (
    <div style={{ background: T.card, borderBottom: `1px solid ${T.border}`, padding: "0 20px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: T.blue, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={16} color="white" strokeWidth={2} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.t900, letterSpacing: "-0.02em" }}>PolicyWallet</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative" }}>
                <button style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <Bell size={16} color={T.t600} strokeWidth={1.5} />
                </button>
                <div style={{ position: "absolute", top: 7, right: 7, width: 7, height: 7, background: T.red, borderRadius: "50%", border: "2px solid white" }} />
            </div>
        </div>
    </div>
);

// ─── ROOT ──────────────────────────────────────────────────────────────────
export default function PolicyWalletPolicyView() {
    const [screen, setScreen] = useState("wallet");
    const [selectedPolicy, setSelectedPolicy] = useState(null);

    const handleSelect = (policy) => {
        setSelectedPolicy(policy);
        setScreen("policy-detail");
    };

    const handleBack = () => {
        setSelectedPolicy(null);
        setScreen("wallet");
    };

    const handleTab = (tab) => {
        if (tab !== "wallet") setSelectedPolicy(null);
        setScreen(tab);
    };

    return (
        <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", maxWidth: 430, margin: "0 auto", position: "relative" }}>
            <TopNav />
            <div style={{ overflowY: "auto", height: "calc(100vh - 60px)" }}>
                {screen === "wallet" && <PolicyList onSelect={handleSelect} />}
                {screen === "policy-detail" && selectedPolicy && <PolicyDetail policy={selectedPolicy} onBack={handleBack} />}
                {screen === "home" && <div style={{ padding: 32, textAlign: "center", color: T.t400 }}>Dashboard — tap My Wallet to explore policies</div>}
                {screen === "docs" && <div style={{ padding: 32, textAlign: "center", color: T.t400 }}>Documents tab</div>}
                {screen === "agent" && <div style={{ padding: 32, textAlign: "center", color: T.t400 }}>Agent tab</div>}
                {screen === "profile" && <div style={{ padding: 32, textAlign: "center", color: T.t400 }}>Profile & Settings</div>}
            </div>
            <BottomNav active={screen} onTab={handleTab} />
        </div>
    );
}